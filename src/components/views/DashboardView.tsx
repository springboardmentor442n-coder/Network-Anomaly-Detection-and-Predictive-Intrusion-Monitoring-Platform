import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Bell, 
  Flame, 
  Gauge, 
  Cpu, 
  ArrowRight,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Radio,
  Clock
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
  LineChart, 
  Line,
  Legend
} from 'recharts';
import { useSecurity } from '../../context/SecurityContext';
import { SOCMetricCard, SeverityBadge, AttackBadge, RiskGaugeBadge } from '../common/UIComponents';
import { NavItemKey } from '../Sidebar';

interface DashboardViewProps {
  setActiveTab: (tab: NavItemKey) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const { 
    stats, 
    packets, 
    alerts, 
    incidents, 
    isLiveStreamActive, 
    toggleLiveStream,
    acknowledgeAlert,
    escalateAlertToIncident
  } = useSecurity();

  // Synthetic trend data for traffic & risk over the last 12 time intervals
  const trafficTrendData = [
    { time: '15:10', normal: 420, attack: 12, risk: 24 },
    { time: '15:12', normal: 460, attack: 18, risk: 28 },
    { time: '15:14', normal: 510, attack: 15, risk: 25 },
    { time: '15:16', normal: 490, attack: 45, risk: 42 },
    { time: '15:18', normal: 540, attack: 68, risk: 58 },
    { time: '15:20', normal: 590, attack: 32, risk: 48 },
    { time: '15:22', normal: 610, attack: 28, risk: 44 },
    { time: '15:24', normal: stats.normalTrafficCount % 800 + 400, attack: stats.anomalousTrafficCount % 120 + 20, risk: stats.averageRiskScore }
  ];

  const attackDistributionData = [
    { name: 'DDoS', count: 38, color: '#f43f5e' },
    { name: 'Port Scan', count: 24, color: '#f59e0b' },
    { name: 'Brute Force', count: 18, color: '#fb923c' },
    { name: 'Web Attack', count: 14, color: '#ec4899' },
    { name: 'Botnet', count: 11, color: '#ef4444' },
    { name: 'Infiltration', count: 6, color: '#8b5cf6' }
  ];

  const severityData = [
    { name: 'Critical', value: stats.criticalAlertsCount + 3, color: '#f43f5e' },
    { name: 'High', value: 8, color: '#f97316' },
    { name: 'Medium', value: 14, color: '#f59e0b' },
    { name: 'Low', value: 29, color: '#10b981' }
  ];

