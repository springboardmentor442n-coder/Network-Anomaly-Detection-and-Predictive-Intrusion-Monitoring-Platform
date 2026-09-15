
import os
import glob
import joblib
import pandas as pd

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

BASE_DIR = os.path.dirname(__file__)

DATA_PATH = os.path.join(
    BASE_DIR,
    "data",
    "CICIDS2017"
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "netshield_model.pkl"
)

FEATURE_PATH = os.path.join(
    BASE_DIR,
    "model_features.pkl"
)

# ==========================================
# LOAD CSV FILES
# ==========================================

csv_files = glob.glob(
    os.path.join(DATA_PATH, "*.csv")
)

if not csv_files:
    print("ERROR: No CSV files found!")
    print("Check backend/data/CICIDS2017 folder.")
    exit()

print("CSV files found:", len(csv_files))

dataframes = []

for file in csv_files:

    try:
        df = pd.read_csv(
            file,
            encoding="latin1",
            low_memory=False
        )

        df.columns = df.columns.str.strip()

        if "Label" in df.columns:
            dataframes.append(df)

            print(
                "Loaded:",
                os.path.basename(file),
                "Rows:",
                len(df)
            )

    except Exception as e:
        print(
            "Error reading",
            file,
            e
        )

if not dataframes:
    print("ERROR: No valid CSV files found!")
    exit()

# ==========================================
# COMBINE DATA
# ==========================================

data = pd.concat(
    dataframes,
    ignore_index=True
)

print()
print("Total rows:", len(data))

# ==========================================
# CREATE TARGET
# BENIGN = 0
# ATTACK = 1
# ==========================================

data["Label"] = (
    data["Label"]
    .astype(str)
    .str.strip()
    .str.upper()
)

data["Target"] = (
    data["Label"]
    .apply(
        lambda x: 0
        if x == "BENIGN"
        else 1
    )
)

# ==========================================
# SELECT NUMERIC FEATURES
# ==========================================

numeric_columns = data.select_dtypes(
    include=["number"]
).columns.tolist()

if "Target" in numeric_columns:
    numeric_columns.remove("Target")

if not numeric_columns:
    print(
        "ERROR: No numeric features found!"
    )
    exit()

X = data[numeric_columns].copy()
y = data["Target"]

# Replace invalid values
X = X.replace(
    [float("inf"), float("-inf")],
    0
)

X = X.fillna(0)

# ==========================================
# LIMIT EXTREME VALUES
# ==========================================

X = X.clip(
    lower=-1e10,
    upper=1e10
)

# ==========================================
# TRAIN / TEST SPLIT
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print()
print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))

# ==========================================
# RANDOM FOREST MODEL
# ==========================================

model = RandomForestClassifier(
    n_estimators=100,
    random_state=42,
    class_weight="balanced"
)

print()
print("Training anomaly detection model...")

model.fit(
    X_train,
    y_train
)

print("Training completed!")

# ==========================================
# PREDICTION
# ==========================================

y_pred = model.predict(X_test)

# ==========================================
# MODEL PERFORMANCE
# ==========================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

print()
print("==========================================")
print("ANOMALY DETECTION MODEL PERFORMANCE")
print("==========================================")

print(
    "Accuracy:",
    round(accuracy * 100, 2),
    "%"
)

print()
print("Classification Report:")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=[
            "BENIGN",
            "ATTACK"
        ],
        zero_division=0
    )
)

print("Confusion Matrix:")
print(
    confusion_matrix(
        y_test,
        y_pred
    )
)

# ==========================================
# SAVE MODEL
# ==========================================

joblib.dump(
    model,
    MODEL_PATH
)

joblib.dump(
    numeric_columns,
    FEATURE_PATH
)

print()
print("==========================================")
print("MODEL SAVED SUCCESSFULLY")
print("==========================================")

print(
    "Model:",
    MODEL_PATH
)

print(
    "Features:",
    FEATURE_PATH
)

print(
    "Number of features:",
    len(numeric_columns)
)