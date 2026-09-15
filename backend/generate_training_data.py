import pandas as pd
import numpy as np
import joblib
import os

# Load the exact 70 features used by the model
features = joblib.load("model_features.pkl")

print("Features loaded:", len(features))

np.random.seed(42)

# Number of samples
normal_samples = 1000
attack_samples = 500

# Generate normal traffic
normal_data = {}

for feature in features:
    if feature == "Destination Port":
        normal_data[feature] = np.random.randint(20, 10000, normal_samples)
    else:
        normal_data[feature] = np.abs(
            np.random.normal(100, 50, normal_samples)
        )

normal_df = pd.DataFrame(normal_data)
normal_df["Label"] = "BENIGN"


# Generate attack traffic
attack_data = {}

for feature in features:
    if feature == "Destination Port":
        attack_data[feature] = np.random.randint(1, 65535, attack_samples)
    else:
        attack_data[feature] = np.abs(
            np.random.normal(500, 250, attack_samples)
        )

attack_df = pd.DataFrame(attack_data)
attack_df["Label"] = "ATTACK"


# Combine datasets
df = pd.concat([normal_df, attack_df], ignore_index=True)

# Shuffle
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# Save
output_folder = "data/CICIDS2017"
os.makedirs(output_folder, exist_ok=True)

output_file = os.path.join(
    output_folder,
    "NetShield_Training_Dataset.csv"
)

df.to_csv(output_file, index=False)

print("\nTraining dataset created successfully!")
print("File:", output_file)
print("Total rows:", len(df))
print("Normal:", (df["Label"] == "BENIGN").sum())
print("Attack:", (df["Label"] == "ATTACK").sum())
print("Features:", len(features))