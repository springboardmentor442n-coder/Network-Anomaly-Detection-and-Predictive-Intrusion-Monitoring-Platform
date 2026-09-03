
import pandas as pd
import glob
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# -----------------------------
# Load CICIDS2017
# -----------------------------
cicids_path = os.path.join(BASE_DIR, "data", "MachineLearningCVE")

cicids_files = glob.glob(os.path.join(cicids_path, "*.csv"))

cicids_data = []

for file in cicids_files:
    try:
        df = pd.read_csv(file, encoding="latin1")
        cicids_data.append(df)
        print(f"Loaded CICIDS file: {os.path.basename(file)}")
        print(f"Rows: {len(df)}")
    except Exception as e:
        print(f"Error loading {file}: {e}")

if cicids_data:
    cicids_df = pd.concat(cicids_data, ignore_index=True)
else:
    cicids_df = pd.DataFrame()

print("\nCICIDS2017 total rows:", len(cicids_df))


# -----------------------------
# Load UNSW-NB15
# -----------------------------
unsw_path = os.path.join(BASE_DIR, "data", "UNSW-NB15")

train_file = os.path.join(
    unsw_path,
    "UNSW_NB15_training-set.csv"
)

test_file = os.path.join(
    unsw_path,
    "UNSW_NB15_testing-set.csv"
)

unsw_train = pd.read_csv(train_file)
unsw_test = pd.read_csv(test_file)

print("UNSW-NB15 training rows:", len(unsw_train))
print("UNSW-NB15 testing rows:", len(unsw_test))

print("\nDatasets loaded successfully!")