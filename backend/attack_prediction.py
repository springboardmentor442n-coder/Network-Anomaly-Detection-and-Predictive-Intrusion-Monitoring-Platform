
import os
import glob
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(
    BASE_DIR,
    "data",
    "MachineLearningCVE"
)


print("==========================================")
print("NETSHIELD AI - ATTACK TYPE PREDICTION")
print("==========================================\n")


# Find dataset files
files = glob.glob(
    os.path.join(DATA_DIR, "*.csv")
)


dataframes = []


# Read datasets
for file in files:

    print("Reading:", os.path.basename(file))

    df = pd.read_csv(
        file,
        encoding="latin1"
    )

    # Remove spaces from column names
    df.columns = df.columns.str.strip()

    if "Label" not in df.columns:
        continue

    # Take maximum 10,000 records from each file
    df = df.sample(
        n=min(10000, len(df)),
        random_state=42
    )

    dataframes.append(df)


print("\nCombining datasets...")


data = pd.concat(
    dataframes,
    ignore_index=True
)


print(
    "Total sampled records:",
    len(data)
)


# Clean labels
data["Label"] = (
    data["Label"]
    .astype(str)
    .str.strip()
)


# Remove classes with fewer than 2 records
label_counts = data["Label"].value_counts()


valid_labels = label_counts[
    label_counts >= 2
].index


data = data[
    data["Label"].isin(valid_labels)
].copy()


print("\nClasses after filtering:")


for label in sorted(data["Label"].unique()):
    print("-", label)


# Target
y = data["Label"]


# Remove target column
X = data.drop(
    columns=["Label"]
)


# Keep only numeric columns
X = X.select_dtypes(
    include=["number"]
)


# Load existing NetShield feature list
binary_features_path = os.path.join(
    BASE_DIR,
    "model_features.pkl"
)


existing_features = joblib.load(
    binary_features_path
)


print(
    "\nExisting NetShield features:",
    len(existing_features)
)


# Use same 70 features
available_features = [
    feature
    for feature in existing_features
    if feature in X.columns
]


X = X[available_features]


print(
    "Features used for attack prediction:",
    len(available_features)
)


# Clean numeric values
X = X.astype("float64")


X = X.fillna(0)


X = X.replace(
    [float("inf"), float("-inf")],
    0
)


# Train / test split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


print(
    "\nTraining samples:",
    len(X_train)
)


print(
    "Testing samples:",
    len(X_test)
)


# Random Forest multiclass model
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42,
    n_jobs=-1,
    class_weight="balanced"
)


print(
    "\nTraining attack prediction model..."
)


# Train model
model.fit(
    X_train,
    y_train
)


# Predict attack type
y_pred = model.predict(
    X_test
)


# Calculate accuracy
accuracy = accuracy_score(
    y_test,
    y_pred
)


print("\n==========================================")
print("ATTACK PREDICTION RESULTS")
print("==========================================")


print(
    "\nAccuracy:",
    round(accuracy * 100, 2),
    "%"
)


print("\nClassification Report:")


print(
    classification_report(
        y_test,
        y_pred,
        zero_division=0
    )
)


print("\nConfusion Matrix:")


print(
    confusion_matrix(
        y_test,
        y_pred
    )
)


# Save attack prediction model
model_path = os.path.join(
    BASE_DIR,
    "attack_model.pkl"
)


features_path = os.path.join(
    BASE_DIR,
    "attack_model_features.pkl"
)


joblib.dump(
    model,
    model_path
)


joblib.dump(
    available_features,
    features_path
)


print("\n==========================================")
print("MODEL SAVED SUCCESSFULLY")
print("==========================================")


print(
    "Attack model:",
    model_path
)


print(
    "Feature file:",
    features_path
)


print(
    "\nAttack prediction model training completed!"
)

