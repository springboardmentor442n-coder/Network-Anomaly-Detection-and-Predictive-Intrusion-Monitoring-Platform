import { useEffect, useState } from 'react';
import './App.css';

const API_URL = 'http://127.0.0.1:8000';


// ---------------------------------------------------------
// MAIN APP
// ---------------------------------------------------------

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('netshield_token')
  );

  const [username, setUsername] = useState(
    localStorage.getItem('netshield_username') || ''
  );

  const [role, setRole] = useState(
    localStorage.getItem('netshield_role') || ''
  );

  const handleLogin = (user, userRole, token) => {
    localStorage.setItem('netshield_token', token);
    localStorage.setItem('netshield_username', user);
    localStorage.setItem('netshield_role', userRole);

    setUsername(user);
    setRole(userRole);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('netshield_token');
    localStorage.removeItem('netshield_username');
    localStorage.removeItem('netshield_role');

    setUsername('');
    setRole('');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <DashboardLayout
      username={username}
      role={role}
      onLogout={handleLogout}
    />
  );
}


// ---------------------------------------------------------
// LOGIN PAGE
// ---------------------------------------------------------

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid username or password');
      }

      const data = await response.json();

      onLogin(
        data.username,
        data.role,
        data.access_token
      );
    } catch (err) {
      setError(
        err.message || 'Unable to connect to the server'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-logo">
          ⚡
        </div>

        <h1>NetShield AI</h1>

        <p className="login-subtitle">
          Network Anomaly Detection & Threat Monitoring
        </p>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Username</label>

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Enter username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        <div className="development-accounts">
          <strong>Development Accounts</strong>

          <p>
            Admin: <code>admin / admin123</code>
          </p>

          <p>
            Analyst: <code>analyst / analyst123</code>
          </p>
        </div>

      </div>
    </div>
  );
}


// ---------------------------------------------------------
// DASHBOARD LAYOUT
// ---------------------------------------------------------

