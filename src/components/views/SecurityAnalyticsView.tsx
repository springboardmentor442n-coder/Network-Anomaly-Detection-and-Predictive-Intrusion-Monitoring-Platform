import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Calendar, 
  TrendingUp, 
  PieChart as PieIcon, 
  ShieldAlert, 
  Filter,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useSecurity } from '../../context/SecurityContext';
import { 
  mockTrafficTrend, 
  mockThreatDistribution, 
  mockTopAttackedPorts, 
  mockTopMaliciousIps 
} from '../../data/mockData';

export const SecurityAnalyticsView: React.FC = () => {
  const { alerts, packets, blockedIps, addToast } = useSecurity();
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const COLORS = ['#f43f5e', '#f97316', '#eab308', '#06b6d4', '#8b5cf6', '#ec4899'];

  const handleExportReport = () => {
    const reportText = `
=============================================================
NETSHIELD AI - ENTERPRISE SECURITY OPERATIONS ANALYTICS REPORT
Generated: ${new Date().toISOString()}
Scope: All Monitored Subnets & Perimeter Gateways
=============================================================

EXECUTIVE SUMMARY:
- Total Flow Records Evaluated: 84,291
- Total Threat Alerts Logged: ${alerts.length}
- Critical P-1 Incidents: ${alerts.filter(a => a.severity === 'Critical').length}
- Active Perimeter Blocked IPs: ${blockedIps.length}
- Average AI Detection Confidence: 96.8%

TOP ATTACKED PORTS:
${mockTopAttackedPorts.map(p => ` - Port ${p.port} (${p.service}): ${p.count} intrusion attempts (Vector: ${p.attackType})`).join('\n')}

TOP MALICIOUS IP RECONNAISSANCE SOURCES:
${mockTopMaliciousIps.map(ip => ` - ${ip.ip} (${ip.origin}): ${ip.attacks} events, Last Threat: ${ip.threat} (Risk Score: ${ip.risk}/100)`).join('\n')}

RECOMMENDED IMMEDIATE REMEDIATIONS:
1. Enforce strict rate-limiting on port 80/443 against identified DDoS botnet CIDRs.
2. Rotate exposed administrative credentials on internal SSH jumphosts.
3. Review WAF rulesets for OWASP top 10 SQLi bypass attempts.

Report signed by: NetShield AI Security Daemon v4.2-Prod
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `netshield_soc_security_report_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    addToast('Report Downloaded', 'Enterprise SOC executive audit report generated successfully.', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              SECURITY ANALYTICS & SOC INTELLIGENCE REPORTS
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Historical flow analysis, attack frequency trends, destination port telemetry, and threat actor provenance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {(['1h', '24h', '7d', '30d'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-2.5 py-1 rounded transition-all ${
                  timeRange === t ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-950"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate Executive Report</span>
          </button>
        </div>
      </div>

      {/* Primary Charts: Traffic Volume vs Anomaly Surge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Area Chart (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              NETWORK TRAFFIC VOLUME VS. DETECTED THREATS
            </h3>
            <span className="text-xs font-mono text-slate-400">Flows per Minute</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTrafficTrend}>
                <defs>
                  <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="threatColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }} 
                />
                <Area type="monotone" dataKey="total" name="Total Ingress" stroke="#06b6d4" fillOpacity={1} fill="url(#totalColor)" strokeWidth={2} />
                <Area type="monotone" dataKey="threats" name="Identified Attacks" stroke="#f43f5e" fillOpacity={1} fill="url(#threatColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Distribution Donut (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-3">
          <h3 className="text-sm font-bold text-white font-mono uppercase">
            ATTACK DISTRIBUTION BY TYPE
          </h3>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockThreatDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {mockThreatDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1 text-xs font-mono">
            {mockThreatDistribution.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="text-slate-400 font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Row: Top Attacked Ports & Top Malicious IPs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Attacked Ports */}
        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              TOP TARGETED NETWORK PORTS
            </h3>
            <span className="text-xs font-mono text-cyan-400">Reconnaissance & Exploits</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            {mockTopAttackedPorts.map(portItem => (
              <div key={portItem.port} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Port {portItem.port}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">{portItem.service}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{portItem.count.toLocaleString()} probes detected</p>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {portItem.attackType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Malicious IPs */}
        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              REPUTATION WATCHLIST: TOP HOSTILE SOURCE IPS
            </h3>
            <span className="text-xs font-mono text-rose-400">Repeated Offenders</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            {mockTopMaliciousIps.map(ipItem => (
              <div key={ipItem.ip} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-rose-400">{ipItem.ip}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">{ipItem.origin}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Primary Threat: <strong className="text-slate-200">{ipItem.threat}</strong></p>
                </div>

                <div className="text-right">
                  <span className="text-white font-bold">{ipItem.attacks} attacks</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {blockedIps.includes(ipItem.ip) ? 'FIREWALL BLOCKED' : `Risk: ${ipItem.risk}/100`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
