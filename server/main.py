from fastapi import FastAPI, Body, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from db import users_collection
from lemon_webhook import router as lemon_webhook_router
from ai_assistent import router as ai_assistent_router
from backtest import router as backtest_router
from binance import router as binance_router
from algo import router as algo_router
from datetime import datetime

app = FastAPI()

# Allow CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://richacle.com","https://www.richacle.com", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# add routers
app.include_router(lemon_webhook_router)
app.include_router(ai_assistent_router)
app.include_router(backtest_router)
app.include_router(algo_router)
app.include_router(binance_router)

@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    return {"status": "OK"}

# Get user by email
@app.get("/user/{email}")
def get_user(email: str):
    user = users_collection.find_one({"email": email})
    if user:
        user["_id"] = str(user["_id"])
        return user
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/add-user")
def save_referral(email: str = Form(...)):

    # 1. Check if user exists with email
    user = users_collection.find_one({"email": email})
    
    if user:
        return {"message": "User already exists"}

    # 3. If user doesn't exist, insert as new user and give 3 aura
    user_data = {
        "email": email,
        "credits": 3,
        "backtest": 10,
        "copilot": 100,
        "plan": "FREE",
        "active": False,
    }

    users_collection.insert_one(user_data)
    return {"message": "User added successfully"}