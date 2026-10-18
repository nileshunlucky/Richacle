import os
import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
import hmac
import hashlib

router = APIRouter()

# Initialize Razorpay Client
razorpay_client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
)

@router.post("/api/subscription/create-razorpay")
async def razrpay(current_user = Depends(get_current_user)): # Replace with your auth dependency
    try:
        # Create subscription using your Plan ID
        subscription = razorpay_client.subscription.create({
            "plan_id": "plan_TpFoVEdskQkTmL",
            "customer_notify": 1,
            "total_count": 12,  # 12 months billing cycle
            "notes": {
                "userId": str(current_user.id)  # Maps webhook back to user
            }
        })

        return {
            "success": True,
            "subscriptionId": subscription["id"],
            "keyId": os.getenv("RAZORPAY_KEY_ID"),
            "userEmail": current_user.email,
            "userName": current_user.name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    body_bytes = await request.body()
    received_signature = request.headers.get("x-razorpay-signature")

    # Verify webhook signature for security
    expected_signature = hmac.new(
        os.getenv("RAZORPAY_WEBHOOK_SECRET").encode(),
        body_bytes,
        hashlib.sha256
    ).hexdigest()

    if expected_signature != received_signature:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_data = await request.json()
    event_type = event_data.get("event")

    if event_type in ["subscription.charged", "subscription.activated"]:
        sub_entity = event_data["payload"]["subscription"]["entity"]
        user_id = sub_entity["notes"]["userId"]

        # TODO: Update your database here to make user premium (e.g., isPremium = True)
        print(f"User {user_id} subscription successful!")

    return {"status": "ok"}