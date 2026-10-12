import React, { useState } from 'react';
import { 
  Gauge, 
  Sliders, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  Layers,
  CheckCircle2
} from 'lucide-react';
import { AttackCategory, SeverityLevel } from '../../types';

export const RiskScoringView: React.FC = () => {
  // Configurable parameters
  const [anomalyConfidence, setAnomalyConfidence] = useState<number>(95);
  const [selectedAttack, setSelectedAttack] = useState<AttackCategory>('DDoS');
  const [threatSeverity, setThreatSeverity] = useState<SeverityLevel>('Critical');
  const [networkBehaviorIndex, setNetworkBehaviorIndex] = useState<number>(88);
  const [assetCriticality, setAssetCriticality] = useState<number>(80);

  // Attack severity weight table
  const attackWeights: Record<AttackCategory, number> = {
    'BENIGN': 0,
    'DoS': 45,
    'DDoS': 95,
    'Port Scan': 40,
    'Brute Force': 75,
    'Botnet': 90,
    'Web Attack': 80,
    'Infiltration': 92,
    'SQL Injection': 85,
    'Heartbleed': 88
  };

  const severityWeights: Record<SeverityLevel, number> = {
    'Low': 15,
    'Medium': 45,
    'High': 75,
    'Critical': 100
  };

  // Multi-factor formula calculation:
  // Risk = 0.30 * (Anomaly Conf) + 0.30 * (Attack Severity) + 0.25 * (Severity Level) + 0.15 * (Network Behavior)
  const calculatedScore = Math.round(
    0.30 * (anomalyConfidence) +
    0.30 * (attackWeights[selectedAttack] || 0) +
    0.25 * (severityWeights[threatSeverity] || 0) +
    0.15 * (networkBehaviorIndex)
  );

  let riskLevel: SeverityLevel = 'Low';
  let levelColor = 'text-emerald-400';
  let levelBg = 'bg-emerald-950/40 border-emerald-800';
  let gaugeColor = '#10b981';

  if (calculatedScore >= 76) {
    riskLevel = 'Critical';
    levelColor = 'text-rose-400';
    levelBg = 'bg-rose-950/60 border-rose-800';
    gaugeColor = '#f43f5e';
  } else if (calculatedScore >= 51) {
    riskLevel = 'High';
    levelColor = 'text-orange-400';
    levelBg = 'bg-orange-950/50 border-orange-800';
    gaugeColor = '#f97316';
  } else if (calculatedScore >= 26) {
    riskLevel = 'Medium';
    levelColor = 'text-amber-400';
    levelBg = 'bg-amber-950/50 border-amber-800';
    gaugeColor = '#f59e0b';
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              DYNAMIC RISK SCORING & THREAT QUANTIFICATION ENGINE
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Standardized 0–100 cyber risk index computing anomaly probability, attack taxonomy, network volatility, and asset impact
          </p>
        </div>

        {/* 4 Risk Level Threshold Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
            0–25 Low
          </span>
          <span className="px-2 py-1 rounded bg-amber-950/60 text-amber-300 border border-amber-800">
            26–50 Med
          </span>
          <span className="px-2 py-1 rounded bg-orange-950/60 text-orange-300 border border-orange-800">
            51–75 High
          </span>
          <span className="px-2 py-1 rounded bg-rose-950/60 text-rose-300 border border-rose-800">
            76–100 Crit
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Multi-Factor Sliders (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              RISK FACTOR WEIGHTING PARAMETERS
            </h3>
            <span className="text-xs font-mono text-slate-500">Live Mathematical Model</span>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {/* Factor 1: Anomaly Confidence */}
            <div className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-bold">1. ML Anomaly Prediction Confidence (30% Weight):</span>
                <span className="text-cyan-400 font-bold text-sm">{anomalyConfidence}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={anomalyConfidence}
                onChange={(e) => setAnomalyConfidence(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0% (Uncertain)</span>
                <span>50%</span>
                <span>100% (Absolute Anomaly)</span>
              </div>
            </div>

            {/* Factor 2: Attack Classification */}
            <div className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-bold">2. Attack Classification Type (30% Weight):</span>
                <span className="text-rose-400 font-bold">{attackWeights[selectedAttack]} pts</span>
              </div>
              <select
                value={selectedAttack}
                onChange={(e) => setSelectedAttack(e.target.value as AttackCategory)}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white"
              >
                <option value="BENIGN">BENIGN (0 pts)</option>
                <option value="Port Scan">Port Scan (40 pts)</option>
                <option value="DoS">Denial of Service (DoS) (45 pts)</option>
                <option value="Brute Force">Brute Force (75 pts)</option>
                <option value="Web Attack">Web Attack / SQLi (80 pts)</option>
                <option value="Botnet">Botnet C2 Beacon (90 pts)</option>
                <option value="Infiltration">Infiltration / Lateral Pivot (92 pts)</option>
                <option value="DDoS">Distributed DoS Flood (95 pts)</option>
              </select>
            </div>

            {/* Factor 3: Threat Severity Level */}
            <div className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-bold">3. Threat Severity Tier (25% Weight):</span>
                <span className="text-amber-400 font-bold">{severityWeights[threatSeverity]} pts</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['Low', 'Medium', 'High', 'Critical'] as SeverityLevel[]).map(sev => (
                  <button
                    key={sev}
                    onClick={() => setThreatSeverity(sev)}
                    className={`py-1.5 rounded text-xs font-mono font-medium border transition-all ${
                      threatSeverity === sev
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Factor 4: Network Behavior Anomaly Index */}
            <div className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-bold">4. Network Behavior Deviation Rate (15% Weight):</span>
                <span className="text-cyan-400 font-bold text-sm">{networkBehaviorIndex}/100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={networkBehaviorIndex}
                onChange={(e) => setNetworkBehaviorIndex(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0 (Steady Baseline)</span>
                <span>50</span>
                <span>100 (Extreme Traffic Spike)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Visual Risk Gauge & Breakdown (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                CALCULATED RISK ASSESSMENT GAUGE
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${levelBg} ${levelColor}`}>
                {riskLevel.toUpperCase()} RISK
              </span>
            </div>

            {/* Circular Gauge Representation */}
            <div className="flex flex-col items-center justify-center my-4">
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* SVG Radial Gauge Meter */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#1e293b"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={gaugeColor}
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * calculatedScore) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-black font-mono text-white tracking-tight">
                    {calculatedScore}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    Score / 100
                  </span>
                </div>
              </div>

              <div className="mt-2 text-center">
                <p className={`text-base font-bold font-mono ${levelColor}`}>
                  {riskLevel} Severity Tier ({calculatedScore}/100)
                </p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {calculatedScore >= 76 
                    ? 'Immediate SOC escalation required. Activate containment playbooks.' 
                    : calculatedScore >= 51 
                    ? 'High priority triage. Investigate flow endpoints.' 
                    : calculatedScore >= 26 
                    ? 'Moderate threat level. Monitor telemetry.' 
                    : 'Negligible risk. Within standard operational tolerance.'}
                </p>
              </div>
            </div>

            {/* Risk Contribution Breakdown */}
            <div className="space-y-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Anomaly Confidence Factor:</span>
                <span className="text-white">+{(0.30 * anomalyConfidence).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Attack Classification Weight:</span>
                <span className="text-white">+{(0.30 * (attackWeights[selectedAttack] || 0)).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Threat Severity Level:</span>
                <span className="text-white">+{(0.25 * (severityWeights[threatSeverity] || 0)).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Network Volatility Impact:</span>
                <span className="text-white">+{(0.15 * networkBehaviorIndex).toFixed(1)} pts</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold">
                <span className="text-cyan-300">Composite Risk Score:</span>
                <span className={levelColor}>{calculatedScore} / 100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
