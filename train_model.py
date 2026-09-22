# ============================================================
# NETSHIELD AI
# AI Network Anomaly Detection & Threat Monitoring System
# ============================================================
# Dataset: CICIDS2017
# Model: Random Forest Classifier
# Classes: BENIGN, DDoS
# ============================================================

import pandas as pd
import numpy as np
import joblib
import os

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)


# ============================================================
# STEP 1: IMPORT CHECK
# ============================================================

print("Libraries imported successfully!")


# ============================================================
# STEP 2: DATASET PATH
# ============================================================

DATASET_PATH = (
    "/kaggle/input/datasets/chethuhn/"
    "network-intrusion-dataset/"
    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv"
)

print("\nDataset path:")
print(DATASET_PATH)


# ============================================================
# STEP 3: LOAD DATASET
# ============================================================

print("\nLoading dataset...")

df = pd.read_csv(DATASET_PATH)

print("Dataset loaded successfully!")

print("\nDataset shape:")
print(df.shape)


# ============================================================
# STEP 4: CLEAN COLUMN NAMES
# ============================================================

print("\nOriginal column names:")
print(df.columns.tolist())

# Remove extra spaces from column names
df.columns = df.columns.str.strip()

print("\nCleaned column names:")
print(df.columns.tolist())


# ============================================================
# STEP 5: CHECK LABELS
# ============================================================

print("\nLabel distribution:")

print(df["Label"].value_counts())


# ============================================================
# STEP 6: REMOVE DUPLICATE ROWS
# ============================================================

print("\nChecking duplicate rows...")

duplicates = df.duplicated().sum()

print("Duplicate rows:", duplicates)

df = df.drop_duplicates()

print("Dataset shape after removing duplicates:")
print(df.shape)


# ============================================================
# STEP 7: CREATE X AND y
# ============================================================

X = df.drop("Label", axis=1)

y = df["Label"]

print("\nX shape:")
print(X.shape)

print("y shape:")
print(y.shape)


# ============================================================
# STEP 8: KEEP ONLY NUMERIC FEATURES
# ============================================================

print("\nChecking non-numeric columns...")

non_numeric_columns = X.select_dtypes(
    exclude=np.number
).columns.tolist()

print("Non-numeric columns:")
print(non_numeric_columns)


if len(non_numeric_columns) > 0:

    X = X.drop(
        columns=non_numeric_columns
    )

print("\nX shape after keeping numeric features:")
print(X.shape)


# ============================================================
# STEP 9: HANDLE INFINITY AND NaN
# ============================================================

print("\nCleaning NaN and infinity values...")

# Replace infinity with NaN
X = X.replace(
    [np.inf, -np.inf],
    np.nan
)

print(
    "NaN values before cleaning:",
    X.isna().sum().sum()
)


# Keep only rows without NaN
valid_rows = X.notna().all(axis=1)

X = X.loc[valid_rows].copy()

y = y.loc[valid_rows].copy()


print(
    "X shape after cleaning:",
    X.shape
)

print(
    "y shape after cleaning:",
    y.shape
)

print(
    "NaN values after cleaning:",
    X.isna().sum().sum()
)

print(
    "Infinity values after cleaning:",
    np.isinf(X.to_numpy()).sum()
)


# ============================================================
# STEP 10: ENCODE LABELS
# ============================================================

print("\nEncoding labels...")

label_encoder = LabelEncoder()

y_encoded = label_encoder.fit_transform(y)


print("\nOriginal classes:")

print(label_encoder.classes_)


print("\nEncoded label distribution:")

print(
    pd.Series(y_encoded).value_counts()
)


# ============================================================
# STEP 11: SAVE FEATURE NAMES
# ============================================================

feature_names = X.columns.tolist()

print(
    "\nNumber of features:",
    len(feature_names)
)

joblib.dump(
    feature_names,
    "feature_names.pkl"
)

print(
    "feature_names.pkl saved successfully!"
)


# ============================================================
# STEP 12: TRAIN / TEST SPLIT
# ============================================================

print("\nSplitting dataset into training and testing data...")

X_train, X_test, y_train, y_test = train_test_split(

    X,
    y_encoded,

    test_size=0.20,

    random_state=42,

    stratify=y_encoded
)


print("\nTrain/Test Split completed!")

print("X_train shape:", X_train.shape)

print("X_test shape:", X_test.shape)

print("y_train shape:", y_train.shape)

print("y_test shape:", y_test.shape)


# ============================================================
# STEP 13: CREATE RANDOM FOREST MODEL
# ============================================================

print("\nCreating Random Forest model...")

model = RandomForestClassifier(

    n_estimators=100,

    random_state=42,

    n_jobs=-1
)


print("\nModel created:")

print(model)


# ============================================================
# STEP 14: TRAIN MODEL
# ============================================================

print("\n========================================")

print("Training Random Forest...")

print("Please wait...")

print("========================================")


model.fit(
    X_train,
    y_train
)


print("\nRandom Forest training completed successfully!")


# ============================================================
# STEP 15: MAKE PREDICTIONS
# ============================================================

print("\nMaking predictions...")

y_pred = model.predict(X_test)


print("Prediction completed!")


print("\nFirst 20 predictions:")

print(y_pred[:20])


# ============================================================
# STEP 16: CONVERT PREDICTIONS BACK TO LABELS
# ============================================================

predicted_labels = label_encoder.inverse_transform(
    y_pred
)


print("\nFirst 20 predicted labels:")

print(predicted_labels[:20])


# ============================================================
# STEP 17: CALCULATE MODEL METRICS
# ============================================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

