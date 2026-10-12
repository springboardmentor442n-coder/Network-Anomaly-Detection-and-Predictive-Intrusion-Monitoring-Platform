import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  Sliders, 
  Bell, 
  ShieldCheck, 
  Cpu, 
  Database, 
  RefreshCw,
  Lock,
  Radio
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const SettingsView: React.FC = () => {
  const { addToast, addAuditLog } = useSecurity();

  const [sensitivity, setSensitivity] = useState<number>(75);
  const [autoEscalateThreshold, setAutoEscalateThreshold] = useState<number>(85);
  const [autoBlockCritical, setAutoBlockCritical] = useState<boolean>(true);
  const [enableSoundAlerts, setEnableSoundAlerts] = useState<boolean>(true);
  const [primaryModel, setPrimaryModel] = useState<string>('Ensemble (Isolation Forest + XGBoost)');
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [slackWebhook, setSlackWebhook] = useState<string>('https://hooks.slack.com/services/T00/B00/X00');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addAuditLog('Updated SOC Detection Sensitivity & Security Configuration Parameters', 'System');
    addToast('Settings Saved', 'NetShield AI configuration parameters updated and applied across worker cluster.', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              SYSTEM CONFIGURATION & DETECTION POLICIES
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Global inference thresholds, automatic containment switches, notification webhooks, and retention limits
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-950"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
        {/* Detection Engine Parameters */}
        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-white font-bold">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="uppercase">AI/ML Detection Thresholds</h3>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Anomaly Detection Sensitivity:</span>
              <span className="text-cyan-400 font-bold">{sensitivity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={99}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <p className="text-[10px] text-slate-500">
              Higher values detect subtle micro-anomalies but slightly increase false positives.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Auto-Incident Escalation Threshold:</span>
              <span className="text-rose-400 font-bold">Risk Score &ge; {autoEscalateThreshold}</span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              value={autoEscalateThreshold}
              onChange={(e) => setAutoEscalateThreshold(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
            <p className="text-[10px] text-slate-500">
              Alerts with risk scores exceeding this threshold automatically spawn a formal SOC incident case.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-slate-400 block">Default Inference Model Pipeline:</label>
            <select
              value={primaryModel}
              onChange={(e) => setPrimaryModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
            >
              <option value="Ensemble (Isolation Forest + XGBoost)">Ensemble (Isolation Forest + XGBoost v3.1)</option>
              <option value="XGBoost Standalone">XGBoost Standalone (100 estimators)</option>
              <option value="Deep Neural Network">Deep Neural Network (TensorFlow MLP)</option>
            </select>
          </div>
        </div>

        {/* Tactical Containment & Notifications */}
        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-white font-bold">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="uppercase">Tactical Containment & Integrations</h3>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <p className="text-white font-bold">Autonomous Perimeter Null-Route</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Instantly drops source IP when Critical intrusion is detected</p>
            </div>
            <input
              type="checkbox"
              checked={autoBlockCritical}
              onChange={(e) => setAutoBlockCritical(e.target.checked)}
              className="w-4 h-4 accent-cyan-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <p className="text-white font-bold">SOC Terminal Audio Alarms</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Play acoustic tone on incoming P-1 Critical alert events</p>
            </div>
            <input
              type="checkbox"
              checked={enableSoundAlerts}
              onChange={(e) => setEnableSoundAlerts(e.target.checked)}
              className="w-4 h-4 accent-cyan-500"
            />
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-slate-400 block">Slack / PagerDuty Dispatch Webhook:</label>
            <input
              type="url"
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-slate-400 block">Telemetry Log Retention Period:</label>
            <select
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
            >
              <option value={7}>7 Days (Staging / Development)</option>
              <option value={30}>30 Days (Standard SOC SLA)</option>
              <option value={90}>90 Days (Enterprise Compliance)</option>
              <option value={365}>365 Days (Full Forensic Audit)</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  );
};
