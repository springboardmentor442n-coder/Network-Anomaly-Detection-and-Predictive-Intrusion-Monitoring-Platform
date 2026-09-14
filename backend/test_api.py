import os
import requests
import pandas as pd


# ============================================================
# CONFIGURATION
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
        "cicids2017_binary_ml_ready.csv",
    )
)

BASE_URL = "http://127.0.0.1:8000"

LOGIN_URL = f"{BASE_URL}/auth/login"
PREDICTION_URL = f"{BASE_URL}/prediction"
USERNAME = "admin"
PASSWORD = input("Enter admin password: ")


# ============================================================
# LOAD DATASET
# ============================================================

print("Loading dataset...")

data = pd.read_csv(
    DATA_PATH,
    nrows=30000,
)

print("Dataset loaded successfully!")
print("Test dataset shape:", data.shape)


# ============================================================
# CHECK REQUIRED COLUMN
# ============================================================

if "Binary_Label" not in data.columns:
    raise RuntimeError(
        "ERROR: Binary_Label column not found!"
    )


# ============================================================
# FIND BENIGN AND ATTACK SAMPLES
# ============================================================

benign_rows = data[
    data["Binary_Label"] == 0
]

attack_rows = data[
    data["Binary_Label"] == 1
]

if benign_rows.empty:
    raise RuntimeError(
        "ERROR: No benign sample found in the test dataset."
    )

if attack_rows.empty:
    raise RuntimeError(
        "ERROR: No attack sample found in the test dataset."
    )

benign_index = benign_rows.index[0]
attack_index = attack_rows.index[0]

print(
    "\nBenign sample index:",
    benign_index,
)

print(
    "Attack sample index:",
    attack_index,
)


# ============================================================
# SELECT SAMPLES
# ============================================================

benign_flow = data.iloc[benign_index]

attack_flow = data.iloc[attack_index]


# ============================================================
# VERIFY SAMPLES
# ============================================================

print("\n" + "=" * 60)
print("BENIGN ROW CHECK")
print("=" * 60)

print(
    "Binary_Label:",
    benign_flow["Binary_Label"],
)


print("\n" + "=" * 60)
print("ATTACK ROW CHECK")
print("=" * 60)

print(
    "Binary_Label:",
    attack_flow["Binary_Label"],
)


# ============================================================
# LOGIN
# ============================================================

def get_access_token():
    """
    Authenticate using the JSON LoginRequest expected by
    the FastAPI /auth/login endpoint.
    """

    print("\n" + "=" * 60)
    print("AUTHENTICATION TEST")
    print("=" * 60)

    try:
        response = requests.post(
            LOGIN_URL,
            json={
                "username": USERNAME,
                "password": PASSWORD,
            },
            timeout=30,
        )

        print(
            "Login HTTP Status:",
            response.status_code,
        )

        if response.status_code != 200:
            print("Login Error:")
            print(response.text)
            return None

        response_data = response.json()

        access_token = response_data.get(
            "access_token"
        )

        if not access_token:
            print(
                "ERROR: access_token missing from login response."
            )
            return None

        print("Authentication successful.")
        print(
            "Username:",
            response_data.get("username"),
        )
        print(
            "Role:",
            response_data.get("role"),
        )

        return access_token

    except requests.exceptions.ConnectionError:
        print(
            "ERROR: Could not connect to FastAPI server."
        )
        print(
            "Make sure the FastAPI server is running."
        )
        return None

    except requests.exceptions.Timeout:
        print(
            "ERROR: Authentication request timed out."
        )
        return None

    except requests.exceptions.RequestException as error:
        print(
            "ERROR: Login request failed."
        )
        print(
            f"{type(error).__name__}: {error}"
        )
        return None


# ============================================================
# PREDICTION TEST HELPER
# ============================================================

def run_flow_api_test(
    flow,
    flow_type,
    access_token,
):
    """
    Send one network flow to the authenticated
    FastAPI prediction endpoint.
    """

    print("\n" + "=" * 60)
    print(flow_type)
    print("=" * 60)

    features = flow.drop(
        labels=[
            "Binary_Label",
            "Label",
        ],
        errors="ignore",
    ).to_dict()

    headers = {
        "Authorization": (
            f"Bearer {access_token}"
        )
    }

    try:
        response = requests.post(
            PREDICTION_URL,
            headers=headers,
            json={
                "features": features
            },
            timeout=30,
        )

        print(
            "HTTP Status:",
            response.status_code,
        )

        if response.status_code == 200:
            print("API Response:")

            result = response.json()

            print(
                "Prediction:",
                result.get("prediction"),
            )

            print(
                "Attack Probability:",
                result.get("attack_probability"),
            )

            print(
                "Attack Type:",
                result.get("attack_type"),
            )

            print(
                "Attack Type Confidence:",
                result.get("attack_type_confidence"),
            )

            print(
                "Anomaly:",
                result.get("anomaly"),
            )

            print(
                "Risk Score:",
                result.get("risk_score"),
            )

            print(
                "Risk Level:",
                result.get("risk_level"),
            )

            print(
                "Prediction ID:",
                result.get("prediction_id"),
            )

            print(
                "Message:",
                result.get("message"),
            )

        else:
            print("API Error:")
            print(response.text)

    except requests.exceptions.ConnectionError:
        print(
            "ERROR: Could not connect to FastAPI server."
        )
        print(
            "Make sure the FastAPI server is running."
        )

    except requests.exceptions.Timeout:
        print(
            "ERROR: Prediction request timed out."
        )

    except requests.exceptions.RequestException as error:
        print(
            "ERROR: Prediction request failed."
        )
        print(
            f"{type(error).__name__}: {error}"
        )


# ============================================================
# MAIN TEST FLOW
# ============================================================

access_token = get_access_token()

if access_token is None:
    print("\n" + "=" * 60)
    print("FASTAPI + ML END-TO-END TEST STOPPED")
    print("=" * 60)
    print(
        "Authentication failed, so prediction tests were skipped."
    )
    raise SystemExit(1)


# ============================================================
# TEST BENIGN FLOW
# ============================================================

run_flow_api_test(
    benign_flow,
    "BENIGN FLOW API TEST",
    access_token,
)


# ============================================================
# TEST ATTACK FLOW
# ============================================================

run_flow_api_test(
    attack_flow,
    "ATTACK FLOW API TEST",
    access_token,
)


# ============================================================
# FINAL MESSAGE
# ============================================================

print("\n" + "=" * 60)
print("FASTAPI + ML END-TO-END TEST COMPLETED")
print("=" * 60)