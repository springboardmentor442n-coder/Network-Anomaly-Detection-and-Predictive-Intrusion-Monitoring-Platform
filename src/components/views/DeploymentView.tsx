import React, { useState } from 'react';
import { 
  Server, 
  CheckCircle2, 
  RefreshCw, 
  Terminal, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Download, 
  Play, 
  Layers,
  ArrowUpRight,
  Zap
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const DeploymentView: React.FC = () => {
  const { addAuditLog, addToast } = useSecurity();

  const [isDeploying, setIsDeploying] = useState(false);
  const [containerLogs, setContainerLogs] = useState<string[]>([
    '[2026-09-21 15:20:00] [INFO] [init] NetShield AI microservices initializing...',
    '[2026-09-21 15:20:01] [INFO] [ebpf] Attached eBPF raw socket filter on eth0 at 10 Gbps ring buffer.',
    '[2026-09-21 15:20:02] [INFO] [ml] Loaded XGBoost v3.1 weights from /models/xgboost_cicids2017.ubj',
    '[2026-09-21 15:20:02] [INFO] [ml] Loaded Isolation Forest ensemble checkpoint (200 trees, 0.05 contamination).',
    '[2026-09-21 15:20:03] [INFO] [fastapi] Uvicorn running on http://0.0.0.0:8000 (Workers: 8)',
    '[2026-09-21 15:20:04] [INFO] [telemetry] Prometheus metrics exporter mounted on /metrics',
    '[2026-09-21 15:20:05] [READY] NetShield AI SOC Ingress Daemon is OPERATIONAL and actively streaming.'
  ]);

  const checklistItems = [
    { name: 'Docker Container Multi-Stage Build', status: 'Ready', desc: 'Distroless Alpine base image (98MB footprint, non-root user)' },
    { name: 'FastAPI High-Performance Async Backend', status: 'Ready', desc: '8 async uvicorn worker threads with CUDA PyTorch runtime' },
    { name: 'React + Vite SOC Frontend Container', status: 'Ready', desc: 'Single-page SOC dashboard compiled to static nginx reverse proxy' },
    { name: 'Production Secrets & Environment Config', status: 'Ready', desc: 'GEMINI_API_KEY, JWT_SECRET, and SSL certificates loaded via Vault' },
    { name: 'Prometheus & Grafana Alert Exporters', status: 'Ready', desc: 'Scraping /metrics endpoint at 15s interval for SOC dashboards' },
    { name: 'mTLS & Zero Trust Network Mesh', status: 'Ready', desc: 'Mutual TLS 1.3 cryptographic enforcement across internal Pods' }
  ];

  const microservices = [
    { name: 'NetShield eBPF Ingress Daemon', status: 'HEALTHY', port: 9001, uptime: '18d 4h 12m', latency: '0.42 ms', cpu: '3.8%' },
    { name: 'FastAPI ML Inference Gateway', status: 'HEALTHY', port: 8000, uptime: '18d 4h 12m', latency: '1.18 ms', cpu: '14.2%' },
    { name: 'Alert Dispatcher & Webhook Broker', status: 'HEALTHY', port: 9092, uptime: '18d 4h 12m', latency: '0.85 ms', cpu: '2.1%' },
    { name: 'CICFlowMeter Feature Aggregator', status: 'HEALTHY', port: 6379, uptime: '18d 4h 12m', latency: '0.34 ms', cpu: '5.6%' }
  ];

  const handleRestartCluster = () => {
    setIsDeploying(true);
    addAuditLog('Initiated graceful cluster rolling restart of NetShield AI containers', 'System');
    
    setTimeout(() => {
      setContainerLogs(prev => [
        ...prev,
        `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] [DEPLOY] Rolling restart completed. Zero packet drops recorded.`
      ]);
      setIsDeploying(false);
      addToast('Cluster Re-deployed', 'All NetShield AI container Pods successfully cycled with green health checks.', 'success');
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              SYSTEM DEPLOYMENT, ARCHITECTURE & CLOUD OPERATIONS
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Production container orchestration, microservice telemetry, health checks, and CI/CD runtime readiness
          </p>
        </div>

        <button
          onClick={handleRestartCluster}
          disabled={isDeploying}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-950"
        >
          {isDeploying ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Rolling Update in Progress...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart Microservices Cluster</span>
            </>
          )}
        </button>
      </div>

      {/* Microservices Status Fleet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {microservices.map(svc => (
          <div key={svc.name} className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">Port :{svc.port}</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                {svc.status}
              </span>
            </div>
            <h4 className="text-xs font-bold text-white font-mono">{svc.name}</h4>
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-slate-500">Latency:</span>
                <p className="text-cyan-300 font-bold">{svc.latency}</p>
              </div>
              <div>
                <span className="text-slate-500">CPU Load:</span>
                <p className="text-slate-200">{svc.cpu}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Deployment Readiness Checklist */}
      <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white font-mono uppercase">
            ENTERPRISE DEPLOYMENT READINESS AUDIT CHECKLIST
          </h3>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            6 / 6 Verification Controls Passed (100%)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checklistItems.map((item, idx) => (
            <div 
              key={item.name}
              className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white">{item.name}</h4>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {item.status}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-Time Container Console Logs */}
      <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              LIVE CONTAINER RUNTIME STDOUT / STDERR STREAM
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Tail -n 50 --follow
          </span>
        </div>

        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 h-48 overflow-y-auto space-y-1">
          {containerLogs.map((log, i) => (
            <div key={i} className="leading-relaxed">
              <span className="text-cyan-400">{log.slice(0, 21)}</span>
              <span className={log.includes('[READY]') ? 'text-emerald-400 font-bold' : log.includes('[WARN]') ? 'text-amber-400' : 'text-slate-300'}>
                {log.slice(21)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
