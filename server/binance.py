from fastapi import APIRouter, HTTPException, Form
from pydantic import BaseModel
import pandas as pd
import ccxt
import traceback
from db import users_collection

router = APIRouter()

@router.post("/api/balance")
async def get_balance(email: str = Form(...)):
    # 1. Get user and API keys from DB
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    binance_creds = user.get("binance")
    if not binance_creds or not binance_creds.get("apiKey"):
        raise HTTPException(status_code=400, detail="Binance API keys not configured")

    try:
        # 2. Initialize exchange
        exchange = ccxt.binance({
            'apiKey': binance_creds.get("apiKey"),
            'secret': binance_creds.get("apiSecret"),
            'enableRateLimit': True,
            'options': {'defaultType': 'future'},
        })

        if binance_creds.get("demo"):
            exchange.enable_demo_trading(True)

        # 3. Fetch Balance
        balance = exchange.fetch_balance()
        
        # USDT Balance Details
        usdt_data = balance.get('USDT', {})
        total_wallet_balance = usdt_data.get('total', 0.0)  # Cash in wallet
        available_balance = usdt_data.get('free', 0.0)     # Cash not tied up in margin

        # 4. Calculate Equity (Wallet Balance + Unrealized PnL)
        # Binance returns 'totalMarginBalance' in the info object for Futures
        equity = float(balance.get('info', {}).get('totalMarginBalance', total_wallet_balance))
        unrealized_pnl = equity - total_wallet_balance

        return {
            "status": "success",
            "wallet_balance": round(total_wallet_balance, 2),
            "available_balance": round(available_balance, 2),
            "equity": round(equity, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "currency": "USDT"
        }

    except ccxt.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid API keys stored in database")
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Exchange error: {str(e)}")

@router.post("/api/binance")
async def autocomplete(
    email: str = Form(...),
    apiKey: str = Form(...), 
    apiSecret: str = Form(...), 
    isDemo: bool = Form(...), 
):
    # 1. Initialize the Binance client
    exchange = ccxt.binance({
        'apiKey': apiKey,
        'secret': apiSecret,
        'enableRateLimit': True,
        'options': {'defaultType': 'future'},
    })

    if isDemo:
        exchange.enable_demo_trading(True)

    try:
        # 2. Validate credentials by calling a private endpoint
        # fetch_balance() requires a valid signature
        exchange.fetch_balance()
        
    except ccxt.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid Binance API Key or Secret")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not connect to Binance: {str(e)}")

    # 3. If validation passes, proceed to database update
    try:
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        users_collection.update_one(
            {"email": email},
            {
                "$set": {
                    "binance": {
                        "apiKey": apiKey, 
                        "apiSecret": apiSecret,
                        "demo": isDemo
                    },
                    "terminal": True
                }
            }
        )
        return {"status": "success", "message": "API keys validated and saved"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database update failed")

@router.post("/api/engine")
async def set_engine(
    email: str = Form(...),
    toggle: bool = Form(...)
):
    try:
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        terminal = user.get("terminal", False)

        # Block engine ON if terminal is OFF
        if toggle is True and terminal is not True:
            raise HTTPException(status_code=403, detail="Terminal must be ON before enabling engine")

        users_collection.update_one(
            {"email": email},
            {"$set": {"engine": toggle}}
        )

        return {"status": "ok"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
