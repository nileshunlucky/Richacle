from fastapi import APIRouter, HTTPException, Form
from pydantic import BaseModel
import pandas as pd
import ccxt
import traceback
from db import users_collection
import os
from cryptography.fernet import Fernet

router = APIRouter()

MASTER_KEY = os.getenv("MASTER_KEY")
fernet = Fernet(MASTER_KEY)

@router.post("/api/balance")
async def get_balance(email: str = Form(...)):
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    binance_creds = user.get("binance")
    if not binance_creds or not binance_creds.get("apiKey"):
        raise HTTPException(status_code=400, detail="Binance API keys not configured")

    apiSecret = binance_creds.get("apiSecret")
    decrypted_secret = fernet.decrypt(apiSecret.encode()).decode()

    try:
        exchange = ccxt.binance({
            'apiKey': binance_creds.get("apiKey"),
            'secret': decrypted_secret,
            'enableRateLimit': True,
            'options': {'defaultType': 'future'},
        })

        if binance_creds.get("demo"):
            exchange.enable_demo_trading(True)

        # 1. Fetch General Balance
        balance = exchange.fetch_balance()
        usdt_data = balance.get('USDT', {})
        wallet_cash = usdt_data.get('total', 0.0)
        available_cash = usdt_data.get('free', 0.0)

        # 2. Fetch Unrealized PnL from active positions (THE FIX)
        # This gets the live PnL for your -0.005 BTC short
        positions = exchange.fetch_positions()
        total_unrealized_pnl = 0.0
        
        for pos in positions:
            pnl = float(pos.get('unrealizedPnl', 0.0))
            total_unrealized_pnl += pnl

        # 3. Calculate Real Equity
        # Equity = Your Cash + Your Live Profit/Loss
        equity = wallet_cash + total_unrealized_pnl

        return {
            "status": "success",
            "wallet_balance": round(wallet_cash, 2),
            "available_balance": round(available_cash, 2),
            "equity": round(equity, 2),
            "unrealized_pnl": round(total_unrealized_pnl, 2), # This will now show -0.78
            "currency": "USDT"
        }

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Exchange error: {str(e)}")

@router.post("/api/binance")
async def autocomplete(
    email: str = Form(...),
    apiKey: str = Form(...), 
    apiSecret: str = Form(...), 
    isDemo: bool = Form(...), 
):
    # 1. Initialize the Binance client
    exchange = ccxt.binance({
        'apiKey': apiKey,
        'secret': apiSecret,
        'enableRateLimit': True,
        'options': {'defaultType': 'future'},
    })

    if isDemo:
        exchange.enable_demo_trading(True)

    try:
        # 2. Validate credentials by calling a private endpoint
        # fetch_balance() requires a valid signature
        exchange.fetch_balance()
        
    except ccxt.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid Binance API Key or Secret")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not connect to Binance: {str(e)}")

    # 3. If validation passes, proceed to database update
    try:
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        encrypted_secret = fernet.encrypt(apiSecret.encode()).decode()

        users_collection.update_one(
            {"email": email},
            {
                "$set": {
                    "binance": {
                        "apiKey": apiKey, 
                        "apiSecret": encrypted_secret,
                        "demo": isDemo
                    },
                }
            }
        )
        return {"status": "success", "message": "API keys validated and saved"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database update failed")

@router.post("/api/engine")
async def set_engine(
    email: str = Form(...),
    toggle: bool = Form(...)
):
    try:
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        terminal = user.get("terminal", False)

        # Block engine ON if terminal is OFF
        if toggle is True and terminal is not True:
            raise HTTPException(status_code=403, detail="Terminal must be ON before enabling engine")

        users_collection.update_one(
            {"email": email},
            {"$set": {"engine": toggle}}
        )

        return {"status": "ok"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/trade-log")
async def get_trade_log(
    email: str = Form(...),
):

    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    binance_creds = user.get("binance")
    if not binance_creds or not binance_creds.get("apiKey"):
        raise HTTPException(status_code=400, detail="Binance API keys not configured")

    apiSecret = binance_creds.get("apiSecret")
    decrypted_secret = fernet.decrypt(apiSecret.encode()).decode()

    try:
        exchange = ccxt.binance({
            'apiKey': binance_creds.get("apiKey"),
            'secret': decrypted_secret,
            'enableRateLimit': True,
            'options': {'defaultType': 'future'},
        })

        if binance_creds.get("demo"):
            exchange.enable_demo_trading(True)

        symbol_list = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]  # fixed internally, frontend doesn't need to send this
        all_trades = []

        for sym in symbol_list:
            ccxt_symbol = sym.replace("USDT", "/USDT")
            try:
                fills = exchange.fetch_my_trades(ccxt_symbol, limit=200)
            except Exception:
                continue

            if not fills:
                continue

            fills.sort(key=lambda t: t['timestamp'])

            position_qty = 0.0
            entry_notional = 0.0
            open_side = None
            closed_trades = []

            for f in fills:
                qty = f['amount']
                price = f['price']
                side = f['side']
                realized_pnl = float(f.get('info', {}).get('realizedPnl', 0) or 0)
                signed_qty = qty if side == 'buy' else -qty

                if position_qty == 0:
                    open_side = 'BUY' if side == 'buy' else 'SELL'
                    entry_notional = qty * price
                    position_qty = signed_qty
                    continue

                same_direction = (position_qty > 0 and side == 'buy') or (position_qty < 0 and side == 'sell')

                if same_direction:
                    entry_notional += qty * price
                    position_qty += signed_qty
                else:
                    closing_qty = min(qty, abs(position_qty))
                    avg_entry_price = entry_notional / abs(position_qty) if position_qty != 0 else price
                    roi_pct = (realized_pnl / (avg_entry_price * closing_qty)) * 100 if avg_entry_price and closing_qty else 0

                    closed_trades.append({
                        "symbol": sym,
                        "side": open_side,
                        "entryPrice": round(avg_entry_price, 4),
                        "exitPrice": round(price, 4),
                        "qty": round(closing_qty, 6),
                        "pnl": round(realized_pnl, 2),
                        "roi": round(roi_pct, 2),
                        "closedAt": f['timestamp'],
                    })

                    position_qty += signed_qty
                    entry_notional = entry_notional * (abs(position_qty) / (abs(position_qty) + closing_qty)) if position_qty != 0 else 0

                    if position_qty != 0 and ((position_qty > 0) != (open_side == 'BUY')):
                        open_side = 'BUY' if position_qty > 0 else 'SELL'
                        entry_notional = abs(position_qty) * price

            all_trades.extend(closed_trades)

        all_trades.sort(key=lambda t: t['closedAt'], reverse=True)
        all_trades = all_trades[:30]

        return {
            "status": "success",
            "trades": all_trades,
        }

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Exchange error: {str(e)}")