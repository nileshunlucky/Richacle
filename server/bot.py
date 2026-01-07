import os, time, traceback, ccxt
import pandas as pd
import numpy as np
from datetime import datetime
from db import users_collection

# --- Configuration ---
EMAIL = os.getenv("EMAIL")
API_KEY = os.getenv("BINANCE_API_KEY")
API_SECRET = os.getenv("BINANCE_API_SECRET")
STRATEGY_ID = os.getenv("STRATEGY_ID")
STRATEGY_CODE = os.getenv("STRATEGY_CODE")
SYMBOL = os.getenv("SYMBOL", "BTC/USDT")
TIMEFRAME = os.getenv("TIMEFRAME", "1h")
MODE = os.getenv("MODE", "PAPER") 
AMOUNT = float(os.getenv("AMOUNT", 10.0)) 
LEVERAGE = int(os.getenv("LEVERAGE", 1))
STARTING_BALANCE = 10000.0

# Stop Loss / Take Profit
STOP_LOSS = float(os.getenv("STOP_LOSS", 0.02))
TAKE_PROFIT = float(os.getenv("TAKE_PROFIT", 0.05))

# --- Conditional Exchange Initialization ---
exchange = None
exchange_config = {
    'apiKey': API_KEY,
    'secret': API_SECRET,
    'enableRateLimit': True,
    'options': {'defaultType': 'future'}  # CRITICAL: Sets CCXT to Futures Mode
}

if MODE == "LIVE":
    exchange = ccxt.binance(exchange_config)
else:
    # Public markets for paper trading
    exchange = ccxt.binance({'enableRateLimit': True, 'options': {'defaultType': 'future'}})

# --- Helper Functions ---
def get_strategy_state():
    user = users_collection.find_one({"email": EMAIL, "strategies.id": STRATEGY_ID})
    if user:
        for strat in user.get('strategies', []):
            if strat['id'] == STRATEGY_ID:
                return {
                    "pos": float(strat.get('paper_pos', 0.0)) if MODE == "PAPER" else float(strat.get('live_pos', 0.0)),
                    "entry": float(strat.get('paper_entry', 0.0)) if MODE == "PAPER" else float(strat.get('live_entry', 0.0)),
                    "total_pnl": float(strat.get('paper_pnl', 0.0)) if MODE == "PAPER" else float(strat.get('live_pnl', 0.0))
                }
    return {"pos": 0.0, "entry": 0.0, "total_pnl": 0.0}

def update_strategy_state(pos, entry=0.0, pnl_inc=0.0):
    pnl_field = "strategies.$.live_pnl" if MODE == "LIVE" else "strategies.$.paper_pnl"
    pos_field = "strategies.$.live_pos" if MODE == "LIVE" else "strategies.$.paper_pos"
    entry_field = "strategies.$.live_entry" if MODE == "LIVE" else "strategies.$.paper_entry"

    users_collection.update_one(
        {"email": EMAIL, "strategies.id": STRATEGY_ID},
        {
            "$set": {
                pos_field: pos,
                entry_field: entry,
                "strategies.$.status": "running",
                "strategies.$.last_update": datetime.now(),
            },
            "$inc": {pnl_field: pnl_inc}
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
        print(f"🔥 Meta-Error: {db_e}")

def main():
    if not STRATEGY_CODE: return

    print(f"🚀 Bot starting | Mode: {MODE} | Symbol: {SYMBOL} | Leverage: {LEVERAGE}x")
    exchange.load_markets()

    if MODE == "LIVE":
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
            state = get_strategy_state()
            df = fetch_data()
            current_price = float(df['close'].iloc[-1])
            _, signal = run_strategy(df)
            
            current_wallet = STARTING_BALANCE + state['total_pnl']
            print(f"🕒 {datetime.now().strftime('%H:%M:%S')} | Wallet: ${current_wallet:.2f} | Pos: {state['pos']} | Signal: {signal}")

            # --- 1. EXIT LOGIC (SL/TP) ---
            if state['pos'] != 0:
                entry_price = state['entry']
                # Calculate profit: Longs benefit from price UP, Shorts from price DOWN
                is_long = state['pos'] > 0
                price_change_pct = (current_price - entry_price) / entry_price if is_long else (entry_price - current_price) / entry_price
                
                exit_reason = ""
                if price_change_pct <= -STOP_LOSS:
                    exit_reason = f"STOP LOSS hit at {current_price}"
                elif price_change_pct >= TAKE_PROFIT:
                    exit_reason = f"TAKE PROFIT hit at {current_price}"

                if exit_reason:
                    trade_pnl = price_change_pct * (abs(state['pos']) * entry_price)
                    if MODE == "LIVE":
                        side = "sell" if is_long else "buy"
                        exchange.create_order(SYMBOL, 'market', side, abs(state['pos']))
                    
                    update_strategy_state(pos=0.0, entry=0.0, pnl_inc=trade_pnl)
                    print(f"🛑 {exit_reason} | PnL: ${trade_pnl:.2f}")
                    continue 

            # --- 2. EXECUTION LOGIC (LONG & SHORT) ---
            # BUY SIGNAL
            if signal == "BUY":
                if state['pos'] < 0: # Close Short first
                    trade_pnl = (state['entry'] - current_price) * abs(state['pos'])
                    if MODE == "LIVE":
                        exchange.create_market_buy_order(SYMBOL, abs(state['pos']))
                    update_strategy_state(pos=0.0, entry=0.0, pnl_inc=trade_pnl)
                    print(f"🔄 Closed SHORT at {current_price}")
                    state = get_strategy_state() # Update local state after close

                if state['pos'] == 0: # Open Long
                    qty = calculate_dynamic_qty(current_price)
                    if qty > 0:
                        if MODE == "LIVE":
                            exchange.create_market_buy_order(SYMBOL, qty)
                        update_strategy_state(pos=qty, entry=current_price)
                        print(f"📈 [FUTURES] Opened LONG: {qty} at {current_price}")

            # SELL SIGNAL
            elif signal == "SELL":
                if state['pos'] > 0: # Close Long first
                    trade_pnl = (current_price - state['entry']) * state['pos']
                    if MODE == "LIVE":
                        exchange.create_market_sell_order(SYMBOL, abs(state['pos']))
                    update_strategy_state(pos=0.0, entry=0.0, pnl_inc=trade_pnl)
                    print(f"🔄 Closed LONG at {current_price}")
                    state = get_strategy_state() # Update local state after close

                if state['pos'] == 0: # Open Short
                    qty = calculate_dynamic_qty(current_price)
                    if qty > 0:
                        if MODE == "LIVE":
                            exchange.create_market_sell_order(SYMBOL, qty)
                        update_strategy_state(pos=-qty, entry=current_price) # Negative pos = Short
                        print(f"📉 [FUTURES] Opened SHORT: {qty} at {current_price}")

            time.sleep(60)

        except Exception as e:
            print(f"❌ Loop Error: {e}")
            log_error_to_db(e)
            time.sleep(15)

if __name__ == "__main__":
    main()