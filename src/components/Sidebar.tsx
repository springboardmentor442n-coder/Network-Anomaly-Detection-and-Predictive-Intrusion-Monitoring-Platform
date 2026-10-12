import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  Database,
  Cpu, 
  Crosshair, 
  ShieldAlert, 
  Gauge, 
  Bell, 
  FileText, 
  BarChart3, 
  Globe, 
  FileBarChart, 
  Award, 
  FlaskConical, 
  Server, 
  BookOpen, 
  Settings, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export type NavItemKey = 
  | 'dashboard'
  | 'monitoring'
  | 'datasets'
  | 'anomaly'
  | 'prediction'
  | 'classification'
  | 'risk'
  | 'alerts'
  | 'incidents'
  | 'analytics'
  | 'intel'
  | 'reports'
  | 'performance'
  | 'testing'
  | 'deployment'
  | 'documentation'
  | 'firewall'
  | 'audit-logs'
  | 'settings';

export interface NavItem {
  key: NavItemKey;
  label: string;
  icon: any;
  badge?: string;
  badgeColor?: 'rose' | 'amber' | 'cyan';
}

interface SidebarProps {
  activeTab: NavItemKey;
  setActiveTab: (tab: NavItemKey) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen = true }) => {
  const { stats, logout, incidents, alerts } = useSecurity();

  const activeIncidentsCount = incidents.filter(i => i.status !== 'Resolved').length;
  const unacknowledgedAlertsCount = alerts.filter(a => a.status === 'active').length;

  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: 'SOC Core',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { key: 'monitoring', label: 'Network Monitoring', icon: Activity, badge: 'Live' },
        { key: 'datasets', label: 'Dataset Management', icon: Database }
      ]
    },
    {
      title: 'AI / ML Engines',
      items: [
        { key: 'anomaly', label: 'Anomaly Detection', icon: Cpu },
        { key: 'prediction', label: 'Attack Prediction', icon: Crosshair },
        { key: 'classification', label: 'Threat Classification', icon: ShieldAlert },
        { key: 'risk', label: 'Risk Scoring', icon: Gauge }
      ]
    },
    {
      title: 'Incident Operations',
      items: [
        { 
          key: 'alerts', 
          label: 'Threat Alerts', 
          icon: Bell, 
          badge: unacknowledgedAlertsCount > 0 ? String(unacknowledgedAlertsCount) : undefined,
          badgeColor: 'rose'
        },
        { 
          key: 'incidents', 
          label: 'Incident Management', 
          icon: FileText, 
          badge: activeIncidentsCount > 0 ? String(activeIncidentsCount) : undefined,
          badgeColor: 'amber'
        },
        { key: 'analytics', label: 'Security Analytics', icon: BarChart3 },
        { key: 'intel', label: 'Threat Intelligence', icon: Globe },
        { key: 'firewall', label: 'Firewall & ACLs', icon: Server }
      ]
    },
    {
      title: 'Verification & Ops',
      items: [
        { key: 'performance', label: 'Model Performance', icon: Award },
        { key: 'testing', label: 'System Testing', icon: FlaskConical },
        { key: 'deployment', label: 'Deployment', icon: Server, badge: 'Online' },
        { key: 'documentation', label: 'Documentation', icon: BookOpen }
      ]
    },
    {
      title: 'Administration',
      items: [
        { key: 'audit-logs', label: 'Audit Trail & Compliance', icon: FileBarChart },
        { key: 'settings', label: 'Settings & Policies', icon: Settings }
      ]
    }
  ];

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="w-64 shrink-0 bg-[#080c14] border-r border-slate-800/80 flex flex-col h-[calc(100vh-57px)] sticky top-[57px] select-none">
      {/* Scrollable nav items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    id={`nav-item-${item.key}`}
                    onClick={() => setActiveTab(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all group ${
                      isActive 
                        ? 'bg-cyan-950/50 text-cyan-300 font-semibold border border-cyan-800/60 shadow-sm shadow-cyan-950/40' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                      }`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.badge && (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono leading-tight font-bold ${
                          item.badgeColor === 'rose'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/70 animate-pulse'
                            : item.badgeColor === 'amber'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                            : 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Logout Button */}
      <div className="p-3 border-t border-slate-800/80 bg-[#060910]">
        <button
          onClick={logout}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-400" />
            <span>Sign Out Session</span>
          </div>
          <span className="text-[10px] text-slate-600 font-mono">ESC</span>
        </button>
      </div>
    </aside>
  );
};
