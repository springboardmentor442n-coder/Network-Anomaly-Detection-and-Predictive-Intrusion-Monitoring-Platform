import pandas as pd
import joblib
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

# Load trained model and feature list
model = joblib.load("netshield_model.pkl")
features = joblib.load("model_features.pkl")

# Load training dataset
data = pd.read_csv("data/CICIDS2017/NetShield_Training_Dataset.csv")

# Prepare features and labels
X = data[features]
y = (data["Label"] != "BENIGN").astype(int)

# Predict
y_pred = model.predict(X)

# Calculate metrics
accuracy = accuracy_score(y, y_pred)
precision = precision_score(y, y_pred)
recall = recall_score(y, y_pred)
f1 = f1_score(y, y_pred)

cm = confusion_matrix(y, y_pred)

# Create report
report = f"""
==========================================
NETSHIELD AI - ANOMALY DETECTION REPORT
==========================================

Dataset: NetShield_Training_Dataset.csv

Total Samples: {len(data)}
Normal Samples: {(y == 0).sum()}
Attack Samples: {(y == 1).sum()}

------------------------------------------
MODEL PERFORMANCE
------------------------------------------

Accuracy  : {accuracy * 100:.2f}%
Precision : {precision * 100:.2f}%
Recall    : {recall * 100:.2f}%
F1 Score  : {f1 * 100:.2f}%

------------------------------------------
CONFUSION MATRIX
------------------------------------------

{cm}

------------------------------------------
CLASSIFICATION REPORT
------------------------------------------

{classification_report(y, y_pred)}

==========================================
REPORT GENERATED SUCCESSFULLY
==========================================
"""

# Display report
print(report)

# Save report
with open("anomaly_detection_report.txt", "w") as file:
    file.write(report)

print("Report saved as: anomaly_detection_report.txt")