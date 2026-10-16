"""
NETSHIELD AI - Synthetic CICIDS2017 Sample Dataset Generator
Generates realistic CICIDS2017 CSV flow records for testing & offline training.
"""
import os
import pandas as pd
import numpy as np

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "CICIDS2017_sample.csv")

COLUMNS = [
    " Destination Port", " Flow Duration", " Total Fwd Packets", " Total Backward Packets",
    "Total Length of Fwd Packets", " Total Length of Bwd Packets", " Fwd Packet Length Max",
    " Fwd Packet Length Min", " Fwd Packet Length Mean", " Fwd Packet Length Std",
    "Bwd Packet Length Max", " Bwd Packet Length Min", " Bwd Packet Length Mean",
    " Bwd Packet Length Std", "Flow Bytes/s", " Flow Packets/s", " Flow IAT Mean",
    " Flow IAT Std", " Flow IAT Max", " Flow IAT Min", "Fwd IAT Total", " Fwd IAT Mean",
    " Fwd IAT Std", " Fwd IAT Max", " Fwd IAT Min", "Bwd IAT Total", " Bwd IAT Mean",
    " Bwd IAT Std", " Bwd IAT Max", " Bwd IAT Min", "Fwd PSH Flags", " Bwd PSH Flags",
    " Fwd URG Flags", " Bwd URG Flags", " Fwd Header Length", " Bwd Header Length",
    "Fwd Packets/s", " Bwd Packets/s", " Min Packet Length", " Max Packet Length",
    " Packet Length Mean", " Packet Length Std", " Packet Length Variance",
    "FIN Flag Count", " SYN Flag Count", " RST Flag Count", " PSH Flag Count",
    " ACK Flag Count", " URG Flag Count", " CWE Flag Count", " ECE Flag Count",
    " Down/Up Ratio", " Average Packet Size", " Avg Fwd Segment Size",
    " Avg Bwd Segment Size", " Fwd Header Length.1", "Fwd Avg Bytes/Bulk",
    " Fwd Avg Packets/Bulk", " Fwd Avg Bulk Rate", " Bwd Avg Bytes/Bulk",
    " Bwd Avg Packets/Bulk", " Bwd Avg Bulk Rate", "Subflow Fwd Packets",
    " Subflow Fwd Bytes", " Subflow Bwd Packets", " Subflow Bwd Bytes",
    "Init_Win_bytes_forward", " Init_Win_bytes_backward", " act_data_pkt_fwd",
    " min_seg_size_forward", "Active Mean", " Active Std", " Active Max",
    " Active Min", "Idle Mean", " Idle Std", " Idle Max", " Idle Min", " Label"
]

def generate_cicids2017_csv(num_rows: int = 5000):
    print(f"Generating {num_rows} CICIDS2017 flow samples...")
    np.random.seed(42)

    # 70% Benign, 10% DDoS, 10% PortScan, 10% Brute Force
    labels = np.random.choice(
        ["BENIGN", "DDoS", "PortScan", "SSH-Patator"],
        size=num_rows,
        p=[0.7, 0.1, 0.1, 0.1]
    )

    data = np.random.exponential(scale=100.0, size=(num_rows, len(COLUMNS) - 1))

    # Add realistic attack signatures
    for idx, label in enumerate(labels):
        if label == "DDoS":
            data[idx, 0] = 80  # Dest Port
            data[idx, 1] *= 10  # Duration
            data[idx, 2] *= 20  # High Fwd Packets
        elif label == "PortScan":
            data[idx, 0] = np.random.randint(1, 65535)
            data[idx, 1] = np.random.randint(10, 500)
        elif label == "SSH-Patator":
            data[idx, 0] = 22  # SSH Port
            data[idx, 2] = 15

    df = pd.DataFrame(data, columns=COLUMNS[:-1])
    df[" Label"] = labels

    df.to_csv(OUTPUT_FILE, index=False)
    print(f"[SUCCESS] CICIDS2017 sample saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_cicids2017_csv()
