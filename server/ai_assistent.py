from fastapi import APIRouter, Form, HTTPException
from openai import OpenAI
import os
from dotenv import load_dotenv
from db import users_collection
from typing import Optional
import traceback
from uuid import uuid4
from pydantic import BaseModel, Field


load_dotenv()

router = APIRouter()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class CryptoPrediction(BaseModel):
    research_summary: str = Field(description="Short real-time research summary of the crypto asset.")
    symbol: str = Field(description="Trading pair in capital, e.g., 'BTC/USDT'.")
    side: str = Field(description="Prediction based on market condition: 'BUY' or 'SELL'.")
    leverage: int = Field(description="Leverage value between 1 and 125.")
    take_profit: float = Field(description="Target price calculated with 1:3 Risk-to-Reward.")
    stop_loss: float = Field(description="Stop loss price calculated to protect capital.")

@router.post("/api/search")
async def autocomplete(email: str = Form(...), prompt: str = Form(...)):
    try:
        user = users_collection.find_one({"email": email})
        if not user or user.get("credits", 0) < 1:
            raise HTTPException(status_code=403, detail="Credits exhausted")

        # System Instructions
        system_instructions = (
            "You are a real-time crypto research and prediction AI. "
            "Analyze the user's prompt and provide a precise trading setup. "
            "1. Symbol: Always uppercase (e.g., BTC/USDT). "
            "2. Side: Predict BUY or SELL based on implied market sentiment. "
            "3. Leverage: 1-125 based on volatility (lower for higher risk). "
            "4. TP/SL: Calculate based on a 1:3 Risk-to-Reward ratio."
        )

        # API Call with Structured Output
        completion = openai_client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_instructions},
                {"role": "user", "content": prompt},
            ],
            response_format=CryptoPrediction, # Enforces the Pydantic schema
        )

        prediction_data = completion.choices[0].message.parsed

        # Credit Deduction
        users_collection.update_one({"email": email}, {"$inc": {"credits": -1}})

        return {
            "status": "success",
            "data": prediction_data.dict()
        }
    
    # ADD THIS: Catch the 403 specifically so it doesn't hit the generic Exception block
    except HTTPException as he:
        raise he

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))