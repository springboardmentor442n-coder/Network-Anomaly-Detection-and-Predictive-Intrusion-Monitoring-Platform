import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { BarChart2, TrendingUp, ShieldAlert, Download, Layers, ShieldCheck, Gauge, FileSpreadsheet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart as RePie, Pie, Cell, BarChart, Bar } from 'recharts';

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');

  const attackBreakdown = [
    { name: 'DDoS / Flooding', value: 38, color: '#ef4444' },
    { name: 'PortScan Activity', value: 27, color: '#f59e0b' },
    { name: 'SSH/FTP Brute Force', value: 18, color: '#3b82f6' },
    { name: 'Botnet Propagation', value: 11, color: '#8b5cf6' },
    { name: 'Web Exploits', value: 6, color: '#10b981' },
  ];

  const trafficTrend = [
    { time: 'Mon', benign: 12400, malicious: 450, totalBytesMB: 312 },
    { time: 'Tue', benign: 14200, malicious: 620, totalBytesMB: 420 },
    { time: 'Wed', benign: 13500, malicious: 890, totalBytesMB: 380 },
    { time: 'Thu', benign: 15100, malicious: 410, totalBytesMB: 490 },
    { time: 'Fri', benign: 16800, malicious: 1250, totalBytesMB: 580 },
    { time: 'Sat', benign: 9800, malicious: 230, totalBytesMB: 210 },
    { time: 'Sun', benign: 8900, malicious: 180, totalBytesMB: 195 },
  ];

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Day,BenignPackets,MaliciousPackets,VolumeMB\n" +
      trafficTrend.map(e => `${e.time},${e.benign},${e.malicious},${e.totalBytesMB}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `netshield_threat_analytics_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Network & Risk Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: 14 }}>
            In-depth protocol inspection, risk engine telemetry, and exportable SOC audit logs
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6, fontSize: 13 }}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Download size={14} />
            Export CSV Report
          </button>
        </div>
      </div>

      {/* Traffic Trend Chart */}
      <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Traffic Volume & Anomaly Velocity</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Granularity: 1 Day</span>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficTrend}>
              <defs>
                <linearGradient id="colorBenign" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMalicious" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1e293b', borderColor: '#334155', borderRadius: 6, fontSize: 12 }} />
              <Area type="monotone" dataKey="benign" stroke="#10b981" fillOpacity={1} fill="url(#colorBenign)" name="Benign Flows" />
              <Area type="monotone" dataKey="malicious" stroke="#ef4444" fillOpacity={1} fill="url(#colorMalicious)" name="Anomalous Attacks" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Protocol Distribution */}
        <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} style={{ color: 'var(--brand-blue)' }} />
            Protocol & Port Telemetry
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>TCP / HTTP & HTTPS (Ports 80, 443)</span>
                <span style={{ fontWeight: 600 }}>64.2%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <div style={{ width: '64.2%', height: '100%', background: '#3b82f6', borderRadius: 4 }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>UDP / DNS Queries (Port 53)</span>
                <span style={{ fontWeight: 600 }}>18.5%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <div style={{ width: '18.5%', height: '100%', background: '#10b981', borderRadius: 4 }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>SSH / Remote Shell (Port 22)</span>
                <span style={{ fontWeight: 600 }}>9.8%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <div style={{ width: '9.8%', height: '100%', background: '#f59e0b', borderRadius: 4 }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>ICMP & Raw Socket Probes</span>
                <span style={{ fontWeight: 600 }}>7.5%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <div style={{ width: '7.5%', height: '100%', background: '#8b5cf6', borderRadius: 4 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Engine Breakdown */}
        <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gauge size={18} style={{ color: '#f59e0b' }} />
            Risk Engine Formulation
          </h3>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            NetShield calculates real-time threat scores using a multi-factor weighting formula:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '8px 12px', background: 'rgba(59,130,246,0.06)', borderRadius: 6, border: '1px solid rgba(59,130,246,0.15)', fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: 'var(--brand-blue)' }}>Attack Severity Baseline (40%)</div>
              <div style={{ color: 'var(--text-muted)' }}>DDoS = 90, Brute Force = 75, PortScan = 60, Benign = 0</div>
            </div>
            <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.06)', borderRadius: 6, border: '1px solid rgba(16,185,129,0.15)', fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: '#34d399' }}>ML Model Confidence Multiplier (30%)</div>
              <div style={{ color: 'var(--text-muted)' }}>Probabilistic confidence weight from Random Forest classifier</div>
            </div>
            <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.15)', fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: '#f87171' }}>Dynamic Escalation Window (30%)</div>
              <div style={{ color: 'var(--text-muted)' }}>+15 bonus score applied if IP repeats 3+ times in 10-minute window</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
