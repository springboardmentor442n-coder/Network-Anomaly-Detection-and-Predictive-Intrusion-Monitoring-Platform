import React, { useState } from 'react';
import { SecurityProvider } from './context/SecurityContext';
import { Header } from './components/Header';
import { Sidebar, NavItemKey } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { LoginModal } from './components/LoginModal';

// Views
import { DashboardView } from './components/views/DashboardView';
import { NetworkMonitoringView } from './components/views/NetworkMonitoringView';
import { DatasetManagementView } from './components/views/DatasetManagementView';
import { AnomalyDetectionView } from './components/views/AnomalyDetectionView';
import { AttackPredictionView } from './components/views/AttackPredictionView';
import { ThreatClassificationView } from './components/views/ThreatClassificationView';
import { RiskScoringView } from './components/views/RiskScoringView';
import { ThreatAlertsView } from './components/views/ThreatAlertsView';
import { IncidentManagementView } from './components/views/IncidentManagementView';
import { SecurityAnalyticsView } from './components/views/SecurityAnalyticsView';
import { ThreatIntelligenceView } from './components/views/ThreatIntelligenceView';
import { ModelPerformanceView } from './components/views/ModelPerformanceView';
import { SystemTestingView } from './components/views/SystemTestingView';
import { DeploymentView } from './components/views/DeploymentView';
import { DocumentationView } from './components/views/DocumentationView';
import { FirewallRulesView } from './components/views/FirewallRulesView';
import { AuditLogsView } from './components/views/AuditLogsView';
import { SettingsView } from './components/views/SettingsView';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView setActiveTab={setActiveTab} />;
      case 'monitoring':
        return <NetworkMonitoringView />;
      case 'datasets':
        return <DatasetManagementView />;
      case 'anomaly':
        return <AnomalyDetectionView />;
      case 'prediction':
        return <AttackPredictionView />;
      case 'classification':
        return <ThreatClassificationView />;
      case 'risk':
        return <RiskScoringView />;
      case 'alerts':
        return <ThreatAlertsView />;
      case 'incidents':
        return <IncidentManagementView />;
      case 'analytics':
      case 'reports':
        return <SecurityAnalyticsView />;
      case 'intel':
        return <ThreatIntelligenceView />;
      case 'performance':
        return <ModelPerformanceView />;
      case 'testing':
        return <SystemTestingView />;
      case 'deployment':
        return <DeploymentView />;
      case 'documentation':
        return <DocumentationView />;
      case 'firewall':
        return <FirewallRulesView />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#070b13] text-slate-100 overflow-hidden font-sans">
      {/* Collapsible Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          openLoginModal={() => setIsLoginModalOpen(true)}
          activeTab={activeTab}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#070b13] custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Global Notifications & Modals */}
      <ToastContainer />
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
};

export default function App() {
  return (
    <SecurityProvider>
      <MainLayout />
    </SecurityProvider>
  );
}
