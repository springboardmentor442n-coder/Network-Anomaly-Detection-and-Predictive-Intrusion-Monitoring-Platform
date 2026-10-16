import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/Topbar';
import { MetricCard, Card, RiskBadge, LoadingState, ErrorState, DemoBanner, ModelActiveBanner } from '@/components/ui/Components';
import {
  Activity, AlertTriangle, Shield, Zap, BarChart2, TrendingUp, CheckCircle
} from 'lucide-react';
import api from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const ATTACK_COLORS: Record<string, string> = {
  BENIGN: '#22c55e',
  PortScan: '#3b82f6',
  DDoS: '#ef4444',
  Bot: '#f97316',
  'DoS Hulk': '#eab308',
  'Web Attack - Brute Force': '#8b5cf6',
  'FTP-Patator': '#06b6d4',
  'SSH-Patator': '#ec4899',
  DEFAULT: '#6b7280',
};

function getAttackColor(name: string) {
  return ATTACK_COLORS[name] || ATTACK_COLORS.DEFAULT;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: liveThreats } = useQuery({
    queryKey: ['live-threats'],
    queryFn: () => api.get('/dashboard/live-threats?limit=50').then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: attackDist } = useQuery({
    queryKey: ['attack-distribution'],
    queryFn: () => api.get('/dashboard/attack-distribution').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: trafficOverTime } = useQuery({
    queryKey: ['traffic-over-time'],
    queryFn: () => api.get('/dashboard/traffic-over-time?hours=24').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: topIPs } = useQuery({
    queryKey: ['top-ips'],
    queryFn: () => api.get('/dashboard/top-source-ips').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.get('/dashboard/system-health').then(r => r.data),
    refetchInterval: 30000,
  });

  if (statsLoading) return (
    <div className="main-area">
      <Topbar title="Overview Dashboard" />
      <div className="page-content"><LoadingState message="Loading dashboard..." /></div>
    </div>
  );

  if (statsError) return (
    <div className="main-area">
      <Topbar title="Overview Dashboard" />
      <div className="page-content"><ErrorState message="Failed to load dashboard. Is the backend running?" retry={refetchStats} /></div>
    </div>
  );

  return (
    <div className="main-area">
      <Topbar title="Overview Dashboard" />
      <div className="page-content">

        {/* Model status banner */}
        <div style={{ marginBottom: stats?.metadata_diagnostics ? 12 : 20 }}>
          {stats?.demo_mode
            ? <DemoBanner />
            : <ModelActiveBanner modelName={stats?.model_name || 'CICIDS2017 Model'} />
          }
        </div>

        {/* Dataset Metadata Diagnostics */}
        {stats?.metadata_diagnostics && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            borderRadius: 8,
            background: stats.metadata_diagnostics.status === 'ACTIVE' ? 'rgba(34,197,94,0.06)' : 'rgba(234,179,8,0.06)',
            border: `1px solid ${stats.metadata_diagnostics.status === 'ACTIVE' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)'}`,
            color: stats.metadata_diagnostics.status === 'ACTIVE' ? 'var(--status-healthy)' : 'var(--severity-medium)',
            fontSize: 13,
            marginBottom: 20
          }}>
            <Activity size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Metadata Diagnostic:</strong> {stats.metadata_diagnostics.message}
            </span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
          <MetricCard
            label="Total Traffic"
            value={stats?.total_traffic?.toLocaleString() ?? '0'}
            icon={<Activity size={18} style={{ color: 'var(--brand-blue)' }} />}
            iconBg="rgba(59,130,246,0.1)"
            highlight="blue"
          />
          <MetricCard
            label="Malicious Traffic"
            value={stats?.malicious_traffic?.toLocaleString() ?? '0'}
            sub={`${stats?.detection_rate ?? 0}% detection rate`}
            icon={<AlertTriangle size={18} style={{ color: 'var(--severity-critical)' }} />}
            iconBg="var(--severity-critical-bg)"
            highlight="critical"
          />
          <MetricCard
            label="Benign Traffic"
            value={stats?.benign_traffic?.toLocaleString() ?? '0'}
            icon={<CheckCircle size={18} style={{ color: 'var(--severity-low)' }} />}
            iconBg="var(--severity-low-bg)"
            highlight="low"
          />
          <MetricCard
            label="Active Threats"
            value={stats?.active_threats?.toLocaleString() ?? '0'}
            icon={<Shield size={18} style={{ color: 'var(--severity-high)' }} />}
            iconBg="var(--severity-high-bg)"
            highlight="high"
          />
        </div>

        <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
          <MetricCard
            label="Critical Alerts"
            value={stats?.critical_alerts?.toLocaleString() ?? '0'}
            icon={<Zap size={18} style={{ color: 'var(--severity-critical)' }} />}
            iconBg="var(--severity-critical-bg)"
            highlight="critical"
          />
          <MetricCard
            label="Anomalies Detected"
            value={stats?.anomalies_detected?.toLocaleString() ?? '0'}
            icon={<TrendingUp size={18} style={{ color: 'var(--severity-high)' }} />}
            iconBg="var(--severity-high-bg)"
          />
          <MetricCard
            label="Avg Risk Score"
            value={stats?.avg_risk_score ?? '0'}
            icon={<BarChart2 size={18} style={{ color: 'var(--severity-medium)' }} />}
            iconBg="var(--severity-medium-bg)"
          />
          <MetricCard
            label="Detection Rate"
            value={`${stats?.detection_rate ?? 0}%`}
            icon={<Activity size={18} style={{ color: 'var(--brand-blue)' }} />}
            iconBg="rgba(59,130,246,0.1)"
            highlight="blue"
          />
        </div>

        {/* Main content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 20 }}>

          {/* Traffic over time */}
          <Card title="Traffic Volume — Last 24 Hours" subtitle="Benign vs malicious traffic">
            {trafficOverTime && trafficOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trafficOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} tickFormatter={t => t.slice(11, 16)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" stroke="var(--brand-blue)" strokeWidth={2} dot={false} name="Total" />
                  <Line type="monotone" dataKey="malicious" stroke="var(--severity-critical)" strokeWidth={2} dot={false} name="Malicious" />
                  <Line type="monotone" dataKey="benign" stroke="var(--severity-low)" strokeWidth={1.5} dot={false} name="Benign" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No traffic data yet. Start a scan to populate.
              </div>
            )}
          </Card>

          {/* Attack distribution */}
          <Card title="Attack Distribution" subtitle="CICIDS2017 attack classes">
            {attackDist && attackDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={attackDist}
                    dataKey="count"
                    nameKey="attack_type"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ attack_type, percent }) => `${attack_type?.slice(0, 12)} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={9}
                  >
                    {attackDist.map((entry: any, index: number) => (
                      <Cell key={index} fill={getAttackColor(entry.attack_type)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No predictions yet.
              </div>
            )}
          </Card>
        </div>

        {/* Live Threat Activity */}
        <Card title="Live Threat Activity" subtitle="Recent malicious detections" style={{ marginBottom: 20 }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Source IP</th>
                  <th>Destination IP</th>
                  <th>Port</th>
                  <th>Protocol</th>
                  <th>Predicted Attack</th>
                  <th>Confidence</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {liveThreats && liveThreats.length > 0 ? (
                  liveThreats.map((t: any) => (
                    <tr key={t.id}>
                      <td>{new Date(t.timestamp).toLocaleTimeString()}</td>
                      <td>{t.source_ip}</td>
                      <td>{t.destination_ip}</td>
                      <td>{t.destination_port || 'N/A'}</td>
                      <td>{t.protocol}</td>
                      <td style={{ color: 'var(--text-primary)' }}>{t.predicted_attack}</td>
                      <td>{t.confidence ? `${(t.confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                      <td style={{ fontWeight: 600 }}>{t.risk_score}</td>
                      <td><RiskBadge level={t.risk_level} /></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No threats detected yet. Start a scan to see results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Top Source IPs */}
          <Card title="Top Suspicious Source IPs">
            {topIPs && topIPs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topIPs.map((ip: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{ip.source_ip}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ip.alert_count} alerts</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--severity-high)' }}>{ip.max_risk}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>max risk</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No suspicious IPs yet.
              </div>
            )}
          </Card>

          {/* System Health */}
          <Card title="System Health">
            {systemHealth ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(systemHealth).map(([key, info]: [string, any]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {key.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{info.message}</div>
                    </div>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: info.status === 'healthy' || info.status === 'active' ? 'var(--status-healthy)' :
                                  info.status === 'idle' ? 'var(--brand-blue)' :
                                  info.status === 'no_model' ? 'var(--status-warning)' : 'var(--status-error)',
                    }} />
                  </div>
                ))}
              </div>
            ) : (
              <LoadingState message="Checking system health..." />
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
