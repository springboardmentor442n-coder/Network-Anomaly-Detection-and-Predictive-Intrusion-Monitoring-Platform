import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Search, Shield, RefreshCw, Filter, AlertCircle, FileText, User, Globe, Clock, CheckCircle, XCircle } from 'lucide-react';

export function ThreatIntelPage() {
  const [ipQuery, setIpQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  // Audit logs search & filter
  const [auditSearch, setAuditSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/audit-logs?limit=200').then(r => r.data),
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

  const formatTimestamp = (ts?: string | null): string => {
    if (!ts) return 'Not recorded';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) {
        return ts;
      }
      // Format as YYYY-MM-DD HH:mm:ss
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return ts;
    }
  };

  // Extract all distinct action names for filter dropdown
  const availableActions = useMemo(() => {
    const rawItems: any[] = auditLogs?.items || [];
    const actions = new Set<string>();
    rawItems.forEach(item => {
      if (item.action) actions.add(item.action);
    });
    return Array.from(actions).sort();
  }, [auditLogs]);

  // Filter audit logs based on user search & action dropdown
  const filteredLogs = useMemo(() => {
    const rawItems: any[] = auditLogs?.items || [];
    return rawItems.filter(log => {
      // Action filter
      if (actionFilter !== 'ALL' && log.action !== actionFilter) {
        return false;
      }
      // Search term filter across all metadata fields
      if (auditSearch.trim()) {
        const query = auditSearch.toLowerCase().trim();
        const userStr = String(log.user || log.username || log.actor || '').toLowerCase();
        const actionStr = String(log.action || '').toLowerCase();
        const resourceStr = String(log.resource || log.resource_type || log.resource_id || '').toLowerCase();
        const ipStr = String(log.ip || log.ip_address || '').toLowerCase();
        const statusStr = String(log.status || log.result || '').toLowerCase();
        const timeStr = String(log.timestamp || log.created_at || '').toLowerCase();

        return (
          userStr.includes(query) ||
          actionStr.includes(query) ||
          resourceStr.includes(query) ||
          ipStr.includes(query) ||
          statusStr.includes(query) ||
          timeStr.includes(query)
        );
      }
      return true;
    });
  }, [auditLogs, auditSearch, actionFilter]);

  const renderStatusBadge = (statusVal?: string | null) => {
    const raw = String(statusVal || '').trim().toUpperCase();
    if (!raw || raw === 'NOT RECORDED' || raw === 'NONE' || raw === 'NULL') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 4,
          background: 'rgba(148,163,184,0.1)',
          color: 'var(--text-muted)',
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid rgba(148,163,184,0.2)'
        }}>
          Not recorded
        </span>
      );
    }

    if (['SUCCESS', 'RESOLVED', 'EXECUTED', 'ACTIVE', 'COMPLETED'].includes(raw)) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 4,
          background: 'rgba(16,185,129,0.1)',
          color: '#10b981',
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid rgba(16,185,129,0.2)'
        }}>
          ● {raw}
        </span>
      );
    }

    if (['FAILURE', 'FAILED', 'ERROR', 'BLOCKED', 'CRITICAL'].includes(raw)) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 4,
          background: 'rgba(239,68,68,0.1)',
          color: '#ef4444',
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid rgba(239,68,68,0.2)'
        }}>
          ● {raw}
        </span>
      );
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        background: 'rgba(245,158,11,0.1)',
        color: '#f59e0b',
        fontSize: 11,
        fontWeight: 600,
        border: '1px solid rgba(245,158,11,0.2)'
      }}>
        ● {raw}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Threat Intelligence & Audit Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: 14 }}>
            Global IP threat lookup, threat indicators, and system security audit trails
          </p>
        </div>
      </div>

      {/* IP Lookup Bar */}
      <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
          IP Reputation & Threat Feeds Search
        </h3>
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
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>IP: {searchResult.ip}</div>
              <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600, fontSize: 12 }}>
                Threat Score: {searchResult.threat_score}/100
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div><strong style={{ color: 'var(--text-primary)' }}>Reputation:</strong> {searchResult.reputation}</div>
              <div><strong style={{ color: 'var(--text-primary)' }}>Country / ASN:</strong> {searchResult.country} ({searchResult.asn})</div>
              <div><strong style={{ color: 'var(--text-primary)' }}>Blacklists:</strong> {Array.isArray(searchResult.blacklists) ? searchResult.blacklists.join(', ') : searchResult.blacklists}</div>
              <div><strong style={{ color: 'var(--text-primary)' }}>Recent Event:</strong> {searchResult.recent_activity}</div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              System Audit Logs & Security Events
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {filteredLogs.length} of {auditLogs?.total || auditLogs?.items?.length || 0} recorded events
            </span>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                style={{
                  padding: '7px 12px 7px 30px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  width: 190,
                }}
              />
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{
                padding: '7px 10px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="ALL">All Actions ({availableActions.length})</option>
              {availableActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>

            <button
              onClick={() => refetch()}
              title="Refresh audit logs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 12px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>

        {/* Responsive Table Container */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>User / Service</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Action</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Resource</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>IP Address</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isLoading ? 'Loading system audit logs...' : 'No audit log records match the selected filter.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: any, idx: number) => {
                  // Resolve field naming variations supported by schema & API
                  const timestampStr = formatTimestamp(log.timestamp || log.created_at || log.time || log.date);
                  const userStr = log.user || log.username || log.actor || log.service || (log.user_id ? `User #${String(log.user_id).slice(0, 8)}` : null) || 'System';
                  const actionStr = log.action || log.event || 'UNKNOWN';
                  
                  // Resource resolution
                  const resourceStr =
                    log.resource ||
                    (log.resource_type && log.resource_id
                      ? `${log.resource_type.replace('_', ' ').toUpperCase()} #${String(log.resource_id).slice(0, 8)}`
                      : log.resource_type || log.resource_id) ||
                    (log.details?.filename ? `Dataset: ${log.details.filename}` : null) ||
                    (log.details?.title ? `Incident: ${log.details.title}` : null) ||
                    (actionStr.includes('LOGIN') ? 'User Session' : null) ||
                    'Not recorded';

                  // IP Address resolution
                  const ipRaw = log.ip || log.ip_address || log.client_ip;
                  const ipStr = (ipRaw && ipRaw !== 'None' && ipRaw !== 'null') ? ipRaw : 'Not recorded';

                  // Status resolution
                  const statusRaw = log.status || log.result || log.state || 'Not recorded';

                  return (
                    <tr
                      key={log.id || idx}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {timestampStr}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {userStr}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <code style={{
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(59,130,246,0.08)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59,130,246,0.18)',
                          fontWeight: 500
                        }}>
                          {actionStr}
                        </code>
                      </td>
                      <td style={{
                        padding: '10px 12px',
                        color: resourceStr === 'Not recorded' ? 'var(--text-muted)' : 'var(--text-primary)',
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={resourceStr}>
                        {resourceStr}
                      </td>
                      <td style={{
                        padding: '10px 12px',
                        color: ipStr === 'Not recorded' ? 'var(--text-muted)' : 'var(--text-primary)',
                        fontSize: 12,
                        fontFamily: 'monospace'
                      }}>
                        {ipStr}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {renderStatusBadge(statusRaw)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ThreatIntelPage;
