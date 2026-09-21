import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [analytics, setAnalytics] = useState({});
  const [report, setReport] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [traffic, setTraffic] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadData = async () => {
    try {
      const analyticsResponse = await fetch(
        "http://127.0.0.1:5000/analytics"
      );
      const analyticsData = await analyticsResponse.json();
      setAnalytics(analyticsData);

      const reportResponse = await fetch(
        "http://127.0.0.1:5000/threat-report"
      );
      const reportData = await reportResponse.json();
      setReport(reportData);

      const alertsResponse = await fetch(
        "http://127.0.0.1:5000/alerts"
      );
      const alertsData = await alertsResponse.json();
      setAlerts(alertsData.alerts || []);

      const notificationResponse = await fetch(
        "http://127.0.0.1:5000/notifications"
      );
      const notificationData = await notificationResponse.json();

      setNotifications(
        notificationData.notifications || []
      );

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

const fetchTraffic = async () => {
  try {
    const response = await fetch("http://127.0.0.1:5000/traffic");
    const data = await response.json();

    if (data.status === "success") {
      setTraffic(data);
    }
  } catch (error) {
    console.error("Traffic loading error:", error);
  }
};
  useEffect(() => {
  loadData();
  fetchTraffic();

  const interval = setInterval(() => {
    loadData();
    fetchTraffic();
  }, 5000);

  return () => clearInterval(interval);
}, []);

  const updateStatus = async (id, status) => {
    try {
      await fetch(
        `http://127.0.0.1:5000/alerts/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            status: status
          })
        }
      );

      loadData();

    } catch (error) {
      console.error("Status update error:", error);
    }
  };


  return (
    <div className="dashboard">

      {/* ================= HEADER ================= */}

      <header className="header">

        <div>
          <h1>🛡️ NetShield AI</h1>
          <p>Network Anomaly Detection & Threat Monitoring</p>
        </div>

        <div className="notification-container">

          <button
            className="notification-button"
            onClick={() =>
              setShowNotifications(!showNotifications)
            }
          >
            🔔

            {notifications.length > 0 && (
              <span className="notification-badge">
                {notifications.length}
              </span>
            )}
          </button>


          {/* Notification Dropdown */}

          {showNotifications && (

            <div className="notification-panel">

              <div className="notification-header">
                <h3>🔔 Notifications</h3>

                <button
                  onClick={() =>
                    setShowNotifications(false)
                  }
                >
                  ✕
                </button>
              </div>


              {notifications.length === 0 ? (

                <div className="no-notifications">
                  <p>✅ No high-risk notifications</p>
                </div>

              ) : (

                notifications.map((notification) => (

                  <div
                    className="notification-item"
                    key={notification.id}
                  >

                    <div className="notification-title">
                      🚨 {notification.type}
                    </div>

                    <div className="notification-message">
                      {notification.message}
                    </div>

                    <div className="notification-details">

                      <span>
                        Risk: {notification.risk_level}
                      </span>

                      <span>
                        Score: {notification.risk_score}
                      </span>

                      <span>
                        Confidence: {notification.confidence}%
                      </span>

                    </div>

                    <div className="notification-time">
                      {notification.timestamp}
                    </div>

                  </div>

                ))

              )}

            </div>

          )}

        </div>

      </header>


      {/* ================= ANALYTICS CARDS ================= */}

      <section className="cards">

        <div className="card">
          <h3>Total Alerts</h3>
          <h2>{analytics.total_alerts || 0}</h2>
        </div>

        <div className="card high">
          <h3>High Risk</h3>
          <h2>{analytics.high_risk || 0}</h2>
        </div>

        <div className="card medium">
          <h3>Medium Risk</h3>
          <h2>{analytics.medium_risk || 0}</h2>
        </div>

        <div className="card open">
          <h3>Open Alerts</h3>
          <h2>{analytics.open_alerts || 0}</h2>
        </div>

        <div className="card investigating">
          <h3>Investigating</h3>
          <h2>{analytics.investigating || 0}</h2>
        </div>

        <div className="card resolved">
          <h3>Resolved</h3>
          <h2>{analytics.resolved || 0}</h2>
        </div>

      </section>


      {/* ================= THREAT INTELLIGENCE ================= */}

      <section className="section">

        <h2>🧠 Threat Intelligence Report</h2>

        <div className="cards">

          <div className="card">
            <h3>Total Threats</h3>
            <h2>{report.total_threats || 0}</h2>
          </div>

          <div className="card high">
            <h3>High Risk</h3>
            <h2>{report.high_risk || 0}</h2>
          </div>

          <div className="card medium">
            <h3>Medium Risk</h3>
            <h2>{report.medium_risk || 0}</h2>
          </div>

          <div className="card open">
            <h3>Open</h3>
            <h2>{report.open || 0}</h2>
          </div>

          <div className="card investigating">
            <h3>Investigating</h3>
            <h2>{report.investigating || 0}</h2>
          </div>

          <div className="card resolved">
            <h3>Resolved</h3>
            <h2>{report.resolved || 0}</h2>
          </div>

        </div>

      </section>
       <section className="section">

        <h2>📡 Network Monitoring</h2>

        <div className="cards">

          <div className="card">
            <h3>Total Traffic</h3>
            <h2>
              {traffic.total_traffic?.toLocaleString() || 0}
            </h2>
          </div>

          <div className="card">
            <h3>Benign Traffic</h3>
            <h2>
              {traffic.benign_traffic?.toLocaleString() || 0}
            </h2>
          </div>

          <div className="card high">
            <h3>Attack Traffic</h3>
            <h2>
              {traffic.attack_traffic?.toLocaleString() || 0}
            </h2>
          </div>

          <div className="card medium">
            <h3>Attack Percentage</h3>
            <h2>
              {traffic.attack_percentage || 0}%
            </h2>
          </div>

        </div>

        <div className="monitor-status">
          🟢 <strong>Monitoring Active</strong>
        </div>

      </section>
      <div className="visualization-section">
  <h2>📊 Attack Type Visualization</h2>

  {Object.keys(report.attack_types || {}).length === 0 ? (
    <p className="empty-message">No attack data available</p>
  ) : (
    <div className="attack-chart">
      {Object.entries(report.attack_types).map(([attack, count]) => {
        const maxCount = Math.max(...Object.values(report.attack_types));
        const width = (count / maxCount) * 100;

        return (
          <div className="attack-row" key={attack}>
            <div className="attack-name">
              {attack}
            </div>

            <div className="bar-container">
              <div
                className="attack-bar"
                style={{ width: `${width}%` }}
              >
                {count}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>


      {/* ================= ATTACK DISTRIBUTION ================= */}

      <section className="section">

        <h2>📊 Attack Type Distribution</h2>

        {report.attack_types &&
        Object.keys(report.attack_types).length > 0 ? (

          Object.entries(report.attack_types).map(
            ([attack, count]) => (

              <div
                className="attack-row"
                key={attack}
              >

                <div className="attack-name">
                  {attack}
                </div>

                <div className="attack-bar-container">

                  <div
                    className="attack-bar"
                    style={{
                      width: `${
                        (count /
                          Math.max(
                            ...Object.values(
                              report.attack_types
                            )
                          )) *
                        100
                      }%`
                    }}
                  >
                    {count}
                  </div>

                </div>

              </div>

            )

          )

        ) : (

          <p>No attack data available.</p>

        )}

      </section>


      {/* ================= RECENT THREATS ================= */}

      <section className="section">

        <h2>🚨 Recent Threats</h2>

        {report.recent_threats &&
        report.recent_threats.length > 0 ? (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>ID</th>
                  <th>Attack Type</th>
                  <th>Risk</th>
                  <th>Score</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>

              </thead>

              <tbody>

                {report.recent_threats.map(
                  (threat) => (

                    <tr key={threat.id}>

                      <td>{threat.id}</td>

                      <td>
                        {threat.attack_type}
                      </td>

                      <td>
                        {threat.risk_level}
                      </td>

                      <td>
                        {threat.risk_score}
                      </td>

                      <td>
                        {threat.confidence}%
                      </td>

                      <td>
                        {threat.status}
                      </td>

                      <td>
                        {threat.timestamp}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        ) : (

          <p>No recent threats detected.</p>

        )}

      </section>


      {/* ================= SECURITY ALERTS ================= */}

      <section className="section">

        <h2>🔐 Security Alerts</h2>

        {alerts.length === 0 ? (

          <p>No Security Alerts</p>

        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>ID</th>
                  <th>Attack</th>
                  <th>Risk</th>
                  <th>Score</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>

              </thead>

              <tbody>

                {alerts.map((alert) => (

                  <tr key={alert.id}>

                    <td>{alert.id}</td>

                    <td>{alert.attack_type}</td>

                    <td>{alert.risk_level}</td>

                    <td>{alert.risk_score}</td>

                    <td>{alert.confidence}%</td>

                    <td>{alert.status}</td>

                    <td>

                      <select
                        value={alert.status}
                        onChange={(e) =>
                          updateStatus(
                            alert.id,
                            e.target.value
                          )
                        }
                      >

                        <option value="Open">
                          Open
                        </option>

                        <option value="Investigating">
                          Investigating
                        </option>

                        <option value="Resolved">
                          Resolved
                        </option>

                        <option value="Closed">
                          Closed
                        </option>

                      </select>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}

export default App;