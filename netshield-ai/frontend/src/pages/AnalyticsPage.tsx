import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { BarChart2, PieChart, TrendingUp, ShieldAlert, Download, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart as RePie, Pie, Cell } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');

  const attackBreakdown = [
    { name: 'DDoS / DoS', value: 42, color: '#ef4444' },
    { name: 'PortScan', value: 28, color: '#f59e0b' },
    { name: 'Brute Force', value: 15, color: '#3b82f6' },
    { name: 'Botnet', value: 10, color: '#8b5cf6' },
    { name: 'Infiltration', value: 5, color: '#10b981' },
  ];

  const trafficTrend = [
    { time: 'Mon', benign: 12000, malicious: 450 },
    { time: 'Tue', benign: 14200, malicious: 620 },
    { time: 'Wed', benign: 13500, malicious: 890 },
    { time: 'Thu', benign: 15100, malicious: 410 },
    { time: 'Fri', benign: 16800, malicious: 1250 },
    { time: 'Sat', benign: 9800, malicious: 230 },
    { time: 'Sun', benign: 8900, malicious: 180 },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Network Threat Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: 14 }}>
            Aggregated traffic statistics, threat breakdown, and historical trends
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 6 }}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Traffic Trend Chart */}
      <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Network Traffic Volume & Attack Velocity</h3>
        <div style={{ width: '100%', height: 280 }}>
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
              <Tooltip contentStyle={{ background: '#1e293b', borderColor: '#334155', borderRadius: 6 }} />
              <Area type="monotone" dataKey="benign" stroke="#10b981" fillOpacity={1} fill="url(#colorBenign)" name="Benign Packets" />
              <Area type="monotone" dataKey="malicious" stroke="#ef4444" fillOpacity={1} fill="url(#colorMalicious)" name="Anomalous Packets" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attack Categories & Risk Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Detected Attack Types (CICIDS2017 taxonomy)</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RePie>
                  <Pie data={attackBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {attackBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RePie>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attackBreakdown.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                  <span style={{ width: 120 }}>{item.name}</span>
                  <span style={{ fontWeight: 600 }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Protocol Distribution & Threat Density</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>HTTP / HTTPS (Port 80/443)</span>
                <span style={{ fontWeight: 600 }}>64.2%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <div style={{ width: '64.2%', height: '100%', background: '#3b82f6', borderRadius: 4 }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>DNS Query (Port 53)</span>
                <span style={{ fontWeight: 600 }}>18.5%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <div style={{ width: '18.5%', height: '100%', background: '#10b981', borderRadius: 4 }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>SSH / Telnet (Port 22/23)</span>
                <span style={{ fontWeight: 600 }}>9.8%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <div style={{ width: '9.8%', height: '100%', background: '#f59e0b', borderRadius: 4 }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>Other Raw Socket / ICMP</span>
                <span style={{ fontWeight: 600 }}>7.5%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <div style={{ width: '7.5%', height: '100%', background: '#8b5cf6', borderRadius: 4 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AnalyticsPage;
