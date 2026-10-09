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
    {
      name: 'Threat Intelligence',
      icon: '◎',
    },
    {
      name: 'Risk Analysis',
      icon: '◈',
    },
    {
      name: 'Incidents',
      icon: '⚡',
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

      case 'Threat Intelligence':
        return <ThreatIntelligence />;

      case 'Risk Analysis':
        return <RiskAnalysis />;

      case 'Incidents':
        return <Incidents />;

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
// THREAT INTELLIGENCE
// ---------------------------------------------------------

function ThreatIntelligence() {
  const [threatData, setThreatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [classificationFilter, setClassificationFilter] =
    useState('');

  const fetchThreatIntelligence = async () => {
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
          `${API_URL}/threat-intelligence`,
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
          `Threat Intelligence service returned HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      setThreatData(data);
      setLastUpdated(
        new Date()
      );

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
    fetchThreatIntelligence();

    const intervalId =
      setInterval(
        fetchThreatIntelligence,
        10000
      );

    return () => {
      clearInterval(
        intervalId
      );
    };
  }, []);


  const formatDateTime = (value) => {
    if (!value) {
      return 'N/A';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'N/A';
    }

    return date.toLocaleString();
  };


  const getRiskClass = (riskLevel) => {
    const normalized =
      (
        riskLevel ||
        'LOW'
      ).toLowerCase();

    return `risk-badge ${normalized}`;
  };


  const summary =
    threatData?.summary || {
      total_indicators: 0,
      high_risk_indicators: 0,
      public_indicators: 0,
      private_indicators: 0,
    };


  const indicators =
    threatData?.indicators || [];


  const normalizedSearch =
    searchTerm
      .trim()
      .toLowerCase();


  const filteredIndicators =
    indicators
      .filter(
        (item) => {

          const matchesSearch =
            !normalizedSearch ||
            (
              item.indicator ||
              ''
            )
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesRisk =
            !riskFilter ||
            (
              item.risk_level ||
              ''
            ).toUpperCase() ===
              riskFilter;

          const matchesClassification =
            !classificationFilter ||
            (
              item.classification ||
              ''
            ).toUpperCase() ===
              classificationFilter;

          return (
            matchesSearch &&
            matchesRisk &&
            matchesClassification
          );
        }
      );


  return (
    <div>

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Threat Intelligence
            </h2>

            <span>
              Indicator analysis from stored
              network security alerts
            </span>

            {lastUpdated && (
              <span
                style={{
                  display: 'block',
                  marginTop: '4px',
                }}
              >
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
          <div className="alert-table">

            <p className="login-error">
              {error}
            </p>

            <button
              className="primary-button"
              onClick={fetchThreatIntelligence}
            >
              Retry
            </button>

          </div>
        )}


        {!error && (
          <div className="metrics-grid">

            <MetricCard
              title="Total Indicators"
              value={Number(
                summary.total_indicators || 0
              ).toLocaleString()}
              change="Tracked"
              icon="◎"
            />

            <MetricCard
              title="High-Risk Indicators"
              value={Number(
                summary.high_risk_indicators || 0
              ).toLocaleString()}
              change="HIGH + CRITICAL"
              icon="⚠"
            />

            <MetricCard
              title="Public Indicators"
              value={Number(
                summary.public_indicators || 0
              ).toLocaleString()}
              change="External"
              icon="◉"
            />

            <MetricCard
              title="Private Indicators"
              value={Number(
                summary.private_indicators || 0
              ).toLocaleString()}
              change="Internal"
              icon="◆"
            />

          </div>
        )}

      </div>


      {!loading && !error && (

        <>

          <div className="panel">

            <div className="panel-header">

              <div>

                <h2>
                  Indicator Search & Filters
                </h2>

                <span>
                  Investigate IP indicators
                  by risk and network scope
                </span>

              </div>

            </div>


            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(220px, 2fr) minmax(160px, 1fr) minmax(160px, 1fr)',
                gap: '12px',
                marginBottom: '10px',
              }}
            >

              <div className="form-group">
                <label>
                  Search Indicator
                </label>

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="Search IP address..."
                />
              </div>


              <div className="form-group">
                <label>
                  Risk Level
                </label>

                <select
                  value={riskFilter}
                  onChange={(event) =>
                    setRiskFilter(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    All Risks
                  </option>

                  <option value="CRITICAL">
                    CRITICAL
                  </option>

                  <option value="HIGH">
                    HIGH
                  </option>

                  <option value="MEDIUM">
                    MEDIUM
                  </option>

                  <option value="LOW">
                    LOW
                  </option>

                </select>

              </div>


              <div className="form-group">
                <label>
                  Classification
                </label>

                <select
                  value={
                    classificationFilter
                  }
                  onChange={(event) =>
                    setClassificationFilter(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    All Indicators
                  </option>

                  <option value="PUBLIC">
                    PUBLIC
                  </option>

                  <option value="PRIVATE">
                    PRIVATE
                  </option>

                  <option value="UNKNOWN">
                    UNKNOWN
                  </option>

                </select>

              </div>

            </div>

          </div>


          <div className="panel">

            <div className="panel-header">

              <div>

                <h2>
                  Network Indicators
                </h2>

                <span>
                  Showing{' '}
                  {
                    filteredIndicators.length
                  }{' '}
                  of{' '}
                  {
                    indicators.length
                  }{' '}
                  indicators
                </span>

              </div>

            </div>


            {filteredIndicators.length === 0 ? (

              <div className="monitoring-placeholder">

                <span>
                  ◎
                </span>

                <h3>
                  No indicators found
                </h3>

                <p>
                  Try changing the search or
                  filter criteria.
                </p>

              </div>

            ) : (

              <div className="user-table">

                <table>

                  <thead>

                    <tr>

                      <th>
                        Indicator
                      </th>

                      <th>
                        Type
                      </th>

                      <th>
                        Classification
                      </th>

                      <th>
                        Occurrences
                      </th>

                      <th>
                        Max Risk
                      </th>

                      <th>
                        Risk Level
                      </th>

                      <th>
                        Attack Types
                      </th>

                      <th>
                        Latest Activity
                      </th>

                      <th>
                        Analyst Verdict
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredIndicators.map(
                      (item) => (

                        <tr
                          key={`${item.type}-${item.indicator}`}
                        >

                          <td>
                            <strong>
                              {
                                item.indicator ||
                                'UNKNOWN'
                              }
                            </strong>
                          </td>


                          <td>
                            {
                              item.type ||
                              'IP'
                            }
                          </td>


                          <td>
                            <span className="table-role">
                              {
                                item.classification ||
                                'UNKNOWN'
                              }
                            </span>
                          </td>


                          <td>
                            {Number(
                              item.occurrences ||
                              0
                            ).toLocaleString()}
                          </td>


                          <td>
                            {Number(
                              item.maximum_risk_score ||
                              0
                            ).toFixed(1)}
                            /100
                          </td>


                          <td>
                            <span
                              className={getRiskClass(
                                item.risk_level
                              )}
                            >
                              {
                                item.risk_level ||
                                'LOW'
                              }
                            </span>
                          </td>


                          <td>
                            {
                              Object.entries(
                                item.attack_types ||
                                {}
                              )
                                .map(
                                  (
                                    [
                                      attackType,
                                      count,
                                    ]
                                  ) =>
                                    `${attackType} (${count})`
                                )
                                .join(', ') ||
                              'UNKNOWN'
                            }
                          </td>


                          <td>
                            {formatDateTime(
                              item.latest_activity
                            )}
                          </td>


                          <td>
                            <span className="table-role">
                              {
                                item.analyst_verdict ||
                                'UNKNOWN'
                              }
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


          <div className="dashboard-grid">

            <div className="panel">

              <div className="panel-header">

                <h2>
                  Intelligence Guidance
                </h2>

                <span>
                  Analyst workflow
                </span>

              </div>


              <div className="analytics-list">

                <div>

                  <span>
                    PUBLIC
                  </span>

                  <strong>
                    External-facing indicator
                  </strong>

                </div>


                <div>

                  <span>
                    PRIVATE
                  </span>

                  <strong>
                    Internal network indicator
                  </strong>

                </div>


                <div>

                  <span>
                    HIGH / CRITICAL
                  </span>

                  <strong>
                    Prioritize for investigation
                  </strong>

                </div>


                <div>

                  <span>
                    UNKNOWN
                  </span>

                  <strong>
                    Requires analyst review
                  </strong>

                </div>

              </div>

            </div>


            <div className="panel">

              <div className="panel-header">

                <h2>
                  Intelligence Scope
                </h2>

                <span>
                  Current dataset
                </span>

              </div>


              <div className="analytics-list">

                <div>

                  <span>
                    Indicator Type
                  </span>

                  <strong>
                    IP addresses
                  </strong>

                </div>


                <div>

                  <span>
                    Data Source
                  </span>

                  <strong>
                    Stored security alerts
                  </strong>

                </div>


                <div>

                  <span>
                    Refresh
                  </span>

                  <strong>
                    Every 10 seconds
                  </strong>

                </div>

              </div>

            </div>

          </div>

        </>

      )}


      {loading && (

        <div className="panel">

          <div className="monitoring-placeholder">

            <span>
              ◎
            </span>

            <h3>
              Loading Threat Intelligence
            </h3>

            <p>
              Analyzing stored alert indicators...
            </p>

          </div>

        </div>

      )}

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
// INCIDENT MANAGEMENT
// ---------------------------------------------------------

function Incidents() {
  const [incidents, setIncidents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [severityFilter, setSeverityFilter] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('');

  const [selectedIncident, setSelectedIncident] =
    useState(null);

  const [note, setNote] =
    useState('');

  const [savingNote, setSavingNote] =
    useState(false);


  const fetchIncidents = async () => {
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

      const params =
        new URLSearchParams();

      if (severityFilter) {
        params.set(
          'severity',
          severityFilter
        );
      }

      if (statusFilter) {
        params.set(
          'incident_status',
          statusFilter
        );
      }

      const query =
        params.toString();

      const response =
        await fetch(
          `${API_URL}/incidents${
            query
              ? `?${query}`
              : ''
          }`,
          {
            method: 'GET',

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


      if (!response.ok) {
        throw new Error(
          `Incident service returned HTTP ${response.status}`
        );
      }


      const data =
        await response.json();

      setIncidents(data);

    } catch (err) {
      setError(
        err.message ||
        'Unable to load incidents.'
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchIncidents();
  }, [
    severityFilter,
    statusFilter,
  ]);


  const updateIncident =
    async (
      incidentId,
      payload
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
        setError('');

        const response =
          await fetch(
            `${API_URL}/incidents/${incidentId}`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify(
                payload
              ),
            }
          );


        if (response.status === 401) {
          throw new Error(
            'Authentication expired. Please login again.'
          );
        }


        const data =
          await response.json()
            .catch(
              () => ({})
            );


        if (!response.ok) {
          throw new Error(
            data.detail ||
            'Unable to update incident.'
          );
        }


        await fetchIncidents();

        if (
          selectedIncident &&
          selectedIncident.incident_id ===
            incidentId
        ) {
          setSelectedIncident(data);
        }

      } catch (err) {
        setError(
          err.message ||
          'Unable to update incident.'
        );
      }
    };


  const addNote = async () => {

    if (!selectedIncident) {
      return;
    }


    if (!note.trim()) {
      setError(
        'Investigation note cannot be empty.'
      );
      return;
    }


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
      setSavingNote(true);
      setError('');


      const response =
        await fetch(
          `${API_URL}/incidents/${selectedIncident.incident_id}/notes`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`,
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


      const data =
        await response.json()
          .catch(
            () => ({})
          );


      if (!response.ok) {
        throw new Error(
          data.detail ||
          'Unable to add investigation note.'
        );
      }


      setNote('');
      setSelectedIncident(data);

      await fetchIncidents();

    } catch (err) {
      setError(
        err.message ||
        'Unable to add investigation note.'
      );

    } finally {
      setSavingNote(false);
    }
  };


  const createFromAlert =
    async () => {

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
        setError('');


        const alertResponse =
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
          alertResponse.status === 401
        ) {
          throw new Error(
            'Authentication expired. Please login again.'
          );
        }


        if (!alertResponse.ok) {
          throw new Error(
            'Unable to load alerts.'
          );
        }


        const alerts =
          await alertResponse.json();


        const candidate =
          alerts.find(
            (alert) => {

              const level =
                (
                  alert.risk_level ||
                  ''
                ).toUpperCase();

              return (
                level === 'CRITICAL' ||
                level === 'HIGH'
              );
            }
          );


        if (!candidate) {
          throw new Error(
            'No HIGH or CRITICAL alert is available.'
          );
        }


        const response =
          await fetch(
            `${API_URL}/incidents/from-alert/${candidate.alert_id}`,
            {
              method: 'POST',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );


        const data =
          await response.json()
            .catch(
              () => ({})
            );


        if (!response.ok) {
          throw new Error(
            data.detail ||
            'Unable to create incident from alert.'
          );
        }


        await fetchIncidents();

        setSelectedIncident(data);

      } catch (err) {
        setError(
          err.message ||
          'Unable to create incident.'
        );
      }
    };


  if (loading) {
    return (
      <div className="panel">

        <div className="panel-header">

          <div>
            <h2>
              Incident Management
            </h2>

            <span>
              Security incidents requiring investigation
            </span>
          </div>

        </div>


        <div className="monitoring-placeholder">

          <h3>
            Loading incidents...
          </h3>

        </div>

      </div>
    );
  }


  return (
    <div>

      <div className="panel">

        <div className="panel-header">

          <div>

            <h2>
              Incident Management
            </h2>

            <span>
              Security incidents requiring investigation
            </span>

          </div>


          <button
            className="primary-button"
            onClick={createFromAlert}
          >
            + Create From Alert
          </button>

        </div>


        {error && (
          <p className="login-error">
            {error}
          </p>
        )}


        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >

          <select
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(
                event.target.value
              )
            }
          >

            <option value="">
              All Severities
            </option>

            <option value="CRITICAL">
              CRITICAL
            </option>

            <option value="HIGH">
              HIGH
            </option>

            <option value="MEDIUM">
              MEDIUM
            </option>

            <option value="LOW">
              LOW
            </option>

          </select>


          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >

            <option value="">
              All Statuses
            </option>

            <option value="OPEN">
              OPEN
            </option>

            <option value="INVESTIGATING">
              INVESTIGATING
            </option>

            <option value="RESOLVED">
              RESOLVED
            </option>

            <option value="CLOSED">
              CLOSED
            </option>

          </select>

        </div>


        {incidents.length === 0 ? (

          <div className="monitoring-placeholder">

            <h3>
              No incidents found
            </h3>

            <p>
              Click "Create From Alert" to
              create an incident from a
              HIGH or CRITICAL alert.
            </p>

          </div>

        ) : (

          <div className="user-table">

            <table>

              <thead>

                <tr>

                  <th>
                    ID
                  </th>

                  <th>
                    Incident
                  </th>

                  <th>
                    Attack Type
                  </th>

                  <th>
                    Severity
                  </th>

                  <th>
                    Risk
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Source
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {incidents.map(
                  (incident) => (

                    <tr
                      key={
                        incident.incident_id
                      }
                    >

                      <td>
                        #
                        {
                          incident.incident_id
                        }
                      </td>


                      <td>

                        <strong>
                          {
                            incident.title
                          }
                        </strong>

                      </td>


                      <td>
                        {
                          incident.attack_type
                        }
                      </td>


                      <td>

                        <span
                          className={`risk-badge ${
                            (
                              incident.severity ||
                              'LOW'
                            ).toLowerCase()
                          }`}
                        >
                          {
                            incident.severity
                          }
                        </span>

                      </td>


                      <td>

                        {
                          Number(
                            incident.risk_score ||
                            0
                          ).toFixed(1)
                        }
                        /100

                      </td>


                      <td>

                        <span className="table-role">
                          {
                            incident.status
                          }
                        </span>

                      </td>


                      <td>

                        {
                          incident.source ||
                          'N/A'
                        }

                      </td>


                      <td>

                        <button
                          className="table-action"
                          onClick={() => {
                            setSelectedIncident(
                              incident
                            );

                            setNote('');
                            setError('');
                          }}
                        >
                          View
                        </button>


                        {incident.status !==
                          'INVESTIGATING' &&
                          incident.status !==
                            'RESOLVED' &&
                          incident.status !==
                            'CLOSED' && (

                          <button
                            className="table-action"
                            onClick={() =>
                              updateIncident(
                                incident.incident_id,
                                {
                                  status:
                                    'INVESTIGATING',
                                }
                              )
                            }
                          >
                            Investigate
                          </button>

                        )}


                        {incident.status !==
                          'RESOLVED' &&
                          incident.status !==
                            'CLOSED' && (

                          <button
                            className="table-action danger"
                            onClick={() =>
                              updateIncident(
                                incident.incident_id,
                                {
                                  status:
                                    'RESOLVED',
                                }
                              )
                            }
                          >
                            Resolve
                          </button>

                        )}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {selectedIncident && (

        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Incident #
                {
                  selectedIncident.incident_id
                }
              </h2>

              <span>
                Investigation workspace
              </span>

            </div>


            <button
              className="table-action"
              onClick={() =>
                setSelectedIncident(null)
              }
            >
              Close
            </button>

          </div>


          <div className="analytics-list">

            <div>
              <span>
                Title
              </span>

              <strong>
                {
                  selectedIncident.title
                }
              </strong>
            </div>


            <div>
              <span>
                Attack Type
              </span>

              <strong>
                {
                  selectedIncident.attack_type
                }
              </strong>
            </div>


            <div>
              <span>
                Severity
              </span>

              <strong>
                {
                  selectedIncident.severity
                }
              </strong>
            </div>


            <div>
              <span>
                Risk Score
              </span>

              <strong>
                {
                  Number(
                    selectedIncident.risk_score ||
                    0
                  ).toFixed(1)
                }
                /100
              </strong>
            </div>


            <div>
              <span>
                Source
              </span>

              <strong>
                {
                  selectedIncident.source ||
                  'N/A'
                }
              </strong>
            </div>


            <div>
              <span>
                Destination
              </span>

              <strong>
                {
                  selectedIncident.destination ||
                  'N/A'
                }
              </strong>
            </div>


            <div>
              <span>
                Status
              </span>

              <strong>
                {
                  selectedIncident.status
                }
              </strong>
            </div>

          </div>


          <h3>
            Investigation Notes
          </h3>


          <div
            className="monitoring-placeholder"
            style={{
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
            }}
          >
            {
              selectedIncident.investigation_notes ||
              'No investigation notes yet.'
            }
          </div>


          <textarea
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value
              )
            }
            placeholder="Enter investigation note..."
            rows={4}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '10px',
            }}
            disabled={savingNote}
          />


          <button
            className="primary-button"
            onClick={addNote}
            disabled={savingNote}
            style={{
              marginTop: '10px',
            }}
          >
            {savingNote
              ? 'Saving...'
              : 'Add Investigation Note'}
          </button>

        </div>

      )}

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

    fetchAlerts();


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