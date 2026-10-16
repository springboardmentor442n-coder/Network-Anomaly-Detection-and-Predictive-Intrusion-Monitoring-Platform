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
              <Route path="/dataset" element={<DatasetPage />} />
              <Route path="/traffic" element={<AnalyticsPage />} />
              <Route path="/threat-detection" element={<MLModelsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/risk-analysis" element={<AnalyticsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/threat-intelligence" element={<ThreatIntelPage />} />
              <Route path="/reports" element={<AnalyticsPage />} />
              <Route path="/model-performance" element={<MLModelsPage />} />
              <Route path="/admin/users" element={<AdminSettingsPage />} />
              <Route path="/admin/teams" element={<AdminSettingsPage />} />
              <Route path="/admin/audit-logs" element={<ThreatIntelPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
