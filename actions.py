def retry_payment(payment_id):
    print(f"Retrying payment {payment_id}...")
    
    return {
        "action": "RETRY",
        "status": "SUCCESS",
        "message": f"Payment {payment_id} retry initiated."
    }


def send_payment_link(payment_id):
    print(f"Sending payment link for {payment_id}...")
    
    return {
        "action": "SEND_PAYMENT_LINK",
        "status": "SUCCESS",
        "message": f"Payment link sent for {payment_id}."
    }


def escalate_payment(payment_id):
    print(f"Escalating payment {payment_id}...")
    
    return {
        "action": "ESCALATE",
        "status": "ESCALATED",
        "message": f"Payment {payment_id} sent for manual review."
    }