import { useEffect, useState } from 'react';
import './App.css';
import AuditLogs from './AuditLogs';
import ModelInfo from './ModelInfo';
import Settings from './Settings';

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
    {
      name: 'Risk Analysis',
      icon: '◈',
    },
    {
      name: 'Incidents',
      icon: '◆',
    },
    {
      name: 'Threat Intelligence',
      icon: '◇',
    },
    {
      name: 'Reports',
      icon: '▣',
    },
    {
      name: 'Audit Logs',
      icon: '▤',
    },
    {
      name: 'Model Info',
      icon: '⌁',
    },
    {
      name: 'Settings',
      icon: '⚙',
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

      case 'Risk Analysis':
        return <RiskAnalysis />;

      case 'Incidents':
        return <Incidents />;

      case 'Threat Intelligence':
        return <ThreatIntelligence />;

      case 'Reports':
        return <Reports />;

      case 'Audit Logs':
        return <AuditLogs />;

      case 'Model Info':
        return <ModelInfo />;

      case 'Settings':
        return <Settings />;

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
// RISK ANALYSIS
// ---------------------------------------------------------

function RiskAnalysis() {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRiskAnalysis = async () => {
    const token = localStorage.getItem('netshield_token');

    if (!token) {
      setError('Authentication token not found.');
      setLoading(false);
      return;
    }

    try {
      setError('');

      const response = await fetch(
        `${API_URL}/risk-analysis`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }

      if (!response.ok) {
        throw new Error(
          `Risk Analysis service returned HTTP ${response.status}`
        );
      }

      const data = await response.json();

      setRiskData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.message ||
        'Unable to load risk analysis.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    const pollRiskAnalysis = async () => {
      if (cancelled) {
        return;
      }

      await fetchRiskAnalysis();

      if (!cancelled) {
        timeoutId = setTimeout(
          pollRiskAnalysis,
          5000
        );
      }
    };

    pollRiskAnalysis();

    return () => {
      cancelled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const getRiskClass = (riskLevel) => {
    const normalized = (
      riskLevel || 'LOW'
    ).toLowerCase();

    return `risk-badge ${normalized}`;
  };

  const formatDateTime = (value) => {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleString();
  };

  if (loading && !riskData) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Risk Analysis</h2>
            <span>
              Real-time security risk assessment
            </span>
          </div>
        </div>

        <div className="monitoring-placeholder">
          <span>◈</span>
          <h3>Loading Risk Analysis</h3>
          <p>
            Analyzing current security alerts and
            risk levels...
          </p>
        </div>
      </div>
    );
  }

  if (error && !riskData) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Risk Analysis</h2>
            <span>
              Real-time security risk assessment
            </span>
          </div>
        </div>

        <div className="alert-table">
          <p className="login-error">
            {error}
          </p>

          <button
            className="primary-button"
            onClick={fetchRiskAnalysis}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalAlerts =
    riskData?.total_alerts || 0;

  const averageRiskScore =
    Number(
      riskData?.average_risk_score || 0
    );

  const maximumRiskScore =
    Number(
      riskData?.maximum_risk_score || 0
    );

  const currentRiskLevel =
    riskData?.current_risk_level || 'LOW';

  const distribution =
    riskData?.risk_distribution || {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

  const attackTypes =
    riskData?.attack_type_distribution || {};

  const topSources =
    riskData?.top_sources || [];

  const topDestinations =
    riskData?.top_destinations || [];

  const recentHighRiskAlerts =
    riskData?.recent_high_risk_alerts || [];

  return (
    <div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Risk Analysis</h2>

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

        {error && (
          <p className="login-error">
            {error}
          </p>
        )}

        <div className="metrics-grid">

          <MetricCard
            title="Average Risk Score"
            value={`${averageRiskScore.toFixed(1)}/100`}
            change="Current"
            icon="◈"
          />

          <MetricCard
            title="Maximum Risk Score"
            value={`${maximumRiskScore.toFixed(1)}/100`}
            change="Observed"
            icon="⚠"
          />

          <MetricCard
            title="Total Alerts"
            value={totalAlerts.toLocaleString()}
            change="Analyzed"
            icon="⚡"
          />

          <MetricCard
            title="Current Risk Level"
            value={currentRiskLevel}
            change="Overall assessment"
            icon="◫"
          />

        </div>
      </div>


      <div className="dashboard-grid">

        <div className="panel">

          <div className="panel-header">
            <h2>
              Risk Distribution
            </h2>

            <span>
              All stored alerts
            </span>
          </div>

          <div className="analytics-list">

            {[
              'LOW',
              'MEDIUM',
              'HIGH',
              'CRITICAL',
            ].map((level) => {

              const count =
                Number(
                  distribution[level] || 0
                );

              const percentage =
                totalAlerts > 0
                  ? (
                      count /
                      totalAlerts
                    ) * 100
                  : 0;

              return (
                <div key={level}>

                  <span>
                    <span
                      className={getRiskClass(
                        level
                      )}
                    >
                      {level}
                    </span>
                  </span>

                  <strong>
                    {count.toLocaleString()}
                    {' '}
                    ({percentage.toFixed(1)}%)
                  </strong>

                </div>
              );
            })}

          </div>

        </div>


        <div className="panel">

          <div className="panel-header">
            <h2>
              Attack Type Distribution
            </h2>

            <span>
              Alert classification
            </span>
          </div>

          <div className="analytics-list">

            {Object.keys(attackTypes).length === 0 ? (

              <div>
                <span>
                  No attack-type data available
                </span>
              </div>

            ) : (

              Object.entries(
                attackTypes
              ).map(
                ([attackType, count]) => (
                  <div key={attackType}>
                    <span>
                      {attackType}
                    </span>

                    <strong>
                      {Number(
                        count
                      ).toLocaleString()}
                    </strong>
                  </div>
                )
              )

            )}

          </div>

        </div>

      </div>


      <div className="dashboard-grid">

        <div className="panel">

          <div className="panel-header">
            <h2>
              Top Risk Sources
            </h2>

            <span>
              Most frequent alert sources
            </span>
          </div>

          <div className="analytics-list">

            {topSources.length === 0 ? (

              <div>
                <span>
                  No source data available
                </span>
              </div>

            ) : (

              topSources.map(
                ({ source, count }) => (

                  <div key={source}>

                    <span>
                      {source}
                    </span>

                    <strong>
                      {Number(
                        count
                      ).toLocaleString()}
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
              Top Risk Destinations
            </h2>

            <span>
              Most frequent alert destinations
            </span>
          </div>

          <div className="analytics-list">

            {topDestinations.length === 0 ? (

              <div>
                <span>
                  No destination data available
                </span>
              </div>

            ) : (

              topDestinations.map(
                ({
                  destination,
                  count,
                }) => (

                  <div
                    key={destination}
                  >

                    <span>
                      {destination}
                    </span>

                    <strong>
                      {Number(
                        count
                      ).toLocaleString()}
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

          <div>
            <h2>
              Recent High-Risk Events
            </h2>

            <span>
              HIGH and CRITICAL alerts requiring
              attention
            </span>
          </div>

        </div>


        <div className="user-table">

          {recentHighRiskAlerts.length === 0 ? (

            <p>
              No HIGH or CRITICAL events found.
            </p>

          ) : (

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
                    Risk Level
                  </th>

                  <th>
                    Score
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Created
                  </th>

                </tr>

              </thead>


              <tbody>

                {recentHighRiskAlerts.map(
                  (alert) => (

                    <tr
                      key={alert.alert_id}
                    >

                      <td>
                        <strong>
                          {alert.attack_type ||
                            'UNKNOWN'}
                        </strong>
                      </td>

                      <td>
                        {alert.source ||
                          'N/A'}
                      </td>

                      <td>
                        {alert.destination ||
                          'N/A'}
                      </td>

                      <td>
                        <span
                          className={getRiskClass(
                            alert.risk_level
                          )}
                        >
                          {alert.risk_level ||
                            'LOW'}
                        </span>
                      </td>

                      <td>
                        {Number(
                          alert.risk_score || 0
                        ).toFixed(1)}
                        /100
                      </td>

                      <td>
                        <span className="table-role">
                          {alert.status ||
                            'OPEN'}
                        </span>
                      </td>

                      <td>
                        {formatDateTime(
                          alert.created_at
                        )}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          )}

        </div>

      </div>

    </div>
  );
}


// ---------------------------------------------------------
// USER MANAGEMENT
// ---------------------------------------------------------
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'ANALYST',
    is_active: true,
  });

  const fetchUsers = async () => {
    const token = localStorage.getItem('netshield_token');

    if (!token) {
      setError('Authentication token not found.');
      setLoading(false);
      return;
    }

    try {
      setError('');

      const response = await fetch(
        `${API_URL}/users`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }

      if (response.status === 403) {
        throw new Error(
          'Administrator privileges are required.'
        );
      }

      if (!response.ok) {
        throw new Error(
          'Unable to load users.'
        );
      }

      const data = await response.json();

      setUsers(data);

    } catch (err) {
      setError(
        err.message ||
        'Unable to connect to the backend.'
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchUsers();
  }, []);


  const handleFormChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const handleCreateUser = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem(
      'netshield_token'
    );

    if (!token) {
      setError(
        'Authentication token not found.'
      );
      return;
    }

    if (
      !formData.username.trim() ||
      !formData.password
    ) {
      setError(
        'Username and password are required.'
      );
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await fetch(
        `${API_URL}/users`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            username:
              formData.username.trim(),

            password:
              formData.password,

            role:
              formData.role,

            is_active:
              formData.is_active,
          }),
        }
      );

      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }

      if (response.status === 403) {
        throw new Error(
          'Administrator privileges are required.'
        );
      }

      const data =
        await response.json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
          'Unable to create user.'
        );
      }

      setFormData({
        username: '',
        password: '',
        role: 'ANALYST',
        is_active: true,
      });

      setShowAddForm(false);

      await fetchUsers();

    } catch (err) {
      setError(
        err.message ||
        'Unable to create user.'
      );

    } finally {
      setSaving(false);
    }
  };


  const handleDeleteUser = async (user) => {
    const token = localStorage.getItem(
      'netshield_token'
    );

    if (!token) {
      setError(
        'Authentication token not found.'
      );
      return;
    }

    if (user.username === 'admin') {
      setError(
        'The admin account cannot be deleted.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete user "${user.username}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      const response = await fetch(
        `${API_URL}/users/${user.user_id}`,
        {
          method: 'DELETE',

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }

      if (response.status === 403) {
        throw new Error(
          'Administrator privileges are required.'
        );
      }

      const data =
        await response.json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
          'Unable to delete user.'
        );
      }

      await fetchUsers();

    } catch (err) {
      setError(
        err.message ||
        'Unable to delete user.'
      );
    }
  };


  if (loading) {
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

        </div>

        <div className="user-table">
          <p>
            Loading users...
          </p>
        </div>

      </div>
    );
  }


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

          onClick={() => {
            setShowAddForm(
              (previous) => !previous
            );

            setError('');
          }}
        >
          {showAddForm
            ? '✕ Cancel'
            : '+ Add User'}
        </button>

      </div>


      {error && (
        <p className="login-error">
          {error}
        </p>
      )}


      {showAddForm && (
        <div className="panel">

          <h3>
            Add New User
          </h3>


          <form
            onSubmit={handleCreateUser}
          >

            <div className="form-group">

              <label>
                Username
              </label>

              <input
                type="text"
                name="username"
                value={
                  formData.username
                }
                onChange={
                  handleFormChange
                }
                placeholder="Enter username"
                disabled={saving}
              />

            </div>


            <div className="form-group">

              <label>
                Password
              </label>

              <input
                type="password"
                name="password"
                value={
                  formData.password
                }
                onChange={
                  handleFormChange
                }
                placeholder="Enter password"
                disabled={saving}
              />

            </div>


            <div className="form-group">

              <label>
                Role
              </label>

              <select
                name="role"
                value={
                  formData.role
                }
                onChange={
                  handleFormChange
                }
                disabled={saving}
              >

                <option value="ANALYST">
                  ANALYST
                </option>

                <option value="ADMIN">
                  ADMIN
                </option>

              </select>

            </div>


            <div
              style={{
                marginTop: '10px',
                marginBottom: '15px',
              }}
            >

              <label>

                <input
                  type="checkbox"
                  checked={
                    formData.is_active
                  }

                  onChange={(event) => {
                    setFormData(
                      (previous) => ({
                        ...previous,
                        is_active:
                          event.target.checked,
                      })
                    );
                  }}

                  disabled={saving}
                />

                {' '}
                Active

              </label>

            </div>


            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? 'Creating...'
                : 'Create User'}
            </button>

          </form>

        </div>
      )}


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
                  key={user.user_id}
                >

                  <td>

                    <strong>
                      {user.username}
                    </strong>

                  </td>


                  <td>

                    <span
                      className="table-role"
                    >
                      {user.role}
                    </span>

                  </td>


                  <td>

                    <span
                      className="active-status"
                    >
                      ●{' '}
                      {user.is_active
                        ? 'Active'
                        : 'Inactive'}
                    </span>

                  </td>


                  <td>

                    <button
                      className="table-action danger"

                      onClick={() =>
                        handleDeleteUser(user)
                      }

                      disabled={
                        user.username ===
                        'admin'
                      }
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
// INCIDENT MANAGEMENT
// ---------------------------------------------------------

function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionId, setActionId] = useState(null);

  const fetchIncidents = async () => {
    const token = localStorage.getItem('netshield_token');

    if (!token) {
      setError('Authentication token not found.');
      setLoading(false);
      return;
    }

    try {
      setError('');

      const query = new URLSearchParams();

      if (severityFilter !== 'ALL') {
        query.set('severity', severityFilter);
      }

      if (statusFilter !== 'ALL') {
        query.set('incident_status', statusFilter);
      }

      const queryString = query.toString();
      const url = queryString
        ? `${API_URL}/incidents?${queryString}`
        : `${API_URL}/incidents`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }

      if (response.status === 403) {
        throw new Error(
          'You do not have permission to view incidents.'
        );
      }

      if (!response.ok) {
        throw new Error(
          `Incident service returned HTTP ${response.status}`
        );
      }

      const data = await response.json();
      setIncidents(data);
    } catch (err) {
      setError(
        err.message || 'Unable to load incidents.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [severityFilter, statusFilter]);

  const updateIncidentStatus = async (
    incidentId,
    newStatus
  ) => {
    const token = localStorage.getItem('netshield_token');

    if (!token) {
      setError('Authentication token not found.');
      return;
    }

    try {
      setActionId(incidentId);
      setError('');

      const response = await fetch(
        `${API_URL}/incidents/${incidentId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.detail || 'Unable to update incident.'
        );
      }

      await fetchIncidents();
    } catch (err) {
      setError(
        err.message || 'Unable to update incident.'
      );
    } finally {
      setActionId(null);
    }
  };

  const createIncidentFromAlert = async () => {
    const token = localStorage.getItem('netshield_token');

    if (!token) {
      setError('Authentication token not found.');
      return;
    }

    const alertId = window.prompt(
      'Enter the Alert ID to convert into an incident:'
    );

    if (!alertId || !alertId.trim()) {
      return;
    }

    if (!/^\d+$/.test(alertId.trim())) {
      setError('Alert ID must be a number.');
      return;
    }

    try {
      setActionId(`alert-${alertId}`);
      setError('');

      const response = await fetch(
        `${API_URL}/incidents/from-alert/${alertId.trim()}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.detail || 'Unable to create incident from alert.'
        );
      }

      await fetchIncidents();
    } catch (err) {
      setError(
        err.message || 'Unable to create incident from alert.'
      );
    } finally {
      setActionId(null);
    }
  };

  const addInvestigationNote = async (incidentId) => {
    const token = localStorage.getItem('netshield_token');

    if (!token) {
      setError('Authentication token not found.');
      return;
    }

    const note = window.prompt(
      'Enter investigation note:'
    );

    if (!note || !note.trim()) {
      return;
    }

    try {
      setActionId(`note-${incidentId}`);
      setError('');

      const response = await fetch(
        `${API_URL}/incidents/${incidentId}/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            note: note.trim(),
          }),
        }
      );

      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.detail || 'Unable to save investigation note.'
        );
      }

      await fetchIncidents();
    } catch (err) {
      setError(
        err.message || 'Unable to save investigation note.'
      );
    } finally {
      setActionId(null);
    }
  };

  const totalIncidents = incidents.length;
  const openCount = incidents.filter(
    (item) => item.status === 'OPEN'
  ).length;
  const investigatingCount = incidents.filter(
    (item) => item.status === 'INVESTIGATING'
  ).length;
  const criticalCount = incidents.filter(
    (item) => item.severity === 'CRITICAL'
  ).length;

  const riskClass = (severity) =>
    `risk-badge ${(severity || 'MEDIUM').toLowerCase()}`;

  if (loading && incidents.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Incident Management</h2>
            <span>Investigation and response workflow</span>
          </div>
        </div>
        <div className="monitoring-placeholder">
          <h3>Loading incidents...</h3>
          <p>Retrieving investigation cases from the backend.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="metrics-grid">
        <MetricCard
          title="Total Incidents"
          value={totalIncidents.toLocaleString()}
          change="Current"
          icon="◆"
        />
        <MetricCard
          title="Open"
          value={openCount.toLocaleString()}
          change="Active"
          icon="◉"
        />
        <MetricCard
          title="Investigating"
          value={investigatingCount.toLocaleString()}
          change="In progress"
          icon="⚡"
        />
        <MetricCard
          title="Critical"
          value={criticalCount.toLocaleString()}
          change="Requires attention"
          icon="⚠"
        />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Incident Management</h2>
            <span>Alerts promoted into investigation cases</span>
          </div>

          <button
            className="primary-button"
            onClick={createIncidentFromAlert}
            disabled={actionId !== null}
          >
            + Create from Alert
          </button>
        </div>

        {error && (
          <p className="login-error">{error}</p>
        )}

        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '18px',
          }}
        >
          <label>
            Severity{' '}
            <select
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(event.target.value)
              }
            >
              <option value="ALL">All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>

          <label>
            Status{' '}
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="ALL">All</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>

          <button
            className="primary-button"
            onClick={fetchIncidents}
          >
            Refresh
          </button>
        </div>

        <div className="user-table">
          {incidents.length === 0 ? (
            <div className="monitoring-placeholder">
              <h3>No incidents found</h3>
              <p>
                Promote a high-risk alert into an incident to start an investigation.
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Incident</th>
                  <th>Attack Type</th>
                  <th>Severity</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.incident_id}>
                    <td>
                      <strong>#{incident.incident_id}</strong>
                    </td>

                    <td>
                      <strong>{incident.title}</strong>
                    </td>

                    <td>{incident.attack_type}</td>

                    <td>
                      <span className={riskClass(incident.severity)}>
                        {incident.severity}
                      </span>
                    </td>

                    <td>
                      {Number(incident.risk_score || 0).toFixed(1)}/100
                    </td>

                    <td>
                      <span className="table-role">
                        {incident.status}
                      </span>
                    </td>

                    <td>{incident.source || 'N/A'}</td>

                    <td>
                      {incident.status === 'OPEN' && (
                        <button
                          className="table-action"
                          disabled={actionId === incident.incident_id}
                          onClick={() =>
                            updateIncidentStatus(
                              incident.incident_id,
                              'INVESTIGATING'
                            )
                          }
                        >
                          Investigate
                        </button>
                      )}

                      {incident.status === 'INVESTIGATING' && (
                        <button
                          className="table-action"
                          disabled={actionId === incident.incident_id}
                          onClick={() =>
                            updateIncidentStatus(
                              incident.incident_id,
                              'RESOLVED'
                            )
                          }
                        >
                          Resolve
                        </button>
                      )}

                      <button
                        className="table-action"
                        disabled={actionId === `note-${incident.incident_id}`}
                        onClick={() =>
                          addInvestigationNote(
                            incident.incident_id
                          )
                        }
                      >
                        Note
                      </button>

                      {incident.status === 'RESOLVED' && (
                        <button
                          className="table-action"
                          disabled={actionId === incident.incident_id}
                          onClick={() =>
                            updateIncidentStatus(
                              incident.incident_id,
                              'CLOSED'
                            )
                          }
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


// ---------------------------------------------------------
// THREAT INTELLIGENCE
// ---------------------------------------------------------

function ThreatIntelligence() {
  const [threatData, setThreatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [classificationFilter, setClassificationFilter] = useState('ALL');

  const fetchThreatIntelligence = async () => {
    const token = localStorage.getItem('netshield_token');

    if (!token) {
      setError('Authentication token not found.');
      setLoading(false);
      return;
    }

    try {
      setError('');

      const response = await fetch(
        `${API_URL}/threat-intelligence`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }

      if (!response.ok) {
        throw new Error(
          `Threat Intelligence service returned HTTP ${response.status}`
        );
      }

      const data = await response.json();
      setThreatData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.message ||
        'Unable to load threat intelligence.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    const pollThreatIntelligence = async () => {
      if (cancelled) {
        return;
      }

      await fetchThreatIntelligence();

      if (!cancelled) {
        timeoutId = setTimeout(
          pollThreatIntelligence,
          10000
        );
      }
    };

    pollThreatIntelligence();

    return () => {
      cancelled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const indicators =
    threatData?.indicators || [];

  const filteredIndicators = indicators.filter(
    (item) => {
      const search = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !search ||
        String(item.indicator || '')
          .toLowerCase()
          .includes(search) ||
        String(item.type || '')
          .toLowerCase()
          .includes(search) ||
        String(item.classification || '')
          .toLowerCase()
          .includes(search) ||
        Object.keys(item.attack_types || {})
          .join(' ')
          .toLowerCase()
          .includes(search);

      const normalizedRisk = String(
        item.risk_level || ''
      ).toUpperCase();

      const normalizedClassification = String(
        item.classification || ''
      ).toUpperCase();

      const matchesRisk =
        riskFilter === 'ALL' ||
        normalizedRisk === riskFilter;

      const matchesClassification =
        classificationFilter === 'ALL' ||
        normalizedClassification === classificationFilter;

      return (
        matchesSearch &&
        matchesRisk &&
        matchesClassification
      );
    }
  );

  const formatDateTime = (value) => {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleString();
  };

  const getRiskClass = (riskLevel) => {
    return `risk-badge ${(riskLevel || 'LOW').toLowerCase()}`;
  };

  const getClassificationClass = (classification) => {
    const normalized = (
      classification || 'UNKNOWN'
    ).toLowerCase();

    return `risk-badge ${normalized}`;
  };

  if (loading && !threatData) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Threat Intelligence</h2>
            <span>Indicator aggregation from security alerts</span>
          </div>
        </div>
        <div className="monitoring-placeholder">
          <span>◇</span>
          <h3>Loading Threat Intelligence</h3>
          <p>Building the latest indicator intelligence view...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="alert-table">
          <p className="login-error">{error}</p>
          <button
            className="primary-button"
            onClick={fetchThreatIntelligence}
          >
            Retry
          </button>
        </div>
      )}

      <div className="metrics-grid">
        <MetricCard
          title="Total Indicators"
          value={
            threatData?.summary?.total_indicators?.toLocaleString() ||
            '0'
          }
          change="Current intelligence scope"
          icon="◇"
        />

        <MetricCard
          title="High-Risk Indicators"
          value={
            threatData?.summary?.high_risk_indicators?.toLocaleString() ||
            '0'
          }
          change="High + critical risk"
          icon="⚠"
        />

        <MetricCard
          title="Public Indicators"
          value={
            threatData?.summary?.public_indicators?.toLocaleString() ||
            '0'
          }
          change="Internet-routable scope"
          icon="◎"
        />

        <MetricCard
          title="Private Indicators"
          value={
            threatData?.summary?.private_indicators?.toLocaleString() ||
            '0'
          }
          change="Internal network scope"
          icon="◉"
        />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Indicator Search & Filters</h2>
            {lastUpdated && (
              <span>
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="form-group">
            <label>Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search IP, type, classification or attack"
            />
          </div>

          <div className="form-group">
            <label>Risk Level</label>
            <select
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.target.value)
              }
            >
              <option value="ALL">All risk levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="form-group">
            <label>Classification</label>
            <select
              value={classificationFilter}
              onChange={(event) =>
                setClassificationFilter(event.target.value)
              }
            >
              <option value="ALL">All indicators</option>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Indicator Intelligence</h2>
            <span>
              Showing {filteredIndicators.length.toLocaleString()} of{' '}
              {indicators.length.toLocaleString()} indicators
            </span>
          </div>
        </div>

        {filteredIndicators.length === 0 ? (
          <div className="monitoring-placeholder">
            <span>◇</span>
            <h3>No indicators match your filters</h3>
            <p>Try a broader search or reset the filters.</p>
          </div>
        ) : (
          <div className="alert-table">
            <table>
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Type</th>
                  <th>Classification</th>
                  <th>Occurrences</th>
                  <th>Max Risk</th>
                  <th>Risk Level</th>
                  <th>Attack Types</th>
                  <th>Latest Activity</th>
                  <th>Analyst Verdict</th>
                </tr>
              </thead>
              <tbody>
                {filteredIndicators.slice(0, 250).map(
                  (item) => (
                    <tr key={`${item.type}-${item.indicator}`}>
                      <td>
                        <strong>{item.indicator}</strong>
                      </td>
                      <td>{item.type}</td>
                      <td>
                        <span className={getClassificationClass(item.classification)}>
                          {item.classification || 'UNKNOWN'}
                        </span>
                      </td>
                      <td>
                        {(item.occurrences || 0).toLocaleString()}
                      </td>
                      <td>
                        {Number(
                          item.maximum_risk_score || 0
                        ).toFixed(1)}
                      </td>
                      <td>
                        <span className={getRiskClass(item.risk_level)}>
                          {item.risk_level || 'LOW'}
                        </span>
                      </td>
                      <td>
                        {Object.entries(item.attack_types || {})
                          .map(
                            ([attackType, count]) =>
                              `${attackType} (${count})`
                          )
                          .join(', ') || 'UNKNOWN'}
                      </td>
                      <td>
                        {formatDateTime(item.latest_activity)}
                      </td>
                      <td>
                        <span className="status-badge">
                          {item.analyst_verdict || 'UNKNOWN'}
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


// ---------------------------------------------------------
// REPORTS
// ---------------------------------------------------------

function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    const token = localStorage.getItem('netshield_token');

    if (!token) {
      setError('Authentication token not found.');
      setLoading(false);
      return;
    }

    try {
      setError('');

      const response = await fetch(
        `${API_URL}/reports/overview`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }

      if (!response.ok) {
        throw new Error(
          `Reports service returned HTTP ${response.status}`
        );
      }

      const data = await response.json();
      setReportData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.message ||
        'Unable to load security reports.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const exportAlerts = async () => {
    const token = localStorage.getItem('netshield_token');

    if (!token) {
      setError('Authentication token not found.');
      return;
    }

    try {
      setError('');
      setExporting(true);

      const response = await fetch(
        `${API_URL}/reports/alerts.csv`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error(
          'Authentication expired. Please login again.'
        );
      }

      if (!response.ok) {
        throw new Error(
          `CSV export returned HTTP ${response.status}`
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'netshield_alerts_report.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.message ||
        'Unable to export alerts report.'
      );
    } finally {
      setExporting(false);
    }
  };

  const summary = reportData?.summary || {};
  const riskDistribution = reportData?.risk_distribution || {};
  const attackDistribution =
    reportData?.attack_type_distribution || {};
  const topSources = reportData?.top_sources || [];
  const topDestinations = reportData?.top_destinations || [];
  const recentCriticalAlerts =
    reportData?.recent_critical_alerts || [];
  const recentIncidents = reportData?.recent_incidents || [];

  const formatDateTime = (value) => {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleString();
  };

  const getRiskClass = (riskLevel) => {
    return `risk-badge ${(riskLevel || 'LOW').toLowerCase()}`;
  };

  const distributionEntries = (value) =>
    Object.entries(value).sort(
      (a, b) => b[1] - a[1]
    );

  if (loading && !reportData) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Security Reports</h2>
            <span>Consolidated alert and incident reporting</span>
          </div>
        </div>
        <div className="monitoring-placeholder">
          <span>▣</span>
          <h3>Generating Security Report</h3>
          <p>Collecting alerts, incidents and risk statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="alert-table">
          <p className="login-error">{error}</p>
          <button
            className="primary-button"
            onClick={fetchReport}
          >
            Retry
          </button>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Security Operations Report</h2>
            <span>
              Generated for {reportData?.generated_for || 'current user'}
              {lastUpdated
                ? ` • Refreshed ${lastUpdated.toLocaleTimeString()}`
                : ''}
            </span>
          </div>

          <button
            className="primary-button"
            onClick={exportAlerts}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export Alerts CSV'}
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="Total Alerts"
          value={Number(summary.total_alerts || 0).toLocaleString()}
          change="Current alert inventory"
          icon="⚠"
        />
        <MetricCard
          title="Critical Alerts"
          value={Number(summary.critical_alerts || 0).toLocaleString()}
          change="Immediate attention"
          icon="🚨"
        />
        <MetricCard
          title="Open Incidents"
          value={Number(summary.open_incidents || 0).toLocaleString()}
          change="Awaiting response"
          icon="◆"
        />
        <MetricCard
          title="Average Risk"
          value={Number(summary.average_risk_score || 0).toFixed(1)}
          change="Across recorded alerts"
          icon="◈"
        />
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Alert Status</h2>
            <span>Operational workload</span>
          </div>

          <div className="analytics-list">
            <div>
              <span>Open</span>
              <strong>{Number(summary.open_alerts || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>Acknowledged</span>
              <strong>{Number(summary.acknowledged_alerts || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>Resolved</span>
              <strong>{Number(summary.resolved_alerts || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>High + Critical</span>
              <strong>{Number(summary.high_alerts || 0).toLocaleString()}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Incident Status</h2>
            <span>Case management workload</span>
          </div>

          <div className="analytics-list">
            <div>
              <span>Total</span>
              <strong>{Number(summary.total_incidents || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>Open</span>
              <strong>{Number(summary.open_incidents || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>Investigating</span>
              <strong>{Number(summary.investigating_incidents || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>Resolved / Closed</span>
              <strong>
                {(
                  Number(summary.resolved_incidents || 0) +
                  Number(summary.closed_incidents || 0)
                ).toLocaleString()}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Risk Distribution</h2>
            <span>Recorded alert risk levels</span>
          </div>

          <div className="analytics-list">
            {distributionEntries(riskDistribution).map(
              ([level, count]) => (
                <div key={level}>
                  <span>
                    <span className={getRiskClass(level)}>
                      {level}
                    </span>
                  </span>
                  <strong>{Number(count).toLocaleString()}</strong>
                </div>
              )
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Attack Type Distribution</h2>
            <span>Detected classifications</span>
          </div>

          <div className="analytics-list">
            {distributionEntries(attackDistribution)
              .slice(0, 10)
              .map(([attackType, count]) => (
                <div key={attackType}>
                  <span>{attackType}</span>
                  <strong>{Number(count).toLocaleString()}</strong>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Top Source Indicators</h2>
            <span>Most frequently observed sources</span>
          </div>

          <div className="analytics-list">
            {topSources.length === 0 ? (
              <div>
                <span>No source data</span>
              </div>
            ) : (
              topSources.map((item) => (
                <div key={item.source}>
                  <span>{item.source}</span>
                  <strong>{Number(item.count || 0).toLocaleString()}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Top Destination Indicators</h2>
            <span>Most frequently observed destinations</span>
          </div>

          <div className="analytics-list">
            {topDestinations.length === 0 ? (
              <div>
                <span>No destination data</span>
              </div>
            ) : (
              topDestinations.map((item) => (
                <div key={item.destination}>
                  <span>{item.destination}</span>
                  <strong>{Number(item.count || 0).toLocaleString()}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent Critical Alerts</h2>
            <span>Highest priority items in the report</span>
          </div>
        </div>

        {recentCriticalAlerts.length === 0 ? (
          <div className="monitoring-placeholder">
            <h3>No critical alerts in the current report</h3>
          </div>
        ) : (
          <div className="alert-table">
            <table>
              <thead>
                <tr>
                  <th>Alert</th>
                  <th>Attack Type</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentCriticalAlerts.map((item) => (
                  <tr key={item.alert_id}>
                    <td>#{item.alert_id}</td>
                    <td>{item.attack_type}</td>
                    <td>
                      <span className={getRiskClass(item.risk_level)}>
                        {item.risk_score?.toFixed
                          ? item.risk_score.toFixed(1)
                          : item.risk_score}
                      </span>
                    </td>
                    <td>{item.status}</td>
                    <td>{item.source || 'UNKNOWN'}</td>
                    <td>{item.destination || 'UNKNOWN'}</td>
                    <td>{formatDateTime(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent Incidents</h2>
            <span>Latest investigation cases</span>
          </div>
        </div>

        {recentIncidents.length === 0 ? (
          <div className="monitoring-placeholder">
            <h3>No incidents in the current report</h3>
          </div>
        ) : (
          <div className="alert-table">
            <table>
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Title</th>
                  <th>Attack Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentIncidents.map((item) => (
                  <tr key={item.incident_id}>
                    <td>#{item.incident_id}</td>
                    <td>{item.title}</td>
                    <td>{item.attack_type}</td>
                    <td>{item.severity}</td>
                    <td>{item.status}</td>
                    <td>{Number(item.risk_score || 0).toFixed(1)}</td>
                    <td>{formatDateTime(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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