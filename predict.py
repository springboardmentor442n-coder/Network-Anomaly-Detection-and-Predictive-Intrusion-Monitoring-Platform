import joblib
import pandas as pd


# Load trained models
binary_model = joblib.load("model_random_forest.pkl")
attack_model = joblib.load("model_attack_classifier.pkl")


# Load preprocessing information
preprocessing_medians = joblib.load(
    "binary_preprocessing_medians.pkl"
)

feature_columns = joblib.load(
    "feature_columns.pkl"
)


def preprocess_data(X):

    X = X.copy()

    # Keep exactly the same 78 features
    # and in the same order used during training
    X = X[feature_columns]

    # Handle negative values
    # using medians learned from training data
    for col, median_value in preprocessing_medians.items():

        X.loc[X[col] < 0, col] = None

        X[col] = X[col].fillna(median_value)

    return X


def predict_traffic(X):

    # Preprocess the incoming data
    X = preprocess_data(X)

    # Model 1: BENIGN or ATTACK
    binary_prediction = binary_model.predict(X)[0]

    if binary_prediction == 0:

        return {
            "prediction": "BENIGN",
            "attack_type": None
        }

    # Model 2: Specific attack type
    attack_prediction = attack_model.predict(X)[0]

    return {
        "prediction": "ATTACK",
        "attack_type": attack_prediction
    }


# Test with one real row
df = pd.read_csv(
    "data/cleaned/Wednesday-workingHours.pcap_ISCX_cleaned.csv"
)

sample = df.drop(columns=["Label"]).iloc[[78883]]

print("Sample shape:", sample.shape)


# Make prediction
result = predict_traffic(sample)

print("Predicted:", result)


# Compare with actual label
actual_label = df.iloc[78883]["Label"]

print("Actual:", actual_label)