
import os
import glob
import pandas as pd


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(
    BASE_DIR,
    "data",
    "MachineLearningCVE"
)


print("Checking CICIDS2017 attack labels...\n")


files = glob.glob(
    os.path.join(DATA_DIR, "*.csv")
)


all_labels = []


for file in files:

    print("Reading:", os.path.basename(file))

    df = pd.read_csv(
        file,
        encoding="latin1"
    )

    df.columns = df.columns.str.strip()

    if "Label" in df.columns:

        labels = (
            df["Label"]
            .astype(str)
            .str.strip()
        )

        all_labels.extend(
            labels.tolist()
        )


print("\n==========================================")
print("ATTACK TYPE COUNTS")
print("==========================================")

label_counts = pd.Series(
    all_labels
).value_counts()


print(label_counts)


print("\n==========================================")
print("UNIQUE ATTACK TYPES")
print("==========================================")

for label in label_counts.index:

    print(label)


print("\n==========================================")
print("Total Records:", len(all_labels))
print("==========================================")