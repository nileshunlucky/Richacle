from fastapi import APIRouter, HTTPException, Form
from pydantic import BaseModel
import pandas as pd
import ccxt
import traceback
from db import users_collection

router = APIRouter()

@router.post("/api/binance")
async def autocomplete(
    email: str = Form(...),
    apiKey: str = Form(...), 
    apiSecret: str = Form(...), 
):
    # 1. Initialize the Binance client
    exchange = ccxt.binance({
        'apiKey': apiKey,
        'secret': apiSecret,
        'enableRateLimit': True,
    })

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
                        "apiSecret": apiSecret
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
