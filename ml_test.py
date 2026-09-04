from ai_agent import analyze_payment


test_payments = [

    {
        "amount": 85000,
        "payment_method": "CARD",
        "failure_reason": "authentication_failed",
        "previous_successful_payments": 1,
        "previous_failed_payments": 7
    },

    {
        "amount": 499,
        "payment_method": "UPI",
        "failure_reason": "bank_server_error",
        "previous_successful_payments": 15,
        "previous_failed_payments": 1
    },

    {
        "amount": 25000,
        "payment_method": "CARD",
        "failure_reason": "card_declined",
        "previous_successful_payments": 2,
        "previous_failed_payments": 6
    },

    {
        "amount": 799,
        "payment_method": "UPI",
        "failure_reason": "insufficient_funds",
        "previous_successful_payments": 18,
        "previous_failed_payments": 0
    }
]


for i, payment in enumerate(test_payments, 1):

    print(f"\n--- Test Payment {i} ---")

    result = analyze_payment(payment)

    print("Risk Score :", result["risk_score"])
    print("Risk Level :", result["risk_level"])
    print("Action     :", result["recommended_action"])
    print("Reason     :", result["reason"])