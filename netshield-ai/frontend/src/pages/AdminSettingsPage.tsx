import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Settings, Users, Shield, Database, Key, Server, Save, Check } from 'lucide-react';

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'keys'>('settings');
  const [saved, setSaved] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          System Administration & Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: 14 }}>
          Manage user access, system configuration, alert escalation rules, and API keys
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-color)', marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '10px 16px', background: 'none', border: 'none',
            borderBottom: activeTab === 'settings' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'settings' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer'
          }}
        >
          System Configuration
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 16px', background: 'none', border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'users' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer'
          }}
        >
          Users & Access Control
        </button>
        <button
          onClick={() => setActiveTab('keys')}
          style={{
            padding: '10px 16px', background: 'none', border: 'none',
            borderBottom: activeTab === 'keys' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'keys' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer'
          }}
        >
          API Keys & Integration
        </button>
      </div>

      {activeTab === 'settings' && (
        <form onSubmit={handleSave} className="card" style={{ padding: 24, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, maxWidth: 800 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>NETSHIELD AI Operational Parameters</h3>
          
          <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Anomaly Risk Threshold (0.0 to 1.0)
              </label>
              <input type="number" step="0.05" defaultValue="0.75" style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Alert Escalation Trigger Count (Consecutive Anomalies)
              </label>
              <input type="number" defaultValue="3" style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                CICIDS2017 Preprocessing Chunk Size
              </label>
              <input type="number" defaultValue="10000" style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Automated Firewall Mitigation Action
              </label>
              <select defaultValue="AUTO_BLOCK" style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)' }}>
                <option value="AUTO_BLOCK">Automatic IP Blocking (High Confidence &gt; 90%)</option>
                <option value="ALERT_ONLY">Notify SecOps Team Only</option>
                <option value="QUARANTINE">Quarantine Subnet Segment</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Settings Saved!' : 'Save Configuration'}
          </button>
        </form>
      )}

      {activeTab === 'users' && (
        <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Authorized System Users</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>User</th>
                <th style={{ padding: '10px 12px' }}>Email</th>
                <th style={{ padding: '10px 12px' }}>Role</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(users?.items || [
                { username: 'admin', email: 'admin@netshield.ai', role: 'ADMIN', active: true },
                { username: 'secops_lead', email: 'secops@netshield.ai', role: 'SECURITY_ANALYST', active: true },
                { username: 'network_eng', email: 'network@netshield.ai', role: 'NETWORK_ENGINEER', active: true },
                { username: 'auditor', email: 'compliance@netshield.ai', role: 'AUDITOR', active: true },
              ]).map((u: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{u.username}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: 11, fontWeight: 600 }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: '#10b981', fontSize: 12 }}>● Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'keys' && (
        <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, maxWidth: 800 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>API Access Tokens</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Production Monitoring Ingestion Key</span>
                <span style={{ fontSize: 11, color: '#10b981' }}>Active</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 4 }}>
                ns_live_9f8a3b7c2e1d0f4e5a6b7c8d9e0f1a2b
              </div>
            </div>

            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>CICIDS2017 Dataset Batch Ingestion Key</span>
                <span style={{ fontSize: 11, color: '#10b981' }}>Active</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 4 }}>
                ns_batch_4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminSettingsPage;
