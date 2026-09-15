
import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))


MODEL_PATH = os.path.join(
    BASE_DIR,
    "netshield_model.pkl"
)

FEATURES_PATH = os.path.join(
    BASE_DIR,
    "model_features.pkl"
)


print("==========================================")
print("NETSHIELD AI - ANOMALY DETECTION REPORT")
print("==========================================\n")


# Load model
model = joblib.load(MODEL_PATH)

# Load feature names
feature_names = joblib.load(FEATURES_PATH)


print("ML Model loaded successfully")
print("Model features:", len(feature_names))


# Load CICIDS data
DATA_DIR = os.path.join(
    BASE_DIR,
    "data",
    "MachineLearningCVE"
)


import glob

files = glob.glob(
    os.path.join(DATA_DIR, "*.csv")
)


dataframes = []


for file in files:

    print(
        "Reading:",
        os.path.basename(file)
    )

    df = pd.read_csv(
        file,
        encoding="latin1"
    )

    df.columns = df.columns.str.strip()

    if "Label" not in df.columns:
        continue

    # Sample 5,000 records from each file
    df = df.sample(
        n=min(5000, len(df)),
        random_state=42
    )

    dataframes.append(df)


# Combine data
data = pd.concat(
    dataframes,
    ignore_index=True
)


print(
    "\nTotal records used:",
    len(data)
)


# Clean labels
data["Label"] = (
    data["Label"]
    .astype(str)
    .str.strip()
)


# Convert labels to binary
data["Target"] = data["Label"].apply(
    lambda x: 0
    if x.upper() == "BENIGN"
    else 1
)


# Select model features
X = data[feature_names].copy()

y = data["Target"]


# Convert values to numeric
X = X.apply(
    pd.to_numeric,
    errors="coerce"
)


X = X.fillna(0)


X = X.replace(
    [float("inf"), float("-inf")],
    0
)


# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


# Predict
y_pred = model.predict(
    X_test
)


# Metrics
accuracy = accuracy_score(
    y_test,
    y_pred
)

precision = precision_score(
    y_test,
    y_pred,
    zero_division=0
)

recall = recall_score(
    y_test,
    y_pred,
    zero_division=0
)

f1 = f1_score(
    y_test,
    y_pred,
    zero_division=0
)


# Traffic statistics
total_records = len(data)

normal_records = (
    data["Target"] == 0
).sum()

attack_records = (
    data["Target"] == 1
).sum()


# Attack type counts
attack_types = (
    data[data["Target"] == 1]["Label"]
    .value_counts()
)


# Generate report
report_path = os.path.join(
    BASE_DIR,
    "anomaly_detection_report.txt"
)


with open(
    report_path,
    "w",
    encoding="utf-8"
) as report:

    report.write(
        "==========================================\n"
    )

    report.write(
        "NETSHIELD AI - ANOMALY DETECTION REPORT\n"
    )

    report.write(
        "==========================================\n\n"
    )

    report.write(
        f"Total Records: {total_records}\n"
    )

    report.write(
        f"Normal Records: {normal_records}\n"
    )

    report.write(
        f"Attack Records: {attack_records}\n\n"
    )

    report.write(
        "==========================================\n"
    )

    report.write(
        "MODEL PERFORMANCE\n"
    )

    report.write(
        "==========================================\n\n"
    )

    report.write(
        f"Accuracy: {accuracy * 100:.2f}%\n"
    )

    report.write(
        f"Precision: {precision * 100:.2f}%\n"
    )

    report.write(
        f"Recall: {recall * 100:.2f}%\n"
    )

    report.write(
        f"F1-Score: {f1 * 100:.2f}%\n\n"
    )

    report.write(
        "==========================================\n"
    )

    report.write(
        "ATTACK TYPE DISTRIBUTION\n"
    )

    report.write(
        "==========================================\n\n"
    )

    for attack, count in attack_types.items():

        report.write(
            f"{attack}: {count}\n"
        )

    report.write(
        "\n==========================================\n"
    )

    report.write(
        "CLASSIFICATION REPORT\n"
    )

    report.write(
        "==========================================\n\n"
    )

    report.write(
        classification_report(
            y_test,
            y_pred,
            target_names=[
                "Normal",
                "Attack"
            ],
            zero_division=0
        )
    )

    report.write(
        "\n==========================================\n"
    )

    report.write(
        "CONFUSION MATRIX\n"
    )

    report.write(
        "==========================================\n\n"
    )

    report.write(
        str(
            confusion_matrix(
                y_test,
                y_pred
            )
        )
    )


print("\n==========================================")
print("ANOMALY REPORT GENERATED")
print("==========================================")

print(
    "\nAccuracy:",
    f"{accuracy * 100:.2f}%"
)

print(
    "Precision:",
    f"{precision * 100:.2f}%"
)

print(
    "Recall:",
    f"{recall * 100:.2f}%"
)

print(
    "F1-Score:",
    f"{f1 * 100:.2f}%"
)

print(
    "\nReport saved at:"
)

print(
    report_path
)