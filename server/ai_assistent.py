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
                "1. Output ONLY the number (e.g., 100.5).\n"
                "2. Remove any '$' or 'USDT' symbols.\n"
                "3. If no amount is found, output '25.0' as the default.\n"
                "4. No words, no punctuation, no explanations.\n"
                "\nExamples:\n"
                "Input: 'buy $500 of btc' -> Output: 500\n"
                "Input: 'trade with 25.5 usdt' -> Output: 25.5\n"
                "Input: 'start a strategy' -> Output: 25.0"
            )},
                    {"role": "user", "content": input},
                ],
            )
        raw_amount = amountres.output_text.strip()

        try:
          clean_amount = "".join(c for c in raw_amount if c.isdigit() or c == '.')
          amount = float(clean_amount) if clean_amount else 25.0
        except ValueError:
          amount = 25.0 # Final fallback if AI hallucinates text

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
                "Default: 0.02"
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

        prompt = """
You are a code generator, not a chat assistant.
Your output will be executed directly by Python without modification.

STRICT OUTPUT CONTRACT:
- Output ONLY valid Python code.
- Output ONLY ONE function named run_strategy(df).
- Output must start with: def run_strategy(df):
- Output must end with: return trades, latest_signal
- NEVER use markdown, backticks, or code fences.
- DO NOT include imports, comments, prints, or explanations.
- Indicator imports (like pandas as pd) are handled by the environment.
- You may use 'pd' for pandas and 'np' for numpy. 

DATA:
df columns = ['timestamp','open','high','low','close','volume']

RULES:
1. LONG only strategy. Use a variable `open_trade = None` to track state.
2. Calculate indicators (SMA, RSI, etc.) using 'df' and append them as columns to 'df'.
3. Loop through `range(len(df))` to simulate trades.
4. Inside the loop:
   - If `open_trade` is None: Check the Entry condition. If met, set `open_trade = {'entry_price': current_price, 'qty': 1}`.
   - If `open_trade` is NOT None: Check the Exit condition. If met, add 'exit_price', append to `trades`, and set `open_trade = None`.
5. Identify 'latest_signal': If the last candle meets the entry condition, "BUY". If it meets the exit condition, "SELL". Otherwise, "HOLD".
6. After the loop: If `open_trade` is still not None, close it using the last available 'close' price and append to `trades`.

USER REQUEST:
[[USER_INPUT]]

PREVIOUS CONTEXT:
[[CONTEXT]]
""".replace("[[USER_INPUT]]", input).replace("[[CONTEXT]]", str(existing_strategy.get("code") if existing_strategy else "None"))

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
                    "content": "You are a Crypto trading algo completion tool. Complete the user's sentence briefly. Only provide the   completion text. No conversational filler."
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