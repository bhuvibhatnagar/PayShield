# PayShield

### AI-powered decision engine for failed payments

A payment failure does not always mean the same thing.

A temporary bank outage may be worth retrying. An authentication failure may need an alternative payment method. A high-value transaction with repeated failures may need human review.

**PayShield analyzes a failed payment, estimates its risk, and recommends the safest next action.**

It combines a **Random Forest machine learning model** with **deterministic risk guardrails** to turn a failed transaction into an actionable decision:

```text
Failed Payment
      ↓
Transaction & Customer History
      ↓
ML Risk Analysis
      ↓
Risk Score + Risk Level
      ↓
Safety Guardrails
      ↓
Recommended Action
      ↓
RETRY / SEND PAYMENT LINK / ESCALATE
```

The key idea is simple:

> **Don't treat every failed payment the same way.**

---

## Why PayShield?

A simple payment-failure workflow may look like:

```text
Payment Failed → Retry
```

But blindly retrying every failed payment ignores the context behind the failure.

Consider three very different situations:

```text
₹499 UPI + Bank Server Error
→ probably temporary

₹75,000 Card + Authentication Failure
→ potentially high risk

Repeated Failures + Poor Payment History
→ requires additional caution
```

Treating all three cases identically can result in unnecessary retries, poor customer experience and inadequate handling of high-risk payment situations.

PayShield considers factors such as:

* How much money is involved
* Why the payment failed
* Which payment method was used
* How many payments the customer has successfully completed
* How many previous payments have failed
* The customer's historical failure rate
* The ML model's risk prediction

The system then combines the ML prediction with explicit safety rules before making its final recommendation.

This means PayShield is not just a **risk classifier**.

It is a **risk-aware action recommendation system**.

---

# What Does PayShield Actually Do?

The easiest way to understand the system is through different payment-failure scenarios.

## Scenario 1 — Temporary Bank Failure

A customer attempts a small UPI payment, but the bank server temporarily fails.

```text
Amount: ₹499
Payment Method: UPI
Failure Reason: bank_server_error
Previous Successful Payments: 15
Previous Failed Payments: 1
```

This transaction has several reassuring signals:

* Low transaction value
* Strong previous payment history
* Very few previous failures
* Failure originated from a temporary bank/server condition

The system can therefore treat the transaction as retryable.

```text
Risk: LOW
Reason: Temporary bank/server failure with strong payment history
Recommended Action: RETRY
```

### Why?

A server-side failure does not necessarily indicate a risky customer or transaction.

Immediately escalating this transaction would introduce unnecessary friction.

A retry is the more appropriate action.

---

## Scenario 2 — High-Value Authentication Failure

Now consider a very different payment:

```text
Amount: ₹75,000
Payment Method: CARD
Failure Reason: authentication_failed
Previous Successful Payments: 1
Previous Failed Payments: 7
```

Several warning signals appear together:

* High transaction amount
* Authentication failure
* Very few previous successful payments
* Multiple previous failed payments

Even if the machine-learning prediction alone does not produce the highest possible risk classification, PayShield's deterministic guardrails can recognize the combination:

```text
High Value + Authentication Failure
```

and force the safer decision.

```text
Risk: HIGH
Recommended Action: ESCALATE
```

### Why?

Automatically retrying a high-value authentication failure is much less desirable than retrying a temporary bank outage.

This is exactly why PayShield does not allow the ML model to have unrestricted authority over the final action.

---

## Scenario 3 — Repeated Customer Failures

Consider a customer with a poor historical payment pattern.

```text
Amount: ₹25,000
Payment Method: CARD
Failure Reason: card_declined
Previous Successful Payments: 2
Previous Failed Payments: 6
```

The system calculates the customer's historical failure rate:

```text
Failure Rate
= Failed Payments / Total Previous Payments

= 6 / (6 + 2)

= 75%
```

A high historical failure rate increases the risk associated with the transaction.

```text
Risk: HIGH
Reason: High historical failure rate
Recommended Action: ESCALATE
```

### Why?

One failed payment can be temporary.

A repeated pattern of failures provides additional context that should influence the decision.

