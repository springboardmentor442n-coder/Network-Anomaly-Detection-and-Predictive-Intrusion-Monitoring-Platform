# NetShield AI

## AI-Powered Network Anomaly Detection and Predictive Intrusion Monitoring Platform

NetShield AI is a network-security monitoring platform that combines live network traffic analysis with machine-learning-based attack detection, anomaly detection, risk scoring, attack classification, and security alert management.

The system is designed as a development and demonstration platform for monitoring network behavior and identifying potentially malicious activity.

---

## 1. Key Features

- Live network packet capture using Scapy/Npcap
- Network traffic and protocol analysis
- Real-time flow feature extraction
- Random Forest attack detection
- Isolation Forest anomaly detection
- Attack-type classification
- Risk scoring from 0 to 100
- Risk levels: LOW, MEDIUM, HIGH, CRITICAL
- Automatic security-alert generation
- Alert lifecycle management
- JWT authentication
- Role-based access control
- SQLite database persistence
- FastAPI backend
- React/Vite frontend
- Real-time monitoring dashboard
- Automated pytest tests
- End-to-end API and ML validation

---

## 2. System Architecture

```text
Network Traffic
       |
       v
Packet Capture
       |
       v
Packet Processing
       |
       v
Traffic Analytics
       |
       v
Real-Time Flow Feature Extraction
       |
       v
+-------------------------------+
|        ML Prediction          |
|                               |
| Random Forest Attack Detection|
| Isolation Forest Anomaly      |
| Attack-Type Classification    |
+---------------+---------------+
                |
                v
           Risk Scoring
                |
                v
          Alert Generation
                |
                v
        SQLite Persistence
                |
                v
        FastAPI Backend
                |
                v
        React Dashboard