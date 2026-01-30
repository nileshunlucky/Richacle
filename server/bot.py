import os
import time
import traceback
import ccxt
import pandas as pd
import numpy as np
import json
from datetime import datetime
from db import users_collection
from openai import OpenAI

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

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

def analyze_and_optimize_loss(trade_data, strategy_df):
    """
    Analyzes the loss using gpt-4o-mini and updates the strategy in the DB.
    Triggered only on trade completion if result is a loss.
    """
    try:
        user = users_collection.find_one({"email": EMAIL})
        if user.get("credits", 0) < 1:
            log_error_to_db("Insufficient credits")
            return

        # Prepare a small data snapshot for context (last 10 candles)
        recent_market_context = strategy_df.tail(10).to_dict(orient='records')
        
        prompt = f"""
        Analyze this losing trade and optimize the FULL strategy including risk parameters (if needed).

        Current Parameters:
        - Leverage: {LEVERAGE}x
        - Stop Loss: {STOP_LOSS*100}%
        - Take Profit: {TAKE_PROFIT*100}%
        - Symbol: {SYMBOL} | Timeframe: {TIMEFRAME}
        
        Trade Details:
        - Side: {trade_data['side']}
        - Entry: {trade_data['entry']} | Exit: {trade_data['exit']}
        - Calculated PnL: {trade_data['pnl']}
        - Market Snapshot: {json.dumps(recent_market_context)}

        Current Strategy Code:
        {STRATEGY_CODE}

        STRICT RULES:
        1. Output ONLY the function `def run_strategy(df):`. No markdown, no backticks, no comments.
        2. Use 'pd' for pandas and 'np' for numpy.
        3. The function MUST return: `trades` (a list of dicts) and `latest_signal` (a string).
        4. Trade Dictionary Format: 
        - Each trade MUST be: {{'entry_price': float, 'exit_price': float, 'qty': 1}}
        5. latest_signal: "BUY" (if current candle meets entry), "SELL" (if in trade and exit met), or "HOLD".

        ENVIRONMENT:
        - df columns: ['timestamp', 'open', 'high', 'low', 'close', 'volume']
        - All price columns are already floats.

        EXAMPLE STRUCTURE:
        def run_strategy(df):
            df['ema'] = df['close'].ewm(span=20).mean()
            trades = []
            open_trade = None
            latest_signal = "HOLD"
            for i in range(len(df)):
                price = df['close'].iloc[i]
                if open_trade is None:
                    if price > df['ema'].iloc[i]: # Entry Logic
                        open_trade = {{'entry_price': price, 'qty': 1}}
                        if i == len(df)-1: latest_signal = "BUY"
                else:
                    if price < df['ema'].iloc[i]: # Exit Logic
                        trades.append({{'entry_price': open_trade['entry_price'], 'exit_price': price, 'qty': 1}})
                        open_trade = None
                        if i == len(df)-1: latest_signal = "SELL"
            if open_trade:
                trades.append({{'entry_price': open_trade['entry_price'], 'exit_price': df['close'].iloc[-1], 'qty': 1}})
            return trades, latest_signal

                Instructions:
                1. Identify the likely reason for the loss in one short sentence.
                2. Rewrite the 'def run_strategy(df)' function to be more robust against this specific scenario.
                3. Suggest better Stop Loss ex. (0.02, 0.05), Take Profit ex. (0.05, 0.10), and Leverage values ex. (1, 125).
                NOTE: strategy will be apply in binance using ccxt.

                Respond ONLY with a JSON object in this format:
                {{
                "reason": "short explanation",
                "optimized_code": "full updated STRATEGY_CODE here",
                "new_stop_loss": float, 
                "new_take_profit": float,
                "new_leverage": int
                }}
                """

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a quantitative trading auditor."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        analysis = json.loads(response.choices[0].message.content)

        users_collection.update_one(
            {"email": EMAIL},
            {"$inc": {"credits": -1}}
        )
        
        # Save loss reason to array and update strategy code in DB
        users_collection.update_one(
            {"email": EMAIL, "strategies.id": STRATEGY_ID},
            {
                "$push": {
                    "strategies.$.loss_reasons": {
                        "reason": analysis.get("reason"),
                        "pnl": trade_data['pnl'],
                        "timestamp": datetime.now()
                    }
                },
                "$set": {
                    "strategies.$.strategy_code": analysis.get("optimized_code"),
                    "strategies.$.last_optimization": datetime.now()
                }
            }
        )
        print(f"✅ AI Analysis: {analysis.get('reason')}")
        print("🛠️ Strategy code updated in DB to prevent recurring loss.")
        
    except Exception as e:
        print(f"⚠️ GPT Optimization Error: {e}")

def sync_exchange_data():
    """Fetches the REAL truth from the exchange."""
    try:
        positions = exchange.fetch_positions([SYMBOL])
        raw_symbol = SYMBOL.replace("/", "")
        symbol_pos = next((p for p in positions if p['symbol'] == raw_symbol), None)
        
        if symbol_pos:
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
            { "$set": {"strategies.$.status": "error", "strategies.$.last_error": str(error_msg), "strategies.$.error_at": datetime.now()}}
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
                trade_status = "" # Track if it's a loss or profit
                
                if price_change_pct <= -STOP_LOSS:
                    exit_reason = f"STOP LOSS hit at {current_price}"
                    trade_status = "loss"
                elif price_change_pct >= TAKE_PROFIT:
                    exit_reason = f"TAKE PROFIT hit at {current_price}"
                    trade_status = "profit"

                if exit_reason:
                    trade_pnl = price_change_pct * (abs(state['pos']) * entry_price)
                    side = "sell" if is_long else "buy"
                    
                    print(f"🛑 {exit_reason} | Closing Real Pos: {state['pos']}")
                    exchange.create_order(SYMBOL, 'market', side, abs(state['pos']))
                    update_strategy_state(pos=0.0, entry=0.0, pnl_inc=trade_pnl, unpnl=0.0)
                    
                    # TRIGGER GPT LOGIC ONLY ON LOSS
                    if trade_status == "loss":
                        print("📉 Trade lost. Analyzing with AI...")
                        trade_summary = {
                            "side": "LONG" if is_long else "SHORT",
                            "entry": entry_price,
                            "exit": current_price,
                            "pnl": trade_pnl
                        }
                        analyze_and_optimize_loss(trade_summary, df)
                    
                    continue 

            # --- 2. EXECUTION LOGIC ---
            if signal == "BUY":
                if state['pos'] < 0: # Close Short
                    trade_pnl = (state['entry'] - current_price) * abs(state['pos'])
                    exchange.create_market_buy_order(SYMBOL, abs(state['pos']))
                    update_strategy_state(pos=0.0, entry=0.0, pnl_inc=trade_pnl)
                    print(f"🔄 Closed SHORT at {current_price}")
                    time.sleep(1)
                    state = get_strategy_state() 

                if state['pos'] == 0: # Open Long
                    qty = calculate_dynamic_qty(current_price)
                    if qty > 0:
                        exchange.create_market_buy_order(SYMBOL, qty)
                        update_strategy_state(pos=qty, entry=current_price)
                        print(f"📈 Opened LIVE LONG: {qty} at {current_price}")

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