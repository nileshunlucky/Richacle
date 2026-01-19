from fastapi import APIRouter, Form, HTTPException
from openai import OpenAI
import os
from dotenv import load_dotenv
from db import users_collection
from typing import Optional
import traceback
from uuid import uuid4

load_dotenv()

router = APIRouter()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@router.post("/api/strategy")
async def predict_trade(
    email: str = Form(...),
    input: str = Form(...),
    id: Optional[str] = Form(None)
):
    try:
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.get("credits", 0) < 1:
            raise HTTPException(status_code=403, detail="Insufficient credits")

        strategies = user.get("strategies", [])
        existing_strategy = None

        if id:
            existing_strategy = next(
                (s for s in strategies if s.get("id") == id),
                None
            )
            if not existing_strategy:
                raise HTTPException(status_code=404, detail="Strategy not found")

        # Generate strategy name only for NEW strategy
        name = existing_strategy["name"] if existing_strategy else None
        if not existing_strategy:
            res = openai_client.responses.create(
                model="gpt-4o-mini",
                input=[
                    {"role": "system", "content": "write a short simple name for algorithm trading, dont use "". "},
                    {"role": "user", "content": input},
                ],
            )
            name = res.output_text.strip()

        symbolres = openai_client.responses.create(
                model="gpt-4o-mini",
                input=[
                    {"role": "system", "content": (
                "Identify the single Crypto trading pair symbol from the user input. "
                "Format: SYMBOL/USDT (e.g., BTC/USDT, ETH/USDT, SOL/USDT). "
                "If no specific coin is mentioned, output 'BTC/USDT'. "
                "Output ONLY the symbol string. No explanation, no quotes, no markdown."
            )},
                    {"role": "user", "content": input},
                ],
            )
        symbol = symbolres.output_text.strip()

        amountres = openai_client.responses.create(
                model="gpt-4o-mini",
                input=[
                    {"role": "system", "content": (
                "Extract the trading amount in USDT from the user input. "
                "Rules:\n"
                "1. Output ONLY the number (e.g., 100.0).\n"
                "2. Remove any '$' or 'USDT' symbols.\n"
                "3. If no amount is found, output '100.0' as the default.\n"
                "4. No words, no punctuation, no explanations.\n"
                "\nExamples:\n"
                "Input: 'buy $500 of btc' -> Output: 500\n"
                "Input: 'trade with 100.0 usdt' -> Output: 100.0\n"
                "Input: 'start a strategy' -> Output: 100.0"
            )},
                    {"role": "user", "content": input},
                ],
            )
        raw_amount = amountres.output_text.strip()

        try:
          clean_amount = "".join(c for c in raw_amount if c.isdigit() or c == '.')
          amount = float(clean_amount) if clean_amount else 100.0
        except ValueError:
          amount = 100.0 # Final fallback if AI hallucinates text

        leverageres = openai_client.responses.create(
            model="gpt-4o-mini",
            input=[
                {"role": "system", "content": (
                    "Extract leverage from user input. Rules:\n"
                    "1. Output ONLY the integer (e.g., 5).\n"
                    "2. If no leverage is mentioned, output '1'.\n"
                    "3. Max limit is 20.\n"
                    "Examples: '10x leverage' -> 10, 'use 5 leverage' -> 5, 'no mention' -> 1"
                )},
                {"role": "user", "content": input},
            ],
        )
        try:
            leverage = int("".join(filter(str.isdigit, leverageres.output_text.strip())))
            leverage = min(max(leverage, 1), 20) # Keep between 1x and 20x
        except:
            leverage = 1

        takeProfitres = openai_client.responses.create(
                model="gpt-4o-mini",
                input=[
                    {
            "role": "system", 
            "content": (
                "Extract Take Profit and convert to decimal. Output ONLY the number.\n"
                "Examples:\n"
                "Input: 'take profit 5%' -> Output: 0.05\n"
                "Input: 'tp at 10%' -> Output: 0.10\n"
                "Default: 0.05"
            )
            },
                    {"role": "user", "content": input},
                ],
            )
        take_profit = takeProfitres.output_text.strip()


        stopLossres = openai_client.responses.create(
                model="gpt-4o-mini",
                input=[
                    {
            "role": "system", 
            "content": (
                "Extract Stop Loss and convert to decimal. Output ONLY the number.\n"
                "Examples:\n"
                "Input: 'stop loss 3%' -> Output: 0.03\n"
                "Input: 'sl at 2.5%' -> Output: 0.025\n"
                "Default: 0.03"
            )
        },
                    {"role": "user", "content": input},
                ],
            )
        stop_loss = stopLossres.output_text.strip()

        if take_profit == 0: take_profit = 0.05
        if stop_loss == 0: stop_loss = 0.02

        timeframeres = openai_client.responses.create(
            model="gpt-4o-mini",
              input=[
              {"role": "system", "content": (
                   "Identify the trading timeframe from user input. "
                   "Valid options: '1m', '5m', '15m', '30m', '1h', '4h', '1d'. "
                   "If none mentioned, output '1h'. Output ONLY the string."
               )},
              {"role": "user", "content": input},
           ],
        )
        timeframe = timeframeres.output_text.strip()

        prompt = f"""
You are an expert Quant Architect. Generate a high-performance Python trading strategy.

STRICT TECHNICAL REQUIREMENTS:
1. VECTORIZED CALCULATIONS: Use pandas/numpy for all indicators and signal logic. NO 'for' loops or '.apply()'.
2. THE SIGNAL COLUMN: The function must create a new column 'signal' in the DataFrame 'df'. 
   - 1 for BUY
   - -1 for SELL
   - 0 for HOLD
3. DUAL-PURPOSE RETURN: 
   - For Backtesting: The 'signal' column must be populated for the entire history.
   - For Bot: The 'latest_signal' must be the string representation ("BUY", "SELL", or "HOLD") of the very last row.
4. DATA SAFETY: If the DataFrame is too short for indicators (e.g., < 200 rows for a 200 EMA), return [], "HOLD".

FUNCTION SIGNATURE:
def run_strategy(df):
    # logic here...
    return [], latest_signal

STRATEGY REQUEST:
{input}

EXAMPLE OF DUAL-MODE CODE:
def run_strategy(df):
    import numpy as np
    df = df.copy()
    # 1. Vectorized Indicators
    df['ema_200'] = df['close'].ewm(span=200).mean()
    df['rsi'] = ... # (Vectorized RSI logic)
    
    # 2. Vectorized Signal Logic (Fills the whole column for backtesting)
    df['signal'] = 0
    df.loc[(df['close'] > df['ema_200']) & (df['rsi'] < 30), 'signal'] = 1
    df.loc[(df['close'] < df['ema_200']) & (df['rsi'] > 70), 'signal'] = -1
    
    # 3. Live Bot Output
    if len(df) < 200: return [], "HOLD"
    last_val = df['signal'].iloc[-1]
    latest_signal = "BUY" if last_val == 1 else ("SELL" if last_val == -1 else "HOLD")
    
    return [], latest_signal
"""

        response = openai_client.responses.create(
            model="gpt-4o-mini",
            input=[
                {
                    "role": "system",
                    "content": "You are a professional quant trader and Python coder. Write fully working algorithmic trading strategies."
                },
                {"role": "user", "content": prompt},
            ],
        )

        result_text = response.output_text.strip()

        if existing_strategy:
            # UPDATE existing strategy
            users_collection.update_one(
                {
                    "email": email,
                    "strategies.id": id
                },
                {
                    "$set": {
                        "strategies.$.input": input,
                        "strategies.$.symbol": symbol,
                        "strategies.$.amount": amount,
                        "strategies.$.leverage": leverage,
                        "strategies.$.code": result_text,
                        "strategies.$.take_profit": take_profit,
                        "strategies.$.stop_loss": stop_loss,
                        "strategies.$.timeframe": timeframe,
                    }
                }
            )
        else:
            # CREATE new strategy
            strategy_doc = {
                "id": str(uuid4()),
                "input": input,
                "code": result_text,
                "name": name,
                "symbol": symbol,
                "amount": amount,
                "leverage": leverage,
                "take_profit": take_profit,
                "stop_loss": stop_loss,
                "timeframe": timeframe,
            }

            users_collection.update_one(
                {"email": email},
                {"$push": {"strategies": strategy_doc}}
            )

        # Deduct 1 credit
        users_collection.update_one(
            {"email": email},
            {"$inc": {"credits": -1}}
        )

        return {
            "status": "success"
        }

    except HTTPException:
        raise

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/autocomplete")
async def autocomplete(
    prompt: str = Form(...), 
    email: str = Form(...)
    ):
    try:
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.get("copilot", 0) < 1:
            raise HTTPException(status_code=403, detail="Insufficient copilot")

        response = openai_client.responses.create(
            model="gpt-4o-mini",
            input=[
                {
                    "role": "system",
                    "content": "You are a Crypto trading algo completion tool. Complete the user's sentence briefly. Only provide the   completion text. No conversational filler.if not mention this then add, symbol (ex. BTC/USDT, ETH/USDT), Leverage 1 to 100 max, Timeframe (ex.5m, 15min, 30min, 1hr) and amount like min $$100. if all this mention and strtegy logic is complete  then stop (dont reply)"
                },
                {"role": "user", "content": prompt},
            ],
        )
    
        suggestion =  response.output_text.strip()

        users_collection.update_one(
            {"email": email},
            {"$inc": {"copilot": -1}}
        )
        return {"suggestion": suggestion}

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))