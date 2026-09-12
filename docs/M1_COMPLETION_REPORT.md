# M1 Completion Report

## NetShield AI

**Project:** AI-Powered Network Anomaly Detection and Predictive Intrusion Monitoring Platform

**Module:** M1 — Network Security Platform Foundation

**Status:** COMPLETED

---

## 1. M1 Overview

M1 establishes the core foundation of the NetShield AI security monitoring platform.

The module integrates:

* React frontend
* FastAPI backend
* SQLite database
* User authentication
* JWT-based authorization
* Role-based access control
* Machine learning prediction service
* Prediction persistence
* Security alert management
* Alert lifecycle management
* Frontend and backend integration

The objective of M1 was to establish a functional and secure foundation that can receive requests, authenticate users, execute ML predictions, store results, generate alerts, and display security information through the web interface.

---

## 2. System Architecture

The completed M1 request flow is:

```text
User
  │
  ▼
React Frontend
  │
  │ JWT Authentication
  ▼
FastAPI Backend
  │
  ├── Authentication
  │
  ├── Authorization
  │
  ├── Prediction API
  │
  └── Alert API
  │
  ▼
ML Prediction Service
  │
  ├── Binary Classification
  ├── Attack Type Classification
  ├── Anomaly Detection
  └── Risk Scoring
  │
  ▼
SQLite Database
  │
  ├── Users
  ├── Predictions
  ├── Alerts
  └── Network Traffic
```

---

## 3. Backend Implementation

The backend is implemented using FastAPI.

### Main backend capabilities

* REST API
* Authentication endpoints
* JWT token generation and validation
* Role-based authorization
* ML prediction endpoint
* Alert creation endpoint
* Alert retrieval endpoint
* Alert status update endpoint
* Health check endpoint
* CORS configuration for frontend communication

### Main API endpoints

| Endpoint                    | Method | Purpose                    |
| --------------------------- | ------ | -------------------------- |
| `/`                         | GET    | API root                   |
| `/health`                   | GET    | Backend health check       |
| `/auth/login`               | POST   | User authentication        |
| `/auth/me`                  | GET    | Current authenticated user |
| `/auth/admin-test`          | GET    | ADMIN authorization test   |
| `/prediction`               | POST   | Execute ML prediction      |
| `/alerts`                   | POST   | Create security alert      |
| `/alerts`                   | GET    | Retrieve stored alerts     |
| `/alerts/{alert_id}/status` | PATCH  | Update alert status        |

---

## 4. Authentication and Security

M1 implements JWT-based authentication.

Users must authenticate before accessing protected API endpoints.

The login process is:

```text
Username + Password
        │
        ▼
Database User Verification
        │
        ▼
Password Hash Verification
        │
        ▼
JWT Access Token
        │
        ▼
Authenticated API Requests
```

Passwords are stored using PBKDF2-SHA256 password hashing.

JWT tokens contain:

* Username
* User role
* Expiration time

Protected endpoints reject requests without valid authentication.

---

## 5. Role-Based Access Control

Two development roles are implemented:

### ADMIN

Administrator users can access administrator-protected functionality.

### ANALYST

Analyst users can access normal security monitoring functionality but do not receive ADMIN-only permissions.

The `/auth/admin-test` endpoint was tested successfully using an ADMIN account.

---

## 6. Database Implementation

SQLite is used as the development database.

The database contains the following tables:

```text
users
predictions
alerts
network_traffic
```

### Users

Stores:

* User ID
* Username
* Password hash
* Role
* Account status
* Creation timestamp

### Predictions

Stores:

* Prediction ID
* Binary prediction
* Attack probability
* Attack type
* Attack type confidence
* Anomaly status
* Risk score
* Risk level
* Creation timestamp

### Alerts

Stores:

* Alert ID
* Prediction
* Attack probability
* Attack type
* Attack type confidence
* Anomaly status
* Risk score
* Risk level
* Source
* Destination
* Alert status
* Creation timestamp

---

## 7. Machine Learning Integration

The M1 backend successfully integrates the ML prediction service.

The prediction pipeline provides:

1. Binary attack prediction
2. Attack probability
3. Attack type classification
4. Attack type confidence
5. Anomaly detection
6. Risk score
7. Risk level

The prediction result is returned through the FastAPI API and stored in the database.

---

## 8. Risk Assessment

The prediction service produces a risk score and risk level.

