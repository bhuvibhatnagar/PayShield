import pandas as pd
import joblib

from database import get_db_connection

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix


# ==========================================
# 1. LOAD TRAINING DATA FROM MYSQL
# ==========================================

connection = get_db_connection()

query = """
SELECT
    amount,
    payment_method,
    failure_reason,
    previous_successful_payments,
    previous_failed_payments,
    failure_rate,
    risk_level
FROM ml_training_data
"""

df = pd.read_sql(query, connection)

connection.close()

print("Dataset loaded:", len(df), "records")


# ==========================================
# 2. FEATURES AND TARGET
# ==========================================

X = df[
    [
        "amount",
        "payment_method",
        "failure_reason",
        "previous_successful_payments",
        "previous_failed_payments",
        "failure_rate"
    ]
]

y = df["risk_level"]


# ==========================================
# 3. TRAIN / TEST SPLIT
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# ==========================================
# 4. PREPROCESSING
# ==========================================

categorical_features = [
    "payment_method",
    "failure_reason"
]

numeric_features = [
    "amount",
    "previous_successful_payments",
    "previous_failed_payments",
    "failure_rate"
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        ),
        (
            "numeric",
            "passthrough",
            numeric_features
        )
    ]
)


# ==========================================
# 5. RANDOM FOREST MODEL
# ==========================================

model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced",
    max_depth=12
)


# ==========================================
# 6. CREATE ML PIPELINE
# ==========================================

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ]
)


# ==========================================
# 7. TRAIN
# ==========================================

print("Training ML model...")

pipeline.fit(X_train, y_train)


# ==========================================
# 8. EVALUATE
# ==========================================

predictions = pipeline.predict(X_test)

accuracy = accuracy_score(y_test, predictions)

print("\nModel Accuracy:", round(accuracy * 100, 2), "%")

print("\nClassification Report:")
print(classification_report(y_test, predictions))


print("\nConfusion Matrix:")
cm = confusion_matrix(
    y_test,
    predictions,
    labels=["HIGH", "MEDIUM", "LOW"]
)

print(pd.DataFrame(
    cm,
    index=["Actual HIGH", "Actual MEDIUM", "Actual LOW"],
    columns=["Predicted HIGH", "Predicted MEDIUM", "Predicted LOW"]
))

# ==========================================
# 9. SAVE MODEL
# ==========================================

joblib.dump(pipeline, "risk_model.pkl")

print("\nModel saved as risk_model.pkl")