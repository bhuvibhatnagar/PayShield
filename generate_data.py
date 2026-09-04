import random
from database import get_db_connection


NUM_RECORDS = 100000
NUM_CUSTOMERS = 20000

failure_reasons = [
    "insufficient_funds",
    "card_declined",
    "network_error",
    "bank_server_error",
    "authentication_failed"
]

payment_methods = [
    "UPI",
    "CARD",
    "NETBANKING"
]


# --------------------------------------------------
# CREATE CUSTOMER PROFILES
# --------------------------------------------------

customers = {}

for i in range(1000, 1000 + NUM_CUSTOMERS):

    # Different customers have different behavior
    profile = random.random()

    if profile < 0.60:
        # Normal/good customer
        successful = random.randint(5, 30)
        failed = random.randint(0, 5)

    elif profile < 0.90:
        # Moderate-risk customer
        successful = random.randint(2, 15)
        failed = random.randint(3, 10)

    else:
        # High-risk customer
        successful = random.randint(0, 10)
        failed = random.randint(8, 25)

    customers[f"cust_{i}"] = {
        "successful": successful,
        "failed": failed
    }


# --------------------------------------------------
# GENERATE AMOUNT
# --------------------------------------------------

def generate_amount():

    r = random.random()

    if r < 0.45:
        return random.choice([
            199, 299, 399, 499, 799, 999
        ])

    elif r < 0.75:
        return random.choice([
            1299, 1999, 2499, 3499, 4999
        ])

    elif r < 0.93:
        return random.choice([
            5000, 7500, 10000, 15000, 25000
        ])

    else:
        return random.choice([
            35000, 50000, 75000, 100000, 150000
        ])


# --------------------------------------------------
# GENERATE FAILURE REASON
# --------------------------------------------------

def generate_failure_reason(amount):

    r = random.random()

    if amount >= 50000 and r < 0.35:
        return "authentication_failed"

    if r < 0.08:
        return "bank_server_error"

    elif r < 0.20:
        return "network_error"

    elif r < 0.48:
        return "insufficient_funds"

    elif r < 0.78:
        return "card_declined"

    else:
        return "authentication_failed"


# --------------------------------------------------
# CALCULATE RISK LABEL
# --------------------------------------------------

def calculate_risk(
    amount,
    payment_method,
    failure_reason,
    successful,
    failed
):

    total_attempts = successful + failed

    if total_attempts > 0:
        failure_rate = (failed / total_attempts) * 100
    else:
        failure_rate = 0

    risk = 0


    # -----------------------------
    # Transaction amount
    # -----------------------------

    if amount >= 100000:
        risk += 35

    elif amount >= 75000:
        risk += 30

    elif amount >= 50000:
        risk += 25

    elif amount >= 25000:
        risk += 18

    elif amount >= 10000:
        risk += 10


    # -----------------------------
    # Customer failure rate
    # -----------------------------

    if failure_rate >= 70:
        risk += 35

    elif failure_rate >= 50:
        risk += 27

    elif failure_rate >= 30:
        risk += 18

    elif failure_rate >= 15:
        risk += 8


    # -----------------------------
    # Failure reason
    # -----------------------------

    if failure_reason == "authentication_failed":

        risk += 22

    elif failure_reason == "card_declined":

        risk += 16

    elif failure_reason == "insufficient_funds":

        risk += 12

    elif failure_reason == "network_error":

        risk += 5

    elif failure_reason == "bank_server_error":

        risk += 2


    # -----------------------------
    # Payment method
    # -----------------------------

    if payment_method == "CARD":

        risk += 3

    elif payment_method == "NETBANKING":

        risk += 2


    # -----------------------------
    # Customer history
    # -----------------------------

    if successful >= 20:

        risk -= 12

    elif successful >= 10:

        risk -= 6


    if failed >= 10:

        risk += 12

    elif failed >= 5:

        risk += 5


    # -----------------------------
    # Important combinations
    # -----------------------------

    # High-value authentication failure
    if (
        amount >= 50000
        and failure_reason == "authentication_failed"
    ):

        risk += 15


    # High-value transaction from
    # customer with many failures

    if (
        amount >= 25000
        and failure_rate >= 50
    ):

        risk += 15


    # Repeated authentication failures

    if (
        failure_reason == "authentication_failed"
        and failed >= 5
    ):

        risk += 10


    # -----------------------------
    # Small randomness
    # -----------------------------

    risk += random.randint(-5, 5)

    risk = max(0, min(100, risk))


    # -----------------------------
    # Risk label
    # -----------------------------

    if risk >= 60:

        return "HIGH"

    elif risk >= 30:

        return "MEDIUM"

    else:

        return "LOW"


# --------------------------------------------------
# DATABASE
# --------------------------------------------------

connection = get_db_connection()
cursor = connection.cursor()


# --------------------------------------------------
# GENERATE DATA
# --------------------------------------------------

customer_ids = list(customers.keys())


for i in range(1, NUM_RECORDS + 1):

    customer_id = random.choice(customer_ids)

    customer = customers[customer_id]

    successful = customer["successful"]
    failed = customer["failed"]

    amount = generate_amount()

    payment_method = random.choice(payment_methods)

    failure_reason = generate_failure_reason(amount)

    total_attempts = successful + failed

    if total_attempts > 0:

        failure_rate = (
            failed / total_attempts
        ) * 100

    else:

        failure_rate = 0


    risk_level = calculate_risk(
        amount,
        payment_method,
        failure_reason,
        successful,
        failed
    )


    query = """
        INSERT INTO ml_training_data
        (
            amount,
            payment_method,
            failure_reason,
            previous_successful_payments,
            previous_failed_payments,
            failure_rate,
            risk_level
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """


    values = (
        amount,
        payment_method,
        failure_reason,
        successful,
        failed,
        failure_rate,
        risk_level
    )


    cursor.execute(query, values)


    if i % 5000 == 0:

        connection.commit()

        print(
            f"{i} records generated..."
        )


connection.commit()

cursor.close()
connection.close()


print()
print("======================================")
print("100,000 realistic ML records created")
print("======================================")