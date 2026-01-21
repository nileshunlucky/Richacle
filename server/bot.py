import os
import time
import traceback
import ccxt
import pandas as pd
import numpy as np
from datetime import datetime
from db import users_collection

# --- Configuration ---
EMAIL = os.getenv("EMAIL")
API_KEY = os.getenv("BINANCE_API_KEY")
API_SECRET = os.getenv("BINANCE_API_SECRET")
DEMO = os.getenv("DEMO", True)
STRATEGY_ID = os.getenv("STRATEGY_ID")
STRATEGY_CODE = os.getenv("STRATEGY_CODE")
SYMBOL = os.getenv("SYMBOL", "BTC/USDT")
TIMEFRAME = os.getenv("TIMEFRAME", "1m")
AMOUNT = float(os.getenv("AMOUNT", 100)) 
LEVERAGE = int(os.getenv("LEVERAGE", 5))

# Stop Loss / Take Profit
STOP_LOSS = float(os.getenv("STOP_LOSS", 0.02))
TAKE_PROFIT = float(os.getenv("TAKE_PROFIT", 0.05))

# --- Exchange Initialization (Live Futures) ---
exchange = ccxt.binance({
    'apiKey': API_KEY,
    'secret': API_SECRET,
    'enableRateLimit': True,
    'options': {'defaultType': 'future'}
})

if DEMO:
    exchange.enable_demo_trading(True)

DB_PREFIX = "live" if DEMO else "demo"

# --- Helper Functions ---

def sync_exchange_data():
    """Fetches the REAL truth from the exchange."""
    try:
        # fetch_positions provides real size and entry price
        positions = exchange.fetch_positions([SYMBOL])
        # Find our specific symbol
        raw_symbol = SYMBOL.replace("/", "")
        symbol_pos = next((p for p in positions if p['symbol'] == raw_symbol), None)
        
        if symbol_pos:
            # positionAmt is positive for long, negative for short
            signed_pos = float(symbol_pos['info']['positionAmt'])
            entry_price = float(symbol_pos['entryPrice'] or 0.0)
            unrealized_pnl = float(symbol_pos['unrealizedPnl'] or 0.0)
            
            return {
                "pos": signed_pos,
                "entry": entry_price,
                "unpnl": unrealized_pnl
            }
    except Exception as e:
        print(f"⚠️ Exchange Sync Error: {e}")
    return None

def get_strategy_state():
    user = users_collection.find_one({"email": EMAIL, "strategies.id": STRATEGY_ID})
    if user:
        for strat in user.get('strategies', []):
            if strat['id'] == STRATEGY_ID:
                return {
                    "pos": float(strat.get(f'{DB_PREFIX}_pos', 0.0)),
                    "entry": float(strat.get(f'{DB_PREFIX}_entry', 0.0)),
                    "total_pnl": float(strat.get(f'{DB_PREFIX}_pnl', 0.0))
                }
    return {"pos": 0.0, "entry": 0.0, "total_pnl": 0.0}

def update_strategy_state(pos, entry=0.0, pnl_inc=0.0, unpnl=0.0):
    """Updates DB with both realized (inc) and unrealized (set) PnL."""
    users_collection.update_one(
        {"email": EMAIL, "strategies.id": STRATEGY_ID},
        {
            "$set": {
                f"strategies.$.{DB_PREFIX}_pos": pos,
                f"strategies.$.{DB_PREFIX}_entry": entry,
                f"strategies.$.{DB_PREFIX}_unrealized_pnl": unpnl,
                "strategies.$.status": "running",
                "strategies.$.last_update": datetime.now(),
            },
            "$inc": {f"strategies.$.{DB_PREFIX}_pnl": pnl_inc}
        }
    )

def calculate_dynamic_qty(price):
    try:
        raw_qty = (AMOUNT * LEVERAGE) / price
        return float(exchange.amount_to_precision(SYMBOL, raw_qty))
    except Exception as e:
        print(f"⚠️ Qty Calculation Error: {e}")
        return 0.0