function DashboardLayout({
  username,
  role,
  onLogout,
}) {
  const [activePage, setActivePage] = useState('Dashboard');

  const isAdmin = role === 'ADMIN';

  const navigationItems = [
    {
      name: 'Dashboard',
      icon: '◈',
    },
    {
      name: 'Live Monitoring',
      icon: '◉',
    },
    {
      name: 'Alerts',
      icon: '⚠',
    },
    {
      name: 'Analytics',
      icon: '◫',
    },
  ];

  if (isAdmin) {
    navigationItems.push({
      name: 'User Management',
      icon: '♟',
    });
  }

  const renderPage = () => {
    switch (activePage) {

      case 'Dashboard':
        return <Dashboard />;

      case 'Live Monitoring':
        return <LiveMonitoring />;

      case 'Alerts':
        return <Alerts />;

      case 'Analytics':
        return <Analytics />;

      case 'User Management':
        return isAdmin ? (
          <UserManagement />
        ) : (
          <AccessDenied />
        );

      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="sidebar-logo">

          <div className="sidebar-logo-icon">
            ⚡
          </div>

          <div>
            <h2>NetShield AI</h2>
            <span>Security Platform</span>
          </div>

        </div>

        <nav className="sidebar-nav">

          {navigationItems.map((item) => (
            <button
              key={item.name}
              className={
                activePage === item.name
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() => setActivePage(item.name)}
            >

              <span className="nav-icon">
                {item.icon}
              </span>

              <span>
                {item.name}
              </span>

            </button>
          ))}

        </nav>

        <div className="sidebar-user">

          <div className="user-avatar">
            {username.charAt(0).toUpperCase()}
          </div>

          <div className="user-details">

            <strong>
              {username}
            </strong>

            <span className="role-badge">
              {role}
            </span>

          </div>

          <button
            className="logout-button"
            onClick={onLogout}
            title="Logout"
          >
            ⇱
          </button>

        </div>

      </aside>


      {/* MAIN CONTENT */}

      <main className="main-content">

        <header className="top-header">

          <div>

            <h1>
              {activePage}
            </h1>

            <p>
              AI-powered network security monitoring
            </p>

          </div>

          <div className="header-status">

            <span className="status-dot"></span>

            System Online

          </div>

        </header>

        <div className="page-content">

          {renderPage()}

        </div>

      </main>

    </div>
  );
}


// ---------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------

function Dashboard() {
  return (
    <>
      <div className="metrics-grid">

        <MetricCard
          title="Total Packets"
          value="24,582"
          change="+12.4%"
          icon="◈"
        />

        <MetricCard
          title="Network Flows"
          value="3,847"
          change="+8.7%"
          icon="◫"
        />

        <MetricCard
          title="Threats Detected"
          value="127"
          change="+5.2%"
          icon="⚡"
        />

        <MetricCard
          title="Critical Alerts"
          value="8"
          change="-14.3%"
          icon="⚠"
        />

      </div>


      <div className="dashboard-grid">

        <div className="panel">

          <div className="panel-header">

            <h2>
              Threat Activity
            </h2>

            <span>
              Last 24 hours
            </span>

          </div>

          <div className="chart-container">

            <div className="bar-chart">

              {[
                35,
                48,
                42,
                65,
                54,
                78,
                61,
                85,
                72,
                92,
                67,
                76,
              ].map(
                (height, index) => (
                  <div
                    key={index}
                    className="chart-bar"
                    style={{
                      height: `${height}%`,
                    }}
                  ></div>
                )
              )}

            </div>

          </div>

        </div>


        <div className="panel">

          <div className="panel-header">

            <h2>
              Threat Score
            </h2>

            <span>
              Current
            </span>

          </div>

          <div className="threat-score">

            <div className="score-circle">

              <strong>
                72
              </strong>

              <span>
                /100
              </span>

            </div>

            <p className="score-warning">
              Elevated Risk
            </p>

            <p>
              Several suspicious activities detected
            </p>

          </div>

        </div>

      </div>


      <div className="panel">

        <div className="panel-header">

          <h2>
            Recent Alerts
          </h2>

          <span>
            Latest events
          </span>

        </div>

        <AlertTable />

      </div>
    </>
  );
}


// ---------------------------------------------------------
// LIVE MONITORING
// ---------------------------------------------------------

function LiveMonitoring() {

  const [
    monitoring,
    setMonitoring,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);


  const fetchMonitoring = async () => {

    try {

      setError('');

      const response = await fetch(
        `${API_URL}/monitoring/live`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {

        throw new Error(
          `Monitoring service returned HTTP ${response.status}`
        );

      }

      const data =
        await response.json();

      setMonitoring(
        data.monitoring
      );

      setLastUpdated(
        new Date()
      );

    } catch (err) {

      setError(
        err.message ||
        'Unable to connect to the monitoring service.'
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    let timeoutId;

    let cancelled = false;


    const pollMonitoring =
      async () => {

        if (cancelled) {
          return;
        }

        await fetchMonitoring();


        if (!cancelled) {

          timeoutId =
            setTimeout(
              pollMonitoring,
              1000
            );

        }

      };


    pollMonitoring();


    return () => {

      cancelled = true;

      if (timeoutId) {
        clearTimeout(
          timeoutId
        );
      }

    };

  }, []);


  const formatBytes = (
    bytes
  ) => {

    if (
      bytes === undefined ||
      bytes === null
    ) {
      return '0 B';
    }


    if (
      bytes < 1024
    ) {

      return (
        `${bytes.toFixed(2)} B`
      );

    }


    if (
      bytes < 1024 * 1024
    ) {

      return (
        `${(
          bytes / 1024
        ).toFixed(2)} KB`
      );

    }


    return (
      `${(
        bytes /
        (1024 * 1024)
      ).toFixed(2)} MB`
    );

  };


  const protocolCounts =
    monitoring?.protocol_counts ||
    {};


  const protocolEntries =
    Object.entries(
      protocolCounts
    ).sort(
      (a, b) =>
        b[1] - a[1]
    );


  const topSourceIps =
    monitoring?.top_source_ips ||
    [];


  const topDestinationIps =
    monitoring?.top_destination_ips ||
    [];


  return (
    <div>

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Live Network Monitoring
            </h2>

            {lastUpdated && (

              <span>
                Updated:{' '}
                {lastUpdated.toLocaleTimeString()}
              </span>

            )}

          </div>


          <span className="live-indicator">
            ● LIVE
          </span>

        </div>


        {loading &&
          !monitoring && (

            <div className="monitoring-placeholder">

              <span>
                ◉
              </span>

              <h3>
                Starting Live Monitoring
              </h3>

              <p>
                Capturing live network traffic
                through the Scapy monitoring service...
              </p>

            </div>

        )}


        {error && (

          <div className="alert-table">

            <p className="login-error">
              {error}
            </p>

            <button
              className="primary-button"
              onClick={fetchMonitoring}
            >
              Retry
            </button>

          </div>

        )}


        {monitoring && (

          <>

            <div className="monitoring-stats">

              <div>

                <strong>
                  {monitoring.packets_per_second}
                </strong>

                <span>
                  Packets/sec
                </span>

              </div>


              <div>

                <strong>
                  {formatBytes(
                    monitoring.bytes_per_second
                  )}/s
                </strong>

                <span>
                  Traffic Rate
                </span>

              </div>


              <div>

                <strong>
                  {monitoring.total_packets.toLocaleString()}
                </strong>

                <span>
                  Packets Captured
                </span>

              </div>


              <div>

                <strong>
                  {formatBytes(
                    monitoring.average_packet_size
                  )}
                </strong>

                <span>
                  Avg Packet Size
                </span>

              </div>

            </div>


            <div className="panel">

              <div className="panel-header">

                <h2>
                  Capture Summary
                </h2>

                <span>
                  {
                    monitoring.capture_duration_seconds
                  }s capture
                </span>

              </div>


              <div className="analytics-list">

                <div>

                  <span>
                    Total Bytes
                  </span>

                  <strong>
                    {
                      monitoring.total_bytes.toLocaleString()
                    } B
                  </strong>

                </div>


                <div>

                  <span>
                    Capture Duration
                  </span>

                  <strong>
                    {
                      monitoring.capture_duration_seconds
                    }s
                  </strong>

                </div>


                <div>

                  <span>
                    Packets/sec
                  </span>

                  <strong>
                    {
                      monitoring.packets_per_second
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    Bytes/sec
                  </span>

                  <strong>
                    {formatBytes(
                      monitoring.bytes_per_second
                    )}/s
                  </strong>

                </div>

              </div>

            </div>


            <div className="dashboard-grid">

              <div className="panel">

                <div className="panel-header">

                  <h2>
                    Protocol Distribution
                  </h2>

                </div>


                <div className="analytics-list">

                  {protocolEntries.length === 0 ? (

                    <div>

                      <span>
                        No protocol data
                      </span>

                    </div>

                  ) : (

                    protocolEntries.map(
                      (
                        [
                          protocol,
                          count,
                        ]
                      ) => (

                        <div
                          key={protocol}
                        >

                          <span>
                            {protocol}
                          </span>

                          <strong>
                            {count.toLocaleString()}
                          </strong>

                        </div>

                      )
                    )

                  )}

                </div>

              </div>


              <div className="panel">

                <div className="panel-header">

                  <h2>
                    Top Source IPs
                  </h2>

                </div>


                <div className="analytics-list">

                  {topSourceIps.length === 0 ? (

                    <div>

                      <span>
                        No source IP data
                      </span>

                    </div>

                  ) : (

                    topSourceIps.map(
                      (
                        [
                          ip,
                          count,
                        ]
                      ) => (

                        <div
                          key={ip}
                        >

                          <span>
                            {ip}
                          </span>

                          <strong>
                            {count.toLocaleString()}
                          </strong>

                        </div>

                      )
                    )

                  )}

                </div>

              </div>

            </div>


            <div className="panel">

              <div className="panel-header">

                <h2>
                  Top Destination IPs
                </h2>

              </div>


              <div className="analytics-list">

                {topDestinationIps.length === 0 ? (

                  <div>

                    <span>
                      No destination IP data
                    </span>

                  </div>

                ) : (

                  topDestinationIps.map(
                    (
                      [
                        ip,
                        count,
                      ]
                    ) => (

                      <div
                        key={ip}
                      >

                        <span>
                          {ip}
                        </span>

                        <strong>
                          {count.toLocaleString()}
                        </strong>

                      </div>

                    )
                  )

                )}

              </div>

            </div>


            <div className="monitoring-placeholder">

              <span>
                ◉
              </span>

              <h3>
                Live Packet Stream Connected
              </h3>

              <p>
                Real network traffic is being captured
                through Scapy and refreshed automatically.
              </p>

            </div>

          </>

        )}

      </div>

    </div>
  );
}


// ---------------------------------------------------------
// ALERTS
// ---------------------------------------------------------

function Alerts() {

  return (

    <div className="panel">

      <div className="panel-header">

        <h2>
          Alert Management
        </h2>

        <span>
          Active security alerts
        </span>

      </div>

      <AlertTable />

    </div>

  );
}


// ---------------------------------------------------------
// ANALYTICS
// ---------------------------------------------------------

function Analytics() {

  const [
    monitoring,
    setMonitoring,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);


  const fetchAnalytics = async () => {

    try {

      setError('');

      const response =
        await fetch(
          `${API_URL}/monitoring/live`,
          {
            method: 'GET',
          }
        );


      if (!response.ok) {

        throw new Error(
          `Analytics service returned HTTP ${response.status}`
        );

      }


      const data =
        await response.json();


      setMonitoring(
        data.monitoring
      );


      setLastUpdated(
        new Date()
      );

    } catch (err) {

      setError(
        err.message ||
        'Unable to load live analytics.'
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    let timeoutId;

    let cancelled = false;


    const pollAnalytics =
      async () => {

        if (cancelled) {
          return;
        }


        await fetchAnalytics();


        if (!cancelled) {

          timeoutId =
            setTimeout(
              pollAnalytics,
              1000
            );

        }

      };


    pollAnalytics();


    return () => {

      cancelled = true;

      if (timeoutId) {

        clearTimeout(
          timeoutId
        );

      }

    };

  }, []);


  const protocolCounts =
    monitoring?.protocol_counts ||
    {};


  const totalProtocolPackets =
    Object.values(
      protocolCounts
    ).reduce(
      (sum, count) =>
        sum + count,
      0
    );


  const protocolEntries =
    Object.entries(
      protocolCounts
    )
      .map(
        (
          [
            protocol,
            count,
          ]
        ) => ({

          protocol,

          count,

          percentage:
            totalProtocolPackets > 0
              ? (
                  count /
                  totalProtocolPackets
                ) * 100
              : 0,

        })
      )
      .sort(
        (a, b) =>
          b.count - a.count
      );


  return (

    <div className="analytics-grid">

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Live Protocol Distribution
            </h2>

            {lastUpdated && (

              <span>
                Updated:{' '}
                {lastUpdated.toLocaleTimeString()}
              </span>

            )}

          </div>


          <span className="live-indicator">
            ● LIVE
          </span>

        </div>


        {loading &&
          !monitoring && (

            <div className="monitoring-placeholder">

              <span>
                ◫
              </span>

              <h3>
                Loading Live Analytics
              </h3>

              <p>
                Collecting current protocol statistics
                from the Scapy monitoring service...
              </p>

            </div>

        )}


        {error && (

          <div className="alert-table">

            <p className="login-error">
              {error}
            </p>

            <button
              className="primary-button"
              onClick={fetchAnalytics}
            >
              Retry
            </button>

          </div>

        )}


        {monitoring && (

          <div className="analytics-list">

            {protocolEntries.length === 0 ? (

              <div>

                <span>
                  No protocol data available
                </span>

              </div>

            ) : (

              protocolEntries.map(
                ({
                  protocol,
                  count,
                  percentage,
                }) => (

                  <div
                    key={protocol}
                  >

                    <span>
                      {protocol}
                    </span>

                    <strong>
                      {percentage.toFixed(2)}%
                      {' '}
                      (
                        {count.toLocaleString()}
                      )
                    </strong>

                  </div>

                )
              )

            )}

          </div>

        )}

      </div>


      <div className="panel">

        <div className="panel-header">

          <h2>
            Current Traffic Summary
          </h2>

        </div>


        {monitoring ? (

          <div className="ml-metrics">

            <div>

              <strong>
                {
                  monitoring.total_packets.toLocaleString()
                }
              </strong>

              <span>
                Packets Captured
              </span>

            </div>


            <div>

              <strong>
                {
                  monitoring.packets_per_second
                }
              </strong>

              <span>
                Packets/sec
              </span>

            </div>


            <div>

              <strong>
                {
                  monitoring.capture_duration_seconds
                }s
              </strong>

              <span>
                Capture Duration
              </span>

            </div>

          </div>

        ) : (

          <div className="monitoring-placeholder">

            <p>
              Waiting for live traffic data...
            </p>

          </div>

        )}

      </div>


      <div className="panel">

        <div className="panel-header">

          <h2>
            ML Performance
          </h2>

        </div>


        <div className="ml-metrics">

          <div>

            <strong>
              99.78%
            </strong>

            <span>
              Binary Accuracy
            </span>

          </div>


          <div>

            <strong>
              98.79%
            </strong>

            <span>
              Attack Type Accuracy
            </span>

          </div>


          <div>

            <strong>
              99.97%
            </strong>

            <span>
              ROC-AUC
            </span>

          </div>

        </div>

      </div>

    </div>

  );
}


// ---------------------------------------------------------
// USER MANAGEMENT
// ---------------------------------------------------------

function UserManagement() {

  const users = [
    {
      username: 'admin',
      role: 'ADMIN',
      status: 'Active',
    },

    {
      username: 'analyst',
      role: 'ANALYST',
      status: 'Active',
    },
  ];


  return (

    <div className="panel">

      <div className="panel-header">

        <div>

          <h2>
            User Management
          </h2>

          <span>
            Administrator access
          </span>

        </div>


        <button
          className="primary-button"
        >
          + Add User
        </button>

      </div>


      <div className="user-table">

        <table>

          <thead>

            <tr>

              <th>
                Username
              </th>

              <th>
                Role
              </th>

              <th>
                Status
              </th>

              <th>
                Actions
              </th>

            </tr>

          </thead>


          <tbody>

            {users.map(
              (user) => (

                <tr
                  key={user.username}
                >

                  <td>

                    <strong>
                      {user.username}
                    </strong>

                  </td>


                  <td>

                    <span className="table-role">
                      {user.role}
                    </span>

                  </td>


                  <td>

                    <span className="active-status">
                      ● {user.status}
                    </span>

                  </td>


                  <td>

                    <button
                      className="table-action"
                    >
                      Edit
                    </button>


                    <button
                      className="table-action danger"
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>

    </div>

  );
}


// ---------------------------------------------------------
// ACCESS DENIED
// ---------------------------------------------------------

function AccessDenied() {

  return (

    <div className="access-denied">

      <div className="access-denied-icon">
        ⚠
      </div>

      <h2>
        Access Denied
      </h2>

      <p>
        You do not have permission to access this section.
      </p>

      <p>
        Administrator privileges are required.
      </p>

    </div>

  );
}


// ---------------------------------------------------------
// METRIC CARD
// ---------------------------------------------------------

function MetricCard({
  title,
  value,
  change,
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
          {change} from previous period
        </small>

      </div>

    </div>

  );
}


// ---------------------------------------------------------
// ALERT TABLE - REAL DATA + AUTO REFRESH + LIFECYCLE
// ---------------------------------------------------------

function AlertTable() {

  const [
    alerts,
    setAlerts,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState('');


  const [
    updatingAlertId,
    setUpdatingAlertId,
  ] = useState(null);


  const fetchAlerts = async () => {

    const token =
      localStorage.getItem(
        'netshield_token'
      );


    if (!token) {

      setError(
        'Authentication token not found.'
      );

      setLoading(false);

      return;

    }


    try {

      setError('');


      const response =
        await fetch(
          `${API_URL}/alerts`,
          {
            method: 'GET',

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      if (
        response.status === 401
      ) {

        throw new Error(
          'Authentication expired. Please login again.'
        );

      }


      if (!response.ok) {

        throw new Error(
          'Unable to load alerts.'
        );

      }


      const data =
        await response.json();


      setAlerts(data);

    } catch (err) {

      setError(
        err.message ||
        'Unable to connect to the backend.'
      );

    } finally {

      setLoading(false);

    }

  };


  const updateAlertStatus =
    async (
      alertId,
      newStatus
    ) => {

      const token =
        localStorage.getItem(
          'netshield_token'
        );


      if (!token) {

        setError(
          'Authentication token not found.'
        );

        return;

      }


      try {

        setUpdatingAlertId(
          alertId
        );

        setError('');


        const query =
          new URLSearchParams({
            new_status:
              newStatus,
          });


        const response =
          await fetch(
            `${API_URL}/alerts/${alertId}/status?${query.toString()}`,
            {
              method: 'PATCH',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );


        if (
          response.status === 401
        ) {

          throw new Error(
            'Authentication expired. Please login again.'
          );

        }


        if (
          response.status === 403
        ) {

          throw new Error(
            'You do not have permission to update this alert.'
          );

        }


        if (!response.ok) {

          const errorData =
            await response.json()
              .catch(
                () => ({})
              );


          throw new Error(
            errorData.detail ||
            'Unable to update alert status.'
          );

        }


        // Immediately refresh the list after
        // a successful status change.

        await fetchAlerts();

      } catch (err) {

        setError(
          err.message ||
          'Unable to update alert status.'
        );

      } finally {

        setUpdatingAlertId(
          null
        );

      }

    };


  useEffect(() => {

    // Initial load.

    fetchAlerts();


    // Refresh alerts every 5 seconds.

    const intervalId =
      setInterval(
        fetchAlerts,
        5000
      );


    return () => {

      clearInterval(
        intervalId
      );

    };

  }, []);


  if (loading) {

    return (

      <div className="alert-table">

        <p>
          Loading alerts...
        </p>

      </div>

    );

  }


  if (error && alerts.length === 0) {

    return (

      <div className="alert-table">

        <p className="login-error">
          {error}
        </p>


        <button
          className="primary-button"
          onClick={fetchAlerts}
        >
          Retry
        </button>

      </div>

    );

  }


  if (alerts.length === 0) {

    return (

      <div className="alert-table">

        <p>
          No alerts found.
        </p>

        {error && (

          <p className="login-error">
            {error}
          </p>

        )}

      </div>

    );

  }


  return (

    <div className="alert-table">

      {error && (

        <p className="login-error">
          {error}
        </p>

      )}


      <table>

        <thead>

          <tr>

            <th>
              Attack Type
            </th>

            <th>
              Source
            </th>

            <th>
              Destination
            </th>

            <th>
              Risk
            </th>

            <th>
              Score
            </th>

            <th>
              Status
            </th>

            <th>
              Actions
            </th>

          </tr>

        </thead>


        <tbody>

          {alerts.map(
            (alert) => (

              <tr
                key={alert.alert_id}
              >

                <td>

                  <strong>
                    {alert.attack_type}
                  </strong>

                </td>


                <td>
                  {alert.source || 'N/A'}
                </td>


                <td>
                  {alert.destination || 'N/A'}
                </td>


                <td>

                  <span
                    className={`risk-badge ${
                      alert.risk_level
                        ? alert.risk_level.toLowerCase()
                        : ''
                    }`}
                  >

                    {alert.risk_level}

                  </span>

                </td>


                <td>
                  {alert.risk_score}/100
                </td>


                <td>

                  <span className="table-role">
                    {alert.status}
                  </span>

                </td>


                <td>

                  {alert.status === 'OPEN' && (

                    <>

                      <button
                        className="primary-button"
                        disabled={
                          updatingAlertId ===
                          alert.alert_id
                        }
                        onClick={() =>
                          updateAlertStatus(
                            alert.alert_id,
                            'ACKNOWLEDGED'
                          )
                        }
                        style={{
                          marginRight: '6px',
                          marginBottom: '4px',
                        }}
                      >
                        {updatingAlertId ===
                        alert.alert_id
                          ? 'Updating...'
                          : 'Acknowledge'}
                      </button>


                      <button
                        className="primary-button"
                        disabled={
                          updatingAlertId ===
                          alert.alert_id
                        }
                        onClick={() =>
                          updateAlertStatus(
                            alert.alert_id,
                            'RESOLVED'
                          )
                        }
                        style={{
                          marginBottom: '4px',
                        }}
                      >
                        Resolve
                      </button>

                    </>

                  )}


                  {alert.status ===
                    'ACKNOWLEDGED' && (

                    <button
                      className="primary-button"
                      disabled={
                        updatingAlertId ===
                        alert.alert_id
                      }
                      onClick={() =>
                        updateAlertStatus(
                          alert.alert_id,
                          'RESOLVED'
                        )
                      }
                    >
                      {updatingAlertId ===
                      alert.alert_id
                        ? 'Updating...'
                        : 'Resolve'}
                    </button>

                  )}


                  {alert.status ===
                    'RESOLVED' && (

                    <span>
                      Completed
                    </span>

                  )}

                </td>

              </tr>

            )
          )}

        </tbody>

      </table>

    </div>

  );

}


export default App;