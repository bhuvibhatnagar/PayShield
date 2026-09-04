
from database import get_db_connection

import joblib
import pandas as pd

from actions import (
    retry_payment,
    send_payment_link,
    escalate_payment
)


# Load trained ML model
model = joblib.load("risk_model.pkl")


# =========================================================
# GET PAYMENT
# =========================================================

def get_payment(payment_id):

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
        SELECT
            payment_id,
            customer_id,
            amount,
            payment_method,
            status,
            failure_reason,
            previous_successful_payments,
            previous_failed_payments
        FROM transactions
        WHERE payment_id = %s
    """

    cursor.execute(query, (payment_id,))

    payment = cursor.fetchone()

    cursor.close()
    connection.close()

    return payment


# =========================================================
# ANALYZE PAYMENT
# =========================================================

def analyze_payment(payment):

    """
    ML-powered AI Risk Agent.

    Uses the trained Random Forest model to predict
    payment risk based on transaction signals.
    """

    successful = payment["previous_successful_payments"]
    failed = payment["previous_failed_payments"]

    total_attempts = successful + failed

    if total_attempts > 0:
        failure_rate = (failed / total_attempts) * 100
    else:
        failure_rate = 0


    # -----------------------------------------------------
    # Prepare Features
    # -----------------------------------------------------

    input_data = pd.DataFrame([{
        "amount": float(payment["amount"]),
        "payment_method": payment["payment_method"],
        "failure_reason": payment["failure_reason"],
        "previous_successful_payments": successful,
        "previous_failed_payments": failed,
        "failure_rate": failure_rate
    }])


    # -----------------------------------------------------
    # ML Prediction
    # -----------------------------------------------------

    prediction = model.predict(input_data)[0]

    probabilities = model.predict_proba(input_data)[0]

    classes = model.classes_

    probability_map = dict(
        zip(classes, probabilities)
    )


    # -----------------------------------------------------
    # ML Confidence
    # -----------------------------------------------------

    low_probability = probability_map.get("LOW", 0)
    medium_probability = probability_map.get("MEDIUM", 0)
    high_probability = probability_map.get("HIGH", 0)

    model_confidence = round(
        probability_map[prediction] * 100,
        2
    )


    # -----------------------------------------------------
    # Risk Score
    # -----------------------------------------------------

    risk_score = round(
        (high_probability * 100)
        + (medium_probability * 50)
    )

    risk_score = max(0, min(100, risk_score))


    # -----------------------------------------------------
    # Risk Level
    # -----------------------------------------------------

    if risk_score >= 70:
        risk_level = "HIGH"

    elif risk_score >= 30:
        risk_level = "MEDIUM"

    else:
        risk_level = "LOW"


    # -----------------------------------------------------
    # Recovery Action
    # -----------------------------------------------------

    failure_reason = payment["failure_reason"]

    if risk_level == "HIGH":

        recommended_action = "ESCALATE"

    elif failure_reason == "bank_server_error":

        recommended_action = "RETRY"

    elif failure_reason in [
        "authentication_failed",
        "insufficient_funds",
        "card_declined"
    ]:

        recommended_action = "SEND_PAYMENT_LINK"

    else:

        recommended_action = "RETRY"


    # =====================================================
    # DETAILED EXPLANATION
    # =====================================================

    explanation_points = []


    # -----------------------------------------------------
    # Customer Payment History
    # -----------------------------------------------------

    if total_attempts == 0:

        explanation_points.append(
            "No previous payment history is available for this customer."
        )

    elif failure_rate >= 50:

        explanation_points.append(
            f"The customer has a high historical failure rate of "
            f"{failure_rate:.1f}% "
            f"({failed} failed out of {total_attempts} attempts)."
        )

    elif failure_rate >= 30:

        explanation_points.append(
            f"The customer has a moderate historical failure rate of "
            f"{failure_rate:.1f}%."
        )

    else:

        explanation_points.append(
            f"The customer has a relatively stable payment history with a "
            f"{failure_rate:.1f}% historical failure rate."
        )


    # -----------------------------------------------------
    # Transaction Amount
    # -----------------------------------------------------

    amount = float(payment["amount"])

    if amount >= 50000:

        explanation_points.append(
            f"The transaction amount is high at ₹{amount:,.2f}."
        )

    elif amount >= 10000:

        explanation_points.append(
            f"The transaction amount is moderately high at ₹{amount:,.2f}."
        )

    else:

        explanation_points.append(
            f"The transaction amount is relatively low at ₹{amount:,.2f}."
        )


    # -----------------------------------------------------
    # Failure Reason
    # -----------------------------------------------------

    if failure_reason == "authentication_failed":

        explanation_points.append(
            "The payment failed because authentication could not be completed."
        )

    elif failure_reason == "insufficient_funds":

        explanation_points.append(
            "The payment failed because sufficient funds were not available."
        )

    elif failure_reason == "card_declined":

        explanation_points.append(
            "The payment was declined by the payment method."
        )

    elif failure_reason == "bank_server_error":

        explanation_points.append(
            "The payment failed because of a bank/server error, "
            "which is generally treated as a temporary failure."
        )

    else:

        explanation_points.append(
            f"The payment failed with reason: {failure_reason}."
        )


    # -----------------------------------------------------
    # ML Prediction Explanation
    # -----------------------------------------------------

    explanation_points.append(
        f"The Random Forest model classified this transaction as "
        f"{prediction} risk with "
        f"{model_confidence:.1f}% model confidence."
    )


    # Combine explanation
    reason = " ".join(explanation_points)


    # =====================================================
    # ML DECISION TRACE
    # =====================================================

    ml_prediction = prediction

    ml_confidence = round(
        probability_map[ml_prediction] * 100,
        2
    )


    # =====================================================
    # FINAL RESULT
    # =====================================================

    return {

        "risk_score": risk_score,

        "risk_level": risk_level,

        "recommended_action": recommended_action,

        "reason": reason,

        "ml_prediction": ml_prediction,

        "ml_confidence": ml_confidence,

        "guardrail_triggered": False,

        "guardrail_reason": None,

        "decision_source": "ML_MODEL"
    }


# =========================================================
# SAVE RISK ASSESSMENT
# =========================================================

def save_risk_assessment(
    payment_id,
    risk_analysis,
    action_result
):

    connection = get_db_connection()
    cursor = connection.cursor()

    query = """
        INSERT INTO risk_assessments
        (
            payment_id,
            risk_score,
            risk_level,
            recommended_action,
            reason,
            action_status
        )
        VALUES (%s, %s, %s, %s, %s, %s)
    """

    values = (

        payment_id,

        risk_analysis["risk_score"],

        risk_analysis["risk_level"],

        risk_analysis["recommended_action"],

        risk_analysis["reason"],

        action_result["status"]
    )

    cursor.execute(query, values)

    connection.commit()

    cursor.close()
    connection.close()


# =========================================================
# RISK GUARDRAILS
# =========================================================

def apply_risk_guardrails(
    payment,
    risk_analysis
):

    risk_score = risk_analysis["risk_score"]

    total_attempts = (
        payment["previous_successful_payments"]
        + payment["previous_failed_payments"]
    )


    # Calculate historical failure rate
    if total_attempts > 0:

        failure_rate = (
            payment["previous_failed_payments"]
            / total_attempts
        ) * 100

    else:

        failure_rate = 0


    # Store original ML decision
    original_ml_level = risk_analysis["risk_level"]

    original_ml_action = risk_analysis["recommended_action"]

    guardrail_reason = None


    # -----------------------------------------------------
    # Guardrail 1
    # Very High ML Risk
    # -----------------------------------------------------

    if risk_score >= 70:

        risk_analysis["risk_level"] = "HIGH"

        risk_analysis["recommended_action"] = "ESCALATE"

        guardrail_reason = (
            "ML risk score is 70 or higher"
        )


    # -----------------------------------------------------
    # Guardrail 2
    # High Value + Authentication Failure
    # -----------------------------------------------------

    elif (
        payment["amount"] >= 50000
        and payment["failure_reason"] == "authentication_failed"
    ):

        risk_analysis["risk_level"] = "HIGH"

        risk_analysis["recommended_action"] = "ESCALATE"

        guardrail_reason = (
            "High-value transaction with authentication failure"
        )


    # -----------------------------------------------------
    # Guardrail 3
    # High Historical Failure Rate
    # -----------------------------------------------------

    elif (
        failure_rate >= 50
        and payment["failure_reason"] != "bank_server_error"
    ):

        risk_analysis["risk_level"] = "HIGH"

        risk_analysis["recommended_action"] = "ESCALATE"

        guardrail_reason = (
            f"Historical failure rate is very high "
            f"({failure_rate:.2f}%)"
        )


    # -----------------------------------------------------
    # Guardrail 4
    # Temporary Bank Error
    # -----------------------------------------------------

    elif payment["failure_reason"] == "bank_server_error":

        risk_analysis["recommended_action"] = "RETRY"

        guardrail_reason = (
            "Bank server error is treated as a temporary failure"
        )


    # -----------------------------------------------------
    # Record Guardrail Decision
    # -----------------------------------------------------

    if guardrail_reason:

        risk_analysis["guardrail_triggered"] = True

        risk_analysis["guardrail_reason"] = guardrail_reason

        risk_analysis["decision_source"] = "GUARDRAIL"

    else:

        risk_analysis["guardrail_triggered"] = False

        risk_analysis["guardrail_reason"] = None

        risk_analysis["decision_source"] = "ML_MODEL"


    # -----------------------------------------------------
    # Store Original ML Decision
    # -----------------------------------------------------

    risk_analysis["ml_risk_level"] = original_ml_level

    risk_analysis["ml_recommended_action"] = original_ml_action


    return risk_analysis


# =========================================================
# EXECUTE ACTION
# =========================================================

def execute_action(payment_id, action):

    if action == "RETRY":

        return retry_payment(payment_id)

    elif action == "SEND_PAYMENT_LINK":

        return send_payment_link(payment_id)

    elif action == "ESCALATE":

        return escalate_payment(payment_id)

    else:

        return {
            "action": action,
            "status": "FAILED",
            "message": "Unknown action"
        }

