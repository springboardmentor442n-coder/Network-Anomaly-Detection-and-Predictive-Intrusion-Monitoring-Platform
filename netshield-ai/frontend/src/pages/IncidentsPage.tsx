import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/Topbar';
import { Card, StatusBadge, LoadingState } from '@/components/ui/Components';
import { Plus, Eye } from 'lucide-react';
import api from '@/lib/api';

export default function IncidentsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', severity: 'HIGH', source_ip: '', attack_type: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => api.get('/incidents/').then(r => r.data),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/incidents/', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['incidents'] }); setShowCreate(false); setForm({ title: '', description: '', severity: 'HIGH', source_ip: '', attack_type: '' }); },
    onError: (err: any) => alert(err.response?.data?.detail || 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/incidents/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['incidents'] }); setSelected(null); },
  });

  const severityColors: Record<string, string> = {
    CRITICAL: 'var(--severity-critical)',
    HIGH: 'var(--severity-high)',
    MEDIUM: 'var(--severity-medium)',
    LOW: 'var(--severity-low)',
  };

  return (
    <div className="main-area">
      <Topbar title="Incidents" />
      <div className="page-content">
        <div className="page-header">
          <div>
            <div className="page-title">Incident Management</div>
            <div className="page-subtitle">Track and manage security incidents</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Create Incident
          </button>
        </div>

        {isLoading ? <LoadingState /> : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Attack Type</th>
                  <th>Source IP</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.length > 0 ? (
                  data.items.map((inc: any) => (
                    <tr key={inc.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{inc.id.slice(0, 8)}...</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{inc.title}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, color: severityColors[inc.severity] || 'var(--text-secondary)' }}>
                          {inc.severity}
                        </span>
                      </td>
                      <td>{inc.attack_type || 'N/A'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{inc.source_ip || 'N/A'}</td>
                      <td><StatusBadge status={inc.status} /></td>
                      <td>{inc.created_at ? new Date(inc.created_at).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setSelected(inc)}>
                            <Eye size={11} />
                          </button>
                          {inc.status === 'OPEN' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => updateMutation.mutate({ id: inc.id, body: { status: 'INVESTIGATING' } })}>Investigate</button>
                          )}
                          {inc.status === 'INVESTIGATING' && (
                            <button className="btn btn-success btn-sm" onClick={() => updateMutation.mutate({ id: inc.id, body: { status: 'RESOLVED' } })}>Resolve</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No incidents yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Create Incident</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Incident title" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the incident" style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Severity</label>
                    <select className="form-select" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Attack Type</label>
                    <input className="form-input" value={form.attack_type} onChange={e => setForm({ ...form, attack_type: e.target.value })} placeholder="e.g. DDoS" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Source IP</label>
                  <input className="form-input" value={form.source_ip} onChange={e => setForm({ ...form, source_ip: e.target.value })} placeholder="192.168.1.1" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => createMutation.mutate(form)} disabled={!form.title || createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Incident Detail */}
        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{selected.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status:</span> <StatusBadge status={selected.status} /></div>
                <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Severity:</span> <span style={{ fontSize: 13, fontWeight: 600, color: severityColors[selected.severity] }}>{selected.severity}</span></div>
                {selected.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>{selected.description}</div>}
                {selected.status_history?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>STATUS HISTORY</div>
                    {selected.status_history.map((h: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <StatusBadge status={h.status} />
                        <span style={{ color: 'var(--text-muted)' }}>{h.changed_by}</span>
                        <span style={{ color: 'var(--text-disabled)', marginLeft: 'auto' }}>{new Date(h.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
