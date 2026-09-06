import os
import requests
import pandas as pd


# ============================================================
# DATASET PATH
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_PATH = os.path.abspath(
    os.path.join(
        BASE_DIR,
        "..",
        "ml",
        "data",
        "CICIDS2017",
        "ml_ready",
        "cicids2017_binary_ml_ready.csv"
    )
)

API_URL = "http://127.0.0.1:8000/api/prediction/predict"


# ============================================================
# LOAD DATASET
# ============================================================

print("Loading dataset...")
data = pd.read_csv(DATA_PATH, nrows=30000)

print("Dataset loaded successfully!")
print("Test dataset shape:", data.shape)


# ============================================================
# CHECK REQUIRED COLUMN
# ============================================================

if "Binary_Label" not in data.columns:

    print("ERROR: Binary_Label column not found!")

    exit()


# ============================================================
# FIND BENIGN AND ATTACK SAMPLES
# ============================================================

benign_index = data[data["Binary_Label"] == 0].index[0]
attack_index = data[data["Binary_Label"] == 1].index[0]

print("\nBenign sample index:", benign_index)
print("Attack sample index:", attack_index)


# ============================================================
# SELECT SAMPLES
# ============================================================

benign_flow = data.iloc[benign_index]

attack_flow = data.iloc[attack_index]


# ============================================================
# VERIFY THE SAMPLES
# ============================================================

print("\n" + "=" * 60)
print("BENIGN ROW CHECK")
print("=" * 60)

print("Binary_Label:", benign_flow["Binary_Label"])


print("\n" + "=" * 60)
print("ATTACK ROW CHECK")
print("=" * 60)

print("Binary_Label:", attack_flow["Binary_Label"])


# ============================================================
# TEST FUNCTION
# ============================================================

def test_flow(flow, flow_type):

    print("\n" + "=" * 60)
    print(flow_type)
    print("=" * 60)

    # Remove label columns before sending to ML model
    features = flow.drop(
        labels=["Binary_Label", "Label"],
        errors="ignore"
    ).to_dict()

    try:

        response = requests.post(
            API_URL,
            json={
                "features": features
            }
        )

        print("HTTP Status:", response.status_code)

        if response.status_code == 200:

            print("API Response:")
            print(response.json())

        else:

            print("API Error:")
            print(response.text)

    except requests.exceptions.ConnectionError:

        print("ERROR: Could not connect to FastAPI server.")
        print("Make sure the FastAPI server is running.")


# ============================================================
# TEST BENIGN FLOW
# ============================================================

test_flow(
    benign_flow,
    "BENIGN FLOW API TEST"
)


# ============================================================
# TEST ATTACK FLOW
# ============================================================

test_flow(
    attack_flow,
    "ATTACK FLOW API TEST"
)


# ============================================================
# FINAL MESSAGE
# ============================================================

print("\n" + "=" * 60)
print("FASTAPI + ML END-TO-END TEST COMPLETED")
print("=" * 60)