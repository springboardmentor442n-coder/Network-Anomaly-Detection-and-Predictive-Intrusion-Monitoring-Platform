# NetShield AI - Demo PCAP Datasets & Kaggle Sources

This directory contains pre-generated, ready-to-test `.pcap` files specifically structured for testing and demonstrating the **NetShield AI SOC Platform**'s forensic PCAP inspection engine.

---

## 1. Included Ready-to-Demo PCAPs

| File Name | Description | Expected AI Verdict |
| :--- | :--- | :--- |
| [`demo_normal_traffic.pcap`](file:///c:/Users/saranya/OneDrive/Desktop/SpringBoardProject/sample_pcaps/demo_normal_traffic.pcap) | Standard DNS lookup queries and HTTP web browsing flows. | **0 Threats / 4 Clean Flows (BENIGN)** |
| [`demo_ddos_syn_flood.pcap`](file:///c:/Users/saranya/OneDrive/Desktop/SpringBoardProject/sample_pcaps/demo_ddos_syn_flood.pcap) | High-velocity burst of TCP SYN packets simulating volumetric DoS/DDoS. | **1 Threat Flow (CRITICAL / ATTACK)** |
| [`demo_port_scan_recon.pcap`](file:///c:/Users/saranya/OneDrive/Desktop/SpringBoardProject/sample_pcaps/demo_port_scan_recon.pcap) | Multi-port network scanning and probe reconnaissance across service ports. | **1 Threat Flow (HIGH / ATTACK)** |
| [`demo_mixed_enterprise_soc.pcap`](file:///c:/Users/saranya/OneDrive/Desktop/SpringBoardProject/sample_pcaps/demo_mixed_enterprise_soc.pcap) | Realistic corporate SOC network capture containing both legitimate web traffic and blended attacks. | **2 Malicious Threat Flows / 4 Clean Flows** |

### How to Demo in the UI:
1. Start your NetShield frontend (`npm run dev`) and backend (`uvicorn app.main:app --reload`).
2. Navigate to the **Live Traffic & PCAP** tab.
3. Under **"Feature 1: Real PCAP / PCAPNG Packet File Inspector"**, click **Select PCAP File**.
4. Choose any of the files in [`sample_pcaps/`](file:///c:/Users/saranya/OneDrive/Desktop/SpringBoardProject/sample_pcaps).
5. Watch the dual-engine AI parse packet headers with Scapy, evaluate risk scores, trigger XAI drivers, and display mitigation actions.

---

## 2. Public Kaggle PCAP Datasets

If you want large-scale real-world packet captures from Kaggle or public repositories, here are the top curated datasets:

### A. [Attack Scenario Dataset in PCAP Format](https://www.kaggle.com/datasets/agustindelarosa/attack-scenario-dataset-in-pcap-format) (Kaggle)
* **Author:** Agustin Dela Rosa
* **Description:** Real PCAP captures created for benchmarking Network Intrusion Detection Systems (NIDS) and AI models. Contains separate PCAP files for attack scenarios (DDoS, port scans, brute force) and benign traffic.
* **Download via Kaggle CLI:**
  ```bash
  kaggle datasets download -d agustindelarosa/attack-scenario-dataset-in-pcap-format
  ```

### B. [Kitsune Network Attack Dataset](https://www.kaggle.com/datasets/ymirsky/kitsune-network-attack-dataset) (Kaggle)
* **Author:** Yisroel Mirsky
* **Description:** Captures from 9 real network attacks in commercial/IoT environments (Mirai botnet, SYN DoS, SSL Renegotiation, OS Scan, Active Wiretap, etc.). Contains both raw PCAP files and extracted CSVs.
* **Download via Kaggle CLI:**
  ```bash
  kaggle datasets download -d ymirsky/kitsune-network-attack-dataset
  ```

### C. [TII-SSRC-23 Dataset](https://www.kaggle.com/datasets/aliherzalla/tii-ssrc-23-dataset) (Kaggle)
* **Author:** Ali Herzalla
* **Description:** Dual-structure dataset offering both raw PCAP network captures and CSV feature matrices for modern cyber attack evaluation.
* **Download via Kaggle CLI:**
  ```bash
  kaggle datasets download -d aliherzalla/tii-ssrc-23-dataset
  ```

### D. [Canadian Institute for Cybersecurity (CIC-IDS2017 Official Raw PCAPs)](https://www.unb.ca/cic/datasets/ids-2017.html)
* **Source:** University of New Brunswick (UNB)
* **Note on Kaggle CICIDS2017:** Most Kaggle datasets for CIC-IDS2017 contain CSV files extracted with CICFlowMeter (e.g. `Friday-WorkingHours.pcap_ISCX.csv`). If you require the original uncompressed multi-gigabyte raw PCAPs that CICIDS2017 was created from, they are hosted on UNB's portal.

---

## 3. Regenerating or Customizing Demo PCAPs

You can generate more packets or adjust attack signatures at any time by running:
```bash
cd backend
python generate_demo_pcaps.py
```
