import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/Topbar';
import { Card, RiskBadge, StatusBadge, DemoBanner, ModelActiveBanner, ConfidenceBar } from '@/components/ui/Components';
import { Play, Square, Trash2, Database, Wifi, WifiOff, AlertTriangle, Activity } from 'lucide-react';
import api from '@/lib/api';

interface TrafficResult {
  id: string;
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  destination_port: number | null;
  protocol: string;
  predicted_class: string;
  confidence: number;
  risk_score: number;
  risk_level: string;
  is_malicious: boolean;
  alert_id: string | null;
  demo_mode: boolean;
}

interface ScanStats {
  processed_rows: number;
  total_rows: number | null;
  threats_detected: number;
  critical_alerts: number;
  processing_rate: number;
  elapsed_seconds: number;
  progress: number;
}

type ConnectionStatus = 'DISCONNECTED' | 'CONNECTED' | 'RECONNECTING';

export default function LiveMonitorPage() {
  const [selectedFile, setSelectedFile] = useState('');
  const [scanId, setScanId] = useState<string | null>(null);
  const [results, setResults] = useState<TrafficResult[]>([]);
  const [stats, setStats] = useState<ScanStats>({ processed_rows: 0, total_rows: null, threats_detected: 0, critical_alerts: 0, processing_rate: 0, elapsed_seconds: 0, progress: 0 });
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [isRunning, setIsRunning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [metadataDiag, setMetadataDiag] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const MAX_ROWS = 200;

  const { data: datasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.get('/datasets/list').then(r => r.data),
  });

  const { data: mlStatus } = useQuery({
    queryKey: ['ml-status'],
    queryFn: () => api.get('/ml/status').then(r => r.data),
  });

  // Start scan mutation
  const startMutation = useMutation({
    mutationFn: (filename: string) =>
      api.post('/scans/start', { filename, chunk_size: 1000 }),
    onSuccess: (res) => {
      const newScanId = res.data.scan_id;
      setScanId(newScanId);
      connectSSE(newScanId);
    },
    onError: (err: any) => alert(err.response?.data?.detail || 'Failed to start scan'),
  });

  // Stop scan mutation
  const stopMutation = useMutation({
    mutationFn: (id: string) => api.post(`/scans/${id}/stop`),
    onSuccess: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsRunning(false);
      setConnStatus('DISCONNECTED');
    },
  });

  const connectSSE = (id: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem('netshield_token');
    const url = `/api/scans/${id}/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    setConnStatus('CONNECTED');
    setIsRunning(true);

    es.addEventListener('scan_started', (e) => {
      const data = JSON.parse(e.data);
      setDemoMode(data.demo_mode);
      setScanMessage(data.message);
      if (data.metadata_diagnostics) {
        setMetadataDiag(data.metadata_diagnostics);
      }
    });

    es.addEventListener('traffic_result', (e) => {
      const data: TrafficResult = JSON.parse(e.data);
      setResults(prev => {
        const updated = [data, ...prev];
        return updated.slice(0, MAX_ROWS);
      });
    });

    es.addEventListener('scan_progress', (e) => {
      const data = JSON.parse(e.data);
      setStats({
        processed_rows: data.processed_rows,
        total_rows: data.total_rows,
        threats_detected: data.threats_detected,
        critical_alerts: data.critical_alerts,
        processing_rate: data.processing_rate,
        elapsed_seconds: data.elapsed_seconds,
        progress: data.progress,
      });
    });

    es.addEventListener('scan_completed', (e) => {
      const data = JSON.parse(e.data);
      setStats(prev => ({ ...prev, processed_rows: data.processed_rows, threats_detected: data.threats_detected }));
      es.close();
      eventSourceRef.current = null;
      setIsRunning(false);
      setConnStatus('DISCONNECTED');
      setScanMessage('Scan completed!');
    });

    es.addEventListener('scan_error', (e) => {
      const data = JSON.parse(e.data);
      setScanMessage(`Error: ${data.error || data.message}`);
      es.close();
      eventSourceRef.current = null;
      setIsRunning(false);
      setConnStatus('DISCONNECTED');
    });

    es.onerror = () => {
      setConnStatus('RECONNECTING');
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          setConnStatus('DISCONNECTED');
          setIsRunning(false);
        }
      }, 5000);
    };
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleStart = () => {
    if (!selectedFile) { alert('Select a dataset first'); return; }
    setResults([]);
    setStats({ processed_rows: 0, total_rows: null, threats_detected: 0, critical_alerts: 0, processing_rate: 0, elapsed_seconds: 0, progress: 0 });
    startMutation.mutate(selectedFile);
  };

  const handleStop = () => {
    if (scanId) stopMutation.mutate(scanId);
  };

  const handleClear = () => {
    setResults([]);
    setStats({ processed_rows: 0, total_rows: null, threats_detected: 0, critical_alerts: 0, processing_rate: 0, elapsed_seconds: 0, progress: 0 });
    setScanMessage('');
    setMetadataDiag(null);
  };

  const connColor = {
    CONNECTED: 'var(--status-healthy)',
    RECONNECTING: 'var(--status-warning)',
    DISCONNECTED: 'var(--text-disabled)',
  }[connStatus];

  return (
    <div className="main-area">
      <Topbar title="Live Monitor" />
      <div className="page-content">

        {demoMode ? <DemoBanner /> : mlStatus && !mlStatus.demo_mode && <ModelActiveBanner modelName={mlStatus.model_name} />}
        {demoMode && <div style={{ marginTop: 8 }} />}

        {/* Dataset Metadata Diagnostics */}
        {metadataDiag && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            borderRadius: 8,
            background: metadataDiag.status === 'ACTIVE' ? 'rgba(34,197,94,0.06)' : 'rgba(234,179,8,0.06)',
            border: `1px solid ${metadataDiag.status === 'ACTIVE' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)'}`,
            color: metadataDiag.status === 'ACTIVE' ? 'var(--status-healthy)' : 'var(--severity-medium)',
            fontSize: 13,
            marginTop: 12
          }}>
            <Activity size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Stream Diagnostic:</strong> {metadataDiag.message}
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, marginTop: 16 }}>

          {/* Left panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title="Scan Configuration">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Select CICIDS2017 Dataset</label>
                  <select
                    className="form-select"
                    value={selectedFile}
                    onChange={e => setSelectedFile(e.target.value)}
                    disabled={isRunning}
                  >
                    <option value="">-- Select CSV --</option>
                    {datasets?.map((ds: any) => (
                      <option key={ds.filename} value={ds.filename}>{ds.filename}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    id="start-scan-btn"
                    className="btn btn-primary"
                    onClick={handleStart}
                    disabled={isRunning || startMutation.isPending || !selectedFile}
                    style={{ justifyContent: 'center' }}
                  >
                    <Play size={14} />
                    {startMutation.isPending ? 'Starting...' : 'START SCAN'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleStop}
                    disabled={!isRunning}
                    style={{ justifyContent: 'center' }}
                  >
                    <Square size={14} />
                    STOP
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleClear}
                    disabled={isRunning}
                    style={{ justifyContent: 'center' }}
                  >
                    <Trash2 size={14} />
                    CLEAR
                  </button>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <Card title="Scan Status">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: connColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: connColor }}>{connStatus}</span>
                </div>

                {scanId && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    ID: <span style={{ fontFamily: 'monospace' }}>{scanId.slice(0, 16)}...</span>
                  </div>
                )}

                {[
                  ['Rows Processed', stats.processed_rows.toLocaleString()],
                  ['Total Rows', stats.total_rows?.toLocaleString() || '...'],
                  ['Threats Detected', stats.threats_detected.toString()],
                  ['Critical Alerts', stats.critical_alerts.toString()],
                  ['Processing Rate', `${stats.processing_rate.toFixed(0)} rows/s`],
                  ['Elapsed', `${stats.elapsed_seconds.toFixed(0)}s`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{value}</span>
                  </div>
                ))}

                {/* Progress bar */}
                {stats.total_rows && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Progress</span>
                      <span>{stats.progress.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2 }}>
                      <div style={{ width: `${stats.progress}%`, height: '100%', background: 'var(--brand-blue)', borderRadius: 2, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )}

                {scanMessage && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0', borderTop: '1px solid var(--border-subtle)' }}>
                    {scanMessage}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Live results table */}
          <Card
            title="Live Traffic Stream"
            subtitle={`Showing latest ${MAX_ROWS} results`}
            action={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isRunning && (
                  <div className="live-indicator">
                    <div className={`live-dot connected`} />
                    <span style={{ color: 'var(--status-healthy)', fontSize: 11 }}>LIVE</span>
                  </div>
                )}
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{results.length} rows</span>
              </div>
            }
          >
            <div className="data-table-container" style={{ maxHeight: 600, overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Source IP</th>
                    <th>Destination IP</th>
                    <th>Port</th>
                    <th>Protocol</th>
                    <th>Prediction</th>
                    <th>Confidence</th>
                    <th>Risk</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length > 0 ? (
                    results.map((r) => (
                      <tr key={r.id} style={{ background: r.is_malicious ? 'rgba(239,68,68,0.03)' : undefined }}>
                        <td>{new Date(r.timestamp).toLocaleTimeString()}</td>
                        <td>{r.source_ip}</td>
                        <td>{r.destination_ip}</td>
                        <td>{r.destination_port || 'N/A'}</td>
                        <td>{r.protocol}</td>
                        <td style={{ color: r.is_malicious ? 'var(--severity-critical)' : 'var(--severity-low)', fontWeight: r.is_malicious ? 600 : 400 }}>
                          {r.predicted_class}
                          {r.demo_mode && <span style={{ fontSize: 9, marginLeft: 4, color: 'var(--severity-medium)', opacity: 0.7 }}>DEMO</span>}
                        </td>
                        <td><ConfidenceBar value={r.confidence} /></td>
                        <td style={{ fontWeight: 600 }}>{r.risk_score}</td>
                        <td><RiskBadge level={r.risk_level} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        {isRunning ? 'Waiting for data...' : 'Select a dataset and press START SCAN'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