precision = precision_score(
    y_test,
    y_pred,
    average="weighted",
    zero_division=0
)

recall = recall_score(
    y_test,
    y_pred,
    average="weighted",
    zero_division=0
)

f1 = f1_score(
    y_test,
    y_pred,
    average="weighted",
    zero_division=0
)


# ============================================================
# STEP 18: DISPLAY RESULTS
# ============================================================

print("\n========================================")

print("       NETSHIELD AI MODEL RESULTS")

print("========================================")

print(
    f"Accuracy  : {accuracy:.4f}"
)

print(
    f"Precision : {precision:.4f}"
)

print(
    f"Recall    : {recall:.4f}"
)

print(
    f"F1 Score  : {f1:.4f}"
)

print(
    f"\nAccuracy percentage: {accuracy * 100:.2f}%"
)


# ============================================================
# STEP 19: CLASSIFICATION REPORT
# ============================================================

report = classification_report(

    y_test,

    y_pred,

    target_names=label_encoder.classes_,

    zero_division=0
)


print("\nClassification Report:")

print(report)


# ============================================================
# STEP 20: CONFUSION MATRIX
# ============================================================

cm = confusion_matrix(
    y_test,
    y_pred
)


print("\nConfusion Matrix:")

print(cm)


# ============================================================
# STEP 21: GET PREDICTION PROBABILITIES
# ============================================================

print("\nCalculating prediction probabilities...")

probabilities = model.predict_proba(
    X_test
)


print("\nProbability shape:")

print(probabilities.shape)


print("\nClass order:")

print(label_encoder.classes_)


# ============================================================
# STEP 22: GET DDOS PROBABILITY
# ============================================================

ddos_index = list(
    label_encoder.classes_
).index("DDoS")


print(
    "\nDDoS probability column index:",
    ddos_index
)


ddos_probability = probabilities[
    :,
    ddos_index
]


# ============================================================
# STEP 23: CALCULATE RISK SCORE
# ============================================================

risk_score = ddos_probability * 100


print("\nFirst 10 DDoS probabilities:")

print(
    ddos_probability[:10]
)


print("\nFirst 10 DDoS risk scores:")

print(
    np.round(
        risk_score[:10],
        2
    )
)


# ============================================================
# STEP 24: CALCULATE SEVERITY
# ============================================================

def get_severity(score):

    if score <= 30:

        return "LOW"

    elif score <= 70:

        return "MEDIUM"

    else:

        return "HIGH"


severity = [

    get_severity(score)

    for score in risk_score

]


print("\nFirst 10 severity levels:")

print(
    severity[:10]
)


# ============================================================
# STEP 25: DISPLAY SAMPLE PREDICTIONS
# ============================================================

print("\n========================================")

print("       SAMPLE NETSHIELD PREDICTIONS")

print("========================================")


for i in range(10):

    predicted_attack = predicted_labels[i]

    score = round(
        risk_score[i],
        2
    )

    level = severity[i]

    print(

        f"Sample {i + 1}: "

        f"Prediction={predicted_attack}, "

        f"DDoS Risk={score}%, "

        f"Severity={level}"

    )


# ============================================================
# STEP 26: SAVE RANDOM FOREST MODEL
# ============================================================

joblib.dump(

    model,

    "netshield_model.pkl"

)


print(
    "\nnetshield_model.pkl saved successfully!"
)


# ============================================================
# STEP 27: SAVE LABEL ENCODER
# ============================================================

joblib.dump(

    label_encoder,

    "label_encoder.pkl"

)


print(
    "label_encoder.pkl saved successfully!"
)


# ============================================================
# STEP 28: SAVE MODEL METRICS
# ============================================================

with open(
    "model_metrics.txt",
    "w"
) as f:

    f.write(
        "========================================\n"
    )

    f.write(
        "NETSHIELD AI MODEL METRICS\n"
    )

    f.write(
        "========================================\n\n"
    )

    f.write(
        "Model: Random Forest Classifier\n"
    )

    f.write(
        "Dataset: CICIDS2017\n"
    )

    f.write(
        "Number of Estimators: 100\n"
    )

    f.write(
        "Test Size: 20%\n"
    )

    f.write(
        "Random State: 42\n\n"
    )

    f.write("Classes:\n")

    for class_name in label_encoder.classes_:

        f.write(
            f"- {class_name}\n"
        )

    f.write("\n")

    f.write(
        f"Accuracy: {accuracy:.4f}\n"
    )

    f.write(
        f"Precision: {precision:.4f}\n"
    )

    f.write(
        f"Recall: {recall:.4f}\n"
    )

    f.write(
        f"F1 Score: {f1:.4f}\n\n"
    )

    f.write(
        "Classification Report:\n"
    )

    f.write(report)


print(
    "model_metrics.txt saved successfully!"
)


# ============================================================
# STEP 29: CHECK SAVED FILES
# ============================================================

print("\n========================================")

print("          SAVED MODEL FILES")

print("========================================")


files = [

    "netshield_model.pkl",

    "label_encoder.pkl",

    "feature_names.pkl",

    "model_metrics.txt"

]


for file in files:

    if os.path.exists(file):

        size = os.path.getsize(file)

        print(

            f"✓ {file} "
            f"({size / (1024 * 1024):.2f} MB)"

        )

    else:

        print(
            f"✗ {file} NOT FOUND"
        )


# ============================================================
# STEP 30: FINISHED
# ============================================================

print("\n========================================")

print("      NETSHIELD AI ML PIPELINE DONE")

print("========================================")