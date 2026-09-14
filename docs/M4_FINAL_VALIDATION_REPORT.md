NetShield AI - M4 Final Validation Report
1. Overview
This document records the final validation activities performed for the NetShield AI project during Milestone 4 (M4).
The purpose of M4 validation was to verify that the implemented backend, machine-learning pipeline, real-time monitoring system, authentication, database persistence, alert management, and automated tests operate correctly together.
The validation was performed on the development environment using the implemented project components.
---
2. Validation Scope
The following system components were validated:
FastAPI backend
Authentication and JWT authorization
Machine-learning prediction pipeline
Risk scoring
SQLite database persistence
Real-time network traffic monitoring
Real-time flow feature extraction
Real-time ML prediction
Automatic alert generation
Alert retrieval
Alert lifecycle management
Automated pytest tests
End-to-end API integration
---
3. Dependency and Environment Validation
The project dependency specification contains pinned versions for the main application and machine-learning packages.
Important model compatibility requirement:
scikit-learn: `1.7.2`
The saved machine-learning models were trained using scikit-learn 1.7.2.
During M4 validation, the development virtual environment was updated to scikit-learn 1.7.2 to match the trained models and remove the previously observed model-version compatibility warnings.
The development environment also successfully installed and used:
FastAPI
Uvicorn
NumPy
Pandas
SciPy
Joblib
Requests
Pytest
httpx2
---
4. Automated Testing
A pytest test suite was added under:
`tests/test_core.py`
4.1 Test Result
The automated test suite completed successfully.
Final result:
`3 passed`
The tests covered:
Risk-level boundary calculations
FastAPI health endpoint
FastAPI root endpoint
A non-blocking deprecation warning from the Starlette/AnyIO test-client dependency was observed.
---
5. Authentication Validation
The authentication API was tested using the implemented `/auth/login` endpoint.
Successful validation result:
```text
Login HTTP Status: 200
Authentication successful.
Username: admin
Role: ADMIN
```
The application also rejected an unauthenticated request to the protected Alerts endpoint with:
```json
{
  "detail": "Not authenticated"
}
```
This confirms that protected alert resources require authentication.
---
6. End-to-End ML Prediction Validation
The CICIDS2017 ML-ready dataset was used to validate the authenticated prediction workflow.
Test dataset:
```text
Dataset shape: (30000, 79)
Benign sample index: 0
Attack sample index: 25000
```
6.1 Benign flow
The benign sample was submitted through the authenticated prediction endpoint.
Result:
```text
HTTP Status: 200
Prediction: BENIGN
Attack Probability: 0.0
Attack Type: BENIGN
Attack Type Confidence: None
Anomaly: NO
Risk Score: 0.0
Risk Level: LOW
```
The prediction was successfully stored in the database.
6.2 Attack flow
The attack sample was submitted through the same authenticated prediction endpoint.
Result:
```text
HTTP Status: 200
Prediction: ATTACK
Attack Probability: 100.0
Attack Type: DDoS
Attack Type Confidence: 100.0
Anomaly: YES
Risk Score: 100.0
Risk Level: CRITICAL
```
The prediction was successfully stored in the database.
---
7. Real-Time Monitoring Validation
The background monitoring service was verified using:
`GET /monitoring/status`
Observed validation status:
```text
running: true
thread_alive: true
total_flows_processed: 9392
total_predictions: 9392
total_alerts: 1211
```
The monitoring service was confirmed to be running and processing captured network flows through the ML prediction pipeline.
The implemented workflow is:
```text
Live Network Traffic
        |
        v
Flow Feature Extraction
        |
        v
Machine Learning Prediction
        |
        v
Anomaly Detection
        |
        v
Risk Calculation
        |
        v
Alert Generation
```
---
8. Alert API Validation
The protected Alerts endpoint was tested using a valid JWT.
Successful result:
```text
Login: 200
Alerts: 200
```
The endpoint returned stored alert records containing:
Alert ID
Prediction
Attack probability
Attack type
Attack type confidence
Anomaly status
Risk score
Risk level
Source
Destination
Status
Creation timestamp
---
9. Alert Lifecycle Validation
Alert ID `1696` was used for final lifecycle testing.
9.1 Open to Acknowledged
```text
Status: 200
status: ACKNOWLEDGED
```
9.2 Acknowledged to Resolved
```text
Status: 200
status: RESOLVED
```
Final lifecycle:
```text
OPEN
  |
  v
ACKNOWLEDGED
  |
  v
RESOLVED
```
---
10. Security Validation
The following security checks were completed.
Authentication
The ADMIN development account successfully authenticated through `/auth/login`.
JWT Authorization
Protected endpoints rejected unauthenticated requests.
Role-Based Access Control
The authenticated account was identified with:
```text
Role: ADMIN
```
Password Handling
Passwords are stored using salted PBKDF2-SHA256 hashing.
The API test requests the development password interactively rather than storing the plaintext password in the test source code.
---
11. Validation Results Summary
Validation Area	Result
Dependency installation	PASS
scikit-learn compatibility	PASS
Pytest setup	PASS
Core automated tests	PASS
Authentication	PASS
JWT authorization	PASS
Health endpoint	PASS
Root endpoint	PASS
Benign ML prediction	PASS
Attack ML prediction	PASS
Database persistence	PASS
Real-time monitoring	PASS
Real-time ML prediction	PASS
Alert generation	PASS
Protected alert retrieval	PASS
Alert acknowledgement	PASS
Alert resolution	PASS
---
12. Known Observations
During continuous monitoring tests, a relatively high number of alerts were generated.
Many observed alerts followed this pattern:
```text
Prediction: BENIGN
Anomaly: YES
Risk Level: MEDIUM
```
This is consistent with the current alert-generation rule, which creates an alert when:
The supervised classifier predicts `ATTACK`, or
The anomaly detector returns `YES`, or
The risk level is `HIGH` or `CRITICAL`.
The lightweight real-time collector also uses implementation defaults for certain specialized CICIDS2017 bulk, active, and idle features because these cannot be reliably reconstructed by the current lightweight collector.
These observations should be considered during future threshold tuning or production deployment.
---
13. Final M4 Validation Status
The M4 validation activities covered the major implemented system components and confirmed that the primary application workflows operate successfully in the development environment.
The validated workflow is:
```text
Network Traffic
       |
       v
Packet Capture
       |
       v
Flow Feature Extraction
       |
       v
Machine Learning
       |
       +----------------------+
       |                      |
       v                      v
Attack Detection        Anomaly Detection
       |                      |
       +----------+-----------+
                  |
                  v
             Risk Score
                  |
                  v
         Alert Generation
                  |
                  v
          Alert Management
                  |
                  v
             Dashboard
```
M4 validation conclusion
M4 core validation: PASSED
The validated system demonstrates successful integration of:
Network monitoring
Traffic analytics
Machine-learning detection
Anomaly detection
Risk scoring
Attack classification
Authentication
Database persistence
Alert management
Automated testing
Real-time monitoring
---
14. Project Milestone Status
Milestone	Status
M1 - Platform Foundation & Integration	100%
M2 - ML Models & Prediction Engine	100%
M3 - Real-Time Monitoring & Threat Detection	100%
M4 - Final Validation & Finalization	In Progress
This report records the validated implementation state and should be updated if additional M4 components are added after this validation checkpoint.