/**
 * Application shell: navigation, route table and RBAC guards.
 */

import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import { Spinner } from './components/ui'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LiveMonitor from './pages/LiveMonitor'
import Predict from './pages/Predict'
import Alerts from './pages/Alerts'
import Incidents from './pages/Incidents'
import ThreatIntel from './pages/ThreatIntel'
import Analytics from './pages/Analytics'
import Reports from './pages/Reports'
import ModelInfo from './pages/ModelInfo'
import Admin from './pages/Admin'
import AuditLogs from './pages/AuditLogs'
import Settings from './pages/Settings'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/monitor', label: 'Live monitor' },
  { to: '/predict', label: 'Detection' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/threat-intel', label: 'Threat intel' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/reports', label: 'Reports' },
  { to: '/model', label: 'Model' },
  { to: '/admin', label: 'Admin', adminOnly: true },
  { to: '/audit', label: 'Audit logs', adminOnly: true },
  { to: '/settings', label: 'Settings' },
]

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner label="Restoring session" />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <Spinner label="Checking permissions" />
  if (!isAdmin) {
    return (
      <div className="rounded border border-critical/40 bg-critical/10 px-4 py-3 text-sm text-critical">
        Administrator role required. Your account has the analyst role.
      </div>
    )
  }
  return children
}

function Shell({ children }) {
  const { user, logout, isAdmin } = useAuth()
  const items = NAV.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-edge bg-panel/60 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-accent text-sm font-bold text-ink">
              N
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-slate-100">
                NetShield <span className="text-accent">AI</span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted">
                Threat monitoring console
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted">
              {user?.email} <span className="text-accent">({user?.role})</span>
            </span>
            <button
              onClick={logout}
              className="rounded border border-edge px-2.5 py-1 text-muted transition hover:border-critical/50 hover:text-critical"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-[1500px] overflow-x-auto px-4">
          <ul className="flex gap-1 pb-2">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? 'bg-accent/15 text-accent'
                        : 'text-muted hover:bg-edge/40 hover:text-slate-200'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-6">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="*"
        element={
          <RequireAuth>
            <Shell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/monitor" element={<LiveMonitor />} />
                <Route path="/predict" element={<Predict />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/threat-intel" element={<ThreatIntel />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/model" element={<ModelInfo />} />
                <Route
                  path="/admin"
                  element={
                    <RequireAdmin>
                      <Admin />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <RequireAdmin>
                      <AuditLogs />
                    </RequireAdmin>
                  }
                />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
