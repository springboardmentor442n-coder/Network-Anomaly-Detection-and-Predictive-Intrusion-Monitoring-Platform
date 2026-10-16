"""
NETSHIELD AI - Synthetic CICIDS2017 Sample Dataset Generator
Generates realistic CICIDS2017 CSV flow records including standard network flow
headers (Flow ID, Source IP, Source Port, Destination IP, Destination Port, Protocol, Timestamp)
and the 78 standard numeric flow features for offline training and live intrusion detection.
"""
import os
import shutil
import pandas as pd
import numpy as np

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "CICIDS2017_sample.csv")

# Standard 78 flow features in CICIDS2017
FLOW_FEATURES = [
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
    " Active Min", "Idle Mean", " Idle Std", " Idle Max", " Idle Min"
]

def generate_cicids2017_csv(num_rows: int = 5000):
    print(f"Generating {num_rows} realistic CICIDS2017 flow samples with network metadata...")
    np.random.seed(42)

    # 70% Benign, 10% DDoS, 10% PortScan, 10% SSH-Patator
    labels = np.random.choice(
        ["BENIGN", "DDoS", "PortScan", "SSH-Patator"],
        size=num_rows,
        p=[0.7, 0.1, 0.1, 0.1]
    )

    data = np.random.exponential(scale=100.0, size=(num_rows, len(FLOW_FEATURES)))

    flow_ids = []
    src_ips = []
    src_ports = []
    dst_ips = []
    protocols = []
    timestamps = []

    benign_srcs = ["192.168.10.3", "192.168.10.5", "192.168.10.9", "192.168.10.15", "192.168.10.25"]
    benign_dsts = ["192.168.10.50", "192.168.10.51", "8.8.8.8", "104.16.207.165"]

    # Add realistic attack signatures and network endpoints
    for idx, label in enumerate(labels):
        if label == "DDoS":
            dst_port = 80
            src_ip = "172.16.0.1"
            dst_ip = "192.168.10.50"
            src_port = 49152 + (idx % 10000)
            proto = 6  # TCP
            ts = "07/07/2017 03:15:00 PM"
            data[idx, 0] = dst_port  # Dest Port
            data[idx, 1] *= 10       # Duration
            data[idx, 2] *= 20       # High Fwd Packets
        elif label == "PortScan":
            dst_port = int(np.random.randint(1, 65535))
            src_ip = "192.168.10.14"
            dst_ip = "192.168.10.50"
            src_port = int(np.random.randint(40000, 60000))
            proto = 6  # TCP
            ts = "07/07/2017 10:20:00 AM"
            data[idx, 0] = dst_port
            data[idx, 1] = np.random.randint(10, 500)
        elif label == "SSH-Patator":
            dst_port = 22
            src_ip = "172.16.0.1"
            dst_ip = "192.168.10.50"
            src_port = int(np.random.randint(40000, 60000))
            proto = 6  # TCP
            ts = "04/07/2017 11:45:00 AM"
            data[idx, 0] = dst_port
            data[idx, 2] = 15
        else:  # BENIGN
            dst_port = int(np.random.choice([80, 443, 53, 8080, 21]))
            src_ip = benign_srcs[idx % len(benign_srcs)]
            dst_ip = benign_dsts[idx % len(benign_dsts)]
            src_port = int(np.random.randint(49152, 65535))
            proto = int(np.random.choice([6, 17], p=[0.85, 0.15]))
            hour = (idx % 12) + 1
            minute = idx % 60
            ts = f"07/07/2017 {hour:02d}:{minute:02d}:00 AM"
            data[idx, 0] = dst_port

        flow_id = f"{src_ip}-{dst_ip}-{src_port}-{dst_port}-{proto}"
        flow_ids.append(flow_id)
        src_ips.append(src_ip)
        src_ports.append(src_port)
        dst_ips.append(dst_ip)
        protocols.append(proto)
        timestamps.append(ts)

    df_dict = {
        "Flow ID": flow_ids,
        " Source IP": src_ips,
        " Source Port": src_ports,
        " Destination IP": dst_ips,
        " Destination Port": data[:, 0],
        " Protocol": protocols,
        " Timestamp": timestamps,
    }

    # Add the remaining 77 flow features
    for i, col in enumerate(FLOW_FEATURES[1:], 1):
        df_dict[col] = data[:, i]

    df_dict[" Label"] = labels

    df = pd.DataFrame(df_dict)

    # Save to primary data directory
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"[SUCCESS] CICIDS2017 sample saved to: {OUTPUT_FILE} ({len(df)} rows, {len(df.columns)} cols)")

    # Also sync to backend/data directory
    backend_data_dir = os.path.join(os.path.dirname(OUTPUT_DIR), "backend", "data")
    if os.path.exists(backend_data_dir):
        backend_file = os.path.join(backend_data_dir, "CICIDS2017_sample.csv")
        df.to_csv(backend_file, index=False)
        print(f"[SUCCESS] Synced sample to backend: {backend_file}")

if __name__ == "__main__":
    generate_cicids2017_csv()
