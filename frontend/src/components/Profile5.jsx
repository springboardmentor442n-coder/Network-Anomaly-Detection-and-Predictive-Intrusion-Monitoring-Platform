import React, { useState } from 'react';
import {
  ShieldCheck, User, Key, Activity, Award, Mail, Clock,
  Database, Lock, Copy, Check, ExternalLink, Sparkles,
  Terminal, FileText, CheckCircle2, Cpu, Globe, Server,
  Shield, Edit3, Share2, Layers, AlertCircle
} from 'lucide-react';

/**
 * Profile 5 - React Bits Pro Component
 * Creator card with stats and link tabs adapted for NetShield AI SOC Console
 */
export default function Profile5({ user, onEditProfile }) {
  const [activeTab, setActiveTab] = useState('clearance');
  const [copied, setCopied] = useState(false);

  const analystId = user?.id ? `NS-ANALYST-${String(user.id).padStart(4, '0')}` : 'NS-ANALYST-0042';

  const handleCopyId = () => {
    navigator.clipboard?.writeText(analystId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: 'Threats Mitigated', value: '1,429', change: '+14% this month', icon: ShieldCheck, color: 'text-indigo-400' },
    { label: 'Model Precision', value: '99.89%', change: 'CICIDS2017 Benchmark', icon: Cpu, color: 'text-cyan-400' },
    { label: 'Clearance Tier', value: user?.role === 'Lead Administrator' ? 'Tier 4 - Admin' : 'Tier 3 - High', change: 'Biometric Verified', icon: Award, color: 'text-purple-400' },
    { label: 'Sensors Monitored', value: '38 Active', change: 'Zero Latency Spikes', icon: Activity, color: 'text-emerald-400' },
  ];

  const linkTabs = [
    { id: 'clearance', label: 'Clearance & Access', icon: Key },
    { id: 'activity', label: 'SOC Incident Activity', icon: Activity },
    { id: 'datasets', label: 'Assigned Models', icon: Server },
    { id: 'credentials', label: 'Security & Auth', icon: Lock },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn select-none">
      {/* Profile 5 Creator Card Container */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#0f1426]/90 via-[#0a0d1c]/95 to-[#070914] border border-[#5227ff]/30 shadow-2xl shadow-[#5227ff]/10 backdrop-blur-xl overflow-hidden">
        
        {/* Card Header Ambient Banner */}
        <div className="h-44 sm:h-52 w-full relative overflow-hidden bg-gradient-to-r from-[#1e1452] via-[#2a1378] to-[#110d33] border-b border-[#5227ff]/20">
          {/* Cyber Arc Grid Glow inside banner */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(82,39,255,0.45),transparent_75%)]"></div>
          <div className="absolute inset-0 opacity-25 bg-[linear-gradient(to_right,#5227ff_1px,transparent_1px),linear-gradient(to_bottom,#5227ff_1px,transparent_1px)] bg-[size:28px_28px]"></div>

          {/* Top Right Quick Actions */}
          <div className="absolute top-4 right-4 flex items-center space-x-2.5 z-10">
            <button
              onClick={handleCopyId}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-[#5227ff]/50 text-xs font-mono text-gray-300 hover:text-white transition backdrop-blur-md cursor-pointer"
              title="Copy Analyst ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#a78bfa]" />}
              <span>{copied ? 'Copied' : analystId}</span>
            </button>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#5227ff]/20 border border-[#5227ff]/40 text-xs font-mono text-indigo-200 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ACTIVE SESSION</span>
            </div>
          </div>
        </div>

        {/* Creator Info Section */}
        <div className="px-6 sm:px-8 pb-8 pt-0 relative">
          {/* Avatar and Identity Row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-6">
            <div className="flex items-end space-x-4">
              {/* Profile Avatar with Glowing Ring */}
              <div className="relative group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl p-1 bg-gradient-to-tr from-[#5227ff] via-[#8b5cf6] to-[#06b6d4] shadow-xl shadow-[#5227ff]/30">
                  <div className="w-full h-full rounded-[14px] bg-[#0c1022] flex items-center justify-center text-3xl font-extrabold text-white border-2 border-black/40">
                    {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'NS'}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-[#090d1f] border border-[#5227ff]/50 text-[#a78bfa] shadow-md">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              {/* Names and Badges */}
              <div className="pb-1">
                <div className="flex items-center space-x-2 flex-wrap">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    {user?.full_name || 'Security Analyst'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#5227ff]/20 text-[#c4b5fd] border border-[#5227ff]/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#a78bfa]" />
                    {user?.role || 'Security Analyst'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1 flex items-center gap-2">
                  <span>@{user?.email ? user.email.split('@')[0] : 'analyst'}</span>
                  <span className="text-gray-600">•</span>
                  <span>{user?.email || 'analyst@netshield.ai'}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2.5 sm:self-end">
              <button
                onClick={handleCopyId}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#141933] hover:bg-[#1c2247] border border-gray-700/60 hover:border-[#5227ff]/50 text-gray-200 transition flex items-center space-x-2 cursor-pointer shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Share ID</span>
              </button>
              <button
                className="px-4 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-[#5227ff] to-indigo-600 hover:from-[#4318e6] hover:to-indigo-500 text-white shadow-lg shadow-[#5227ff]/30 transition flex items-center space-x-2 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Security Shield</span>
              </button>
            </div>
          </div>

          {/* User Bio / SOC Directive */}
          <div className="bg-[#0e1329]/70 rounded-xl p-4 border border-indigo-950/60 mb-6 text-xs sm:text-sm text-gray-300 leading-relaxed">
            <span className="text-[#a78bfa] font-semibold mr-1.5 font-mono">[SOC PROFILE]</span>
            Assigned to real-time high-throughput intrusion analysis, deep packet inspection, and autonomous anomaly mitigation workflows powered by dual-core Random Forest and XGBoost ensemble engines.
          </div>

          {/* Profile Stats Grid (Profile 5 Spec) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {stats.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#0b0e21]/80 hover:bg-[#101430]/90 border border-indigo-950/70 hover:border-[#5227ff]/40 p-4 rounded-xl transition duration-200 relative group overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400">{s.label}</span>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white mb-1">
                    {s.value}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>{s.change}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Link Tabs Navigation (Profile 5 Spec) */}
          <div className="border-b border-indigo-950/80 mb-6">
            <div className="flex space-x-2 sm:space-x-3 overflow-x-auto pb-1">
              {linkTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium rounded-xl transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#5227ff]/20 text-white border border-[#5227ff]/50 shadow-sm shadow-[#5227ff]/20'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#a78bfa]' : 'text-gray-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="bg-[#080b1a]/70 rounded-xl border border-indigo-950/60 p-5 sm:p-6 text-xs text-gray-300">
            {activeTab === 'clearance' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Cryptographic Clearance & Verification</h4>
                    <p className="text-gray-400 text-xs">Role-based privileges and access boundaries assigned to this analyst.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[11px] font-mono font-medium">
                    VERIFIED ENCLAVE
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-[#0c1024] rounded-lg border border-gray-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-gray-400 text-[11px]">Primary Role Assignment</div>
                      <div className="text-white font-medium text-xs mt-0.5">{user?.role || 'Security Analyst'}</div>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="p-3 bg-[#0c1024] rounded-lg border border-gray-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-gray-400 text-[11px]">Clearance Token ID</div>
                      <div className="text-white font-mono text-xs mt-0.5">{analystId}</div>
                    </div>
                    <Key className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="p-3 bg-[#0c1024] rounded-lg border border-gray-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-gray-400 text-[11px]">Live Threat Pipeline</div>
                      <div className="text-emerald-400 font-medium text-xs mt-0.5">UNRESTRICTED READ/WRITE</div>
                    </div>
                    <Activity className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="p-3 bg-[#0c1024] rounded-lg border border-gray-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-gray-400 text-[11px]">Model Retraining Authorization</div>
                      <div className="text-white font-medium text-xs mt-0.5">
                        {user?.role === 'Lead Administrator' || user?.role === 'SOC Manager' ? 'AUTHORIZED' : 'MONITOR ONLY'}
                      </div>
                    </div>
                    <Cpu className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Recent SOC Audit Activity</h4>
                    <p className="text-gray-400 text-xs">Immutable actions logged under analyst credentials.</p>
                  </div>
                  <span className="text-xs font-mono text-gray-500">Live Sync</span>
                </div>
                <div className="space-y-2 pt-1 font-mono text-xs">
                  <div className="p-2.5 bg-[#0c1024] rounded-lg border border-gray-800/60 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-gray-200">Mitigated DDoS SYN Flood vector on sensor NS-GATEWAY-01</span>
                    </div>
                    <span className="text-gray-500 text-[11px]">14 mins ago</span>
                  </div>
                  <div className="p-2.5 bg-[#0c1024] rounded-lg border border-gray-800/60 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span className="text-gray-200">Evaluated Random Forest 99.89% validation test batch</span>
                    </div>
                    <span className="text-gray-500 text-[11px]">1 hour ago</span>
                  </div>
                  <div className="p-2.5 bg-[#0c1024] rounded-lg border border-gray-800/60 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                      <span className="text-gray-200">Logged into NetShield AI Console (Encrypted TLS 1.3)</span>
                    </div>
                    <span className="text-gray-500 text-[11px]">Today, 10:14 AM</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'datasets' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Attached AI & Neural Classifiers</h4>
                    <p className="text-gray-400 text-xs">Datasets and production models attached to this workspace.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-[#0c1024] rounded-lg border border-indigo-950/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-white text-xs">CICIDS2017 Deep Packet Model</span>
                      <span className="text-indigo-400 font-mono font-bold text-xs">99.89% Acc</span>
                    </div>
                    <p className="text-gray-400 text-[11px]">225,745 flows analyzed across 15 attack vectors including DoS, PortScan, and BruteForce.</p>
                  </div>
                  <div className="p-3 bg-[#0c1024] rounded-lg border border-indigo-950/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-white text-xs">UNSW-NB15 Modern Threat Model</span>
                      <span className="text-cyan-400 font-mono font-bold text-xs">84.73% Acc</span>
                    </div>
                    <p className="text-gray-400 text-[11px]">175,341 flows across contemporary exploits, fuzzers, reconnaissance, and worms.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'credentials' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Authentication & Cryptographic Enclave</h4>
                    <p className="text-gray-400 text-xs">Security keys, encrypted session tokens, and MFA status.</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 bg-[#0c1024] rounded-lg border border-gray-800/70">
                    <div className="flex items-center space-x-3">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-xs font-medium text-white">Two-Factor Authentication (TOTP)</div>
                        <div className="text-[11px] text-gray-400">Enforced hardware security key token</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      ENABLED
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0c1024] rounded-lg border border-gray-800/70">
                    <div className="flex items-center space-x-3">
                      <Key className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-xs font-medium text-white">SOC API Session Token</div>
                        <div className="text-[11px] text-gray-400 font-mono">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</div>
                      </div>
                    </div>
                    <button
                      onClick={() => alert("Token refreshed successfully.")}
                      className="text-xs font-mono px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition cursor-pointer"
                    >
                      Rotate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
