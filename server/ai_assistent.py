import os
import traceback
import ccxt
from fastapi import APIRouter, Form, HTTPException
from openai import OpenAI
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from db import users_collection

load_dotenv()

router = APIRouter()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize Binance via CCXT
exchange = ccxt.binance()

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
        ticker = exchange.fetch_ticker(symbol)
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
            {"role": "system", "content": "Extract the crypto trading pair from the user prompt. Return ONLY the symbol in BASE/USDT format. Example: 'BTC/USDT'. If mention of a coin is vague, default to 'BTC/USDT'."},
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