PayShield therefore evaluates both the **current transaction** and the **customer's previous payment behaviour**.

---

## Scenario 4 — Alternative Payment Route

Not every transaction needs to be retried or escalated.

Some failures may fall into a medium-risk region where repeating the same payment attempt is not ideal, but escalation is unnecessary.

For these situations PayShield can recommend:

```text
SEND PAYMENT LINK
```

The customer can then attempt payment through an alternative route instead of repeatedly retrying the same failed transaction.

This creates three levels of intervention:

| Situation                             | Recommended Response |
| ------------------------------------- | -------------------- |
| Temporary / low-risk failure          | `RETRY`              |
| Alternative payment route appropriate | `SEND PAYMENT LINK`  |
| High-risk situation                   | `ESCALATE`           |

The goal is therefore not simply:

> "Is this transaction risky?"

PayShield tries to answer the more useful question:

> **"Given the risk and context, what should happen next?"**

---

# Live Demo

**Frontend:**
https://payshield-tau.vercel.app/

**Backend API:**
https://payshield-backend-1cyj.onrender.com

The frontend provides:

* Demo failed transactions
* One-click risk analysis
* Risk score and risk level
* Recommended action
* Explanation of the decision
* Custom CSV upload for batch testing

Uploaded CSV transactions are analyzed in **simulation mode** and do not trigger real payment actions.

---

# System Architecture

```text
                         PayShield
                            |
              ┌─────────────┴─────────────┐
              ↓                           ↓
        React Frontend              FastAPI Backend
          (Vercel)                     (Render)
                                          |
                            ┌─────────────┴─────────────┐
                            ↓                           ↓
                     Random Forest              Risk Guardrails
                        Model                  Deterministic Rules
                            |                           |
                            └─────────────┬─────────────┘
                                          ↓
                                    Final Decision
                                          |
                              ┌───────────┼───────────┐
                              ↓           ↓           ↓
                           RETRY     PAYMENT LINK   ESCALATE
                                          |
                                          ↓
                                      MySQL
                                      (Aiven)
```

---

# Decision Pipeline

## 1. Transaction Data

The system receives information about the failed payment and the customer's previous payment history.

Relevant attributes include:

* Transaction amount
* Payment method
* Failure reason
* Previous successful payments
* Previous failed payments
* Historical failure rate

---

## 2. Machine Learning Analysis

A Random Forest classifier evaluates the transaction.

Categorical variables such as:

```text
payment_method
failure_reason
```

are encoded using `OneHotEncoder`.

Numerical variables such as:

```text
amount
previous_successful_payments
previous_failed_payments
failure_rate
```

are passed to the classifier.

The model produces probabilities across the three risk classes.

These probabilities are used by the application to derive a risk score.

---

## 3. Risk Classification

PayShield represents risk using both a numerical score and a categorical risk level.

| Risk Score | Risk Level |
| ---------: | ---------- |
|       0–29 | LOW        |
|      30–69 | MEDIUM     |
|     70–100 | HIGH       |

This makes the model output easier to interpret in the application.

---

## 4. Safety Guardrails

The ML prediction is **not blindly trusted**.

Machine-learning models are probabilistic. Certain payment conditions should have predictable safety behaviour even if the model is uncertain.

PayShield therefore applies deterministic rules after ML analysis.

Examples include:

* HIGH risk scores trigger escalation.
* High-value transactions combined with authentication failures trigger escalation.
* High historical failure rates can trigger escalation.
* Bank/server failures are treated as retryable conditions.

The guardrails provide an explicit safety layer over the predictive model.

---

## 5. Action Recommendation

The final decision is one of three actions:

| Action              | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `RETRY`             | Attempt the payment again when the failure is likely temporary |
| `SEND PAYMENT LINK` | Provide an alternative payment route                           |
| `ESCALATE`          | Flag a higher-risk transaction for additional review           |

---

# Machine Learning

## Dataset

PayShield was developed using a dataset containing **100,000 synthetic payment records**.

It is important to distinguish between the total dataset and the records actually used for evaluation.

The complete dataset was split into:

