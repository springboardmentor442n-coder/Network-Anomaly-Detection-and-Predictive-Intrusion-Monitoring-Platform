import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/Topbar';
import { Card, LoadingState, ErrorState, StatusBadge } from '@/components/ui/Components';
import { Upload, Eye, CheckCircle, Play, Database, AlertCircle, Info } from 'lucide-react';
import api from '@/lib/api';

export default function DatasetPage() {
  const [selectedFile, setSelectedFile] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [inspectData, setInspectData] = useState<any>(null);
  const [validateData, setValidateData] = useState<any>(null);
  const [trainingModelId, setTrainingModelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'inspect' | 'validate' | 'train'>('upload');
  const queryClient = useQueryClient();

  const { data: datasets, isLoading: dsLoading, refetch: refetchDatasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.get('/datasets/list').then(r => r.data),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/datasets/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => {
      setSelectedFile(res.data.filename);
      refetchDatasets();
      alert(`Uploaded: ${res.data.filename}`);
    },
    onError: (err: any) => alert(err.response?.data?.detail || 'Upload failed'),
  });

  // Inspect mutation
  const inspectMutation = useMutation({
    mutationFn: (filename: string) => {
      const fd = new FormData();
      fd.append('filename', filename);
      return api.post('/datasets/inspect', fd);
    },
    onSuccess: (res) => { setInspectData(res.data); setActiveTab('inspect'); },
    onError: (err: any) => alert(err.response?.data?.detail || 'Inspection failed'),
  });

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: (filename: string) => {
      const fd = new FormData();
      fd.append('filename', filename);
      return api.post('/datasets/validate', fd);
    },
    onSuccess: (res) => { setValidateData(res.data); setActiveTab('validate'); },
    onError: (err: any) => alert(err.response?.data?.detail || 'Validation failed'),
  });

  // Train mutation
  const trainMutation = useMutation({
    mutationFn: (filename: string) =>
      api.post('/ml/train', { filename, test_size: 0.2, random_seed: 42 }),
    onSuccess: (res) => {
      setTrainingModelId(res.data.model_run_id);
      setActiveTab('train');
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
    onError: (err: any) => alert(err.response?.data?.detail || 'Training failed'),
  });

  return (
    <div className="main-area">
      <Topbar title="CICIDS2017 Dataset" />
      <div className="page-content">

        <div className="page-header">
          <div>
            <div className="page-title">CICIDS2017 Dataset</div>
            <div className="page-subtitle">Upload, inspect, validate, and train on CICIDS2017 network traffic data</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>

          {/* Left panel - dataset selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Upload */}
            <Card title="Upload Dataset">
              <div
                style={{
                  border: '2px dashed var(--border-default)',
                  borderRadius: 8,
                  padding: 20,
                  textAlign: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
                onClick={() => document.getElementById('csv-upload')?.click()}
              >
                <Upload size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ fontSize: 13 }}>Drop CICIDS2017 CSV here</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>or click to browse</div>
              </div>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setUploadFile(f);
                }}
              />
              {uploadFile && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{uploadFile.name}</div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                    onClick={() => uploadMutation.mutate(uploadFile)}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              )}
            </Card>

            {/* Available datasets */}
            <Card title="Available Datasets">
              {dsLoading ? <LoadingState /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {datasets && datasets.length > 0 ? (
                    datasets.map((ds: any) => (
                      <div
                        key={ds.filename}
                        onClick={() => setSelectedFile(ds.filename)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          background: selectedFile === ds.filename ? 'var(--bg-active)' : 'var(--bg-elevated)',
                          border: `1px solid ${selectedFile === ds.filename ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                          <Database size={12} style={{ display: 'inline', marginRight: 6 }} />
                          {ds.filename}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {(ds.size_bytes / 1024 / 1024).toFixed(1)} MB
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
                      No datasets uploaded yet.
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Actions */}
            {selectedFile && (
              <Card title="Actions">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => inspectMutation.mutate(selectedFile)}
                    disabled={inspectMutation.isPending}
                  >
                    <Eye size={14} />
                    {inspectMutation.isPending ? 'Inspecting...' : 'Inspect Dataset'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => validateMutation.mutate(selectedFile)}
                    disabled={validateMutation.isPending}
                  >
                    <CheckCircle size={14} />
                    {validateMutation.isPending ? 'Validating...' : 'Validate Dataset'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => trainMutation.mutate(selectedFile)}
                    disabled={trainMutation.isPending}
                  >
                    <Play size={14} />
                    {trainMutation.isPending ? 'Starting...' : 'TRAIN MODEL'}
                  </button>
                </div>
              </Card>
            )}
          </div>

          {/* Right panel - results */}
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
              {(['upload', 'inspect', 'validate', 'train'] as const).map(tab => (
                <button
                  key={tab}
                  className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setActiveTab(tab)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'upload' && (
              <Card title="Upload Instructions">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                      CICIDS2017 Dataset Requirements
                    </div>
                    <ul style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: 16 }}>
                      <li>CSV format with network flow features</li>
                      <li>Must contain a Label column (Label / label / Attack)</li>
                      <li>Expected attack classes: BENIGN, DDoS, PortScan, Bot, etc.</li>
                      <li>Available from the CICIDS2017 official dataset</li>
                      <li>All numeric flow statistics (packet counts, byte rates, etc.)</li>
                    </ul>
                  </div>
                  <div style={{ padding: 16, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-blue)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Info size={14} /> Workflow
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Upload → Inspect → Validate → Train Model → Activate → Live Monitor
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'inspect' && inspectData && (
              <Card title={`Dataset Inspection: ${inspectData.filename}`}>
                <div className="grid grid-cols-3 gap-4" style={{ marginBottom: 20 }}>
                  {[
                    ['File Size', `${inspectData.size_mb} MB`],
                    ['Total Rows', inspectData.total_rows?.toLocaleString()],
                    ['Columns', inspectData.num_columns],
                    ['Features', inspectData.num_features],
                    ['Classes', inspectData.num_classes],
                    ['Label Column', inspectData.label_column],
                    ['Missing Values', inspectData.missing_values],
                    ['Infinite Values', inspectData.infinite_values],
                    ['Duplicate Rows', inspectData.duplicate_rows],
                  ].map(([label, value]) => (
                    <div key={label} style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{value || 'N/A'}</div>
                    </div>
                  ))}
                </div>

                {/* Class distribution */}
                {inspectData.class_distribution && Object.keys(inspectData.class_distribution).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Class Distribution (sample)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Object.entries(inspectData.class_distribution as Record<string, number>).map(([cls, count]) => {
                        const total = Object.values(inspectData.class_distribution as Record<string, number>).reduce((a, b) => a + b, 0);
                        const pct = ((count / total) * 100).toFixed(1);
                        return (
                          <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 160, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>{cls}</div>
                            <div style={{ flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 2 }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: cls === 'BENIGN' ? 'var(--severity-low)' : 'var(--severity-critical)', borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>
                              {count.toLocaleString()} ({pct}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'validate' && validateData && (
              <Card title={`Validation: ${validateData.filename}`}>
                <div style={{
                  padding: '14px 18px',
                  borderRadius: 8,
                  background: validateData.valid ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${validateData.valid ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: validateData.valid ? 'var(--severity-low)' : 'var(--severity-critical)',
                }}>
                  {validateData.valid ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  {validateData.valid ? 'Dataset is VALID for training' : 'Dataset is INVALID'}
                </div>

                {validateData.errors?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--severity-critical)', marginBottom: 8 }}>Errors</div>
                    {validateData.errors.map((e: string, i: number) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'var(--severity-critical-bg)', borderRadius: 6, fontSize: 12, color: 'var(--severity-critical)', marginBottom: 4 }}>
                        {e}
                      </div>
                    ))}
                  </div>
                )}

                {validateData.warnings?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--severity-medium)', marginBottom: 8 }}>Warnings</div>
                    {validateData.warnings.map((w: string, i: number) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'var(--severity-medium-bg)', borderRadius: 6, fontSize: 12, color: 'var(--severity-medium)', marginBottom: 4 }}>
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Statistics</div>
                <div className="grid grid-cols-3 gap-4">
                  {validateData.stats && Object.entries(validateData.stats).map(([k, v]: [string, any]) => {
                    if (typeof v === 'object') return null;
                    return (
                      <div key={k} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 4 }}>
                          {k.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {String(v)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {activeTab === 'train' && (
              <Card title="Model Training">
                {trainingModelId ? (
                  <TrainingStatus modelRunId={trainingModelId} />
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                    Select a dataset and click "TRAIN MODEL" to start training.
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainingStatus({ modelRunId }: { modelRunId: string }) {
  const queryClient = useQueryClient();
  const { data: modelStatus } = useQuery({
    queryKey: ['model-status', modelRunId],
    queryFn: () => api.get(`/models/${modelRunId}/status`).then(r => r.data),
    refetchInterval: (data) => data?.status === 'TRAINING' ? 3000 : false,
  });

  const activateMutation = useMutation({
    mutationFn: () => api.post(`/ml/models/${modelRunId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-status'] });
      alert('Model activated! It is now live for predictions.');
    },
    onError: (err: any) => alert(err.response?.data?.detail || 'Activation failed'),
  });

  const { data: modelDetails } = useQuery({
    queryKey: ['model-details', modelRunId],
    queryFn: () => api.get(`/models/${modelRunId}`).then(r => r.data),
    enabled: modelStatus?.status === 'READY' || modelStatus?.status === 'ACTIVE',
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Model ID: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{modelRunId}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={modelStatus?.status || 'TRAINING'} />
            {modelStatus?.status === 'TRAINING' && <div className="spinner" style={{ width: 16, height: 16 }} />}
          </div>
        </div>
      </div>

      {modelStatus?.status === 'TRAINING' && (
        <div style={{ padding: 20, background: 'var(--bg-elevated)', borderRadius: 8, textAlign: 'center' }}>
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Training Random Forest on CICIDS2017...</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>This may take several minutes depending on dataset size</div>
        </div>
      )}

      {modelStatus?.status === 'FAILED' && (
        <div style={{ padding: 16, background: 'var(--severity-critical-bg)', borderRadius: 8, border: '1px solid var(--severity-critical-border)' }}>
          <div style={{ fontSize: 13, color: 'var(--severity-critical)', fontWeight: 600 }}>Training Failed</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{modelStatus.error_message}</div>
        </div>
      )}

      {(modelStatus?.status === 'READY' || modelStatus?.status === 'ACTIVE') && modelDetails && (
        <div>
          <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 20 }}>
            {[
              ['Accuracy', `${(modelDetails.accuracy * 100).toFixed(2)}%`],
              ['Macro F1', `${(modelDetails.f1_macro * 100).toFixed(2)}%`],
              ['Weighted F1', `${(modelDetails.f1_weighted * 100).toFixed(2)}%`],
              ['Training Time', `${modelDetails.training_time_seconds?.toFixed(1)}s`],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--severity-low)' }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
            <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>DATASET STATS</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>Train samples: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{modelDetails.training_samples?.toLocaleString()}</span></div>
                <div>Test samples: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{modelDetails.test_samples?.toLocaleString()}</span></div>
                <div>Features: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{modelDetails.num_features}</span></div>
                <div>Classes: <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{modelDetails.num_classes}</span></div>
              </div>
            </div>
            <div style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>ATTACK CLASSES</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {modelDetails.class_names?.map((cls: string) => (
                  <span key={cls} style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-card)', borderRadius: 4, color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {cls}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {modelStatus?.status === 'READY' && (
            <button
              className="btn btn-success"
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {activateMutation.isPending ? 'Activating...' : '✅ ACTIVATE MODEL — Use for Live Predictions'}
            </button>
          )}

          {modelStatus?.status === 'ACTIVE' && (
            <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.08)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)', fontSize: 13, color: 'var(--severity-low)', textAlign: 'center', fontWeight: 600 }}>
              ✅ MODEL IS ACTIVE — CICIDS2017 predictions are live
            </div>
          )}
        </div>
      )}
    </div>
  );
}
