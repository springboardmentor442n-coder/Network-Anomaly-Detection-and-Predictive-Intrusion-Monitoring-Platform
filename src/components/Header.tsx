import React, { useState } from 'react';
import { 
  Shield, 
  Activity, 
  Play, 
  Pause, 
  Zap, 
  Bell, 
  BellOff, 
  UserCheck, 
  LogOut, 
  Clock, 
  ChevronDown, 
  AlertTriangle,
  Radio,
  Menu
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { AttackCategory } from '../types';

interface HeaderProps {
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  openLoginModal?: () => void;
  activeTab?: string;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen, openLoginModal }) => {
  const { 
    currentUser, 
    switchRole, 
    logout, 
    isLiveStreamActive, 
    toggleLiveStream, 
    streamSpeed, 
    setStreamSpeed,
    injectAttackSimulation,
    stats,
    audioAlertsEnabled,
    setAudioAlertsEnabled
  } = useSecurity();

  const [isAttackMenuOpen, setIsAttackMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Compute SOC Threat Status based on critical alerts
  let threatStatus: { level: string; color: string; bg: string; dotColor: string } = {
    level: 'DEFCON 4 - NORMAL',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/60 border-emerald-800/60',
    dotColor: 'bg-emerald-400'
  };

  if (stats.criticalAlertsCount > 2 || stats.averageRiskScore > 75) {
    threatStatus = {
      level: 'DEFCON 1 - CRITICAL THREAT',
      color: 'text-rose-400',
      bg: 'bg-rose-950/80 border-rose-800/80 shadow-lg shadow-rose-950/50',
      dotColor: 'bg-rose-500 animate-ping'
    };
  } else if (stats.criticalAlertsCount > 0 || stats.averageRiskScore > 50) {
    threatStatus = {
      level: 'DEFCON 2 - ELEVATED',
      color: 'text-orange-400',
      bg: 'bg-orange-950/70 border-orange-800/70',
      dotColor: 'bg-orange-400 animate-pulse'
    };
  } else if (stats.activeAlertsCount > 0) {
    threatStatus = {
      level: 'DEFCON 3 - GUARDED',
      color: 'text-amber-400',
      bg: 'bg-amber-950/60 border-amber-800/60',
      dotColor: 'bg-amber-400'
    };
  }

  const attackOptions: { label: string; type: AttackCategory; desc: string }[] = [
    { label: 'DDoS Volumetric Flood', type: 'DDoS', desc: '1.8M bytes/s HTTP GET surge' },
    { label: 'SSH Credential Brute Force', type: 'Brute Force', desc: '40+ auth failures/min on port 22' },
    { label: 'SQL Injection Probe', type: 'Web Attack', desc: 'Exploit attempt in URI query' },
    { label: 'Stealth SYN Port Scan', type: 'Port Scan', desc: 'Rapid reconnaissance across 1-1024' },
    { label: 'Botnet C2 Beaconing', type: 'Botnet', desc: 'Internal host communicating with C2' }
  ];

  return (
    <header className="sticky top-0 z-30 w-full bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title={isSidebarOpen ? "Collapse Navigation Sidebar" : "Expand Navigation Sidebar"}
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600/30 to-blue-900/40 border border-cyan-500/40 shadow-inner shadow-cyan-500/20">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
                NETSHIELD <span className="text-cyan-400 font-extrabold">AI</span>
              </h1>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
                SOC v2.4
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400 font-mono">
              Network Anomaly Detection & Threat Monitoring
            </p>
          </div>
        </div>

        {/* Center: SOC Threat Status & Simulation Stream Controller */}
        <div className="flex items-center gap-3">
          {/* Threat Level Badge */}
          <div className={`hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-mono font-bold ${threatStatus.bg} ${threatStatus.color}`}>
            <span className={`w-2 h-2 rounded-full ${threatStatus.dotColor}`} />
            <span>{threatStatus.level}</span>
          </div>

          {/* Live Sensor Stream Switch */}
          <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-1 gap-1">
            <button
              id="toggle-live-stream-btn"
              onClick={toggleLiveStream}
              title={isLiveStreamActive ? 'Pause packet intake' : 'Resume packet intake'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                isLiveStreamActive 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isLiveStreamActive ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                    LIVE
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>PAUSED</span>
                </>
              )}
            </button>

            {/* Stream speed selector */}
            <div className="hidden sm:flex items-center gap-0.5 pl-1 pr-1 border-l border-slate-800">
              {[1, 2, 5].map(speed => (
                <button
                  key={speed}
                  onClick={() => setStreamSpeed(speed)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    streamSpeed === speed 
                      ? 'bg-cyan-500/30 text-cyan-300 font-bold' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Quick Attack Simulator Trigger */}
          <div className="relative">
            <button
              id="attack-simulation-dropdown-btn"
              onClick={() => setIsAttackMenuOpen(!isAttackMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 text-xs font-mono font-medium transition-all shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
              <span className="hidden sm:inline">Inject Threat</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {isAttackMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0f172a] border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2"
                onClick={() => setIsAttackMenuOpen(false)}
              >
                <div className="px-2 py-1.5 border-b border-slate-800 mb-1">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-mono font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    SIMULATE INTRUSION SCENARIO
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Inject synthetic anomaly signatures to test detection & alerting
                  </p>
                </div>
                <div className="space-y-1">
                  {attackOptions.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => injectAttackSimulation(opt.type)}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-800/70 border border-transparent hover:border-slate-700 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-medium text-slate-200 group-hover:text-rose-300">
                          {opt.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-900">
                          {opt.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Audio Toggle, Clock & User Role Controller */}
        <div className="flex items-center gap-2.5">
          {/* Sound toggle */}
          <button
            onClick={() => setAudioAlertsEnabled(!audioAlertsEnabled)}
            title={audioAlertsEnabled ? 'Disable alert sounds' : 'Enable alert chime notification'}
            className={`p-2 rounded-lg border transition-colors ${
              audioAlertsEnabled 
                ? 'bg-amber-950/40 border-amber-700/50 text-amber-400' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            {audioAlertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          {/* User identity dropdown */}
          <div className="relative">
            <button
              id="user-profile-menu-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <img 
                src={currentUser?.avatar} 
                alt={currentUser?.name}
                className="w-7 h-7 rounded-full border border-cyan-500/50 object-cover"
              />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-slate-200 leading-none">{currentUser?.name}</p>
                <p className="text-[10px] font-mono text-cyan-400 uppercase mt-0.5">
                  {currentUser?.role === 'admin' ? 'Security Admin' : 'SOC Analyst'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0f172a] border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="p-2 border-b border-slate-800">
                  <p className="text-xs font-semibold text-white">{currentUser?.name}</p>
                  <p className="text-[11px] text-slate-400">{currentUser?.email}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Badge: {currentUser?.badgeId}</p>
                </div>

                <div className="py-1">
                  <p className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Switch Access Role
                  </p>
                  <button
                    onClick={() => switchRole('analyst')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono ${
                      currentUser?.role === 'analyst' 
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Security Analyst</span>
                    {currentUser?.role === 'analyst' && <UserCheck className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                  <button
                    onClick={() => switchRole('admin')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono ${
                      currentUser?.role === 'admin' 
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>SOC Administrator</span>
                    {currentUser?.role === 'admin' && <UserCheck className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-800">
                  <button
                    id="logout-btn"
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono text-rose-400 hover:bg-rose-950/50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
