# NetShield AI - System Architecture

## 1. System Overview

NetShield AI is an AI-powered network security platform designed to monitor network traffic, identify abnormal behavior, classify potential attacks, calculate risk, and generate security alerts.

The platform combines:

- Live network packet monitoring
- Protocol analysis
- Traffic analytics
- Machine learning-based anomaly detection
- Attack classification
- Risk scoring
- Alert management
- Security analytics
- Role-based access control

---

## 2. High-Level Architecture

```text
                    NETWORK ENVIRONMENT
                           |
                           v
                  +-------------------+
                  |  Npcap / Scapy    |
                  | Packet Capture    |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Packet Processing |
                  | & Protocol        |
                  | Analysis          |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Traffic Analytics |
                  | - Packet Count    |
                  | - Bytes           |
                  | - Protocols       |
                  | - IP Statistics   |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Feature Extraction|
                  | & Preprocessing   |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  |   ML Prediction   |
                  |-------------------|
                  | Random Forest     |
                  | Isolation Forest  |
                  | Attack Classifier |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Risk Scoring      |
                  | & Threat Analysis |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Alert Management  |
                  | Priority / Status |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Analytics         |
                  | Dashboard         |
                  +-------------------+
                            ^
                            |
                  +-------------------+
                  | Authentication &  |
                  | RBAC              |
                  +-------------------+