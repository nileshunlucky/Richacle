import os
import traceback
import ccxt.async_support as ccxt
from fastapi import APIRouter, Form, HTTPException
from openai import OpenAI
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from db import users_collection
from cryptography.fernet import Fernet
import json

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
    confidence: int = Field(description="Accuracy score between 0 and 100 representing prediction certainty.")

async def get_live_price(symbol: str):
    """Fetches real-time price from Binance using CCXT."""
    try:
        # Clean symbol for CCXT (e.g., BTC/USDT)
        ticker = await exchange.fetch_ticker(symbol)
        return ticker['last']
    except Exception as e:
        print(f"CCXT Error fetching price for {symbol}: {e}")
        return None

@router.post("/api/chat")
async def autocomplete(email: str = Form(...), prompt: str = Form(...)):
    user = users_collection.find_one({"email": email})
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if int(user.get("credits", 0)) < 1: raise HTTPException(status_code=403, detail="Credits exhausted")

    # Get existing memory
    short_term_memory = user.get("memory", "No previous context.")

    # Define the "Memory Tool"
    tools = [{
        "type": "function",
        "function": {
            "name": "update_memory",
            "description": "Updates the short-term memory with key facts. Max 100 words.",
            "parameters": {
                "type": "object",
                "properties": {
                    "new_memory": {
                        "type": "string", 
                        "description": "A very short, bulleted summary of important user facts."
                    }
                },
                "required": ["new_memory"]
            }
        }
    }]

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": f"You are Richacle AI. Current Memory: {short_term_memory}. "
                               "IMPORTANT: If the user shares new personal info, habits, or preferences, "
                               "call 'update_memory' to save it concisely (e.g., 'User: daytrader')."
                },
                {"role": "user", "content": prompt},
            ],
            tools=tools,
            tool_choice="auto" 
        )

        message = response.choices[0].message
        chat_res = message.content
        
        # 1. Extract Memory from Function Call (if GPT decided to update it)
        updated_mem_value = short_term_memory # Default to old memory
        if message.tool_calls:
            for tool_call in message.tool_calls:
                if tool_call.function.name == "update_memory":
                    arg_data = json.loads(tool_call.function.arguments)
                    updated_mem_value = arg_data.get("new_memory")

        # 2. Update DB (One trip to the DB)
        users_collection.update_one(
            {"email": email}, 
            {
                "$inc": {"credits": -1},
                "$set": {"memory": updated_mem_value[:500]} # Hard character limit
            }
        )

        return {"status": "success", "chat_res": chat_res}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
            f"5. Confidence: Provide a score from 0-100 based on technical strength and data clarity."
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
    # 1. Get Keys from DB
    user = users_collection.find_one({"email": email})
    if not user: raise HTTPException(status_code=404, detail="User not found")

    binance_data = user.get("binance", {})
    api_key = binance_data.get("apiKey")
    encrypted_secret = binance_data.get("apiSecret")
    is_demo = binance_data.get("demo", False)

    if not api_key or not encrypted_secret:
        raise HTTPException(status_code=400, detail="Binance API keys missing.")

    # Decrypt the secret
    try:
        decrypted_secret = fernet.decrypt(encrypted_secret.encode()).decode()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt API secret.")

    # 2. Initialize Private Exchange
    client = ccxt.binance({
        'apiKey': api_key,
        'secret': decrypted_secret, # Use the decrypted variable!
        'options': {'defaultType': 'future'}
    })
    
    if is_demo:
        client.enable_demo_trading(True)

    try:
        # Load markets to get precision rules (CRITICAL for Binance)
        await client.load_markets()
        
        # 3. Setup Leverage
        formatted_symbol = symbol.upper() # Ensure it's BTC/USDT
        await client.set_leverage(leverage, formatted_symbol)

        # 4. Calculate Quantity with Correct Precision
        price = await get_live_price(symbol)
        if not price: raise Exception("Could not fetch live price for calculation")
        
        raw_quantity = (amount * leverage) / price
        # Use CCXT helper to round to the exchange's required decimal places
        quantity = float(client.amount_to_precision(formatted_symbol, raw_quantity))
        
        # 5. Execute Market Order (Side MUST be lowercase)
        order_side = 'buy' if side.upper() == "BUY" else 'sell'
        main_order = await client.create_market_order(formatted_symbol, order_side, quantity)

        actual_fill_price = main_order.get('average') or main_order.get('price')

        # 6. Set Take Profit & Stop Loss (Exit sides are opposite)
        exit_side = 'sell' if order_side == 'buy' else 'buy'
        
        # Round TP/SL to correct price precision
        tp_price = float(client.price_to_precision(formatted_symbol, tp))
        sl_price = float(client.price_to_precision(formatted_symbol, sl))

        common_params = {
            'reduceOnly': True,
            'workingType': 'MARK_PRICE' # <--- Adds stability
        }

        # Take Profit
        tp_order = await client.create_order(
            symbol=formatted_symbol,
            type='TAKE_PROFIT_MARKET',
            side=exit_side,
            amount=quantity,
            params={**common_params,'stopPrice': tp_price}
        )

        # Stop Loss
        sl_order = await client.create_order(
            symbol=formatted_symbol,
            type='STOP_MARKET',
            side=exit_side,
            amount=quantity,
            params={**common_params,'stopPrice': sl_price}
        )

        return {
            "status": "success",
            "message": f"Trade executed on {'Demo' if is_demo else 'Real'} Account",
            "entryPrice": actual_fill_price,
            "orderId": main_order['id'],
            "tpId": tp_order['id'],
            "slId": sl_order['id']
        }

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Binance Error: {str(e)}")
    finally:
        await client.close() # Clean up connection

