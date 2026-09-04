import requests
import time

url = "http://127.0.0.1:8000/webhook/payment-failed"

payment_ids = [
    "pay_1001",
    "pay_1002",
    "pay_1003",
    "pay_1004",
    "pay_1005",
    "pay_1006",
    "pay_1007",
    "pay_1008"
]

for payment_id in payment_ids:

    payload = {
        "event": "payment.failed",
        "payment_id": payment_id
    }

    print(f"\nProcessing {payment_id}...")

    response = requests.post(url, json=payload)

    print("Status Code:", response.status_code)

    if response.status_code == 200:

        result = response.json()

        risk = result["risk_analysis"]

        print(
            "Risk:",
            risk["risk_level"],
            "| Score:",
            risk["risk_score"],
            "| Action:",
            risk["recommended_action"]
        )

        print(
            "ML Prediction:",
            risk.get("ml_prediction"),
            "| ML Confidence:",
            risk.get("ml_confidence"),
            "%"
        )

        print(
            "Decision Source:",
            risk.get("decision_source")
        )

        print(
            "Guardrail Triggered:",
            risk.get("guardrail_triggered")
        )

        if risk.get("guardrail_reason"):
            print(
                "Guardrail Reason:",
                risk["guardrail_reason"]
            )

        print(
            "Reason:",
            risk["reason"]
        )

    else:

        print("Error:", response.text)

    time.sleep(1)