```text
Total Synthetic Dataset: 100,000 records

Training Set:              80,000 records
Held-Out Test Set:         20,000 records
```

Therefore:

> **The model was trained on 80,000 records and evaluated on 20,000 previously unseen held-out records.**

PayShield does **not** claim that all 100,000 records were used for testing.

The synthetic dataset was generated specifically for model development and does not contain real customer payment information.

---

## Train-Test Methodology

The dataset was divided using:

```python
train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)
```

This creates an **80/20 train-test split**.

`stratify=y` helps preserve the relative distribution of LOW, MEDIUM and HIGH risk classes across the training and test sets.

The model learns from the **80,000-record training set**.

Performance metrics are then calculated independently using the **20,000-record held-out test set**.

This means the reported accuracy, precision, recall, F1-score and confusion matrix below are based on records that were not used to fit the model.

---

## Model Features

The model evaluates:

```text
amount
payment_method
failure_reason
previous_successful_payments
previous_failed_payments
failure_rate
```

Target variable:

```text
risk_level
```

Possible classes:

```text
LOW
MEDIUM
HIGH
```

---

## Why Random Forest?

PayShield uses a `RandomForestClassifier`.

The model was configured with:

```text
Number of Trees: 200
Maximum Depth: 12
Class Weight: balanced
Random State: 42
```

Random Forest was chosen because the problem contains a mixture of:

* Numerical transaction features
* Categorical payment information
* Non-linear relationships between risk factors

It also provides class probabilities that can be used by the application when deriving the transaction's risk score.

Using `class_weight="balanced"` helps reduce the impact of class imbalance during training.

---

# Held-Out Model Evaluation

The following results come **only from the 20,000-record held-out test set**, not from the full 100,000-record dataset.

## Overall Test Accuracy

```text
94.05%
```

The classifier correctly predicted approximately 94% of the previously unseen test records.

Accuracy alone, however, is not sufficient for a defensive risk system.

For PayShield, **precision, recall and false positives are particularly important**.

---

## Classification Report

| Risk Level  | Precision | Recall |            F1-Score | Test Records |
| ----------- | --------: | -----: | ------------------: | -----------: |
| HIGH        |       86% |    95% |                 91% |        2,627 |
| MEDIUM      |       91% |    90% |                 90% |        6,267 |
| LOW         |       98% |    96% |                 97% |       11,106 |
| **Overall** |         — |      — | **94.05% Accuracy** |   **20,000** |

### HIGH-Risk Performance

The HIGH-risk class is particularly important because missing a genuinely high-risk transaction can be more serious than introducing some additional review.

There were:

```text
2,627 actual HIGH-risk transactions
```

PayShield correctly identified:

```text
2,499 as HIGH
```

while:

```text
128 were classified as MEDIUM
0 were classified as LOW
```

This produced:

```text
HIGH Precision: 86%
HIGH Recall:    95%
HIGH F1-Score:  91%
```

A **95% HIGH-risk recall** means the model successfully detected approximately 95% of the HIGH-risk records present in the held-out test set.

---

# Confusion Matrix

The exact confusion matrix from the **20,000 unseen test records** was:

| Actual / Predicted |      HIGH |    MEDIUM |        LOW |
| ------------------ | --------: | --------: | ---------: |
| **HIGH**           | **2,499** |       128 |          0 |
| **MEDIUM**         |       394 | **5,658** |        215 |
| **LOW**            |         0 |       454 | **10,652** |

The diagonal values represent correct predictions.

For example:

```text
Actual HIGH → Predicted HIGH
2,499 transactions
```

were correctly detected.

The matrix also exposes the model's mistakes rather than hiding them behind a single accuracy number.

---

# False-Positive Analysis

For PayShield, an important false-positive case is:

```text
Transaction is actually NOT HIGH
            ↓
Model predicts HIGH
            ↓
Transaction may be unnecessarily escalated
```

From the held-out test set:

```text
Actual MEDIUM → Predicted HIGH: 394
Actual LOW    → Predicted HIGH:   0
                                   ───
Total HIGH False Positives:       394
```

The number of transactions that were actually non-HIGH was:

