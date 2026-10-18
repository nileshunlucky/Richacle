import os
import json
import hmac
import hashlib
from datetime import datetime, timezone

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request

from db import users_collection
from auth import get_current_user  # adjust to your actual module

router = APIRouter()

razorpay_client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
)

RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET")

# Map Razorpay plan IDs to your plans/credits (same tiers as Lemon Squeezy)
PLANS = {
    "plan_TpFoVEdskQkTmL": {"plan": "Starter", "credits": 1000},
}


def _get(user, key):
    """Works whether current_user is a dict or an object."""
    return user.get(key) if isinstance(user, dict) else getattr(user, key, None)


@router.post("/api/subscription/create-razorpay")
async def razrpay(current_user=Depends(get_current_user)):
    email = _get(current_user, "email")
    if not email:
        raise HTTPException(status_code=400, detail="User email not found")

    plan_id = "plan_TpFoVEdskQkTmL"

    try:
        subscription = razorpay_client.subscription.create({
            "plan_id": plan_id,
            "customer_notify": 1,
            "total_count": 12,
            "notes": {"email": email},  # used by webhook to find the user
        })

        # Save the subscription ID on the user (status stays pending until webhook)
        users_collection.update_one(
            {"email": email},
            {"$set": {
                "razorpay_subscription_id": subscription["id"],
                "subscription_status": "created",
            }},
        )

        return {
            "success": True,
            "subscriptionId": subscription["id"],
            "keyId": os.getenv("RAZORPAY_KEY_ID"),
            "userEmail": email,
            "userName": _get(current_user, "name"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    body_bytes = await request.body()
    received_signature = request.headers.get("x-razorpay-signature")

    if not RAZORPAY_WEBHOOK_SECRET or not received_signature:
        raise HTTPException(status_code=400, detail="Missing signature or secret")

    expected_signature = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode(), body_bytes, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, received_signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    payload = json.loads(body_bytes)
    event = payload.get("event")

    sub = payload.get("payload", {}).get("subscription", {}).get("entity")
    if not sub:
        return {"status": "info", "message": f"Event '{event}' ignored."}

    subscription_id = sub.get("id")
    plan_id = sub.get("plan_id")
    email = (sub.get("notes") or {}).get("email")

    # Find user by email from notes, fall back to stored subscription id
    query = {"email": email} if email else {"razorpay_subscription_id": subscription_id}
    user = users_collection.find_one(query)
    if not user:
        return {"status": "error", "message": "User not found."}

    now = datetime.now(timezone.utc)

    # Activated or renewed: grant plan and (re)set credits
    if event in ("subscription.activated", "subscription.charged"):
        plan = PLANS.get(plan_id)
        if not plan:
            return {"status": "error", "message": f"Unknown plan id: {plan_id}"}

        update = {
            "subscription_status": "active",
            "razorpay_subscription_id": subscription_id,
            "razorpay_plan_id": plan_id,
            "credits": plan["credits"],
            "plan": plan["plan"],
            "active": True,
        }
        if event == "subscription.activated":
            update["subscription_started_at"] = now

        users_collection.update_one({"_id": user["_id"]}, {"$set": update})
        return {"status": "success", "message": "Subscription active, credits granted."}

    # User or admin cancelled
    elif event == "subscription.cancelled":
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "subscription_status": "cancelled",
                    "subscription_cancelled_at": now,
                    "credits": 0,
                    "plan": "Free",
                    "active": False,
                },
                "$unset": {"razorpay_plan_id": ""},
            },
        )
        return {"status": "success", "message": "Subscription cancelled."}

    # Payment retries exhausted, or billing cycles finished
    elif event in ("subscription.halted", "subscription.completed"):
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "subscription_status": "expired",
                    "subscription_expired_at": now,
                    "credits": 0,
                    "plan": "Free",
                    "active": False,
                },
                "$unset": {"razorpay_plan_id": ""},
            },
        )
        return {"status": "success", "message": "Subscription expired."}

    return {"status": "info", "message": f"Event '{event}' received but not handled."}