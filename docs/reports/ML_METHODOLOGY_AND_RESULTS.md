# ML Methodology and Results

## 1. Overview

The Machine Learning component of NetShield AI is designed to analyze network traffic, identify malicious activity, detect anomalous behavior, classify attack types, and calculate a risk score for security monitoring.

The ML pipeline uses two primary network intrusion datasets:

- CICIDS2017
- UNSW-NB15

The implemented pipeline includes data cleaning, exploratory data analysis, preprocessing, dataset preparation, supervised classification, unsupervised anomaly detection, risk scoring, attack-type classification, model evaluation, and integration with the FastAPI backend.

---

## 2. Datasets

### 2.1 CICIDS2017

CICIDS2017 is the primary dataset used for the network attack detection pipeline.

It contains benign network traffic as well as multiple attack categories, including:

- DoS attacks
- DDoS
- PortScan
- Bot
- FTP-Patator
- SSH-Patator
- Web attacks
- Infiltration
- SQL Injection
- Heartbleed

The dataset contains network-flow features that can be used for machine learning based intrusion detection.

### 2.2 UNSW-NB15

UNSW-NB15 is used as a secondary intrusion-detection dataset.

It contains normal traffic and multiple attack categories and is used to develop and evaluate an additional Random Forest model.

---

## 3. Data Cleaning

The CICIDS2017 dataset was processed file by file.

The cleaning pipeline includes:

1. Loading the raw CSV files.
2. Removing leading and trailing spaces from column names.
3. Converting infinite values to missing values.
4. Removing rows containing invalid/missing feature values.
5. Removing duplicate records.
6. Saving cleaned datasets into the processed-data directory.

Eight CICIDS2017 CSV files were processed.

The cleaned datasets were then used for exploratory analysis and ML dataset preparation.

---

## 4. Exploratory Data Analysis

Exploratory Data Analysis was performed to understand the structure and distribution of the network traffic.

The analysis included:

- Dataset shape
- Feature inspection
- Data types
- Missing-value analysis
- Label distribution
- Benign versus attack distribution
- Attack-category distribution
- Numerical feature statistics
- Extreme-value inspection

The analysis showed a significant class imbalance in the original CICIDS2017 dataset, with benign traffic representing the majority of the records.

Because of this imbalance, controlled sampling was used while creating the ML-ready dataset.

---

## 5. Feature Preprocessing

Network-flow metadata that should not be directly used as numerical ML features was removed.

The following columns were excluded where applicable:

- Flow ID
- Source IP
- Destination IP
- Timestamp
- Label
- Binary_Label

The remaining network-flow features were converted into a numerical representation suitable for machine learning.

Additional preprocessing included:

- Replacing infinite values.
- Handling missing values.
- Ensuring consistent feature columns.
- Aligning prediction features with the trained model's feature set.

---

## 6. Binary Attack Detection

The first supervised ML task is binary classification.

Each network flow is assigned one of two classes:

- `0` — BENIGN
- `1` — ATTACK

A Random Forest classifier was trained to distinguish benign network traffic from malicious traffic.

### Model configuration

- Algorithm: Random Forest
- Number of trees: 100
- Random state: 42
- Class weighting: Balanced
- Parallel processing: Enabled

The resulting model is stored as:

`ml/models/random_forest_baseline.joblib`

---

## 7. Binary Classification Results

The Random Forest binary attack detection model achieved the following evaluation results on the CICIDS2017 evaluation dataset:

| Metric | Score |
|---|---:|
| Accuracy | 99.78% |
| Precision | 99.68% |
| Recall | 99.60% |
| F1-Score | 99.64% |
| ROC-AUC | 99.97% |

These results indicate strong performance for distinguishing benign and malicious network flows in the evaluated CICIDS2017 data.

These values represent evaluation results on the prepared dataset and should not be interpreted as guaranteed performance on unseen real-world network environments.

---

## 8. Anomaly Detection

In addition to supervised attack classification, an Isolation Forest model was implemented for anomaly detection.

Isolation Forest provides an additional behavioral signal by identifying network flows that differ from the learned normal-traffic patterns.

### Model configuration

- Algorithm: Isolation Forest
- Training data: sampled benign CICIDS2017 traffic
- Number of estimators: 100
- Contamination: 0.10
- Random state: 42

The trained model is stored as:

`ml/models/isolation_forest_anomaly.joblib`

The model produces an anomaly indicator:

- `NO` — traffic is not identified as anomalous
- `YES` — traffic is identified as anomalous

---

## 9. Risk Scoring

The system combines supervised attack probability and anomaly information into a unified risk score.

The current risk score uses:

- 70% weight for attack probability
- 30% weight for anomaly indication

The score is normalized to a range from 0 to 100.

### Risk levels

| Risk Score | Risk Level |
|---:|---|
| 0–24.99 | LOW |
| 25–49.99 | MEDIUM |
| 50–74.99 | HIGH |
| 75–100 | CRITICAL |

This score is then used by the alert-management component to determine alert priority.

### Alert priorities

| Risk Level | Priority |
|---|---|
| CRITICAL | P1 |
| HIGH | P2 |
| MEDIUM | P3 |
| LOW | P4 |

---

## 10. Attack-Type Classification

After a flow is identified as an attack, a second Random Forest model is used to determine the probable attack category.

The attack-type model was trained using a sampled and balanced representation of CICIDS2017 attack categories.

The dataset used for this model contained:

- 25,000 BENIGN records
- Up to 10,000 records per major attack category
- 88,901 total records
- 78 numerical features

Rare attack categories were retained where records were available.

The model uses a LabelEncoder to convert attack-category names into numerical class labels.

The attack-type model is stored as:

`ml/models/attack_type_random_forest.joblib`

The corresponding encoder is stored as:

`ml/models/attack_type_label_encoder.joblib`

---

## 11. Attack-Type Classification Results

The attack-type Random Forest achieved:

| Metric | Score |
|---|---:|
| Accuracy | 98.76% |
| Precision | 98.69% |
| Recall | 98.76% |
| F1-Score | 98.71% |

The evaluation was performed on 17,781 test samples.

The weighted performance was very high across the test dataset.

However, the macro-average results were lower because several attack categories had very few examples.

For example:

- Infiltration had only 7 test samples.
- Heartbleed had only 2 test samples.
- SQL Injection also had very limited representation.

Therefore, performance on these rare classes should be interpreted cautiously.

---

## 12. UNSW-NB15 Model

A separate Random Forest model was trained using the official UNSW-NB15 training and testing datasets.

The preprocessing pipeline included:

1. Loading the official training and testing datasets.
2. Cleaning column names.
3. Handling missing attack-category values.
4. Removing the identifier column.
5. Encoding categorical features.
6. One-hot encoding protocol, service, and state information.
7. Aligning training and testing feature columns.
8. Handling infinite and missing values.
9. Creating a binary attack label.

The trained model is stored as:

`ml/models/unsw_nb15_random_forest.joblib`

---

## 13. Unified Prediction Pipeline

The prediction service combines the trained models into a reusable prediction workflow.

The main prediction process is:

```text
Network Flow
     |
     v
Feature Alignment
     |
     v
Data Cleaning
     |
     +-----------------------+
     |                       |
     v                       v
Random Forest          Isolation Forest
Attack Detection       Anomaly Detection
     |                       |
     +-----------+-----------+
                 |
                 v
          Risk Score
                 |
                 v
        Risk Classification
                 |
                 v
       Attack-Type Model
                 |
                 v
        Prediction Result