```text
6,267 MEDIUM
+
11,106 LOW
=
17,373 non-HIGH transactions
```

Therefore:

```text
HIGH False-Positive Rate

394 / 17,373 × 100

≈ 2.27%
```

### Result

**HIGH-risk false-positive rate: approximately 2.27%.**

This means PayShield prioritizes strong HIGH-risk detection while keeping unnecessary HIGH-risk classifications relatively limited on the held-out dataset.

---

# False-Positive Cost

A false positive is not free.

If a transaction is incorrectly classified as HIGH and escalated, it may create:

* Additional manual review
* Operational workload
* Customer friction
* Slower payment resolution

The real monetary cost of such a review depends on the merchant's actual operational process, which is not available in this prototype.

Therefore PayShield does **not** claim an invented real-world merchant cost.

Instead, the project uses a clearly labelled illustrative assumption to demonstrate how false-positive cost can be quantified.

### Illustrative Assumption

Assume:

```text
Operational cost per unnecessary manual review = ₹100
```

With:

```text
394 HIGH false positives
```

the estimated review cost would be:

```text
394 × ₹100

= ₹39,400
```

### Illustrative False-Positive Cost

**₹39,400 across the 20,000-record held-out test set.**

The ₹100 review cost is an explicit modelling assumption.

It is **not claimed to be Razorpay's actual review cost or the measured cost of any real merchant**.

In a production deployment, the same calculation could be replaced with the merchant's real operational cost per review.

---

# Understanding the Trade-Off

For a defensive risk system, there is a trade-off between:

```text
Missing risky transactions
          vs
Escalating safe transactions unnecessarily
```

PayShield's held-out results show:

```text
Actual HIGH transactions:          2,627
Correctly detected HIGH:           2,499
HIGH missed as MEDIUM:               128
HIGH missed as LOW:                    0

HIGH false positives:                394
HIGH false-positive rate:          2.27%
```

The model therefore achieves **95% recall for HIGH-risk transactions**, while the measured HIGH false-positive rate is approximately **2.27%**.

This trade-off is explicitly measured rather than hidden.

---

# ML + Rules: A Hybrid Decision System

A core design decision in PayShield is that the machine-learning model does **not** make the final decision on its own.

```text
              Machine Learning
                     +
            Deterministic Rules
                     ↓
             Final Risk Decision
                     ↓
          Recommended Action
```

## Why not let ML decide everything?

A machine-learning prediction is probabilistic.

Suppose the model evaluates:

```text
Amount: ₹75,000
Failure Reason: authentication_failed
```

and does not assign the transaction to the highest-risk class.

From a safety perspective, the application may still want this combination to be escalated.

A deterministic guardrail can therefore override the probabilistic prediction:

```text
IF amount >= ₹50,000
AND failure_reason = authentication_failed

THEN
Risk Level = HIGH
Action = ESCALATE
```

The ML model provides the **predictive component**.

The guardrails provide **explicit safety constraints**.

The action engine turns the combined result into an operational recommendation.

This gives PayShield a hybrid architecture:

```text
ML Prediction
      ↓
Risk Assessment
      ↓
Safety Guardrails
      ↓
Final Decision
      ↓
RETRY / PAYMENT LINK / ESCALATE
```

---

# CSV Batch Testing

PayShield supports testing custom transactions through CSV upload.

Required columns include:

```text
payment_id
customer_id
amount
payment_method
status
failure_reason
previous_successful_payments
previous_failed_payments
```

Example:

```csv
payment_id,customer_id,amount,payment_method,status,failure_reason,previous_successful_payments,previous_failed_payments
test_001,cust_01,499,UPI,failed,bank_server_error,14,2
test_002,cust_02,75000,CARD,failed,authentication_failed,1,7
test_003,cust_03,25000,CARD,failed,card_declined,2,6
```

Each row is analyzed independently.

Custom CSV transactions are processed through:

```http
POST /analyze-custom
```

in **simulation mode**.

They do not trigger real payment actions.

This allows evaluators to test multiple payment scenarios without affecting the stored transaction flow.

---

# API

