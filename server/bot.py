import os
import time
import traceback
import ccxt
import numpy as np
from datetime import datetime
from db import users_collection

# --- Configuration ---
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

# --- Exchange Initialization ---
exchange = ccxt.binance({
    'apiKey': API_KEY,
    'secret': API_SECRET,
    'enableRateLimit': True,
    'options': {'defaultType': 'spot'} 
})

if DEMO:
    exchange.enable_demo_trading(True)
else:
    exchange.load_markets()

class PnLTracker:
    def __init__(self):
        self.initial_value_usdt = None
        self.total_realized_pnl = 0.0

    def initialize_balance(self, state, current_price):
        """Captures the total account value at the exact moment the bot starts."""
        if self.initial_value_usdt is None:
            self.initial_value_usdt = (state['free_base'] * current_price) + state['free_quote']
            print(f"📊 Initial Portfolio Value: {self.initial_value_usdt:.2f} USDT")

    def calculate_pnl(self, state, current_price):
        """
        Realized PnL: Profit from closed buy/sell grid pairs.
        Unrealized PnL: Current value of held assets vs their value at start.
        """
        current_total_value = (state['free_base'] * current_price) + state['free_quote']
        total_pnl = current_total_value - self.initial_value_usdt
        
        # In Spot Grid, Total PnL is the most reliable metric. 
        # We derive unrealized by subtracting any tracked realized gains.
        return {
            "total_pnl": round(total_pnl, 4),
            "unrealized_pnl": round(total_pnl - self.total_realized_pnl, 4),
            "realized_pnl": round(self.total_realized_pnl, 4),
            "current_value": round(current_total_value, 2)
        }

pnl_tracker = PnLTracker()

def get_grid_levels():
    return np.linspace(LOWERPRICE, UPPERPRICE, GRIDLEVELS).tolist()

def sync_spot_balance():
    try:
        balance = exchange.fetch_balance()
        base_asset = SYMBOL.split('/')[0]
        quote_asset = SYMBOL.split('/')[1]
        return {
            "free_base": balance.get(base_asset, {}).get('free', 0.0) + balance.get(base_asset, {}).get('used', 0.0),
            "free_quote": balance.get(quote_asset, {}).get('free', 0.0) + balance.get(quote_asset, {}).get('used', 0.0),
            "open_orders": exchange.fetch_open_orders(SYMBOL)
        }
    except Exception as e:
        print(f"⚠️ Balance Sync Error: {e}")
        return None

def update_db(open_orders_count, pnl_data=None):
    try:
        update_fields = {
            "strategies.$.status": "running",
            "strategies.$.open_orders": open_orders_count,
            "strategies.$.last_update": datetime.now(),
        }
        if pnl_data:
            update_fields.update({
                "strategies.$.realized_pnl": pnl_data['realized_pnl'],
                "strategies.$.unrealized_pnl": pnl_data['unrealized_pnl'],
                "strategies.$.total_pnl": pnl_data['total_pnl'],
                "strategies.$.current_value": pnl_data['current_value']
            })

        users_collection.update_one(
            {"email": EMAIL, "strategies.id": STRATEGY_ID},
            {"$set": update_fields}
        )
    except Exception as e:
        print(f"⚠️ DB Update Error: {e}")

def refresh_grid():
    print(f"🔄 Refreshing Grid Engine... Step Size: {(UPPERPRICE-LOWERPRICE)/(GRIDLEVELS-1):.2f}")
    try:
        exchange.cancel_all_orders(SYMBOL)
        ticker = exchange.fetch_ticker(SYMBOL)
        current_price = ticker['last']
        grid_prices = get_grid_levels()
        base_asset = SYMBOL.split('/')[0]
        
        # First Principles: Inventory Seeding
        sell_levels = [p for p in grid_prices if p > current_price]
        needed_base = len(sell_levels) * AMOUNT
        
        state = sync_spot_balance()
        if state['free_base'] < (needed_base * 0.99):
            buy_qty = needed_base - state['free_base']
            print(f"🛒 SEEDING: Buying {buy_qty:.4f} {base_asset} to enable SELL levels...")
            exchange.create_market_buy_order(SYMBOL, buy_qty)
            time.sleep(2) 
        
        for price in grid_prices:
            p = float(exchange.price_to_precision(SYMBOL, price))
            qty = float(exchange.amount_to_precision(SYMBOL, AMOUNT))
            if abs(p - current_price) / current_price < 0.0001: continue

            if p < current_price:
                exchange.create_limit_buy_order(SYMBOL, qty, p)
            else:
                exchange.create_limit_sell_order(SYMBOL, qty, p)
                
    except Exception as e:
        print(f"❌ Engine Error: {e}")

def main():
    print(f"🚀 Spot Grid Engine Live | Symbol: {SYMBOL}")
    
    # 1. Initial State Sync
    ticker = exchange.fetch_ticker(SYMBOL)
    state = sync_spot_balance()
    pnl_tracker.initialize_balance(state, ticker['last'])

    # 2. Start Grid
    refresh_grid()

    while True:
        try:
            ticker = exchange.fetch_ticker(SYMBOL)
            state = sync_spot_balance()
            if not state: 
                time.sleep(10)
                continue

            # 3. PnL Calculation
            pnl_stats = pnl_tracker.calculate_pnl(state, ticker['last'])
            num_orders = len(state['open_orders'])
            
            # 4. Update Database
            update_db(num_orders, pnl_stats)

            print(f"🕒 {datetime.now().strftime('%H:%M:%S')} | PnL: {pnl_stats['total_pnl']} USDT | Orders: {num_orders}")

            # 5. Check for Fills
            if num_orders < (GRIDLEVELS - 1):
                print(f"🔔 Fill detected! Re-balancing...")
                # Note: In a production bot, we'd track specific fills to update 'realized_pnl' precisely
                refresh_grid()

            time.sleep(30)

        except Exception as e:
            print(f"❌ Loop Error: {e}")
            time.sleep(20)

if __name__ == "__main__":
    main()