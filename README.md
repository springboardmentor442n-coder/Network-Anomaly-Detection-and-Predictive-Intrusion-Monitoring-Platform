# 🛡️ NetShield AI - Network Anomaly Detection & Threat Monitoring System

[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](LICENSE)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI: 0.115](https://img.shields.io/badge/FastAPI-0.115-emerald.svg)](https://fastapi.tiangolo.com/)
[![React: 18](https://img.shields.io/badge/React-18-cyan.svg)](https://reactjs.org/)
[![XGBoost: Dual Engine](https://img.shields.io/badge/XGBoost-Dual%20Engine-purple.svg)](https://xgboost.readthedocs.io/)

**NetShield AI** is an enterprise-grade, AI-powered **Security Operations Center (SOC) Platform** built for real-time network anomaly detection, PCAP forensic packet capture analysis, Explainable AI (XAI) threat attribution, and automated incident response.

---

## 🌟 Key Features

- 🧠 **Dual XGBoost AI Model Stack**:
  - **CICIDS2017 Model**: **99.89% Accuracy** trained on 52 directional flow features (DoS/DDoS, Botnets, Port Scans).
  - **UNSW-NB15 Model**: **84.73% Accuracy** trained on payload exploit features (Fuzzers, Shellcode, Backdoors).
- 🎭 **Role-Based Access Control (RBAC)**:
  - Strict role-tailored workspace isolation (**Admin**, **Security Analyst**, **SOC Operator**) backed by JWT tokens.
- 📁 **Real `.pcap` Packet Capture Forensic Inspector**:
  - Upload raw Wireshark `.pcap` / `.pcapng` capture files for batch AI anomaly extraction powered by `Scapy`.
- 🔍 **Explainable AI (XAI Feature Drivers)**:
  - Identifies and explains top feature metrics (e.g. `Flow Bytes/sec = 5.7M B/s (+570% velocity surge)`) driving threat scores.
- 🛡️ **Automated Firewall Remediation**:
  - 1-click script exporter generating ready-to-use drop rules for Linux `iptables`, Ubuntu `ufw`, Windows `PowerShell`, and `pfSense`.
- 🔔 **Real-Time Webhook Alert Integration**:
  - Dispatches formatted alert payloads to **Slack**, **Discord**, or **webhook.site**.

---

## 🚀 Quick Start (Local Setup)

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate | On Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup (React / Vite)
```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:3000`** in your browser!

---

## 🐋 1-Click Production Docker Deployment

```bash
docker compose up -d --build
```

- **Frontend Console**: `http://localhost` (Port 80)
- **Backend API Docs**: `http://localhost:8000/docs` (Port 8000)

---

## 🔐 System Authenticated Credentials

| User Email | Password | Assigned Role | Workspace Permissions |
| :--- | :--- | :--- | :--- |
| **`admin@netshield.ai`** | `admin123` | **Admin** | All 6 Tabs (Full Control & User Management) |
| **`analyst@netshield.ai`** | `analyst123` | **Security Analyst** | 5 Operational Tabs (AI Predictor, Alerts, IP Blocking) |
| **`operator@netshield.ai`** | `operator123` | **SOC Operator** | 3 Read-Only Monitoring Tabs |

---

## 👥 Contributing Guidelines (For Interns / Collaborators)

All interns added as collaborators to this repository must follow the branch workflow below. **Direct commits or pushes to the `main` branch are not allowed.**

> Note: `main` only contains the `LICENSE` and initial template — it is not used for active development. There is no need to pull the latest `main` into your branch at any point.

### 1. Branch Naming

- Every intern must create their own branch off `main`, named after themselves.
- Suggested naming convention: `firstname-lastname` (all lowercase, hyphen-separated).
  - Example: `lakshman`, `john-doe`, `aisha-khan`

### 2. How to Create Your Branch

**Option A — Clone and push (recommended)**

```bash
# Clone the repository
git clone https://github.com/springboardmentor442n-coder/Network-Anomaly-Detection-and-Predictive-Intrusion-Monitoring-Platform.git

# Move into the project folder
cd Network-Anomaly-Detection-and-Predictive-Intrusion-Monitoring-Platform

# Create and switch to your own branch (off main)
git checkout -b your-name

# ... make your changes ...

# Stage, commit, and push your changes to YOUR branch only
git add .
git commit -m "Describe your change here"
git push origin your-name
```

**Option B — GitHub UI upload**

1. Go to the repository on GitHub.
2. Switch the branch dropdown from `main` to your own branch (create it first via **Branch: main → View all branches → New branch**, named after yourself).
3. Once on your branch, use **Add file → Upload files** to upload your code.
4. Commit directly to your branch (not `main`).

### 3. Rules

- ❌ Do **not** push or upload code directly to `main`.
- ❌ Do **not** push code to another intern's branch.
- ✅ Only push/upload code to the branch that carries your own name.
- Keep uploading/pushing your code to your branch regularly as you make progress. No pull requests are required — your branch itself is the deliverable.

### 4. Summary

| Action | Allowed? |
|---|---|
| Push to `main` directly | ❌ No |
| Create your own branch from `main` | ✅ Yes |
| Push/upload code to your own branch | ✅ Yes |
| Push/upload code to someone else's branch | ❌ No |
| Open a Pull Request | Not required |

---

## 📄 License
This project is released under the **MIT License**.