def fetch_data():
    bars = exchange.fetch_ohlcv(SYMBOL, TIMEFRAME)
    df = pd.DataFrame(bars, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
    df[["open", "high", "low", "close", "volume"]] = df[["open", "high", "low", "close", "volume"]].astype(float)
    return df

def log_error_to_db(error_msg):
    try:
        users_collection.update_one(
            {"email": EMAIL, "strategies.id": STRATEGY_ID},
            {"$set": {"strategies.$.status": "error", "strategies.$.last_error": str(error_msg), "strategies.$.error_at": datetime.now()}}
        )
    except Exception as db_e:
        print(f"🔥 Database Error: {db_e}")

def main():
    if not STRATEGY_CODE: 
        print("❌ No Strategy Code found.")
        return

    print(f"🚀 Bot starting | {DEMO and 'DEMO' or 'LIVE'} FUTURES | Symbol: {SYMBOL} | Leverage: {LEVERAGE}x")
    exchange.load_markets()

    try:
        exchange.set_leverage(LEVERAGE, SYMBOL)
        exchange.set_margin_mode('ISOLATED', SYMBOL)
    except Exception as e:
        print(f"⚠️ Leverage Config Warning: {e}")

    # Inject strategy code
    local_env = {"pd": pd, "np": np}
    exec(STRATEGY_CODE, local_env)
    run_strategy = local_env.get("run_strategy")

    while True:
        try:
            # --- 0. SYNC REAL STATE ---
            real_exchange = sync_exchange_data()
            if real_exchange is not None:
                # Force local state to match exchange truth
                update_strategy_state(
                    pos=real_exchange['pos'], 
                    entry=real_exchange['entry'], 
                    unpnl=real_exchange['unpnl']
                )

            state = get_strategy_state()
            df = fetch_data()
            current_price = float(df['close'].iloc[-1])
            _, signal = run_strategy(df)
            
            print(f"🕒 {datetime.now().strftime('%H:%M:%S')} | Total PnL: ${state['total_pnl']:.2f} | Real Pos: {state['pos']} | Signal: {signal}")

            # --- 1. EXIT LOGIC (SL/TP) ---
            if state['pos'] != 0:
                entry_price = state['entry']
                is_long = state['pos'] > 0
                price_change_pct = (current_price - entry_price) / entry_price if is_long else (entry_price - current_price) / entry_price
                
                exit_reason = ""
                if price_change_pct <= -STOP_LOSS:
                    exit_reason = f"STOP LOSS hit at {current_price}"
                elif price_change_pct >= TAKE_PROFIT:
                    exit_reason = f"TAKE PROFIT hit at {current_price}"

                if exit_reason:
                    # Calculate estimated realized PnL for the DB
                    trade_pnl = price_change_pct * (abs(state['pos']) * entry_price)
                    side = "sell" if is_long else "buy"
                    
                    print(f"🛑 {exit_reason} | Closing Real Pos: {state['pos']}")
                    exchange.create_order(SYMBOL, 'market', side, abs(state['pos']))
                    
                    update_strategy_state(pos=0.0, entry=0.0, pnl_inc=trade_pnl, unpnl=0.0)
                    continue 

            # --- 2. EXECUTION LOGIC ---
            # BUY SIGNAL
            if signal == "BUY":
                if state['pos'] < 0: # Close Short
                    trade_pnl = (state['entry'] - current_price) * abs(state['pos'])
                    exchange.create_market_buy_order(SYMBOL, abs(state['pos']))
                    update_strategy_state(pos=0.0, entry=0.0, pnl_inc=trade_pnl)
                    print(f"🔄 Closed SHORT at {current_price}")
                    time.sleep(1) # Small delay for exchange processing
                    state = get_strategy_state() 

                if state['pos'] == 0: # Open Long
                    qty = calculate_dynamic_qty(current_price)
                    if qty > 0:
                        exchange.create_market_buy_order(SYMBOL, qty)
                        update_strategy_state(pos=qty, entry=current_price)
                        print(f"📈 Opened LIVE LONG: {qty} at {current_price}")

            # SELL SIGNAL
            elif signal == "SELL":
                if state['pos'] > 0: # Close Long
                    trade_pnl = (current_price - state['entry']) * state['pos']
                    exchange.create_market_sell_order(SYMBOL, abs(state['pos']))
                    update_strategy_state(pos=0.0, entry=0.0, pnl_inc=trade_pnl)
                    print(f"🔄 Closed LONG at {current_price}")
                    time.sleep(1)
                    state = get_strategy_state()

                if state['pos'] == 0: # Open Short
                    qty = calculate_dynamic_qty(current_price)
                    if qty > 0:
                        exchange.create_market_sell_order(SYMBOL, qty)
                        update_strategy_state(pos=-qty, entry=current_price) 
                        print(f"📉 Opened LIVE SHORT: {qty} at {current_price}")

            time.sleep(60)

        except Exception as e:
            print(f"❌ Loop Error: {e}")
            traceback.print_exc()
            log_error_to_db(e)
            time.sleep(15)

if __name__ == "__main__":
    main()