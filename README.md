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

Most payment failure handling is built around simple rules such as:

```text
Payment failed → Retry
```

That approach ignores important context.

PayShield considers factors such as:

* How much money is involved
* Why the payment failed
* Which payment method was used
* How many payments the customer has successfully completed
* How many previous payments have failed
* The customer's historical failure rate
* The ML model's risk prediction

The system then combines the ML prediction with explicit safety rules before making its final recommendation.

This means PayShield is not just a **risk classifier**. It is an **action recommendation system**.

---

## What Does PayShield Actually Do?

Consider a few examples.

### Example 1 — Temporary Failure

A customer attempts a ₹499 payment and the bank server returns an error.

```text
Risk: Low
Reason: Bank/server failure may be temporary
Action: RETRY
```

### Example 2 — Authentication Failure

A customer attempts a ₹75,000 payment and authentication fails.

```text
Risk: High
Reason: High transaction value + authentication failure
Action: ESCALATE
```

### Example 3 — Repeated Customer Failures

A customer has very few successful payments and a large number of previous failures.

```text
Risk: High
Reason: High historical failure rate
Action: ESCALATE
```

The point is not simply to predict whether a payment is risky. The system tries to determine **what should happen next**.

---

## Live Demo

**Frontend:** https://payshield-tau.vercel.app/

**Backend API:** https://payshield-backend-1cyj.onrender.com

The frontend provides:

* Demo failed transactions
* One-click risk analysis
* Risk score and risk level
* Recommended action
* Explanation of the decision
* Custom CSV upload for testing

Uploaded CSV transactions are analyzed in simulation mode and do not trigger real payment actions.

---

## System Architecture

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

## Decision Pipeline

### 1. Transaction Data

The system receives information about the failed payment and the customer's previous payment history.

Relevant attributes include:

* Transaction amount
* Payment method
* Failure reason
* Previous successful payments
* Previous failed payments
* Historical failure rate

### 2. Machine Learning Analysis

A Random Forest classifier evaluates the transaction and produces a probability distribution across risk classes.

The probabilities are converted into a risk score from 0 to 100.

### 3. Risk Classification

| Risk Score | Risk Level |
| ---------- | ---------- |
| 0–29       | LOW        |
| 30–69      | MEDIUM     |
| 70–100     | HIGH       |

### 4. Safety Guardrails

The ML prediction is not blindly trusted.

PayShield applies deterministic rules after the model prediction to handle important safety conditions.

For example:

* High-risk transactions are escalated.
* High-value transactions combined with authentication failures are escalated.
* A high historical failure rate can trigger escalation.
* Bank/server failures are treated as retryable conditions.

### 5. Action Recommendation

The final system decision is one of:

| Action              | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `RETRY`             | Attempt the payment again when the failure may be temporary |
| `SEND PAYMENT LINK` | Provide the customer with an alternative payment route      |
| `ESCALATE`          | Flag the transaction for further review                     |

---

## Machine Learning

PayShield uses a **Random Forest classifier** trained on approximately **10,000 synthetic payment records**.

The training dataset contains transaction and customer-history attributes such as:

* Amount
* Payment method
* Failure reason
* Previous successful payments
* Previous failed payments
* Historical failure rate

The synthetic dataset was generated specifically for model training and does not contain real customer payment information.

The trained model is stored in:

```text
risk_model.pkl
```

and loaded by the backend using Joblib.

### Why Random Forest?

Random Forest was chosen because it works well with a mixture of numerical and categorical transaction features and provides probability estimates that can be used to derive a risk score.

---

## ML + Rules: A Hybrid Decision System

A core design decision in PayShield is that the machine learning model does **not** make the final decision on its own.

```text
                 Machine Learning
                       +
              Deterministic Rules
                       ↓
               Final Risk Decision
```

The ML model provides the predictive component, while guardrails provide explicit safety constraints.

This makes the system easier to reason about for high-risk situations where a predefined rule should take priority over a model prediction.

---

## API

### Health Check

```http
GET /
```

Returns the backend status.

### Get Demo Payments

```http
GET /payments
```

Returns the failed transactions available for the demo.

### Analyze Payment

```http
POST /analyze/{payment_id}
```

Fetches a transaction from the database, runs the ML analysis, applies guardrails, and generates the recommended action.

### Analyze Custom Payment

```http
POST /analyze-custom
```

Analyzes a custom transaction without executing a real payment action.

This endpoint powers the CSV testing feature.

### Payment Failure Webhook

```http
POST /webhook/payment-failed
```

Accepts a payment failure event and sends it through the risk analysis workflow.

---

## CSV Testing

PayShield supports testing custom transactions through CSV upload.

Required columns:

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
test_002,cust_02,75000,UPI,failed,authentication_failed,18,3
```

Custom transactions are processed through `/analyze-custom` in **simulation mode**. They are not inserted into the production transaction flow and do not trigger real payment actions.

---

## Tech Stack

### Frontend

* React
* Vite
* JavaScript
* CSS

### Backend

* Python
* FastAPI
* Uvicorn
* Pydantic

### Machine Learning

* Scikit-learn
* Random Forest
* Pandas
* Joblib

### Database

* MySQL
* Aiven

### Deployment

* Vercel — Frontend
* Render — Backend
* Aiven — Database

---

## Project Structure

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

## Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/bhuvibhatnagar/PayShield.git
cd PayShield
```

### 2. Set up the backend

Create a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

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

### 4. Start the backend

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

### 5. Start the frontend

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

## Security

Credentials are provided through environment variables and are intentionally excluded from the repository.

The following should never be committed:

* `.env`
* Database passwords
* API keys
* Local database dumps

The local database dump is excluded through `.gitignore`.

---

## Project Context

PayShield was developed for the **Razorpay Buildathon**.

The project focuses on a practical problem in digital payments: deciding how to handle a failed transaction using both predictive analysis and explicit safety controls.

The central idea is:

```text
Payment Failure
      ↓
Understand the Context
      ↓
Predict the Risk
      ↓
Apply Safety Guardrails
      ↓
Recommend the Next Action
```

> **Know the risk before you move the money.**
