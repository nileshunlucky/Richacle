import os
import traceback
import ccxt.async_support as ccxt
from fastapi import APIRouter, Form, HTTPException
from openai import OpenAI
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from db import users_collection
from cryptography.fernet import Fernet

load_dotenv()

router = APIRouter()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MASTER_KEY = os.getenv("MASTER_KEY")
fernet = Fernet(MASTER_KEY)

# Initialize Binance via CCXT

exchange = ccxt.binance({
    'options': {
        'defaultType': 'future', # This forces it to USD-M Futures
    }
})

class CryptoPrediction(BaseModel):
    research_summary: str = Field(description="Short real-time research summary of the crypto asset.")
    symbol: str = Field(description="Trading pair in capital, e.g., 'BTC/USDT'.")
    side: str = Field(description="Prediction based on market condition: 'BUY' or 'SELL'.")
    leverage: int = Field(description="Leverage value between 1 and 125.")
    take_profit: float = Field(description="Target price calculated with 1:3 Risk-to-Reward.")
    stop_loss: float = Field(description="Stop loss price calculated to protect capital.")

async def get_live_price(symbol: str):
    """Fetches real-time price from Binance using CCXT."""
    try:
        # Clean symbol for CCXT (e.g., BTC/USDT)
        ticker = await exchange.fetch_ticker(symbol)
        return ticker['last']
    except Exception as e:
        print(f"CCXT Error fetching price for {symbol}: {e}")
        return None

