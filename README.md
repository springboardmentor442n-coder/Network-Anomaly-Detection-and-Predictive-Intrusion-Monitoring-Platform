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
  - Strict role-tailored workspace isolation (**Admin**, **Security Analyst**, **SOC Operator**).
- 📁 **Real `.pcap` Packet Capture Inspector**:
  - Upload raw Wireshark `.pcap` / `.pcapng` capture files for batch AI anomaly extraction powered by `Scapy`.
- 🔍 **Explainable AI (XAI Feature Drivers)**:
  - Identifies and explains top feature metrics (e.g. `Flow Bytes/sec = 5.7M B/s (+570% velocity surge)`) driving threat scores.
- 🛡️ **Automated Firewall Remediation**:
  - 1-click script exporter generating ready-to-use drop rules for Linux `iptables`, Ubuntu `ufw`, Windows `PowerShell`, and `pfSense`.
- 🔔 **Real-Time Webhook Alert Integration**:
  - Pushes formatted JSON/Markdown alert payloads to **Slack**, **Discord**, or **webhook.site**.

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

## 📄 License
This project is released under the **MIT License**.
