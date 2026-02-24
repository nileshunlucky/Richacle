import os
import time
import traceback
import ccxt
import pandas as pd
import numpy as np
from datetime import datetime
from db import users_collection

# --- Configuration (Keeping your exact input names) ---
EMAIL = os.getenv("EMAIL")
API_KEY = os.getenv("BINANCE_API_KEY")
API_SECRET = os.getenv("BINANCE_API_SECRET")
DEMO = os.getenv("DEMO") == "True"
STRATEGY_ID = os.getenv("STRATEGY_ID")
SYMBOL = os.getenv("SYMBOL")
AMOUNT = float(os.getenv("AMOUNT", 0)) 
UPPERPRICE = float(os.getenv("UPPERPRICE", 0)) 
LOWERPRICE = float(os.getenv("LOWERPRICE", 0)) 
GRIDLEVELS = int(float(os.getenv("GRIDLEVELS", 5))) 
INTERVAL = float(os.getenv("INTERVAL")) 

# --- Exchange Initialization (Spot) ---
exchange = ccxt.binance({
    'apiKey': API_KEY,
    'secret': API_SECRET,
    'enableRateLimit': True,
    'options': {'defaultType': 'spot'} # Switched to Spot
})

if DEMO:
    exchange.enable_demo_trading(True)
    DB_PREFIX = "demo"
else:
    DB_PREFIX = "live"

def get_grid_levels():
    """Generates price levels for the grid."""
    return np.linspace(LOWERPRICE, UPPERPRICE, GRIDLEVELS).tolist()

def sync_spot_balance():
    """Checks how much of the asset and cash you have."""
    try:
        balance = exchange.fetch_balance()
        base_asset = SYMBOL.split('/')[0]
        quote_asset = SYMBOL.split('/')[1]
        
        return {
            "free_base": balance.get(base_asset, {}).get('free', 0.0),
            "free_quote": balance.get(quote_asset, {}).get('free', 0.0),
            "open_orders": exchange.fetch_open_orders(SYMBOL)
        }
    except Exception as e:
        print(f"⚠️ Balance Sync Error: {e}")
        return None

def update_db(open_orders_count):
    """Updates database status."""
    users_collection.update_one(
        {"email": EMAIL, "strategies.id": STRATEGY_ID},
        {
            "$set": {
                "strategies.$.status": "running",
                "strategies.$.open_orders": open_orders_count,
                "strategies.$.last_update": datetime.now(),
            }
        }
    )

def refresh_grid():
    """Cancels and replaces grid orders based on current market price."""
    print("🔄 Refreshing Spot Grid...")
    try:
        exchange.cancel_all_orders(SYMBOL)
        ticker = exchange.fetch_ticker(SYMBOL)
        current_price = ticker['last']
        grid_prices = get_grid_levels()
        
        for price in grid_prices:
            # Ensure price/amount fit exchange rules
            p = float(exchange.price_to_precision(SYMBOL, price))
            qty = float(exchange.amount_to_precision(SYMBOL, AMOUNT))
            
            if p < current_price:
                # Place Buy Limit
                exchange.create_limit_buy_order(SYMBOL, qty, p)
                print(f"   BUY Limit set at {p}")
            elif p > current_price:
                # Place Sell Limit (Requires you to own the asset)
                exchange.create_limit_sell_order(SYMBOL, qty, p)
                print(f"   SELL Limit set at {p}")
                
    except Exception as e:
        print(f"⚠️ Grid Placement Error: {e}")

def main():
    print(f"🚀 Spot Grid Bot | Symbol: {SYMBOL} | Levels: {GRIDLEVELS}")
    exchange.load_markets()

    # Initial setup
    refresh_grid()

    while True:
        try:
            state = sync_spot_balance()
            if state is None: 
                time.sleep(10)
                continue

            num_orders = len(state['open_orders'])
            update_db(num_orders)

            # If an order was filled, the count will drop.
            # We refresh to ensure the grid is symmetrical around the new price.
            if num_orders < (GRIDLEVELS - 1):
                print(f"🔔 Fill detected ({num_orders}/{GRIDLEVELS} orders left). Re-gridding...")
                refresh_grid()

            print(f"🕒 {datetime.now().strftime('%H:%M:%S')} | Orders: {num_orders} | Asset: {state['free_base']}")
            time.sleep(INTERVAL)

        except Exception as e:
            print(f"❌ Loop Error: {e}")
            traceback.print_exc()
            time.sleep(30)

if __name__ == "__main__":
    main()