@router.post("/api/search")
async def autocomplete(email: str = Form(...), prompt: str = Form(...)):
    # 1. Fetch and Validate User Credits
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Ensure credits are treated as an integer to prevent comparison errors
    try:
        current_credits = int(user.get("credits", 0))
    except (ValueError, TypeError):
        current_credits = 0

    if current_credits < 1:
        # This will be caught by the status 403 logic in your frontend
        raise HTTPException(status_code=403, detail="Credits exhausted")

    try:
        # STEP 1: AI Symbol Extraction (Handles typos like "btcoin" -> "BTC/USDT")
        extraction_msg = [
            {"role": "system", "content": "Extract the crypto trading pair from the user prompt. Return ONLY the symbol in BASE/USDT format. Example: 'BTC/USDT'. If mention of a coin is vague, default to 'BTC/USDT' and its 1min timeframe remember give accurate takeprofit and stoploss. if Buy then takeprofit: To be upper than the current price. if sell then takeprofit: To be lower than the current price.and stoploss. if buy then Stop Loss: To be lower than the current price. if sell then Stop Loss: To be upper than the current price."},
            {"role": "user", "content": prompt}
        ]
        
        symbol_res = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=extraction_msg,
            temperature=0
        )
        detected_symbol = symbol_res.choices[0].message.content.strip().upper()

        # STEP 2: Fetch Dynamic Market Price
        live_price = await get_live_price(detected_symbol)
        
        price_context = ""
        if live_price:
            price_context = f"The current live price for {detected_symbol} is {live_price}."
        else:
            # Fallback if CCXT fails
            price_context = "Market price is currently volatile. Use the most recent 2026 technical levels."

        # STEP 3: Generate Final Structured Prediction
        system_instructions = (
            f"You are a real-time crypto research and prediction AI. \n"
            f"Context: {price_context} \n"
            f"Analyze the user's prompt and provide a precise trading setup. \n"
            f"1. Symbol: Use {detected_symbol}. \n"
            f"2. Side: Predict BUY or SELL. \n"
            f"3. Leverage: 1-125 based on volatility. \n"
            f"4. TP/SL: Calculate based on a 1:3 Risk-to-Reward ratio relative to the live price ({live_price})."
        )

        completion = openai_client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_instructions},
                {"role": "user", "content": prompt},
            ],
            response_format=CryptoPrediction,
        )

        prediction_data = completion.choices[0].message.parsed

        # STEP 4: Deduct Credit Only on Success
        users_collection.update_one({"email": email}, {"$inc": {"credits": -1}})

        return {
            "status": "success",
            "data": prediction_data.dict()
        }

    except HTTPException as he:
        # Re-raise HTTP exceptions so 403/404 are not turned into 500s
        raise he
    except Exception as e:
        print(traceback.format_exc())
        # Generic error handling
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/execute-trade")
async def execute_trade(
    email: str = Form(...),
    symbol: str = Form(...),
    side: str = Form(...), 
    leverage: int = Form(...),
    amount: float = Form(...), 
    tp: float = Form(...),
    sl: float = Form(...),
):
    user = users_collection.find_one({"email": email})
    if not user: raise HTTPException(status_code=404, detail="User not found")

    binance_data = user.get("binance", {})
    api_key = binance_data.get("apiKey")
    is_demo = binance_data.get("demo", False)
    decrypted_secret = fernet.decrypt(binance_data.get("apiSecret").encode()).decode()

    client = ccxt.binance({
        'apiKey': api_key,
        'secret': decrypted_secret,
        'options': {'defaultType': 'future'}
    })
    if is_demo: client.enable_demo_trading(True)

    try:
        await client.load_markets()
        formatted_symbol = symbol.upper()
        
        # 1. Set Leverage
        await client.set_leverage(leverage, formatted_symbol)

        # 2. Get Price and Calculate Quantity
        price = await get_live_price(formatted_symbol)
        qty = float(client.amount_to_precision(formatted_symbol, (amount * leverage) / price))
        
        # 3. Entry Order
        order_side = 'buy' if side.upper() == "BUY" else 'sell'
        main_order = await client.create_market_order(formatted_symbol, order_side, qty)

        # 4. TP/SL (THE FIX: Use closePosition=True)
        exit_side = 'sell' if order_side == 'buy' else 'buy'
        tp_price = float(client.price_to_precision(formatted_symbol, tp))
        sl_price = float(client.price_to_precision(formatted_symbol, sl))

        # This links the SL/TP specifically to the "Position" 
        # so they show up correctly in the "Open Orders" tab
        common_params = {'reduceOnly': True, 'closePosition': True}

        await client.create_order(formatted_symbol, 'TAKE_PROFIT_MARKET', exit_side, qty, params={'stopPrice': tp_price, **common_params})
        await client.create_order(formatted_symbol, 'STOP_MARKET', exit_side, qty, params={'stopPrice': sl_price, **common_params})

        return {"status": "success", "message": "Trade and TP/SL setup complete"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await client.close()

@router.post("/api/close-position")
async def close_position(email: str = Form(...), symbol: str = Form(...)):
    user = users_collection.find_one({"email": email})
    if not user: raise HTTPException(status_code=404, detail="User not found")

    binance_data = user.get("binance", {})
    api_key = binance_data.get("apiKey")
    is_demo = binance_data.get("demo", False)
    decrypted_secret = fernet.decrypt(binance_data.get("apiSecret").encode()).decode()

    client = ccxt.binance({
        'apiKey': api_key,
        'secret': decrypted_secret,
        'options': {'defaultType': 'future'}
    })
    if is_demo: client.enable_demo_trading(True)

    try:
        formatted_symbol = symbol.upper()

        # 1. KILL ALL ORDERS FIRST (TP, SL, Limits)
        # We call this twice using different methods to ensure Binance wipes the book
        await client.cancel_all_orders(formatted_symbol) 
        
        # 2. GET CURRENT POSITION
        # fetch_positions is the industry standard for specific symbol checks
        positions = await client.fetch_positions([formatted_symbol])
        active_pos = next((p for p in positions if p['symbol'] == formatted_symbol), None)

        if not active_pos or float(active_pos['contracts']) == 0:
            return {"status": "success", "message": "No position found, orders cleared."}

        # 3. MARKET CLOSE THE POSITION
        contracts = float(active_pos['contracts'])
        # CCXT 'contracts' is positive for Longs, negative for Shorts
        side = 'sell' if contracts > 0 else 'buy'
        
        close_order = await client.create_market_order(
            symbol=formatted_symbol,
            side=side,
            amount=abs(contracts),
            params={'reduceOnly': True}
        )

        return {"status": "success", "message": f"Closed {abs(contracts)} {formatted_symbol} and wiped TP/SL."}

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Close Error: {str(e)}")
    finally:
        await client.close()