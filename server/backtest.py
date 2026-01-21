from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
import ccxt
import traceback
from db import users_collection

router = APIRouter()

class BacktestRequest(BaseModel):
    strategy: str
    email: str

def fetch_max_ohlcv(symbol="BTC/USDT", timeframe="1h"):
    exchange = ccxt.kraken({
        "enableRateLimit": True
    })

    since = exchange.milliseconds() - (2 * 365 * 24 * 60 * 60 * 1000)
    limit = 1000
    all_ohlcv = []

    while True:
        ohlcv = exchange.fetch_ohlcv(
            symbol=symbol,
            timeframe=timeframe,
            since=since,
            limit=limit
        )

        if not ohlcv:
            break

        all_ohlcv.extend(ohlcv)
        since = ohlcv[-1][0] + 1

    return all_ohlcv


@router.post("/api/backtest")
async def backtest_crypto(req: BacktestRequest):
    strategy = req.strategy
    email = req.email

    try:
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.get("backtest", 0) < 1:
            raise HTTPException(status_code=403, detail="Insufficient backtest")
        
        ohlcv = fetch_max_ohlcv()

        df = pd.DataFrame(
            ohlcv,
            columns=["timestamp", "open", "high", "low", "close", "volume"]
        )

        df[["open","high","low","close","volume"]] = df[
            ["open","high","low","close","volume"]
        ].astype(float)

        exec_globals = {"pd": pd, "np": np}
        local_env = {}
        exec(strategy, exec_globals, local_env)

        if "run_strategy" not in local_env:
            raise Exception("Strategy must define run_strategy(df)")

        trades, _ = local_env["run_strategy"](df)

        if not isinstance(trades, list):
            raise Exception("run_strategy must return a list")

        equity = 0
        equity_curve = [0]
        wins = losses = 0
        total_pnl = 0

        for trade in trades:
            entry = trade["entry_price"]
            exit = trade["exit_price"]
            qty = trade.get("qty", 1)

            pnl = (exit - entry) * qty
            total_pnl += pnl
            equity += pnl
            equity_curve.append(equity)

            if pnl > 0:
                wins += 1
            else:
                losses += 1

        total_trades = len(trades)
        win_rate = (wins / total_trades * 100) if total_trades else 0

        equity_series = pd.Series(equity_curve)
        rolling_max = equity_series.cummax()
        max_drawdown = (rolling_max - equity_series).max()

        initial_capital = 10000
        return_pct = (total_pnl / initial_capital) * 100

         # Deduct 1 credit
        users_collection.update_one(
            {"email": email},
            {"$inc": {"backtest": -1}}
        )

        trade_history = []
        for trade in trades:
            pnl = (trade["exit_price"] - trade["entry_price"]) * trade.get("qty", 1)
            trade_history.append(round(pnl, 2))

        return {
            "status": "success",
            "trade_history": trade_history,
            "data_info": {
                "candles": len(df),
                "years": round(len(df) / 8760, 2)
            },
            "metrics": {
                "total_pnl": round(total_pnl, 2),
                "return_percent": round(return_pct, 2),
                "max_drawdown": round(float(max_drawdown), 2),
                "total_trades": total_trades,
                "wins": wins,
                "losses": losses,
                "win_rate_percent": round(win_rate, 2)
            }
        }
    
    except HTTPException as he:
        raise he

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Backtest failed: {str(e)}\n{traceback.format_exc()}"
        )
