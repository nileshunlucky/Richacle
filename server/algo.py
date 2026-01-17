import docker
import uuid
import traceback
from fastapi import APIRouter, HTTPException, Form
from pydantic import BaseModel
import ccxt
from db import users_collection

router = APIRouter()
# Initialize docker client once
try:
    client = docker.from_env()
except Exception:
    client = None # Fallback for local dev environments without Docker


# 1. Define the schema
class DeployRequest(BaseModel):
    email: str
    strategyId: str
    mode: str

@router.post("/api/deploy")
async def deploy(request: DeployRequest):

    email = request.email
    strategyId = request.strategyId
    mode = request.mode
    # 1. Find user and specific strategy in one go
    user = users_collection.find_one({"email": email})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # --- PLAN VALIDATION START ---
    user_plan = user.get("plan", "FREE").upper()
    
    # 1. Block FREE users immediately
    if user_plan == "FREE":
        raise HTTPException(
            status_code=403, 
            detail="Deployment not allowed on FREE plan. Please upgrade to PRO or PREMIUM."
        )

    engine = user.get("engine", False)
    if not engine:
        raise HTTPException(status_code=403, detail="Engine is OFF")

    # 2. Count currently running strategies
    # This assumes your strategies list items have a "status" field
    running_count = sum(1 for s in user.get("strategies", []) if s.get("status") == "running")

    # 3. Apply Limits
    limits = {"PRO": 3, "PREMIUM": 24}
    max_allowed = limits.get(user_plan, 0) # Default to 0 if plan is unknown

    if running_count >= max_allowed:
        raise HTTPException(
            status_code=403, 
            detail=f"Limit reached. {user_plan} plan allows max {max_allowed} active deployments."
        )
    # --- PLAN VALIDATION END ---

    strategy = next((s for s in user.get("strategies", []) if s.get("id") == strategyId), None)

    # Prevent duplicate deployment of the same strategy
    if strategy.get("status") == "running":
        raise HTTPException(status_code=400, detail="This strategy is already running.")

    if not strategy or not strategy.get("code"):
        raise HTTPException(status_code=400, detail="Strategy not found or code is empty")

    binance = user.get("binance", {})
    api_key = binance.get("apiKey")
    api_secret = binance.get("apiSecret")
    
    if not api_key or not api_secret:
        raise HTTPException(status_code=403, detail="Binance API keys missing in profile")

    if not client:
        print("Docker engine is not available")
        raise HTTPException(status_code=500, detail="Docker engine is not available")

    try:
        # 3. Docker Deployment
        unique_name = f"bot_{strategyId[:8]}_{uuid.uuid4().hex[:4]}"
        
        container = client.containers.run(
            image="trading-bot-runner:latest",
            name=unique_name,
            detach=True,
            mem_limit="300m",       # Hard limit: 300MB RAM
            mem_reservation="200m",  # Soft limit: 100MB RAM
            cpu_period=100000,
            cpu_quota=10000,         # Limit to 10% of a CPU core
            restart_policy={"Name": "on-failure", "MaximumRetryCount": 5},
            environment={
                "PYTHONUNBUFFERED": "1",
                "EMAIL": email,
                "BINANCE_API_KEY": api_key,
                "BINANCE_API_SECRET": api_secret,
                "MODE": mode,
                "STRATEGY_ID": strategyId,
                "STRATEGY_CODE": strategy["code"],
                "SYMBOL": strategy["symbol"],
                "AMOUNT": strategy["amount"],
                "LEVERAGE": strategy["leverage"],
                "STOP_LOSS": strategy["stop_loss"],
                "TAKE_PROFIT": strategy["take_profit"],
                "TIMEFRAME": strategy["timeframe"],
            }
        )

        # 4. Update Database
        users_collection.update_one(
            {"email": email, "strategies.id": strategyId},
            {"$set": {
                "strategies.$.container_id": container.id,
                "strategies.$.mode": mode,
                "strategies.$.status": "running",
            }}
        )
        
        return {"status": "success", "container_id": container.id}

    except Exception as e:
        traceback.print_exc()
        print("Docker Error:", {str(e)})
        raise HTTPException(status_code=500, detail=f"Docker Error: {str(e)}")

@router.post("/api/stop")
async def stop_bot(email: str = Form(...), strategyId: str = Form(...)):
    user = users_collection.find_one(
        {"email": email, "strategies.id": strategyId},
    )
    
    if not user or "container_id" not in user["strategies"][0]:
        raise HTTPException(status_code=404, detail="No active container found for this strategy")

    container_id = user["strategies"][0]["container_id"]

    try:
        # Get and stop container
        container = client.containers.get(container_id)
        container.stop(timeout=5)
        container.remove()
    except docker.errors.NotFound:
        pass # Already gone
    except Exception as e:
        print(f"Stop error: {e}")

    # Update DB regardless of whether container existed (to keep UI in sync)
    users_collection.update_one(
        {"email": email, "strategies.id": strategyId},
        {
            "$set": {"strategies.$.status": "stopped"},
            "$unset": {
            "strategies.$.container_id": "",
            "strategies.$.error_at": "",
            "strategies.$.last_error": ""
        }
        }
    )
    
    return {"status": "stopped"}


@router.post("/api/squareoff")
async def stop_and_square_off(email: str = Form(...), strategyId: str = Form(...)):
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find the strategy in the list
    strategy = next((s for s in user.get("strategies", []) if s["id"] == strategyId), None)
    
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    # 1. SQUARE OFF LOGIC (CCXT)
    binance = user.get("binance", {})
    api_key = binance.get("apiKey")
    api_secret = binance.get("apiSecret")

    if api_key and api_secret:
        try:
            # Initialize exchange
            exchange = ccxt.binance({
                'apiKey': api_key,
                'secret': api_secret,
                'options': {'defaultType': 'future'}
            })

            is_paper = strategy.get("mode", "PAPER") == "PAPER" 
            if is_paper:
                exchange.enable_demo_trading(True)
                print("Closing PAPER positions...")
            else:
                print("Closing LIVE positions...")

            # Fetch all positions with a balance
            positions = exchange.fetch_positions()
            
            for pos in positions:
                symbol = pos['symbol']
                size = float(pos['contracts']) # 'contracts' is the amount in CCXT
                
                if size != 0:
                    # Opposite side to close
                    side = 'sell' if size > 0 else 'buy'
                    # Execute Market Order to close
                    exchange.create_market_order(
                        symbol=symbol,
                        side=side,
                        amount=abs(size),
                        params={'reduceOnly': True} # Ensure it only closes
                    )
                    print(f"Squared off {symbol}: {size}")

        except Exception as e:
            print(f"Square off error (proceeding to stop container): {e}")
            # We continue even if square off fails to ensure the container is killed

    # 2. DOCKER STOP LOGIC
    container_id = strategy.get("container_id")
    if container_id:
        try:
            container = client.containers.get(container_id)
            container.stop(timeout=2)
            container.remove()
        except Exception as e:
            print(f"Docker stop error: {e}")

    # 3. DATABASE UPDATE
    users_collection.update_one(
        {"email": email, "strategies.id": strategyId},
        {
            "$set": {"strategies.$.status": "stopped",
                "strategies.$.paper_pos": 0,    # Reset these!
                "strategies.$.paper_entry": 0,
                "strategies.$.live_pos": 0,
                "strategies.$.live_entry": 0
            },
            "$unset": {
            "strategies.$.container_id": "",
            "strategies.$.error_at": "",
            "strategies.$.last_error": ""
        }
        }
    )
    
    return {"status": "success", "message": "Position squared off and bot stopped"}