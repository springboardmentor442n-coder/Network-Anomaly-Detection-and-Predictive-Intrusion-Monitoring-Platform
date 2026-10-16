import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Activity, Database, BarChart2, Shield, Bell,
  AlertTriangle, TrendingUp, LineChart, Globe, FileText, Cpu,
  Users, UsersRound, ScrollText, Settings, LogOut, ChevronRight,
  Wifi, WifiOff
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/live-monitor', label: 'Live Monitor', icon: Activity },
  { path: '/dataset', label: 'CICIDS2017 Dataset', icon: Database },
  { path: '/traffic', label: 'Traffic Analysis', icon: BarChart2 },
  { path: '/threat-detection', label: 'Threat Detection', icon: Shield },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/risk-analysis', label: 'Risk Analysis', icon: TrendingUp },
  { path: '/analytics', label: 'Analytics', icon: LineChart },
  { path: '/threat-intelligence', label: 'Threat Intelligence', icon: Globe },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/model-performance', label: 'Model Performance', icon: Cpu },
];

const ADMIN_ITEMS = [
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/teams', label: 'Teams', icon: UsersRound },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.get('/dashboard/system-health').then(r => r.data),
    refetchInterval: 30000,
    retry: false,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">
          NET<span>SHIELD</span> AI
        </div>
        <div className="sidebar-logo-sub">NETWORK SECURITY PLATFORM</div>
      </div>

      {/* Main Nav */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigation</div>
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Admin Nav */}
      {user?.role === 'ADMIN' && (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Administration</div>
          {ADMIN_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>
      )}

      {/* System Status + User */}
      <div className="sidebar-bottom">
        {/* System Status */}
        <div style={{ padding: '8px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)', marginBottom: 8 }}>
            System Status
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {systemHealth ? (
              <>
                <StatusRow label="Backend" status={systemHealth.backend?.status} />
                <StatusRow label="Database" status={systemHealth.database?.status} />
                <StatusRow label="ML Model" status={systemHealth.ml_model?.status === 'active' ? 'healthy' : 'warning'} />
              </>
            ) : (
              <StatusRow label="Backend" status="offline" />
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.full_name || user?.username}</div>
          <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="sidebar-nav-item"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  const dotColor = status === 'healthy' ? 'var(--status-healthy)' :
                   status === 'warning' ? 'var(--status-warning)' :
                   status === 'offline' ? 'var(--text-disabled)' : 'var(--status-warning)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      {label}
    </div>
  );
}