Supported risk levels are:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

This allows the platform to prioritize potentially dangerous network activity.

---

## 9. Alert Management

Security alerts can be created through the API and persisted in the SQLite database.

The alert system supports:

```text
OPEN
   │
   ▼
ACKNOWLEDGED
   │
   ▼
RESOLVED
```

The alert lifecycle was successfully tested.

A sample security alert used during testing contained:

```text
Attack Type: DDoS
Source: 192.168.1.10
Destination: 192.168.1.20
Risk Level: CRITICAL
Risk Score: 94.1
```

---

## 10. Frontend Integration

The React frontend is connected to the FastAPI backend.

Implemented frontend functionality includes:

* Login page
* JWT token storage
* Role-aware navigation
* Dashboard
* Live Monitoring page
* Alerts page
* Analytics page
* User Management page for ADMIN users
* Logout functionality

The dashboard's Recent Alerts section retrieves alert information from the backend `/alerts` API instead of relying only on hardcoded sample data.

---

## 11. Network Monitoring Components

The project also contains the initial network monitoring components required for the security platform.

### Packet Capture

Scapy is used for packet capture and packet-level analysis.

The capture system records information such as:

* Timestamp
* Source IP
* Destination IP
* Protocol
* Source port
* Destination port
* Packet size

### Traffic Analyzer

The traffic analyzer calculates:

* Total packets
* Total bytes
* Average packet size
* Packets per second
* Bytes per second

### Protocol Analysis

The protocol analysis component provides a basic distribution of observed network protocols.

These components establish the foundation for the later real-time monitoring integration.

---

## 12. M1 Functional Testing

The following tests were successfully completed.

| Test                            | Result |
| ------------------------------- | ------ |
| Swagger API documentation       | PASS   |
| Backend health check            | PASS   |
| User login                      | PASS   |
| JWT token generation            | PASS   |
| JWT authentication              | PASS   |
| ADMIN authorization             | PASS   |
| ML prediction API               | PASS   |
| Prediction database persistence | PASS   |
| Alert creation                  | PASS   |
| Alert database persistence      | PASS   |
| Alert retrieval                 | PASS   |
| Alert status update             | PASS   |
| Alert lifecycle                 | PASS   |
| React frontend login            | PASS   |
| Frontend-backend communication  | PASS   |
| Real alert display in dashboard | PASS   |

---

## 13. M1 Validation Results

### Authentication

```text
Status: PASS
```

### Authorization

```text
Status: PASS
```

### ML Prediction

```text
Status: PASS
```

### Database Persistence

```text
Status: PASS
```

### Alert Management

```text
Status: PASS
```

### Frontend Integration

```text
Status: PASS
```

### API Health

```text
Status: PASS
```

---

## 14. M1 Completion Criteria

| Requirement                   | Status    |
| ----------------------------- | --------- |
| Backend operational           | COMPLETED |
| Database operational          | COMPLETED |
| Authentication implemented    | COMPLETED |
| JWT security implemented      | COMPLETED |
| RBAC implemented              | COMPLETED |
| ML prediction integrated      | COMPLETED |
| Predictions persisted         | COMPLETED |
| Alerts implemented            | COMPLETED |
| Alert lifecycle implemented   | COMPLETED |
| Frontend connected to backend | COMPLETED |
| Network capture foundation    | COMPLETED |
| Functional testing            | COMPLETED |

---

## 15. Final M1 Status

# M1 — 100% COMPLETE

The M1 foundation of the NetShield AI platform has been implemented and functionally tested.

The system can now:

```text
Authenticate users
       ↓
Authorize users
       ↓
Receive network prediction requests
       ↓
Execute ML models
       ↓
Calculate risk
       ↓
Store predictions
       ↓
Create security alerts
       ↓
Track alert status
       ↓
Retrieve alerts
       ↓
Display alerts in the React dashboard
```

---

## 16. Next Development Phase

With M1 completed, the project can proceed to the next development phase.

The next major integration will focus on connecting the network monitoring layer with the ML and backend services:

```text
Live Network Traffic
        ↓
Scapy Packet Capture
        ↓
Traffic Feature Extraction
        ↓
ML Prediction
        ↓
Risk Assessment
        ↓
Automatic Alert Generation
        ↓
Database
        ↓
React Dashboard
```

This will move the platform toward real-time predictive intrusion monitoring.
