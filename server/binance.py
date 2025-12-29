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

    try:
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        api = {
                "apiKey": apiKey,
                "apiSecret": apiSecret,
            }

        users_collection.update_one(
            {"email": email},
            {"$set": {"binance": api}}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Binance api failed: {str(e)}\n{traceback.format_exc()}"
        )

@router.post("/api/terminal")
async def set_terminal(
    email: str = Form(...),
    toggle: bool = Form(...)
):
    try:
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # If turning ON → must verify Binance keys exist
        if toggle is True:
            binance = user.get("binance", {})
            api_key = binance.get("apiKey")
            api_secret = binance.get("apiSecret")

            if not api_key or not api_secret:
                raise HTTPException(status_code=403, detail="Binance API keys missing")

            # Turn terminal ON only
            users_collection.update_one(
                {"email": email},
                {"$set": {"terminal": True}}
            )
        
        else:
            # If terminal is turned OFF → also force engine OFF
            users_collection.update_one(
                {"email": email},
                {"$set": {
                    "terminal": False,
                    "engine": False
                }}
            )

        return {"status": "ok"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



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
