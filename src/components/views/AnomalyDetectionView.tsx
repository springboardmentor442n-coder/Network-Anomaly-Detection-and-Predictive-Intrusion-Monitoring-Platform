import React, { useState } from 'react';
import { 
  Cpu, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sliders, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const AnomalyDetectionView: React.FC = () => {
  const { addAuditLog, addToast } = useSecurity();

  // Test vector input state
  const [flowDuration, setFlowDuration] = useState<number>(34100);
  const [totalFwdPackets, setTotalFwdPackets] = useState<number>(6);
  const [totalBwdPackets, setTotalBwdPackets] = useState<number>(7);
  const [flowBytesSec, setFlowBytesSec] = useState<number>(21854);
  const [synFlags, setSynFlags] = useState<number>(0);
  const [destPort, setDestPort] = useState<number>(443);
  const [selectedModel, setSelectedModel] = useState<string>('Isolation Forest + Autoencoder Ensemble');
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [detectionResult, setDetectionResult] = useState<{
    prediction: 'BENIGN' | 'ATTACK / ANOMALOUS';
    confidence: number;
    modelName: string;
    timestamp: string;
    anomalyScore: number;
    featureAttributions: { feature: string; weight: number; impact: 'Normal' | 'Anomalous' }[];
  }>({
    prediction: 'BENIGN',
    confidence: 0.982,
    modelName: 'Isolation Forest + Autoencoder Ensemble v2.4',
    timestamp: '2026-09-21 15:24:02 UTC',
    anomalyScore: 0.08,
    featureAttributions: [
      { feature: 'Flow Bytes / sec', weight: 0.12, impact: 'Normal' },
      { feature: 'SYN Flag Ratio', weight: 0.04, impact: 'Normal' },
      { feature: 'Backward Packet Length Mean', weight: 0.09, impact: 'Normal' },
      { feature: 'Inter-Arrival Time (IAT) Variance', weight: 0.11, impact: 'Normal' }
    ]
  });

  // Pre-load presets
  const loadPreset = (type: 'benign' | 'ddos' | 'portscan' | 'bruteforce') => {
    if (type === 'benign') {
      setFlowDuration(34100);
      setTotalFwdPackets(6);
      setTotalBwdPackets(7);
      setFlowBytesSec(21854);
      setSynFlags(0);
      setDestPort(443);
    } else if (type === 'ddos') {
      setFlowDuration(924510);
      setTotalFwdPackets(1820);
      setTotalBwdPackets(2);
      setFlowBytesSec(1892010);
      setSynFlags(1820);
      setDestPort(80);
    } else if (type === 'portscan') {
      setFlowDuration(410);
      setTotalFwdPackets(2);
      setTotalBwdPackets(0);
      setFlowBytesSec(0);
      setSynFlags(2);
      setDestPort(445);
    } else if (type === 'bruteforce') {
      setFlowDuration(12054);
      setTotalFwdPackets(84);
      setTotalBwdPackets(72);
      setFlowBytesSec(9840);
      setSynFlags(1);
      setDestPort(22);
    }
  };

  const handleRunInference = () => {
    setIsAnalyzing(true);

    setTimeout(() => {
      // Heuristic ML inference simulation based on vector
      const isAttack = (flowBytesSec > 500000) || (synFlags > 20) || (totalFwdPackets > 500) || (destPort === 22 && totalFwdPackets > 50);
      const confidence = isAttack ? 0.964 : 0.985;
      const anomalyScore = isAttack ? 0.89 : 0.08;

      const result = {
        prediction: (isAttack ? 'ATTACK / ANOMALOUS' : 'BENIGN') as 'BENIGN' | 'ATTACK / ANOMALOUS',
        confidence,
        modelName: `${selectedModel} v2.4`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        anomalyScore,
        featureAttributions: [
          { 
            feature: 'Flow Bytes / sec', 
            weight: flowBytesSec > 500000 ? 0.42 : 0.12, 
            impact: (flowBytesSec > 500000 ? 'Anomalous' : 'Normal') as 'Normal' | 'Anomalous'
          },
          { 
            feature: 'SYN Flag Spike', 
            weight: synFlags > 10 ? 0.35 : 0.04, 
            impact: (synFlags > 10 ? 'Anomalous' : 'Normal') as 'Normal' | 'Anomalous'
          },
          { 
            feature: 'Fwd / Bwd Packet Ratio', 
            weight: totalFwdPackets / Math.max(1, totalBwdPackets) > 10 ? 0.28 : 0.09, 
            impact: (totalFwdPackets / Math.max(1, totalBwdPackets) > 10 ? 'Anomalous' : 'Normal') as 'Normal' | 'Anomalous'
          },
          { 
            feature: 'Target Port Sensitivity', 
            weight: [22, 445, 8080].includes(destPort) ? 0.22 : 0.05, 
            impact: ([22, 445, 8080].includes(destPort) ? 'Anomalous' : 'Normal') as 'Normal' | 'Anomalous'
          }
        ]
      };

      setDetectionResult(result);
      setIsAnalyzing(false);
      addAuditLog(`Executed AI Anomaly Inference: Result=${result.prediction} (${Math.round(confidence * 100)}%)`, 'Model');
      addToast('Inference Complete', `Result: ${result.prediction} with ${Math.round(confidence * 100)}% confidence`, isAttack ? 'warning' : 'success');
    }, 450);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              AI/ML NETWORK ANOMALY DETECTION ENGINE
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Unsupervised & semi-supervised anomaly detection: Isolation Forest, Autoencoders & One-Class SVM inference
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="Isolation Forest + Autoencoder Ensemble">Ensemble: Isolation Forest + Autoencoder</option>
            <option value="One-Class SVM RBF Kernel">One-Class SVM (RBF Kernel)</option>
            <option value="Deep Autoencoder Reconstruction Net">Deep Autoencoder (Reconstruction Error)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Vector Inputs (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              FLOW FEATURE VECTOR INPUT
            </h3>
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <span className="text-slate-500 mr-1">Presets:</span>
              <button
                onClick={() => loadPreset('benign')}
                className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900"
              >
                Benign TLS
              </button>
              <button
                onClick={() => loadPreset('ddos')}
                className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60 hover:bg-rose-900"
              >
                DDoS Surge
              </button>
              <button
                onClick={() => loadPreset('portscan')}
                className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 hover:bg-amber-900"
              >
                Port Scan
              </button>
              <button
                onClick={() => loadPreset('bruteforce')}
                className="px-2 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/60 hover:bg-orange-900"
              >
                SSH Brute
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Destination Port:</label>
              <input
                type="number"
                value={destPort}
                onChange={(e) => setDestPort(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Flow Duration (µs):</label>
              <input
                type="number"
                value={flowDuration}
                onChange={(e) => setFlowDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Total Forward Packets:</label>
              <input
                type="number"
                value={totalFwdPackets}
                onChange={(e) => setTotalFwdPackets(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Total Backward Packets:</label>
              <input
                type="number"
                value={totalBwdPackets}
                onChange={(e) => setTotalBwdPackets(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Flow Bytes / sec:</label>
              <input
                type="number"
                value={flowBytesSec}
                onChange={(e) => setFlowBytesSec(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">SYN Flag Count in Flow:</label>
              <input
                type="number"
                value={synFlags}
                onChange={(e) => setSynFlags(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <button
            onClick={handleRunInference}
            disabled={isAnalyzing}
            className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950"
          >
            {isAnalyzing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Computing Anomaly Boundary...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Anomaly Detection Inference</span>
              </>
            )}
          </button>
        </div>

        {/* Right Card: Result Output & Confidence (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                DETECTION OUTPUT CLASSIFICATION
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                {detectionResult.timestamp}
              </span>
            </div>

            {/* Primary Classification Badge */}
            <div className={`p-4 rounded-xl border text-center my-3 ${
              detectionResult.prediction === 'BENIGN'
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/50 border-rose-800/80 text-rose-300 shadow-lg shadow-rose-950/30'
            }`}>
              <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Primary Classification</p>
              <div className="text-xl font-extrabold font-mono mt-1 flex items-center justify-center gap-2">
                {detectionResult.prediction === 'BENIGN' ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400 animate-bounce" />
                )}
                <span>{detectionResult.prediction}</span>
              </div>
              <p className="text-xs font-mono mt-1 opacity-90">
                Confidence: <strong className="text-white">{(detectionResult.confidence * 100).toFixed(1)}%</strong>
              </p>
            </div>

            {/* Model Metadata info */}
            <div className="space-y-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Active Model:</span>
                <span className="text-cyan-300 font-semibold">{detectionResult.modelName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Anomaly Index:</span>
                <span className={detectionResult.anomalyScore > 0.5 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {detectionResult.anomalyScore.toFixed(3)} / 1.000
                </span>
              </div>
            </div>
          </div>

          {/* Feature Importance / SHAP Attribution */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 font-mono mb-2 uppercase">
              Feature Attribution (SHAP Explainability):
            </h4>
            <div className="space-y-2">
              {detectionResult.featureAttributions.map(item => (
                <div key={item.feature} className="space-y-0.5 text-xs font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">{item.feature}</span>
                    <span className={item.impact === 'Anomalous' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {item.impact} (+{(item.weight * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.impact === 'Anomalous' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${item.weight * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
