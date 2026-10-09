import { useEffect, useState } from 'react';

const API_URL = 'http://127.0.0.1:8000';


// =========================================================
// SETTINGS METRIC CARD
// =========================================================

function SettingsMetricCard({
  title,
  value,
  description,
  icon,
}) {
  return (
    <div className="metric-card">

      <div className="metric-icon">
        {icon}
      </div>

      <div className="metric-info">

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>

      </div>

    </div>
  );
}


// =========================================================
// SETTINGS
// =========================================================

function Settings() {

  const [healthStatus, setHealthStatus] =
    useState('Checking...');

  const [monitoringStatus, setMonitoringStatus] =
    useState('Checking...');

  const [lastChecked, setLastChecked] =
    useState(null);

  const [error, setError] =
    useState('');


  const username =
    localStorage.getItem(
      'netshield_username'
    ) || 'Unknown';

  const role =
    localStorage.getItem(
      'netshield_role'
    ) || 'Unknown';

  const token =
    localStorage.getItem(
      'netshield_token'
    );


  // =======================================================
  // CHECK SYSTEM HEALTH
  // =======================================================

  const checkSystemStatus = async () => {

    setError('');

    setHealthStatus('Checking...');
    setMonitoringStatus('Checking...');

    try {

      const healthResponse =
        await fetch(
          `${API_URL}/health`
        );

      if (!healthResponse.ok) {
        throw new Error(
          `Health check failed with HTTP ${healthResponse.status}`
        );
      }

      const healthData =
        await healthResponse.json();

      setHealthStatus(
        healthData.status === 'healthy'
          ? 'Healthy'
          : 'Unavailable'
      );


      const monitoringResponse =
        await fetch(
          `${API_URL}/monitoring/status`
        );

      if (!monitoringResponse.ok) {
        throw new Error(
          `Monitoring check failed with HTTP ${monitoringResponse.status}`
        );
      }

      const monitoringData =
        await monitoringResponse.json();


      if (
        monitoringData &&
        (
          monitoringData.running === true ||
          monitoringData.status === 'running' ||
          monitoringData.status === 'active'
        )
      ) {

        setMonitoringStatus(
          'Active'
        );

      } else if (
        monitoringData &&
        monitoringData.status
      ) {

        setMonitoringStatus(
          String(
            monitoringData.status
          )
        );

      } else {

        setMonitoringStatus(
          'Available'
        );

      }


      setLastChecked(
        new Date()
      );

    } catch (err) {

      setHealthStatus(
        'Unavailable'
      );

      setMonitoringStatus(
        'Unavailable'
      );

      setError(
        err.message ||
        'Unable to check system status.'
      );

      setLastChecked(
        new Date()
      );

    }

  };


  useEffect(() => {

    checkSystemStatus();

  }, []);


  // =======================================================
  // STATUS CLASS
  // =======================================================

  const getStatusClass = (
    status
  ) => {

    const normalized =
      String(
        status || ''
      ).toLowerCase();

    if (
      normalized.includes('healthy') ||
      normalized.includes('active') ||
      normalized.includes('running') ||
      normalized.includes('available')
    ) {

      return 'risk-badge low';

    }

    if (
      normalized.includes('checking')
    ) {

      return 'risk-badge medium';

    }

    return 'risk-badge high';

  };


  return (
    <div>


      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Settings
            </h2>

            <span>
              System configuration, account information and platform status
            </span>

          </div>


          <button
            className="primary-button"
            onClick={checkSystemStatus}
          >
            Refresh Status
          </button>

        </div>


        {lastChecked && (
          <span>
            Last checked:{' '}
            {lastChecked.toLocaleTimeString()}
          </span>
        )}


        {error && (
          <p className="login-error">
            {error}
          </p>
        )}

      </div>


      {/* ===================================================
          SYSTEM SUMMARY
      =================================================== */}

      <div className="metrics-grid">

        <SettingsMetricCard
          title="API Status"
          value={healthStatus}
          description="Backend health check"
          icon="✓"
        />


        <SettingsMetricCard
          title="Monitoring"
          value={monitoringStatus}
          description="Real-time monitoring service"
          icon="◉"
        />


        <SettingsMetricCard
          title="Authentication"
          value={token ? 'Active' : 'Missing'}
          description="Current session token"
          icon="◆"
        />


        <SettingsMetricCard
          title="User Role"
          value={role}
          description="Current access level"
          icon="♟"
        />

      </div>


      {/* ===================================================
          ACCOUNT INFORMATION
      =================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Account Information
            </h2>

            <span>
              Current authenticated user and access details
            </span>

          </div>

        </div>


        <div className="dashboard-grid">

          <div className="form-group">

            <label>
              Username
            </label>

            <input
              type="text"
              value={username}
              readOnly
            />

          </div>


          <div className="form-group">

            <label>
              Role
            </label>

            <input
              type="text"
              value={role}
              readOnly
            />

          </div>


          <div className="form-group">

            <label>
              Session
            </label>

            <input
              type="text"
              value={
                token
                  ? 'Authenticated'
                  : 'Not authenticated'
              }
              readOnly
            />

          </div>


          <div className="form-group">

            <label>
              API Endpoint
            </label>

            <input
              type="text"
              value={API_URL}
              readOnly
            />

          </div>

        </div>

      </div>


      {/* ===================================================
          SECURITY CONFIGURATION
      =================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Security Configuration
            </h2>

            <span>
              Current security controls used by the platform
            </span>

          </div>

        </div>


        <div className="alert-table">

          <table>

            <thead>

              <tr>

                <th>
                  Control
                </th>

                <th>
                  Status
                </th>

                <th>
                  Description
                </th>

              </tr>

            </thead>


            <tbody>

              <tr>

                <td>
                  JWT Authentication
                </td>

                <td>
                  <span className="risk-badge low">
                    ENABLED
                  </span>
                </td>

                <td>
                  API requests use bearer-token authentication.
                </td>

              </tr>


              <tr>

                <td>
                  Role-Based Access Control
                </td>

                <td>
                  <span className="risk-badge low">
                    ENABLED
                  </span>
                </td>

                <td>
                  Administrative functions are restricted by user role.
                </td>

              </tr>


              <tr>

                <td>
                  Audit Logging
                </td>

                <td>
                  <span className="risk-badge low">
                    ENABLED
                  </span>
                </td>

                <td>
                  Security activity can be reviewed through the Audit Logs module.
                </td>

              </tr>


              <tr>

                <td>
                  Password Protection
                </td>

                <td>
                  <span className="risk-badge low">
                    ENABLED
                  </span>
                </td>

                <td>
                  User passwords are stored using the project's password hashing implementation.
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>


      {/* ===================================================
          MACHINE LEARNING CONFIGURATION
      =================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Machine Learning Configuration
            </h2>

            <span>
              Predictive detection components currently used by NetShield AI
            </span>

          </div>

        </div>


        <div className="alert-table">

          <table>

            <thead>

              <tr>

                <th>
                  Component
                </th>

                <th>
                  Status
                </th>

                <th>
                  Purpose
                </th>

              </tr>

            </thead>


            <tbody>

              <tr>

                <td>
                  Random Forest
                </td>

                <td>
                  <span className="risk-badge low">
                    ACTIVE
                  </span>
                </td>

                <td>
                  Supervised attack detection and classification
                </td>

              </tr>


              <tr>

                <td>
                  Isolation Forest
                </td>

                <td>
                  <span className="risk-badge low">
                    ACTIVE
                  </span>
                </td>

                <td>
                  Behavioural anomaly detection
                </td>

              </tr>


              <tr>

                <td>
                  Contextual Risk Scoring
                </td>

                <td>
                  <span className="risk-badge low">
                    ACTIVE
                  </span>
                </td>

                <td>
                  Threat prioritization using model and security context
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>


      {/* ===================================================
          PLATFORM INFORMATION
      =================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Platform Information
            </h2>

            <span>
              NetShield AI deployment details
            </span>

          </div>

          <span className="risk-badge low">
            SYSTEM ONLINE
          </span>

        </div>


        <div className="analytics-list">

          <div>

            <span>
              Platform
            </span>

            <strong>
              NetShield AI
            </strong>

          </div>


          <div>

            <span>
              Purpose
            </span>

            <strong>
              Network Anomaly Detection & Threat Monitoring
            </strong>

          </div>


          <div>

            <span>
              Backend
            </span>

            <strong>
              FastAPI
            </strong>

          </div>


          <div>

            <span>
              Database
            </span>

            <strong>
              SQLite + SQLAlchemy
            </strong>

          </div>


          <div>

            <span>
              Monitoring
            </span>

            <strong>
              Scapy real-time network capture
            </strong>

          </div>


          <div>

            <span>
              Authentication
            </span>

            <strong>
              JWT + Role-Based Access Control
            </strong>

          </div>

        </div>

      </div>


      {/* ===================================================
          STATUS DETAILS
      =================================================== */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Current System Status
            </h2>

            <span>
              Live connection status for major platform services
            </span>

          </div>

        </div>


        <div className="alert-table">

          <table>

            <thead>

              <tr>

                <th>
                  Service
                </th>

                <th>
                  Status
                </th>

              </tr>

            </thead>


            <tbody>

              <tr>

                <td>
                  NetShield AI API
                </td>

                <td>
                  <span
                    className={getStatusClass(
                      healthStatus
                    )}
                  >
                    {String(
                      healthStatus
                    ).toUpperCase()}
                  </span>
                </td>

              </tr>


              <tr>

                <td>
                  Real-Time Monitoring
                </td>

                <td>
                  <span
                    className={getStatusClass(
                      monitoringStatus
                    )}
                  >
                    {String(
                      monitoringStatus
                    ).toUpperCase()}
                  </span>
                </td>

              </tr>


              <tr>

                <td>
                  Authentication Session
                </td>

                <td>
                  <span
                    className={
                      token
                        ? 'risk-badge low'
                        : 'risk-badge high'
                    }
                  >
                    {token
                      ? 'ACTIVE'
                      : 'MISSING'}
                  </span>
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>


    </div>
  );
}


export default Settings;