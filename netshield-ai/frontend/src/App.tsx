import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import LiveMonitorPage from '@/pages/LiveMonitorPage';
import DatasetPage from '@/pages/DatasetPage';
import AlertsPage from '@/pages/AlertsPage';
import IncidentsPage from '@/pages/IncidentsPage';
import MLModelsPage from '@/pages/MLModelsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import ThreatIntelPage from '@/pages/ThreatIntelPage';
import AdminSettingsPage from '@/pages/AdminSettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-root)', color: 'var(--text-secondary)' }}>
        Loading NETSHIELD AI...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-root)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar title="NETSHIELD AI Security Center" />
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-root)' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/live-monitor" element={<LiveMonitorPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/models" element={<MLModelsPage />} />
              <Route path="/dataset" element={<DatasetPage />} />
              <Route path="/threat-intel" element={<ThreatIntelPage />} />
              <Route path="/admin" element={<AdminSettingsPage />} />

              {/* Clean redirects for legacy duplicate paths */}
              <Route path="/traffic" element={<Navigate to="/analytics" replace />} />
              <Route path="/risk-analysis" element={<Navigate to="/analytics" replace />} />
              <Route path="/reports" element={<Navigate to="/analytics" replace />} />
              <Route path="/threat-detection" element={<Navigate to="/models" replace />} />
              <Route path="/model-performance" element={<Navigate to="/models" replace />} />
              <Route path="/threat-intelligence" element={<Navigate to="/threat-intel" replace />} />
              <Route path="/admin/users" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/teams" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/audit-logs" element={<Navigate to="/threat-intel" replace />} />
              <Route path="/admin/settings" element={<Navigate to="/admin" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
