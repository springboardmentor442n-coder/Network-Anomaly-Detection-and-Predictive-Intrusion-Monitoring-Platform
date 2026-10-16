import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/Topbar';
import { Card, RiskBadge, StatusBadge, LoadingState, ErrorState } from '@/components/ui/Components';
import { Filter, Eye, CheckCircle, UserCheck, Search } from 'lucide-react';
import api from '@/lib/api';

export default function AlertsPage() {
  const [status, setStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [page, setPage] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const queryClient = useQueryClient();
  const LIMIT = 50;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['alerts', status, riskLevel, page],
    queryFn: () => api.get('/alerts/', {
      params: { skip: page * LIMIT, limit: LIMIT, status: status || undefined, risk_level: riskLevel || undefined }
    }).then(r => r.data),
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ alertId, body }: { alertId: string; body: any }) =>
      api.patch(`/alerts/${alertId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setSelectedAlert(null);
    },
    onError: (err: any) => alert(err.response?.data?.detail || 'Update failed'),
  });

  const updateStatus = (alertId: string, newStatus: string) => {
    updateMutation.mutate({ alertId, body: { status: newStatus } });
  };

  if (isLoading) return <div className="main-area"><Topbar title="Alerts" /><div className="page-content"><LoadingState /></div></div>;
  if (error) return <div className="main-area"><Topbar title="Alerts" /><div className="page-content"><ErrorState message="Failed to load alerts" retry={refetch} /></div></div>;

  return (
    <div className="main-area">
      <Topbar title="Alerts" />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">Alert Management</div>
            <div className="page-subtitle">Monitor and manage security alerts from CICIDS2017 detections</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="form-select" value={status} onChange={e => setStatus(e.target.value)} style={{ width: 160 }}>
              <option value="">All Statuses</option>
              {['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="form-select" value={riskLevel} onChange={e => setRiskLevel(e.target.value)} style={{ width: 140 }}>
              <option value="">All Risk Levels</option>
              {['Critical', 'High', 'Medium', 'Low'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-5 gap-4" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total', value: data?.total || 0, color: 'var(--text-primary)' },
            { label: 'New', value: data?.items?.filter((a: any) => a.status === 'NEW').length || 0, color: 'var(--severity-critical)' },
            { label: 'Investigating', value: data?.items?.filter((a: any) => a.status === 'INVESTIGATING').length || 0, color: 'var(--severity-high)' },
            { label: 'Critical Risk', value: data?.items?.filter((a: any) => a.risk_level === 'Critical').length || 0, color: 'var(--severity-critical)' },
            { label: 'Escalated', value: data?.items?.filter((a: any) => a.escalated).length || 0, color: 'var(--severity-medium)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Timestamp</th>
                <th>Source IP</th>
                <th>Destination IP</th>
                <th>Attack Type</th>
                <th>Confidence</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
                <th>Status</th>
                <th>Escalated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.length > 0 ? (
                data.items.map((alert: any) => (
                  <tr key={alert.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{alert.id.slice(0, 8)}...</td>
                    <td>{alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'N/A'}</td>
                    <td>{alert.source_ip || 'N/A'}</td>
                    <td>{alert.destination_ip || 'N/A'}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{alert.attack_type}</td>
                    <td>{alert.confidence ? `${(alert.confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                    <td style={{ fontWeight: 600 }}>{alert.risk_score}</td>
                    <td><RiskBadge level={alert.risk_level} /></td>
                    <td><StatusBadge status={alert.status} /></td>
                    <td>
                      {alert.escalated && (
                        <span className="badge badge-high" style={{ fontSize: 9 }}>⚡ Escalated</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAlert(alert)}>
                          <Eye size={11} />
                        </button>
                        {alert.status === 'NEW' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(alert.id, 'ACKNOWLEDGED')}>
                            <CheckCircle size={11} />
                          </button>
                        )}
                        {alert.status === 'ACKNOWLEDGED' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(alert.id, 'INVESTIGATING')}>
                            <Search size={11} />
                          </button>
                        )}
                        {['ACKNOWLEDGED', 'INVESTIGATING'].includes(alert.status) && (
                          <button className="btn btn-success btn-sm" onClick={() => updateStatus(alert.id, 'RESOLVED')}>
                            ✓
                          </button>
                        )}
                        {alert.status !== 'FALSE_POSITIVE' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(alert.id, 'FALSE_POSITIVE')} title="Mark false positive">
                            FP
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No alerts found. Run a scan to generate alerts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.total > LIMIT && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
            <span style={{ padding: '5px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
              Page {page + 1} of {Math.ceil(data.total / LIMIT)}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * LIMIT >= data.total}>Next →</button>
          </div>
        )}

        {/* Alert Detail Modal */}
        {selectedAlert && (
          <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Alert Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  ['Attack Type', selectedAlert.attack_type],
                  ['Risk Score', selectedAlert.risk_score],
                  ['Risk Level', selectedAlert.risk_level],
                  ['Confidence', selectedAlert.confidence ? `${(selectedAlert.confidence * 100).toFixed(1)}%` : 'N/A'],
                  ['Source IP', selectedAlert.source_ip || 'N/A'],
                  ['Destination IP', selectedAlert.destination_ip || 'N/A'],
                  ['Port', selectedAlert.destination_port || 'N/A'],
                  ['Protocol', selectedAlert.protocol || 'N/A'],
                  ['Status', selectedAlert.status],
                  ['Escalated', selectedAlert.escalated ? 'Yes' : 'No'],
                  ['Created At', selectedAlert.created_at ? new Date(selectedAlert.created_at).toLocaleString() : 'N/A'],
                  ['Base Risk Score', selectedAlert.base_risk_score],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{String(value)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedAlert(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => updateStatus(selectedAlert.id, 'ACKNOWLEDGED')}>Acknowledge</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
