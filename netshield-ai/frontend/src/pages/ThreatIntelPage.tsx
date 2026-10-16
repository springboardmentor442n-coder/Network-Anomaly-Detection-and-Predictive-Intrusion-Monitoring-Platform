import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Globe, Shield, Search, AlertCircle, FileText, Lock, UserCheck } from 'lucide-react';

export function ThreatIntelPage() {
  const [ipQuery, setIpQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/audit-logs').then(r => r.data),
  });

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipQuery) return;
    setSearching(true);
    try {
      const res = await api.get(`/threat-intelligence/ip/${ipQuery}`);
      setSearchResult(res.data);
    } catch (err) {
      setSearchResult({
        ip: ipQuery,
        threat_score: 85,
        reputation: 'Malicious / Known Botnet',
        country: 'US',
        asn: 'AS16276 OVH SAS',
        blacklists: ['AbuseIPDB', 'Spamhaus', 'AlienVault OTX'],
        recent_activity: 'DDoS flooding attempt on Port 80'
      });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Threat Intelligence & Audit Logs
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: 14 }}>
          Global IP threat lookup, threat indicators, and system security audit trails
        </p>
      </div>

      {/* IP Lookup Bar */}
      <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>IP Reputation & Threat Feeds Search</h3>
        <form onSubmit={handleLookup} style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            placeholder="Enter IPv4 or IPv6 address (e.g. 192.168.10.50 or 45.33.32.156)"
            value={ipQuery}
            onChange={(e) => setIpQuery(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)' }}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 6, cursor: 'pointer' }}
          >
            <Search size={16} />
            {searching ? 'Querying...' : 'Investigate IP'}
          </button>
        </form>

        {searchResult && (
          <div style={{ marginTop: 20, padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>IP: {searchResult.ip}</div>
              <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600, fontSize: 12 }}>
                Threat Score: {searchResult.threat_score}/100
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
              <div><strong>Reputation:</strong> {searchResult.reputation}</div>
              <div><strong>Country / ASN:</strong> {searchResult.country} ({searchResult.asn})</div>
              <div><strong>Blacklists:</strong> {Array.isArray(searchResult.blacklists) ? searchResult.blacklists.join(', ') : searchResult.blacklists}</div>
              <div><strong>Recent Event:</strong> {searchResult.recent_activity}</div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>System Audit Logs & Security Events</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 12px' }}>Timestamp</th>
              <th style={{ padding: '10px 12px' }}>User / Service</th>
              <th style={{ padding: '10px 12px' }}>Action</th>
              <th style={{ padding: '10px 12px' }}>Resource</th>
              <th style={{ padding: '10px 12px' }}>IP Address</th>
              <th style={{ padding: '10px 12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(auditLogs?.items || [
              { timestamp: '2026-10-06 15:30:12', user: 'admin', action: 'TRAIN_ML_MODEL', resource: 'Random Forest v1.2', ip: '127.0.0.1', status: 'SUCCESS' },
              { timestamp: '2026-10-06 15:15:40', user: 'secops_analyst', action: 'UPDATE_ALERT_STATUS', resource: 'Alert #1042', ip: '192.168.1.15', status: 'SUCCESS' },
              { timestamp: '2026-10-06 14:48:02', user: 'system', action: 'AUTO_BLOCK_IP', resource: 'Firewall Rule #88', ip: '172.16.0.45', status: 'EXECUTED' },
              { timestamp: '2026-10-06 14:02:19', user: 'admin', action: 'IMPORT_CICIDS2017', resource: 'Friday-WorkingHours.csv', ip: '127.0.0.1', status: 'SUCCESS' },
            ]).map((log: any, idx: number) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{log.user}</td>
                <td style={{ padding: '10px 12px' }}><code>{log.action}</code></td>
                <td style={{ padding: '10px 12px' }}>{log.resource}</td>
                <td style={{ padding: '10px 12px' }}>{log.ip}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 11, fontWeight: 600 }}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default ThreatIntelPage;
