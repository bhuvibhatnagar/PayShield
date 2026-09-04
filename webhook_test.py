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

    try:
        response = requests.post(url, json=payload)

        print("Status Code:", response.status_code)

        if response.status_code != 200:
            print("Error:", response.text)
            continue

        result = response.json()

        print(
            "Risk:",
            result["risk_analysis"]["risk_level"],
            "| Score:",
            result["risk_analysis"]["risk_score"],
            "| Action:",
            result["risk_analysis"]["recommended_action"]
        )

    except Exception as e:
        print("Error:", e)

    time.sleep(1)