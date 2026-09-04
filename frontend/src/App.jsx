
import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "https://payshield-backend-1cyj.onrender.com";

function App() {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [result, setResult] = useState(null);

  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const [error, setError] = useState("");

  const [uploadedResults, setUploadedResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [selectedUploadedResult, setSelectedUploadedResult] =
    useState(null);


  // =========================================================
  // LOAD DEMO PAYMENTS
  // =========================================================

  useEffect(() => {
    loadPayments();
  }, []);


  const loadPayments = async () => {
    try {
      setLoadingPayments(true);

      const response = await fetch(`${API}/payments`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Unable to load payments.");
      }

      setPayments(data.payments || []);

    } catch (err) {

      console.error(err);

      setError(
        "Could not connect to PayShield. Make sure FastAPI is running."
      );

    } finally {

      setLoadingPayments(false);

    }
  };


  // =========================================================
  // ANALYZE DEMO PAYMENT
  // =========================================================

  const analyzePayment = async (paymentId) => {

    try {

      setSelectedPayment(paymentId);
      setLoadingAnalysis(true);
      setError("");
      setResult(null);

      const response = await fetch(
        `${API}/analyze/${paymentId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(
          data.error || "Unable to analyze payment."
        );
      }

      setResult(data);

      setTimeout(() => {

        document
          .getElementById("analysis-result")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

      }, 150);

    } catch (err) {

      console.error(err);
      setError(err.message);

    } finally {

      setLoadingAnalysis(false);

    }
  };


  // =========================================================
  // ANALYZE UPLOADED CSV
  // =========================================================

  const analyzeUploadedCSV = async (file) => {

    if (!file) return;

    setUploading(true);
    setUploadError("");
    setUploadedResults([]);
    setSelectedUploadedResult(null);

    try {

      const text = await file.text();

      const lines = text
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);


      if (lines.length < 2) {

        throw new Error(
          "CSV must contain a header and at least one transaction."
        );

      }


      const headers = lines[0]
        .split(",")
        .map((header) => header.trim());


      const requiredColumns = [
        "payment_id",
        "customer_id",
        "amount",
        "payment_method",
        "status",
        "failure_reason",
        "previous_successful_payments",
        "previous_failed_payments",
      ];


      const missingColumns = requiredColumns.filter(
        (column) => !headers.includes(column)
      );


      if (missingColumns.length > 0) {

        throw new Error(
          `Missing columns: ${missingColumns.join(", ")}`
        );

      }


      const transactions = lines.slice(1).map((line) => {

        const values = line.split(",");
        const row = {};

        headers.forEach((header, index) => {

          row[header] =
            values[index]?.trim() || "";

        });


        return {

          payment_id: row.payment_id,

          customer_id: row.customer_id,

          amount: Number(row.amount),

          payment_method: row.payment_method,

          status: row.status,

          failure_reason: row.failure_reason,

          previous_successful_payments:
            Number(row.previous_successful_payments),

          previous_failed_payments:
            Number(row.previous_failed_payments),

        };

      });


      if (transactions.length > 100) {

        throw new Error(
          "Maximum 100 transactions can be tested at once."
        );

      }


      const results = [];


      for (const transaction of transactions) {

        const response = await fetch(
          `${API}/analyze-custom`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(transaction),

          }
        );


        const data = await response.json();


        if (!response.ok) {

          throw new Error(
            data.detail ||
              "Unable to analyze uploaded transaction."
          );

        }


        results.push(data);

      }


      setUploadedResults(results);

    } catch (err) {

      console.error(err);

      setUploadError(err.message);

    } finally {

      setUploading(false);

    }

  };


  // =========================================================
  // SELECT UPLOADED TRANSACTION FOR DETAILED ANALYSIS
  // =========================================================

  const analyzeUploadedResult = (item) => {

    setSelectedUploadedResult(item);

    setTimeout(() => {

      document
        .getElementById("uploaded-analysis-result")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

    }, 100);

  };


  // =========================================================
  // DOWNLOAD SAMPLE CSV
  // =========================================================

  const downloadSampleCSV = () => {

    const csv = `payment_id,customer_id,amount,payment_method,status,failure_reason,previous_successful_payments,previous_failed_payments
test_001,cust_01,500,UPI,failed,insufficient_funds,10,2
test_002,cust_02,25000,CARD,failed,authentication_failed,2,8
test_003,cust_03,1200,NETBANKING,failed,bank_server_error,15,1
test_004,cust_04,85000,UPI,failed,authentication_failed,16,4
`;

    const blob = new Blob(
      [csv],
      {
        type: "text/csv",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "payshield_sample_transactions.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

  };


  // =========================================================
  // FORMATTING HELPERS
  // =========================================================

  const formatAmount = (amount) =>
    `₹${Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;


  const formatText = (text) => {

    if (!text) return "-";

    return text
      .toLowerCase()
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");

  };


  const getRiskClass = (level) =>
    level
      ? level.toLowerCase()
      : "unknown";


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div className="app">


      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="navbar">

        <div className="nav-brand">

          <div>

            <div className="brand-name">
              PayShield
            </div>

            <div className="brand-tagline">
              Payment Risk Intelligence
            </div>

          </div>

        </div>


        <div className="nav-right">

          <span className="nav-status">

            <span className="status-ring"></span>

            Risk Engine

          </span>


          <span className="nav-divider"></span>


          <span className="nav-version">
            v1.0
          </span>

        </div>

      </header>


      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="hero">

        <div className="hero-content">


          <div className="hero-copy">

            <div className="hero-badge">

              <span>✦</span>

              AI-POWERED PAYMENT PROTECTION

            </div>


            <h1>

              Know the risk

              <br />

              <span>
                before you move
              </span>{" "}

              the money.

            </h1>


            <p className="hero-description">

              PayShield analyzes failed payments
              using machine learning and deterministic
              safety guardrails to decide what should
              happen next.

            </p>


            <div className="hero-actions">

              <button
                className="hero-button"
                onClick={() =>
                  document
                    .getElementById("transactions")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              >

                Analyze a payment

                <span>↓</span>

              </button>


              <div className="hero-note">

                <span>ML</span>

                <span>+</span>

                <span>GUARDRAILS</span>

                <span>+</span>

                <span>ACTION</span>

              </div>

            </div>

          </div>


          {/* HERO VISUAL */}

          <div className="hero-visual">

            <div className="visual-glow"></div>


            <div className="risk-orb-card">

              <div className="orb-top">

                <span>
                  PAYMENT RISK ENGINE
                </span>

                <span className="live-dot">
                  LIVE
                </span>

              </div>


              <div className="risk-orb">

                <div className="orb-inner">

                  <span className="orb-label">
                    RISK
                  </span>

                  <strong>
                    AI
                  </strong>

                  <span className="orb-small">
                    ENGINE
                  </span>

                </div>

              </div>


              <div className="pipeline-mini">

                <div className="mini-step">

                  <span className="mini-number">
                    01
                  </span>

                  <strong>
                    ML Model
                  </strong>

                </div>


                <div className="mini-line"></div>


                <div className="mini-step">

                  <span className="mini-number">
                    02
                  </span>

                  <strong>
                    Guardrails
                  </strong>

                </div>


                <div className="mini-line"></div>


                <div className="mini-step">

                  <span className="mini-number">
                    03
                  </span>

                  <strong>
                    Decision
                  </strong>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          PIPELINE
      ===================================================== */}

      <section className="pipeline-section">

        <div className="section-intro">

          <span className="eyebrow blue">
            HOW IT WORKS
          </span>

          <h2>
            From payment failure to safe action.
          </h2>

          <p>
            Every transaction passes through
            the same controlled decision flow.
          </p>

        </div>


        <div className="pipeline">

          <PipelineStep
            number="01"
            title="Transaction"
            text="Payment details & customer history"
            icon="↗"
          />

          <PipelineArrow />


          <PipelineStep
            number="02"
            title="ML Analysis"
            text="Random Forest evaluates risk"
            icon="⌁"
          />

          <PipelineArrow />


          <PipelineStep
            number="03"
            title="Guardrails"
            text="Safety rules validate the prediction"
            icon="◇"
          />

          <PipelineArrow />


          <PipelineStep
            number="04"
            title="Action"
            text="Retry, payment link or escalate"
            icon="→"
          />

        </div>


        <div className="pipeline-statement">

          <span>
            Models predict.
          </span>

          <strong>
            Guardrails authorize.
          </strong>

        </div>

      </section>


      {/* =====================================================
          CUSTOM DATA TESTING
      ===================================================== */}

      <section className="custom-testing">

        <div className="custom-testing-heading">

          <div>

            <span className="eyebrow blue">
              TEST YOUR DATA
            </span>

            <h2>
              Bring your own transactions.
            </h2>

            <p>
              Upload a CSV and see how PayShield
              evaluates each payment using its ML
              model and safety guardrails.
            </p>

          </div>


          <button
            className="sample-button"
            onClick={downloadSampleCSV}
          >

            ↓ Download sample CSV

          </button>

        </div>


        <div className="upload-card">

          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            style={{
              display: "none",
            }}
            onChange={(event) =>
              analyzeUploadedCSV(
                event.target.files[0]
              )
            }
          />


          <label
            htmlFor="csv-upload"
            className="upload-zone"
          >

            <div className="upload-icon">
              ↑
            </div>


            <div>

              <strong>

                {uploading
                  ? "Analyzing your transactions..."
                  : "Upload your transaction CSV"}

              </strong>


              <span>

                {uploading
                  ? "Running ML analysis and safety checks"
                  : "Click to browse or drop your CSV file here"}

              </span>

            </div>


            <div className="upload-format">
              CSV
            </div>

          </label>


          {uploadError && (

            <div className="upload-error">

              <span>!</span>

              {uploadError}

            </div>

          )}

        </div>

      </section>


      {/* =====================================================
          UPLOADED RESULTS TABLE
      ===================================================== */}

      {uploadedResults.length > 0 && (

        <section className="uploaded-results">


          <div className="workspace-heading">

            <div>

              <span className="eyebrow">
                CUSTOM ANALYSIS
              </span>

              <h2>
                Your transaction results
              </h2>

              <p>

                PayShield analyzed{" "}
                {uploadedResults.length} uploaded
                transaction
                {uploadedResults.length !== 1
                  ? "s"
                  : ""}.

                {" "}Select any transaction to
                see the full risk analysis.

              </p>

            </div>


            <div className="workspace-count">

              <strong>
                {uploadedResults.length}
              </strong>

              <span>
                tested
              </span>

            </div>

          </div>


          <div className="transaction-card">

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>
                      PAYMENT
                    </th>

                    <th>
                      AMOUNT
                    </th>

                    <th>
                      METHOD
                    </th>

                    <th>
                      RISK SCORE
                    </th>

                    <th>
                      RISK LEVEL
                    </th>

                    <th>
                      DECISION
                    </th>

                    <th></th>

                  </tr>

                </thead>


                <tbody>

                  {uploadedResults.map(
                    (item) => (

                      <tr
                        key={
                          item.payment.payment_id
                        }
                      >


                        <td>

                          <div className="payment-id">

                            <div className="payment-icon">
                              ₹
                            </div>


                            <div>

                              <strong>
                                {
                                  item.payment
                                    .payment_id
                                }
                              </strong>

                              <span>
                                {
                                  item.payment
                                    .customer_id
                                }
                              </span>

                            </div>

                          </div>

                        </td>


                        <td>

                          <strong className="amount">

                            {formatAmount(
                              item.payment.amount
                            )}

                          </strong>

                        </td>


                        <td>

                          <span className="method">

                            {formatText(
                              item.payment
                                .payment_method
                            )}

                          </span>

                        </td>


                        <td>

                          <strong>

                            {
                              item.risk_analysis
                                .risk_score
                            }

                            /100

                          </strong>

                        </td>


                        <td>

                          <span
                            className={`risk-pill ${getRiskClass(
                              item.risk_analysis
                                .risk_level
                            )}`}
                          >

                            <span></span>

                            {
                              item.risk_analysis
                                .risk_level
                            }

                          </span>

                        </td>


                        <td>

                          <strong>

                            {formatText(
                              item.risk_analysis
                                .recommended_action
                            )}

                          </strong>

                        </td>


                        <td className="analyze-cell">

                          <button
                            className={
                              selectedUploadedResult
                                ?.payment
                                ?.payment_id ===
                              item.payment.payment_id
                                ? "analyze-button analyzing-button"
                                : "analyze-button"
                            }
                            onClick={() =>
                              analyzeUploadedResult(
                                item
                              )
                            }
                          >

                            {selectedUploadedResult
                              ?.payment
                              ?.payment_id ===
                            item.payment.payment_id ? (

                              <>
                                Viewing
                                <span>✓</span>
                              </>

                            ) : (

                              <>
                                Analyze
                                <span>→</span>
                              </>

                            )}

                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </section>

      )}


      {/* =====================================================
          UPLOADED TRANSACTION DETAILED ANALYSIS
      ===================================================== */}

      {selectedUploadedResult &&
        selectedUploadedResult.payment &&
        selectedUploadedResult.risk_analysis && (

          <section
            className="analysis"
            id="uploaded-analysis-result"
          >


            <div className="analysis-heading">

              <div>

                <span className="eyebrow">
                  CUSTOM ENGINE RESULT
                </span>


                <div className="analysis-title-row">

                  <h2>
                    {
                      selectedUploadedResult
                        .payment.payment_id
                    }
                  </h2>


                  <span
                    className={`risk-pill ${getRiskClass(
                      selectedUploadedResult
                        .risk_analysis.risk_level
                    )}`}
                  >

                    <span></span>

                    {
                      selectedUploadedResult
                        .risk_analysis.risk_level
                    }

                  </span>

                </div>

              </div>


              <div className="analysis-caption">
                Analysis completed by PayShield
              </div>

            </div>


            {/* =================================================
                MAIN RESULT
            ================================================= */}

            <div className="result-grid">


              {/* SCORE */}

              <div className="score-panel">

                <div className="panel-label">
                  RISK SCORE
                </div>


                <div className="big-score">

                  {
                    selectedUploadedResult
                      .risk_analysis.risk_score
                  }

                  <span>
                    /100
                  </span>

                </div>


                <div className="score-bar">

                  <div
                    className={`score-progress ${getRiskClass(
                      selectedUploadedResult
                        .risk_analysis.risk_level
                    )}`}
                    style={{
                      width: `${Math.min(
                        Number(
                          selectedUploadedResult
                            .risk_analysis.risk_score
                        ),
                        100
                      )}%`,
                    }}
                  ></div>

                </div>


                <div className="score-scale">

                  <span>LOW</span>
                  <span>MEDIUM</span>
                  <span>HIGH</span>

                </div>


                <div className="risk-message">

                  <span className="risk-message-icon">
                    !
                  </span>


                  <div>

                    <strong>

                      {
                        selectedUploadedResult
                          .risk_analysis.risk_level
                      }{" "}
                      RISK

                    </strong>


                    <span>
                      Based on transaction signals
                      and payment history
                    </span>

                  </div>

                </div>

              </div>


              {/* DECISION */}

              <div className="decision-panel">

                <div className="panel-label">
                  FINAL DECISION
                </div>


                <div className="decision-icon">

                  {
                    selectedUploadedResult
                      .risk_analysis
                      .recommended_action ===
                    "ESCALATE"
                      ? "!"
                      : selectedUploadedResult
                          .risk_analysis
                          .recommended_action ===
                        "RETRY"
                      ? "↻"
                      : "→"
                  }

                </div>


                <h3>

                  {formatText(
                    selectedUploadedResult
                      .risk_analysis
                      .recommended_action
                  )}

                </h3>


                <p>

                  {
                    selectedUploadedResult
                      .action_result?.message ||
                    "Decision generated by the PayShield risk engine."
                  }

                </p>


                <div className="decision-tags">


                  <div>

                    <span>
                      SOURCE
                    </span>

                    <strong>

                      {formatText(
                        selectedUploadedResult
                          .risk_analysis
                          .decision_source
                      )}

                    </strong>

                  </div>


                  <div>

                    <span>
                      GUARDRAIL
                    </span>

                    <strong>

                      {
                        selectedUploadedResult
                          .risk_analysis
                          .guardrail_triggered
                          ? "TRIGGERED"
                          : "CLEAR"
                      }

                    </strong>

                  </div>

                </div>

              </div>

            </div>


            {/* =================================================
                TRANSACTION SIGNALS
            ================================================= */}

            <div className="signals-card">

              <div className="card-heading">

                <div>

                  <span className="eyebrow">
                    TRANSACTION SIGNALS
                  </span>

                  <h3>
                    What the engine saw
                  </h3>

                </div>


                <span className="signal-count">
                  8 signals
                </span>

              </div>


              <div className="signals-grid">


                <Signal
                  label="Amount"
                  value={formatAmount(
                    selectedUploadedResult
                      .payment.amount
                  )}
                />


                <Signal
                  label="Payment method"
                  value={formatText(
                    selectedUploadedResult
                      .payment.payment_method
                  )}
                />


                <Signal
                  label="Failure reason"
                  value={formatText(
                    selectedUploadedResult
                      .payment.failure_reason
                  )}
                />


                <Signal
                  label="Successful payments"
                  value={
                    selectedUploadedResult
                      .payment
                      .previous_successful_payments
                  }
                />


                <Signal
                  label="Failed payments"
                  value={
                    selectedUploadedResult
                      .payment
                      .previous_failed_payments
                  }
                />


                <Signal
                  label="ML prediction"
                  value={
                    selectedUploadedResult
                      .risk_analysis
                      .ml_prediction
                  }
                />


                <Signal
                  label="ML confidence"
                  value={`${Number(
                    selectedUploadedResult
                      .risk_analysis
                      .ml_confidence
                  ).toFixed(1)}%`}
                />


                <Signal
                  label="Risk level"
                  value={
                    selectedUploadedResult
                      .risk_analysis
                      .risk_level
                  }
                />

              </div>

            </div>


            {/* =================================================
                MODEL + GUARDRAIL
            ================================================= */}

            <div className="engine-row">


              <div className="engine-card">

                <div className="card-heading">

                  <div>

                    <span className="eyebrow">
                      MODEL OUTPUT
                    </span>

                    <h3>
                      Machine learning assessment
                    </h3>

                  </div>

                </div>


                <div className="model-content">


                  <div className="model-main">

                    <span>
                      Prediction
                    </span>

                    <strong>

                      {
                        selectedUploadedResult
                          .risk_analysis
                          .ml_prediction
                      }

                    </strong>

                  </div>


                  <div className="confidence">

                    <div className="confidence-top">

                      <span>
                        Confidence
                      </span>

                      <strong>

                        {Number(
                          selectedUploadedResult
                            .risk_analysis
                            .ml_confidence
                        ).toFixed(1)}
                        %

                      </strong>

                    </div>


                    <div className="confidence-bar">

                      <div
                        style={{
                          width: `${Math.min(
                            Number(
                              selectedUploadedResult
                                .risk_analysis
                                .ml_confidence
                            ),
                            100
                          )}%`,
                        }}
                      ></div>

                    </div>

                  </div>

                </div>

              </div>


              <div className="guardrail-card">

                <div className="guardrail-symbol">
                  🛡
                </div>


                <div>

                  <span className="eyebrow">
                    SAFETY LAYER
                  </span>


                  <h3>

                    {
                      selectedUploadedResult
                        .risk_analysis
                        .guardrail_triggered
                        ? "Guardrail triggered"
                        : "No guardrail triggered"
                    }

                  </h3>


                  <p>

                    {
                      selectedUploadedResult
                        .risk_analysis
                        .guardrail_reason ||
                      "Transaction passed the deterministic safety checks."
                    }

                  </p>

                </div>

              </div>

            </div>


            {/* =================================================
                WHY
            ================================================= */}

            <div className="why-card">

              <div className="why-icon">
                ?
              </div>


              <div>

                <span className="eyebrow">
                  RISK EXPLANATION
                </span>


                <h3>
                  Why did PayShield make this decision?
                </h3>


                <p>

                  {
                    selectedUploadedResult
                      .risk_analysis
                      .reason
                  }

                </p>

              </div>

            </div>

          </section>

        )}


      {/* =====================================================
          DEMO TRANSACTIONS
      ===================================================== */}

      <section
        className="workspace"
        id="transactions"
      >


        <div className="workspace-heading">

          <div>

            <span className="eyebrow">
              RISK WORKSPACE
            </span>

            <h2>
              Payment intelligence
            </h2>

            <p>
              Select any failed payment to run
              the PayShield risk engine.
            </p>

          </div>


          <div className="workspace-count">

            <strong>
              {payments.length}
            </strong>

            <span>
              demo payments
            </span>

          </div>

        </div>


        {error && (

          <div className="error">

            <span>!</span>

            {error}

          </div>

        )}


        <div className="transaction-card">


          <div className="table-top">

            <div>

              <span className="table-title">
                Recent transactions
              </span>

              <span className="table-subtitle">
                Payment activity from the risk database
              </span>

            </div>


            <button
              className="refresh-button"
              onClick={loadPayments}
              disabled={loadingPayments}
            >

              ↻ Refresh

            </button>

          </div>


          {loadingPayments ? (

            <div className="loading-state">

              <div className="loading-spinner"></div>

              <span>
                Loading payment intelligence...
              </span>

            </div>

          ) : payments.length === 0 ? (

            <div className="empty-state">
              No payments found.
            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>
                      PAYMENT
                    </th>

                    <th>
                      CUSTOMER
                    </th>

                    <th>
                      AMOUNT
                    </th>

                    <th>
                      METHOD
                    </th>

                    <th>
                      STATUS
                    </th>

                    <th></th>

                  </tr>

                </thead>


                <tbody>

                  {payments.map(
                    (payment) => (

                      <tr
                        key={
                          payment.payment_id
                        }
                        className={
                          selectedPayment ===
                          payment.payment_id
                            ? "selected-row"
                            : ""
                        }
                      >


                        <td>

                          <div className="payment-id">

                            <div className="payment-icon">
                              ₹
                            </div>


                            <div>

                              <strong>
                                {payment.payment_id}
                              </strong>

                              <span>
                                {formatText(
                                  payment.failure_reason
                                )}
                              </span>

                            </div>

                          </div>

                        </td>


                        <td>

                          <span className="customer-id">
                            {payment.customer_id}
                          </span>

                        </td>


                        <td>

                          <strong className="amount">
                            {formatAmount(
                              payment.amount
                            )}
                          </strong>

                        </td>


                        <td>

                          <span className="method">
                            {formatText(
                              payment.payment_method
                            )}
                          </span>

                        </td>


                        <td>

                          <span className="failed-status">

                            <span></span>

                            Failed

                          </span>

                        </td>


                        <td className="analyze-cell">

                          <button
                            className={
                              selectedPayment ===
                              payment.payment_id
                                ? "analyze-button analyzing-button"
                                : "analyze-button"
                            }
                            onClick={() =>
                              analyzePayment(
                                payment.payment_id
                              )
                            }
                            disabled={loadingAnalysis}
                          >

                            {loadingAnalysis &&
                            selectedPayment ===
                              payment.payment_id ? (

                              <>

                                <span className="button-spinner"></span>

                                Analyzing

                              </>

                            ) : (

                              <>

                                Analyze

                                <span>
                                  →
                                </span>

                              </>

                            )}

                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </section>


      {/* =====================================================
          DEMO PAYMENT ANALYSIS
      ===================================================== */}

      {result &&
        result.payment &&
        result.risk_analysis && (

          <section
            className="analysis"
            id="analysis-result"
          >


            <AnalysisContent
              result={result}
              formatAmount={formatAmount}
              formatText={formatText}
              getRiskClass={getRiskClass}
            />


          </section>

        )}


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="footer">

        <div>

          <strong>
            PayShield
          </strong>

          <span>
            Payment Risk Intelligence
          </span>

        </div>


        <span>
          ML-powered • Guardrail-protected • Action-ready
        </span>

      </footer>

    </div>

  );
}


// =============================================================
// REUSABLE ANALYSIS CONTENT
// =============================================================

function AnalysisContent({
  result,
  formatAmount,
  formatText,
  getRiskClass,
}) {

  return (

    <>

      {/* HEADING */}

      <div className="analysis-heading">

        <div>

          <span className="eyebrow">
            ENGINE RESULT
          </span>


          <div className="analysis-title-row">

            <h2>
              {result.payment.payment_id}
            </h2>


            <span
              className={`risk-pill ${getRiskClass(
                result.risk_analysis.risk_level
              )}`}
            >

              <span></span>

              {result.risk_analysis.risk_level}

            </span>

          </div>

        </div>


        <div className="analysis-caption">
          Analysis completed by PayShield
        </div>

      </div>


      {/* MAIN RESULT */}

      <div className="result-grid">


        {/* SCORE */}

        <div className="score-panel">

          <div className="panel-label">
            RISK SCORE
          </div>


          <div className="big-score">

            {result.risk_analysis.risk_score}

            <span>
              /100
            </span>

          </div>


          <div className="score-bar">

            <div
              className={`score-progress ${getRiskClass(
                result.risk_analysis.risk_level
              )}`}
              style={{
                width: `${Math.min(
                  Number(
                    result.risk_analysis.risk_score
                  ),
                  100
                )}%`,
              }}
            ></div>

          </div>


          <div className="score-scale">

            <span>
              LOW
            </span>

            <span>
              MEDIUM
            </span>

            <span>
              HIGH
            </span>

          </div>


          <div className="risk-message">

            <span className="risk-message-icon">
              !
            </span>


            <div>

              <strong>

                {result.risk_analysis.risk_level}
                {" "}RISK

              </strong>


              <span>
                Based on transaction signals
                and payment history
              </span>

            </div>

          </div>

        </div>


        {/* DECISION */}

        <div className="decision-panel">

          <div className="panel-label">
            FINAL DECISION
          </div>


          <div className="decision-icon">

            {
              result.risk_analysis
                .recommended_action ===
              "ESCALATE"
                ? "!"
                : result.risk_analysis
                    .recommended_action ===
                  "RETRY"
                ? "↻"
                : "→"
            }

          </div>


          <h3>

            {formatText(
              result.risk_analysis
                .recommended_action
            )}

          </h3>


          <p>

            {result.action_result?.message ||
              "Decision generated by the PayShield risk engine."}

          </p>


          <div className="decision-tags">


            <div>

              <span>
                SOURCE
              </span>

              <strong>

                {formatText(
                  result.risk_analysis
                    .decision_source
                )}

              </strong>

            </div>


            <div>

              <span>
                GUARDRAIL
              </span>

              <strong>

                {
                  result.risk_analysis
                    .guardrail_triggered
                    ? "TRIGGERED"
                    : "CLEAR"
                }

              </strong>

            </div>

          </div>

        </div>

      </div>


      {/* SIGNALS */}

      <div className="signals-card">

        <div className="card-heading">

          <div>

            <span className="eyebrow">
              TRANSACTION SIGNALS
            </span>

            <h3>
              What the engine saw
            </h3>

          </div>


          <span className="signal-count">
            8 signals
          </span>

        </div>


        <div className="signals-grid">

          <Signal
            label="Amount"
            value={formatAmount(
              result.payment.amount
            )}
          />


          <Signal
            label="Payment method"
            value={formatText(
              result.payment.payment_method
            )}
          />


          <Signal
            label="Failure reason"
            value={formatText(
              result.payment.failure_reason
            )}
          />


          <Signal
            label="Successful payments"
            value={
              result.payment
                .previous_successful_payments
            }
          />


          <Signal
            label="Failed payments"
            value={
              result.payment
                .previous_failed_payments
            }
          />


          <Signal
            label="ML prediction"
            value={
              result.risk_analysis
                .ml_prediction
            }
          />


          <Signal
            label="ML confidence"
            value={`${Number(
              result.risk_analysis
                .ml_confidence
            ).toFixed(1)}%`}
          />


          <Signal
            label="Risk level"
            value={
              result.risk_analysis
                .risk_level
            }
          />

        </div>

      </div>


      {/* MODEL + GUARDRAIL */}

      <div className="engine-row">


        <div className="engine-card">

          <div className="card-heading">

            <div>

              <span className="eyebrow">
                MODEL OUTPUT
              </span>

              <h3>
                Machine learning assessment
              </h3>

            </div>

          </div>


          <div className="model-content">


            <div className="model-main">

              <span>
                Prediction
              </span>

              <strong>
                {
                  result.risk_analysis
                    .ml_prediction
                }
              </strong>

            </div>


            <div className="confidence">

              <div className="confidence-top">

                <span>
                  Confidence
                </span>

                <strong>

                  {Number(
                    result.risk_analysis
                      .ml_confidence
                  ).toFixed(1)}
                  %

                </strong>

              </div>


              <div className="confidence-bar">

                <div
                  style={{
                    width: `${Math.min(
                      Number(
                        result.risk_analysis
                          .ml_confidence
                      ),
                      100
                    )}%`,
                  }}
                ></div>

              </div>

            </div>

          </div>

        </div>


        <div className="guardrail-card">

          <div className="guardrail-symbol">
            🛡
          </div>


          <div>

            <span className="eyebrow">
              SAFETY LAYER
            </span>


            <h3>

              {
                result.risk_analysis
                  .guardrail_triggered
                  ? "Guardrail triggered"
                  : "No guardrail triggered"
              }

            </h3>


            <p>

              {
                result.risk_analysis
                  .guardrail_reason ||
                "Transaction passed the deterministic safety checks."
              }

            </p>

          </div>

        </div>

      </div>


      {/* WHY */}

      <div className="why-card">

        <div className="why-icon">
          ?
        </div>


        <div>

          <span className="eyebrow">
            RISK EXPLANATION
          </span>


          <h3>
            Why did PayShield make this decision?
          </h3>


          <p>
            {result.risk_analysis.reason}
          </p>

        </div>

      </div>

    </>

  );
}


// =============================================================
// PIPELINE COMPONENTS
// =============================================================

function PipelineStep({
  number,
  title,
  text,
  icon,
}) {

  return (

    <div className="pipeline-step">

      <div className="pipeline-icon">
        {icon}
      </div>

      <div className="pipeline-number">
        {number}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

    </div>

  );
}


function PipelineArrow() {

  return (

    <div className="pipeline-arrow">
      →
    </div>

  );

}


// =============================================================
// SIGNAL COMPONENT
// =============================================================

function Signal({
  label,
  value,
}) {

  return (

    <div className="signal">

      <span>
        {label}
      </span>

      <strong>
        {value ?? "-"}
      </strong>

    </div>

  );

}


export default App;

