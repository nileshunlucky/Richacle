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
import random
import re

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

def generate_unique_username(email: str, collection) -> str:
    # Extract the part before the '@'
    base_username = email.split("@")[0].lower()
    # Remove any character that isn't a letter, number, or underscore
    base_username = re.sub(r"[^a-z0-9_]", "", base_username)
    
    username = base_username
    # Loop to ensure the username is unique in the DB
    while collection.find_one({"username": username}):
        # If it exists, append a random 3-digit number and check again
        username = f"{base_username}{random.randint(100, 999)}"
        
    return username

def generate_name_from_email(email: str) -> str:
    # Extract the part before the '@'
    raw_name = email.split("@")[0]
    # Replace common separators with spaces
    clean_name = re.sub(r"[._-]", " ", raw_name)
    # Capitalize words (e.g., "john status" -> "John Status")
    return clean_name.title()


@app.post("/add-user")
def save_referral(email: str = Form(...)):
    # 1. Check if user exists with email
    user = users_collection.find_one({"email": email})
    
    if user:
        return {"message": "User already exists"}

    # 2. Generate unique username and a clean name
    username = generate_unique_username(email, users_collection)
    name = generate_name_from_email(email)

    # 3. Insert as new user
    user_data = {
        "email": email,
        "name": name,
        "username": username,
        "credits": 5,
    }

    users_collection.insert_one(user_data)
    
    return {
        "message": "User added successfully", 
        "data": {
            "name": name,
            "username": username
        }
    }

@app.get("/users-full")
def get_users_full():

    try:
        # Fetch all users with all fields
        users = list(users_collection.find({}))

        # Convert ObjectId to string for JSON serialization
        for user in users:
            if '_id' in user and hasattr(user['_id'], '__str__'):
                user['_id'] = str(user['_id'])
        return users

    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching user data")