## Health Check

```http
GET /
```

Returns backend status.

---

## Get Demo Payments

```http
GET /payments
```

Returns failed transactions available for the demo.

---

## Analyze Stored Payment

```http
POST /analyze/{payment_id}
```

Fetches a stored transaction, performs ML analysis, applies guardrails and returns the recommended action.

---

## Analyze Custom Payment

```http
POST /analyze-custom
```

Analyzes a custom transaction without executing a real payment action.

This endpoint powers CSV-based simulation.

---

## Payment Failure Webhook

```http
POST /webhook/payment-failed
```

Accepts a failed-payment event and sends it through the risk-analysis workflow.

---

# Tech Stack

## Frontend

* React
* Vite
* JavaScript
* CSS

Deployment: **Vercel**

## Backend

* Python
* FastAPI
* Uvicorn
* Pydantic

Deployment: **Render**

## Machine Learning

* Scikit-learn
* Random Forest
* Pandas
* Joblib

## Database

* MySQL
* Aiven

## AI Integration

* Google Gemini API

---

# Project Structure

```text
PayShield/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── actions.py
├── ai_agent.py
├── database.py
├── main.py
├── generate_data.py
├── train_model.py
├── ml_test.py
├── test_webhook.py
├── webhook_test.py
├── risk_model.pkl
├── requirements.txt
├── .gitignore
├── .env.example
└── README.md
```

---

# Running Locally

## 1. Clone the Repository

```bash
git clone https://github.com/bhuvibhatnagar/PayShield.git
cd PayShield
```

## 2. Set Up the Backend

Create a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
DB_HOST=your_mysql_host
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=ai_risk_manager

GEMINI_API_KEY=your_gemini_api_key
```

Never commit `.env` or expose credentials publicly.

---

## 4. Start the Backend

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

---

## 5. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# Security & Defensive Scope

Credentials are provided through environment variables and intentionally excluded from the repository.

The following should never be committed:

* `.env`
* Database passwords
* API keys
* Local database dumps

The local database dump is excluded through `.gitignore`.

PayShield is designed strictly as a **defensive payment-risk analysis system**.

It analyzes failed-payment conditions and recommends safer next actions. It does not provide offensive fraud capabilities.

---

# Project Context

PayShield was developed for the **Razorpay Buildathon — AI Risk Manager track**.

The project focuses on a practical payment-risk problem:

> How should a failed transaction be handled when different failures carry different levels of risk?

The system approaches that problem through:

```text
Payment Failure
      ↓
Understand Transaction Context
      ↓
Predict Risk with Machine Learning
      ↓
Apply Deterministic Safety Guardrails
      ↓
Recommend the Safest Next Action
```

The project demonstrates:

* A working defensive risk detector
* Machine-learning based risk classification
* 100,000-record synthetic development dataset
* 80,000-record model training set
* 20,000-record held-out evaluation set
* Precision, recall and F1-score reporting
* Confusion-matrix analysis
* False-positive measurement
* Explicit false-positive cost modelling
* Deterministic safety guardrails
* Action recommendation
* Live frontend and backend deployment
* CSV-based batch simulation

---

# Evaluation Summary

| Metric                            |            Result |
| --------------------------------- | ----------------: |
| Total Synthetic Dataset           |           100,000 |
| Records Used for Training         |            80,000 |
| Records Used for Held-Out Testing |            20,000 |
| Test Accuracy                     |        **94.05%** |
| HIGH Precision                    |           **86%** |
| HIGH Recall                       |           **95%** |
| HIGH F1-Score                     |           **91%** |
| Correctly Detected HIGH           | **2,499 / 2,627** |
| HIGH → MEDIUM Errors              |           **128** |
| HIGH → LOW Errors                 |             **0** |
| HIGH False Positives              |           **394** |
| HIGH False-Positive Rate          |         **2.27%** |
| Illustrative Review Cost          |       **₹39,400** |

> **All reported model-performance metrics are calculated on the 20,000-record held-out test set. The 100,000 figure refers to the complete synthetic development dataset, not the evaluation set.**

---

> **Know the risk before you move the money.**
