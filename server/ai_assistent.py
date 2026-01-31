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
                   "If none mentioned, output '1m'. Output ONLY the string."
               )},
              {"role": "user", "content": input},
           ],
        )
        timeframe = timeframeres.output_text.strip()

        prompt = f"""
You are a professional Quant Coder. Generate a Python function for a LONG-ONLY trading strategy.

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

USER STRATEGY REQUEST:
{input}
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
                "llm": "ChatGPT",
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
        if not user or user.get("copilot", 0) < 1:
            raise HTTPException(status_code=403, detail="Credits exhausted or user not found")

        # System prompt with clear "Before/After" logic
        system_instruction = (
            "You are a Crypto Trading Algo Autocomplete engine. "
            "Your task is to COMPLETE the user's sentence. "
            "IMPORTANT: Do NOT repeat what the user has already typed. "
            "Provide ONLY the remaining text needed to make a valid strategy. "
            "Elements to include if missing: Indicator (EMA, SMA, etc.), Symbol (BTC/USDT), "
            "Leverage (max 100x), Timeframe (5m, 1h), and Amount (min $100). "
            "If the strategy is already complete, return an empty string."
        )

        # Few-shot examples to 'prime' the model's behavior
        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": "Buy BTC when"},
            {"role": "assistant", "content": " EMA 20 crosses above EMA 50 on 15m timeframe with 10x leverage and $500 amount."},
            {"role": "user", "content": "Sell ETH/USDT 20x leverage"},
            {"role": "assistant", "content": " on 1hr timeframe when RSI is above 70 for $200."},
            {"role": "user", "content": prompt} # The actual user input
        ]

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.2, # Lower temperature for more predictable completions
            max_tokens=50,
            presence_penalty=0.0,
            frequency_penalty=0.0
        )
    
        suggestion = response.choices[0].message.content.strip()

        # Only deduct credit if a suggestion was actually provided
        if suggestion:
            users_collection.update_one(
                {"email": email},
                {"$inc": {"copilot": -1}}
            )
        
        return {"suggestion": suggestion}

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/api/update-llm")
async def llmupdate(
    email: str = Form(...),
    strategyId: str = Form(...), 
    llm: str = Form(...), 
):
    try:
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=403, detail="user not found")

        users_collection.update_one(
        {"email": email, "strategies.id": strategyId},
        {
            "$set": {
                "strategies.$.llm": llm,
            },
        }
        )
        
        return {"status": "llm updated"}

    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/api/duplicate")
async def duplicate(
    email: str = Form(...),
    strategyId: str = Form(...), 
):
    try:
        # 1. Find the user
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        strategies = user.get("strategies", [])
        user_plan = user.get("plan", "FREE").upper() # Normalize to uppercase
        
        # Define limits
        max_limit = 7 if user_plan == "PRO" else 1

        # 2. Limit Check
        duplicate_count = sum(1 for s in strategies if s.get("duplicate") == strategyId)

        if duplicate_count >= max_limit:
            if user_plan == "FREE":
                raise HTTPException(
                    status_code=403, 
                    detail="FREE plan allows only 1 comparison. Upgrade to PRO for 7 slots!"
                )
            else:
                raise HTTPException(
                    status_code=403, 
                    detail="Maximum of 7 comparison reached for this strategy."
                )

        # 3. Extract the original strategy
        original_strategy = next((s for s in strategies if s.get("id") == strategyId), None)
        if not original_strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")

        # 4. Create the clone
        new_strategy = original_strategy.copy()
        new_strategy.update({
            "id": str(uuid4()),
            "name": f"{original_strategy.get('name', 'Strategy')}",
            "status": "stopped",
            "duplicate": strategyId,
            "live_pnl": 0,
            "demo_pnl": 0,
            "loss_reasons": [],
            "last_error": ""
        })

        # 5. Save to Database
        result = users_collection.update_one(
            {"email": email},
            {"$push": {"strategies": new_strategy}}
        )

        return {"status": "success"}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal Server Error")