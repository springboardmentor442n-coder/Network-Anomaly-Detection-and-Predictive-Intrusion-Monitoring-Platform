
import pandas as pd
import glob
import os

DATA_PATH = os.path.join(
    os.path.dirname(__file__),
    "data",
    "MachineLearningCVE",
    "*.csv"
)

files = glob.glob(DATA_PATH)

total_records = 0
benign_records = 0
attack_records = 0
attack_types = {}

for file in files:
    df = pd.read_csv(file, low_memory=False)

    total_records += len(df)

    if "Label" in df.columns:
        labels = df["Label"].astype(str).str.strip()

        benign_records += (labels == "BENIGN").sum()

        attacks = labels[labels != "BENIGN"]
        attack_records += len(attacks)

        for attack in attacks:
            attack_types[attack] = attack_types.get(attack, 0) + 1

print("===== NETSHIELD TRAFFIC ANALYTICS =====")
print("Total Traffic Records:", total_records)
print("Benign Traffic:", benign_records)
print("Attack Traffic:", attack_records)

print("\nAttack Types:")
for attack, count in attack_types.items():
    print(attack, ":", count)