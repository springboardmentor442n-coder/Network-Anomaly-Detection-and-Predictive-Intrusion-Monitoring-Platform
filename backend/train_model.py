
import os
import glob
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)


# ==========================================
# PATHS
# ==========================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CICIDS_DIR = os.path.join(
    BASE_DIR,
    "data",
    "MachineLearningCVE"
)

UNSW_DIR = os.path.join(
    BASE_DIR,
    "data",
    "UNSW-NB15"
)


# ==========================================
# LOAD CICIDS2017
# ==========================================

print("Loading CICIDS2017...")

cicids_files = glob.glob(
    os.path.join(CICIDS_DIR, "*.csv")
)

cicids_list = []

for file in cicids_files:

    print("Reading:", os.path.basename(file))

    df = pd.read_csv(
        file,
        encoding="latin1"
    )

    # Remove spaces from column names
    df.columns = df.columns.str.strip()

    # Take a manageable sample
    if len(df) > 10000:

        df = df.sample(
            n=10000,
            random_state=42
        )

    cicids_list.append(df)


# Check files
if not cicids_list:

    raise Exception(
        "No CICIDS2017 CSV files found!"
    )


cicids = pd.concat(
    cicids_list,
    ignore_index=True
)

print(
    "CICIDS samples:",
    len(cicids)
)


# ==========================================
# FIND LABEL COLUMN
# ==========================================

label_column = None

for col in cicids.columns:

    if col.lower() == "label":

        label_column = col
        break


if label_column is None:

    raise Exception(
        "Label column not found in CICIDS dataset"
    )


print(
    "Label column:",
    label_column
)


# ==========================================
# PREPROCESS CICIDS
# ==========================================

cicids[label_column] = (
    cicids[label_column]
    .astype(str)
    .str.strip()
)


# ==========================================
# CONVERT LABELS
# ==========================================

# BENIGN = 0
# ATTACK = 1

cicids["target"] = (
    cicids[label_column]
    .str.upper()
    .ne("BENIGN")
    .astype(int)
)


# ==========================================
# SELECT NUMERIC FEATURES
# ==========================================

X = cicids.select_dtypes(
    include=["number"]
).copy()


# Remove target from features

if "target" in X.columns:

    X = X.drop(
        columns=["target"]
    )


y = cicids["target"]


# ==========================================
# HANDLE INFINITY VALUES
# ==========================================

X = X.replace(
    [float("inf"), float("-inf")],
    0
)


# ==========================================
# HANDLE MISSING VALUES
# ==========================================

X = X.fillna(0)


# ==========================================
# REMOVE CONSTANT COLUMNS
# ==========================================

X = X.loc[
    :,
    X.nunique() > 1
]


print(
    "Features used:",
    len(X.columns)
)


# ==========================================
# TRAIN / TEST SPLIT
# ==========================================

print("\nSplitting dataset...")

X_train, X_test, y_train, y_test = train_test_split(

    X,
    y,

    test_size=0.2,

    random_state=42,

    stratify=y
)


print(
    "Training samples:",
    len(X_train)
)

print(
    "Testing samples:",
    len(X_test)
)


# ==========================================
# TRAIN RANDOM FOREST
# ==========================================

print(
    "\nTraining Random Forest..."
)

model = RandomForestClassifier(

    n_estimators=100,

    random_state=42,

    n_jobs=-1,

    class_weight="balanced"
)


model.fit(
    X_train,
    y_train
)


print(
    "Training completed!"
)


# ==========================================
# MODEL PREDICTION
# ==========================================

print(
    "\nGenerating predictions..."
)

predictions = model.predict(
    X_test
)


# ==========================================
# ACCURACY
# ==========================================

accuracy = accuracy_score(
    y_test,
    predictions
)


# ==========================================
# CLASSIFICATION REPORT
# ==========================================

report = classification_report(

    y_test,

    predictions,

    target_names=[
        "Normal",
        "Attack"
    ]
)


# ==========================================
# CONFUSION MATRIX
# ==========================================

cm = confusion_matrix(

    y_test,

    predictions
)


# ==========================================
# DISPLAY RESULTS
# ==========================================

print(
    "\n=========================================="
)

print(
    "        MODEL EVALUATION RESULTS"
)

print(
    "=========================================="
)


print(
    "\nAccuracy:",
    round(
        accuracy * 100,
        2
    ),
    "%"
)


print(
    "\nClassification Report:"
)

print(
    report
)


print(
    "Confusion Matrix:"
)

print(
    cm
)


print(
    "\n=========================================="
)


# ==========================================
# SAVE MODEL
# ==========================================

model_path = os.path.join(

    BASE_DIR,

    "netshield_model.pkl"
)


joblib.dump(

    model,

    model_path
)


# ==========================================
# SAVE FEATURE NAMES
# ==========================================

feature_path = os.path.join(

    BASE_DIR,

    "model_features.pkl"
)


joblib.dump(

    list(X.columns),

    feature_path
)


# ==========================================
# FINAL INFORMATION
# ==========================================

print(
    "\nModel saved successfully!"
)

print(
    "Model:",
    model_path
)

print(
    "Features:",
    feature_path
)

print(
    "Number of features:",
    len(X.columns)
)

print(
    "\nMilestone 2 - Step 2 completed!"
)