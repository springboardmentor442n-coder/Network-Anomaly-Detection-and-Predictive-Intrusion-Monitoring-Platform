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
          🛡️
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

function DashboardLayout({ username, role, onLogout }) {
  const [activePage, setActivePage] = useState('Dashboard');

  const isAdmin = role === 'ADMIN';

  const navigationItems = [
    {
      name: 'Dashboard',
      icon: '📊',
    },
    {
      name: 'Live Monitoring',
      icon: '📡',
    },
    {
      name: 'Alerts',
      icon: '🚨',
    },
    {
      name: 'Analytics',
      icon: '📈',
    },
  ];

  // User Management is available only to ADMIN.
  if (isAdmin) {
    navigationItems.push({
      name: 'User Management',
      icon: '👥',
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
            🛡️
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

            <strong>{username}</strong>

            <span className="role-badge">
              {role}
            </span>

          </div>

          <button
            className="logout-button"
            onClick={onLogout}
            title="Logout"
          >
            🚪
          </button>

        </div>

      </aside>


      {/* MAIN CONTENT */}

      <main className="main-content">

        <header className="top-header">

          <div>
            <h1>{activePage}</h1>

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
          icon="📦"
        />

        <MetricCard
          title="Network Flows"
          value="3,847"
          change="+8.7%"
          icon="🔄"
        />

        <MetricCard
          title="Threats Detected"
          value="127"
          change="+5.2%"
          icon="⚠️"
        />

        <MetricCard
          title="Critical Alerts"
          value="8"
          change="-14.3%"
          icon="🚨"
        />

      </div>

      <div className="dashboard-grid">

        <div className="panel">

          <div className="panel-header">
            <h2>Threat Activity</h2>
            <span>Last 24 hours</span>
          </div>

          <div className="chart-container">

            <div className="bar-chart">

              {[35, 48, 42, 65, 54, 78, 61, 85, 72, 92, 67, 76].map(
                (height, index) => (
                  <div
                    key={index}
                    className="chart-bar"
                    style={{ height: `${height}%` }}
                  ></div>
                )
              )}

            </div>

          </div>

        </div>


        <div className="panel">

          <div className="panel-header">
            <h2>Threat Score</h2>
            <span>Current</span>
          </div>

          <div className="threat-score">

            <div className="score-circle">
              <strong>72</strong>
              <span>/100</span>
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
          <h2>Recent Alerts</h2>
          <span>Latest events</span>
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
  return (
    <div className="panel">

      <div className="panel-header">

        <h2>Live Network Monitoring</h2>

        <span className="live-indicator">
          ● LIVE
        </span>

      </div>

      <div className="monitoring-stats">

        <div>
          <strong>22.21</strong>
          <span>Packets/sec</span>
        </div>

        <div>
          <strong>7.68 KB/s</strong>
          <span>Traffic Rate</span>
        </div>

        <div>
          <strong>333</strong>
          <span>Packets Captured</span>
        </div>

        <div>
          <strong>345.77 B</strong>
          <span>Avg Packet Size</span>
        </div>

      </div>

      <div className="monitoring-placeholder">
        <span>📡</span>

        <h3>Live Packet Stream</h3>

        <p>
          Real-time packet visualization will be connected
          to the Scapy monitoring service.
        </p>
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

        <h2>Alert Management</h2>

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
  return (
    <div className="analytics-grid">

      <div className="panel">

        <div className="panel-header">
          <h2>Protocol Distribution</h2>
        </div>

        <div className="analytics-list">

          <div>
            <span>HTTPS</span>
            <strong>41.04%</strong>
          </div>

          <div>
            <span>UDP</span>
            <strong>33.22%</strong>
          </div>

          <div>
            <span>OTHER</span>
            <strong>16.94%</strong>
          </div>

          <div>
            <span>IP</span>
            <strong>5.21%</strong>
          </div>

          <div>
            <span>ARP</span>
            <strong>1.63%</strong>
          </div>

          <div>
            <span>DNS</span>
            <strong>0.65%</strong>
          </div>

        </div>

      </div>


      <div className="panel">

        <div className="panel-header">
          <h2>ML Performance</h2>
        </div>

        <div className="ml-metrics">

          <div>
            <strong>99.78%</strong>
            <span>Binary Accuracy</span>
          </div>

          <div>
            <strong>98.79%</strong>
            <span>Attack Type Accuracy</span>
          </div>

          <div>
            <strong>99.97%</strong>
            <span>ROC-AUC</span>
          </div>

        </div>

      </div>

    </div>
  );
}


// ---------------------------------------------------------
// USER MANAGEMENT - ADMIN ONLY
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
          <h2>User Management</h2>
          <span>Administrator access</span>
        </div>

        <button className="primary-button">
          + Add User
        </button>

      </div>

      <div className="user-table">

        <table>

          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {users.map((user) => (
              <tr key={user.username}>

                <td>
                  <strong>{user.username}</strong>
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

                  <button className="table-action">
                    Edit
                  </button>

                  <button className="table-action danger">
                    Delete
                  </button>

                </td>

              </tr>
            ))}

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
        🔒
      </div>

      <h2>Access Denied</h2>

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

        <span>{title}</span>

        <strong>{value}</strong>

        <small>{change} from previous period</small>

      </div>

    </div>
  );
}


// ---------------------------------------------------------
// ALERT TABLE - REAL BACKEND DATA
// ---------------------------------------------------------

function AlertTable() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAlerts = async () => {
    const token = localStorage.getItem('netshield_token');

    if (!token) {
      setError('Authentication token not found.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/alerts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        throw new Error('Authentication expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error('Unable to load alerts.');
      }

      const data = await response.json();

      setAlerts(data);
    } catch (err) {
      setError(
        err.message || 'Unable to connect to the backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="alert-table">
        <p>Loading alerts...</p>
      </div>
    );
  }

  if (error) {
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
        <p>No alerts found.</p>
      </div>
    );
  }

  return (
    <div className="alert-table">

      <table>

        <thead>

          <tr>
            <th>Attack Type</th>
            <th>Source</th>
            <th>Destination</th>
            <th>Risk</th>
            <th>Score</th>
            <th>Status</th>
          </tr>

        </thead>

        <tbody>

          {alerts.map((alert) => (
            <tr key={alert.alert_id}>

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

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}


export default App;