@router.post("/api/close-position")
async def close_position(email: str = Form(...), symbol: str = Form(...)):
    user = users_collection.find_one({"email": email})
    if not user: raise HTTPException(status_code=404, detail="User not found")

    binance_data = user.get("binance", {})
    api_key = binance_data.get("apiKey")
    encrypted_secret = binance_data.get("apiSecret")
    is_demo = binance_data.get("demo", False)

    decrypted_secret = fernet.decrypt(encrypted_secret.encode()).decode()

    client = ccxt.binance({
        'apiKey': api_key,
        'secret': decrypted_secret,
        'options': {'defaultType': 'future'}
    })
    if is_demo: client.enable_demo_trading(True)

    try:
        formatted_symbol = symbol.upper()
        binance_symbol = formatted_symbol.replace("/", "")  # BTC/USDT → BTCUSDT

        # 1. Fetch position (your working approach — unchanged)
        balance = await client.fetch_balance()
        positions = balance['info']['positions']
        active_pos = next((p for p in positions if p['symbol'] == binance_symbol), None)

        if not active_pos or float(active_pos['positionAmt']) == 0:
            return {"status": "error", "message": f"No active position found for {formatted_symbol}"}

        pos_amount = float(active_pos['positionAmt'])
        side = 'sell' if pos_amount > 0 else 'buy'
        abs_amount = abs(pos_amount)

        # 2. Cancel TP/SL — since Dec 2025 these are ALGO orders on /fapi/v1/openAlgoOrders
        # NOT visible to fetch_open_orders or cancel_all_orders at all
        try:
            algo_response = await client.fapiPrivateGetOpenAlgoOrders({'symbol': binance_symbol})
            # Response is a list of algo orders directly
            algo_orders = algo_response if isinstance(algo_response, list) else algo_response.get('orders', [])
            for order in algo_orders:
                algo_id = order.get('algoId')
                if algo_id:
                    await client.fapiPrivateDeleteAlgoOrder({'algoId': algo_id})
                    print(f"[close-position] cancelled algoId={algo_id}")
        except Exception as cancel_err:
            print(f"[close-position] algo cancel error: {cancel_err}")

        # 3. Close the position (your working approach — unchanged)
        close_order = await client.create_market_order(
            symbol=formatted_symbol,
            side=side,
            amount=abs_amount,
            params={'reduceOnly': True}
        )

        return {
            "status": "success",
            "message": f"Closed {formatted_symbol} position of {abs_amount}",
            "orderId": close_order['id']
        }

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Close Error: {str(e)}")
    finally:
        await client.close()