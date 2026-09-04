# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

from database import get_db_connection

from ai_agent import (
    get_payment,
    analyze_payment,
    apply_risk_guardrails,
    execute_action,
    save_risk_assessment
)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://payshield-tau.vercel.app"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Payment(BaseModel):
    payment_id: str
    customer_id: str
    amount: float
    payment_method: str
    status: str
    failure_reason: str
    previous_successful_payments: int
    previous_failed_payments: int


@app.get("/")
def home():
    return {
        "message": "AI Risk Manager is running!"
    }


@app.post("/payments")
def create_payment(payment: Payment):

    connection = get_db_connection()
    cursor = connection.cursor()

    query = """
    INSERT INTO transactions
    (
        payment_id,
        customer_id,
        amount,
        payment_method,
        status,
        failure_reason,
        previous_successful_payments,
        previous_failed_payments
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """

    values = (
        payment.payment_id,
        payment.customer_id,
        payment.amount,
        payment.payment_method,
        payment.status,
        payment.failure_reason,
        payment.previous_successful_payments,
        payment.previous_failed_payments
    )

    cursor.execute(query, values)
    connection.commit()

    cursor.close()
    connection.close()

    return {
        "message": "Payment received and stored successfully",
        "payment": payment
    }


@app.post("/analyze/{payment_id}")
def analyze_transaction(payment_id: str):

    payment = get_payment(payment_id)

    if not payment:
        return {
            "error": "Payment not found"
        }

    risk_analysis = analyze_payment(payment)

    risk_analysis = apply_risk_guardrails(
        payment,
        risk_analysis
    )

    action = risk_analysis["recommended_action"]

    action_result = execute_action(
        payment["payment_id"],
        action
    )

    save_risk_assessment(
        payment["payment_id"],
        risk_analysis,
        action_result
    )

    return {
        "payment": payment,
        "risk_analysis": risk_analysis,
        "action_result": action_result
    }


class PaymentFailedWebhook(BaseModel):
    event: str
    payment_id: str

@app.get("/payments")
def get_all_payments():

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
    SELECT
        payment_id,
        customer_id,
        amount,
        status,
        failure_reason,
        created_at,
        payment_method,
        previous_successful_payments,
        previous_failed_payments
    FROM transactions
    WHERE payment_id IN (
        'pay_1001',
        'pay_1002',
        'pay_1003',
        'pay_1004',
        'pay_1005',
        'pay_1006',
        'pay_1007',
        'pay_1008'
    )
    ORDER BY created_at DESC
    """

    cursor.execute(query)
    payments = cursor.fetchall()

    cursor.close()
    connection.close()

    return {
        "payments": payments
    }


@app.post("/webhook/payment-failed")
def payment_failed_webhook(webhook: PaymentFailedWebhook):

    if webhook.event != "payment.failed":
        return {
            "status": "ERROR",
            "message": "Invalid event type"
        }

    payment = get_payment(webhook.payment_id)

    if not payment:
        return {
            "status": "ERROR",
            "message": "Payment not found"
        }

    risk_analysis = analyze_payment(payment)

    risk_analysis = apply_risk_guardrails(
        payment,
        risk_analysis
    )

    action = risk_analysis["recommended_action"]

    action_result = execute_action(
        payment["payment_id"],
        action
    )

    save_risk_assessment(
        payment["payment_id"],
        risk_analysis,
        action_result
    )

    return {
        "event": webhook.event,
        "payment": payment,
        "risk_analysis": risk_analysis,
        "action_result": action_result
    }


@app.post("/analyze-custom")
def analyze_custom_payment(payment: Payment):

    payment_data = payment.model_dump()

    # Run ML analysis
    risk_analysis = analyze_payment(payment_data)

    # Apply safety guardrails
    risk_analysis = apply_risk_guardrails(
        payment_data,
        risk_analysis
    )

    # Recommended action
    action = risk_analysis["recommended_action"]

    # Custom uploads are simulation-only.
    # No real payment action is executed.
    action_result = {
        "action": action,
        "status": "SIMULATED",
        "message": f"PayShield recommends: {action}"
    }

    return {
        "payment": payment_data,
        "risk_analysis": risk_analysis,
        "action_result": action_result
    }