  const recentAnomalousPackets = packets.filter(p => p.status === 'ATTACK').slice(0, 5);
  const recentCriticalAlerts = alerts.filter(a => a.severity === 'Critical' || a.severity === 'High').slice(0, 4);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Workflow Status & SOC Headline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0c1322] to-slate-900/90 border border-slate-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h2 className="text-lg font-bold text-white font-mono tracking-tight">
              CENTRAL SECURITY OPERATIONS DASHBOARD
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Autonomous threat monitoring, machine learning intrusion inference, and tactical incident response
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('monitoring')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/60 border border-cyan-800/60 text-xs font-mono text-cyan-300 transition-colors shadow-sm"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Open Network Monitor</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900/60 border border-rose-800/60 text-xs font-mono text-rose-300 transition-colors shadow-sm"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Triage Alerts ({stats.activeAlertsCount})</span>
          </button>
        </div>
      </div>

      {/* Complete System Workflow Stepper Mini-Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 min-w-max">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mr-1">SOC Pipeline:</span>
          {[
            { label: 'Traffic Monitoring', tab: 'monitoring' as NavItemKey },
            { label: 'Data Preprocessing', tab: 'datasets' as NavItemKey },
            { label: 'Feature Extraction', tab: 'datasets' as NavItemKey },
            { label: 'Anomaly Detection', tab: 'anomaly' as NavItemKey, highlight: true },
            { label: 'Attack Prediction', tab: 'prediction' as NavItemKey },
            { label: 'Threat Classification', tab: 'classification' as NavItemKey },
            { label: 'Risk Scoring', tab: 'risk' as NavItemKey, highlight: true },
            { label: 'Threat Alert', tab: 'alerts' as NavItemKey },
            { label: 'Incident Mgmt', tab: 'incidents' as NavItemKey },
            { label: 'Analytics', tab: 'analytics' as NavItemKey },
            { label: 'Model Validation', tab: 'testing' as NavItemKey }
          ].map((step, idx, arr) => (
            <React.Fragment key={step.label}>
              <button
                onClick={() => setActiveTab(step.tab)}
                className={`px-2 py-1 rounded transition-colors ${
                  step.highlight 
                    ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 font-semibold' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {step.label}
              </button>
              {idx < arr.length - 1 && <span className="text-slate-600">&rarr;</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 8 Milestone 1 Key Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <SOCMetricCard
          id="metric-total-traffic"
          title="Total Network Traffic"
          value={`${stats.totalTrafficMb} MB`}
          subValue="Cumulative sensor volume"
          icon={<Activity className="w-5 h-5" />}
          trend="+18.4% surge"
          trendPositive={false}
          statusColor="cyan"
        />

        <SOCMetricCard
          id="metric-total-packets"
          title="Total Packets Monitored"
          value={stats.totalPackets.toLocaleString()}
          subValue="Real-time flow ingress"
          icon={<Cpu className="w-5 h-5" />}
          trend="2,480 pkts/sec"
          trendPositive={true}
          statusColor="slate"
        />

        <SOCMetricCard
          id="metric-normal-traffic"
          title="Normal Traffic"
          value={stats.normalTrafficCount.toLocaleString()}
          subValue="94.6% baseline health"
          icon={<ShieldCheck className="w-5 h-5" />}
          trend="Verified Benign"
          trendPositive={true}
          statusColor="emerald"
        />

        <SOCMetricCard
          id="metric-anomalous-traffic"
          title="Anomalous Traffic"
          value={stats.anomalousTrafficCount.toLocaleString()}
          subValue="Detected via ML Isolation"
          icon={<AlertTriangle className="w-5 h-5" />}
          trend="+8 anomalies"
          trendPositive={false}
          statusColor="amber"
        />

        <SOCMetricCard
          id="metric-detected-attacks"
          title="Detected Attacks"
          value={stats.detectedAttacksCount}
          subValue="Multi-class classified"
          icon={<Flame className="w-5 h-5" />}
          trend="DDoS & Brute Force"
          trendPositive={false}
          statusColor="rose"
        />

        <SOCMetricCard
          id="metric-active-alerts"
          title="Active Alerts"
          value={stats.activeAlertsCount}
          subValue="Requiring SOC triage"
          icon={<Bell className="w-5 h-5" />}
          trend="Queue pending"
          trendPositive={false}
          statusColor="amber"
        />

        <SOCMetricCard
          id="metric-critical-threats"
          title="Critical Alerts"
          value={stats.criticalAlertsCount}
          subValue="P-1 Severity escalated"
          icon={<ShieldAlert className="w-5 h-5" />}
          trend="High impact"
          trendPositive={false}
          statusColor="rose"
        />

        <SOCMetricCard
          id="metric-risk-score"
          title="Average Risk Score"
          value={`${stats.averageRiskScore} / 100`}
          subValue={stats.averageRiskScore > 75 ? 'Critical Risk Band' : stats.averageRiskScore > 50 ? 'High Risk Band' : 'Moderate Band'}
          icon={<Gauge className="w-5 h-5" />}
          trend="Weighted composite"
          trendPositive={stats.averageRiskScore < 50}
          statusColor={stats.averageRiskScore > 75 ? 'rose' : stats.averageRiskScore > 50 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Network Traffic Trend (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                NETWORK TRAFFIC TREND (NORMAL VS ANOMALOUS)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Continuous packet ingress rate and anomaly deviation over time
              </p>
            </div>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Live Feed
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficTrendData}>
                <defs>
                  <linearGradient id="normalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="attackGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="normal" name="Normal Traffic (pkts/s)" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#normalGrad)" />
                <Area type="monotone" dataKey="attack" name="Anomalous Packets" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#attackGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attack Category Distribution (1 col) */}
        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                ATTACK DISTRIBUTION
              </h3>
              <p className="text-xs text-slate-400 font-mono">Classified intrusion categories</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attackDistributionData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} fontFamily="monospace" width={75} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }} 
                />
                <Bar dataKey="count" name="Detections" radius={[0, 4, 4, 0]}>
                  {attackDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Charts: Threat Severity & Risk Score Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Threat Severity Breakdown */}
        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800/80 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                THREAT SEVERITY DISTRIBUTION
              </h3>
              <p className="text-xs text-slate-400 font-mono">Active risk tier categorization</p>
            </div>
            <button 
              onClick={() => setActiveTab('classification')}
              className="text-xs font-mono text-cyan-400 hover:underline"
            >
              View Matrix &rarr;
            </button>
          </div>

          <div className="h-52 w-full flex items-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`sev-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-1/2 space-y-2 pl-2">
              {severityData.map(s => (
                <div key={s.name} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-300">{s.name}</span>
                  </div>
                  <span className="font-bold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Score Trend */}
        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800/80 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                RISK SCORE VELOCITY TREND
              </h3>
              <p className="text-xs text-slate-400 font-mono">Weighted risk score dynamic timeline (0-100)</p>
            </div>
            <button 
              onClick={() => setActiveTab('risk')}
              className="text-xs font-mono text-cyan-400 hover:underline"
            >
              Calculate &rarr;
            </button>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficTrendData}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} fontFamily="monospace" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }} 
                />
                <Line type="monotone" dataKey="risk" name="Risk Score (0-100)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Tables: Recent Anomalous Threats & Priority Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Threats Table */}
        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                RECENT DETECTED THREATS
              </h3>
              <p className="text-xs text-slate-400 font-mono">Live flow intrusions analyzed by ML model</p>
            </div>
            <button
              onClick={() => setActiveTab('monitoring')}
              className="text-xs font-mono text-cyan-400 hover:underline"
            >
              Inspect All &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                  <th className="py-2 px-2.5">Time</th>
                  <th className="py-2 px-2.5">Source IP</th>
                  <th className="py-2 px-2.5">Destination</th>
                  <th className="py-2 px-2.5">Attack Type</th>
                  <th className="py-2 px-2.5">Confidence</th>
                  <th className="py-2 px-2.5">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentAnomalousPackets.map(pkt => (
                  <tr key={pkt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-2.5 text-slate-400 whitespace-nowrap">{pkt.timestamp}</td>
                    <td className="py-2 px-2.5 text-cyan-300 font-semibold">{pkt.sourceIp}</td>
                    <td className="py-2 px-2.5 text-slate-300">{pkt.destIp}:{pkt.destPort}</td>
                    <td className="py-2 px-2.5">
                      <AttackBadge attack={pkt.attackType} />
                    </td>
                    <td className="py-2 px-2.5 text-slate-200">
                      {Math.round(pkt.confidence * 100)}%
                    </td>
                    <td className="py-2 px-2.5">
                      <RiskGaugeBadge score={pkt.riskScore} showBar={false} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority Alerts Table */}
        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800/80 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-400" />
                HIGH & CRITICAL SECURITY ALERTS
              </h3>
              <p className="text-xs text-slate-400 font-mono">Prioritized for immediate triage & response</p>
            </div>
            <button
              onClick={() => setActiveTab('alerts')}
              className="text-xs font-mono text-cyan-400 hover:underline"
            >
              Alert Center &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {recentCriticalAlerts.map(alert => (
              <div 
                key={alert.id}
                className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs">{alert.id}</span>
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-[11px] font-mono text-slate-400">
                      {alert.threatType} on {alert.destIp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono line-clamp-1">
                    {alert.description}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Src: {alert.sourceIp} | {alert.mitreTechnique}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.status === 'active' ? (
                    <>
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                      >
                        Ack
                      </button>
                      <button
                        onClick={() => escalateAlertToIncident(alert.id)}
                        className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-mono transition-colors"
                      >
                        Escalate
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {alert.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
