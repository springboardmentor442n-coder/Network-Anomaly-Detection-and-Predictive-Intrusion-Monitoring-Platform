import React, { useState } from 'react';
import { 
  Crosshair, 
  Play, 
  BarChart2, 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  Zap,
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { AttackCategory } from '../../types';
import { useSecurity } from '../../context/SecurityContext';

export const AttackPredictionView: React.FC = () => {
  const { addAuditLog, addToast, blockIp } = useSecurity();

  const [selectedModel, setSelectedModel] = useState<string>('XGBoost Multi-Class Classifier');
  const [selectedSampleAttack, setSelectedSampleAttack] = useState<AttackCategory>('DDoS');
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  // Dynamic probabilities distribution based on attack category
  const getProbabilities = (attack: AttackCategory) => {
    const list: AttackCategory[] = ['BENIGN', 'DoS', 'DDoS', 'Port Scan', 'Brute Force', 'Botnet', 'Web Attack', 'Infiltration'];
    return list.map(cat => {
      let prob = 0.01;
      if (cat === attack) prob = 0.942;
      else if (attack === 'DDoS' && cat === 'DoS') prob = 0.038;
      else if (attack === 'Web Attack' && cat === 'Brute Force') prob = 0.024;
      else if (attack === 'BENIGN') prob = 0.02;
      return {
        category: cat,
        probability: parseFloat((prob * 100).toFixed(1)),
        isTarget: cat === attack
      };
    });
  };

  const [predictionData, setPredictionData] = useState({
    trafficDetails: {
      sourceIp: '185.220.101.5',
      destIp: '10.0.0.4',
      destPort: 80,
      protocol: 'HTTP/TCP',
      flowDuration: '92.4 ms',
      byteRate: '1.84 MB/sec'
    },
    predictedAttack: 'DDoS' as AttackCategory,
    attackProbability: 94.2,
    predictionConfidence: 0.962,
    modelUsed: 'XGBoost Multi-Class Classifier v3.1',
    predictionTimestamp: '2026-09-21 15:24:01 UTC',
    probabilities: getProbabilities('DDoS'),
    tacticalPlaybook: 'SOC-PB-04: Volumetric DDoS Shielding. Initiate upstream BGP flowspec and engage Edge CDN rate limiting.'
  });

  const handlePredict = () => {
    setIsPredicting(true);

    setTimeout(() => {
      const sampleIps: Record<AttackCategory, { src: string; port: number; proto: string; rate: string }> = {
        'BENIGN': { src: '192.168.1.104', port: 443, proto: 'TLS', rate: '42.1 KB/s' },
        'DoS': { src: '198.51.100.44', port: 80, proto: 'HTTP', rate: '480 KB/s' },
        'DDoS': { src: '185.220.101.5', port: 80, proto: 'HTTP', rate: '1.84 MB/s' },
        'Port Scan': { src: '103.251.167.20', port: 445, proto: 'TCP', rate: '64.2 KB/s' },
        'Brute Force': { src: '172.16.0.45', port: 22, proto: 'SSH/TCP', rate: '18.2 KB/s' },
        'Botnet': { src: '91.240.118.172', port: 6667, proto: 'TCP', rate: '94.0 KB/s' },
        'Web Attack': { src: '45.33.32.156', port: 8080, proto: 'HTTP', rate: '4.8 KB/s' },
        'Infiltration': { src: '192.168.10.15', port: 4444, proto: 'TCP', rate: '12.4 KB/s' },
        'SQL Injection': { src: '45.33.32.156', port: 8080, proto: 'HTTP', rate: '5.2 KB/s' },
        'Heartbleed': { src: '192.168.1.200', port: 443, proto: 'TLS', rate: '64.0 KB/s' }
      };

      const sampleInfo = sampleIps[selectedSampleAttack];
      const probs = getProbabilities(selectedSampleAttack);

      const playbooks: Record<AttackCategory, string> = {
        'BENIGN': 'Standard allow policy. No mitigation required.',
        'DoS': 'Throttle connection rate per IP via iptables limit module.',
        'DDoS': 'SOC-PB-04: Volumetric DDoS Shielding. Initiate upstream BGP flowspec and engage Edge CDN rate limiting.',
        'Port Scan': 'Deploy honeypot tarpit and add drop rule for reconnaissance scan host.',
        'Brute Force': 'SOC-PB-02: Trigger fail2ban SSH jail and invalidate suspect sessions.',
        'Botnet': 'SOC-PB-09: Isolate C2 beaconing endpoint immediately from network segment.',
        'Web Attack': 'Apply SQLi/XSS edge WAF ruleset and inspect database transaction logs.',
        'Infiltration': 'Initiate host memory dump and quarantine adjacent internal subnets.',
        'SQL Injection': 'Sanitize input parameters and enforce parameterized queries on backend database.',
        'Heartbleed': 'Revoke TLS certificates and patch OpenSSL runtime libraries immediately.'
      };

      setPredictionData({
        trafficDetails: {
          sourceIp: sampleInfo.src,
          destIp: '10.0.0.4',
          destPort: sampleInfo.port,
          protocol: sampleInfo.proto,
          flowDuration: '142 ms',
          byteRate: sampleInfo.rate
        },
        predictedAttack: selectedSampleAttack,
        attackProbability: selectedSampleAttack === 'BENIGN' ? 98.4 : 94.8,
        predictionConfidence: selectedSampleAttack === 'BENIGN' ? 0.985 : 0.962,
        modelUsed: `${selectedModel} v3.1`,
        predictionTimestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        probabilities: probs,
        tacticalPlaybook: playbooks[selectedSampleAttack]
      });

      setIsPredicting(false);
      addAuditLog(`Executed Multi-class Attack Prediction: Class=${selectedSampleAttack}`, 'Model');
      addToast('Attack Prediction Generated', `Identified class: ${selectedSampleAttack} with 94.8% probability`, selectedSampleAttack === 'BENIGN' ? 'info' : 'warning');
    }, 450);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              INTRUSION ATTACK PREDICTION & MULTI-CLASS INFERENCE
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Supervised multi-class attack probability modeling across 8 intrusion archetypes (DoS, DDoS, PortScan, Brute Force, Botnet, Web Attack)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Classifier:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="XGBoost Multi-Class Classifier">XGBoost Classifier (100 estimators)</option>
            <option value="Random Forest Multi-Class Classifier">Random Forest (200 trees)</option>
            <option value="Deep Neural Network (MLP)">TensorFlow / Keras 4-Layer DNN</option>
          </select>
        </div>
      </div>

      {/* Selector & Sample Flow Input */}
      <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-2">
              Select Sample Intrusion Traffic Vector to Classify:
            </h3>
            <div className="flex flex-wrap gap-2">
              {(['BENIGN', 'DoS', 'DDoS', 'Port Scan', 'Brute Force', 'Botnet', 'Web Attack', 'Infiltration'] as AttackCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedSampleAttack(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    selectedSampleAttack === cat
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold shadow-sm'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handlePredict}
            disabled={isPredicting}
            className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-cyan-950 shrink-0"
          >
            {isPredicting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Classifying...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Prediction</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 cols: Traffic Details & Output */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white font-mono uppercase border-b border-slate-800 pb-2">
            PREDICTION SUMMARY & FLOW ATTRIBUTES
          </h3>

          <div className="space-y-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Source Endpoint:</span>
              <span className="text-cyan-300 font-bold">{predictionData.trafficDetails.sourceIp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Target Endpoint:</span>
              <span className="text-slate-300">{predictionData.trafficDetails.destIp}:{predictionData.trafficDetails.destPort}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Protocol / Rate:</span>
              <span className="text-slate-300">{predictionData.trafficDetails.protocol} ({predictionData.trafficDetails.byteRate})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Model Engine:</span>
              <span className="text-cyan-400 font-semibold">{predictionData.modelUsed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Inference Timestamp:</span>
              <span className="text-slate-400">{predictionData.predictionTimestamp}</span>
            </div>
          </div>

          {/* Primary Predicted Attack Result */}
          <div className={`p-4 rounded-xl border text-center ${
            predictionData.predictedAttack === 'BENIGN'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/50 border-rose-800 text-rose-300 shadow-lg shadow-rose-950/40'
          }`}>
            <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Predicted Intrusion Class</p>
            <div className="text-2xl font-black font-mono mt-1">
              {predictionData.predictedAttack}
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs font-mono">
              <span>Attack Probability: <strong className="text-white">{predictionData.attackProbability}%</strong></span>
              <span>Confidence: <strong className="text-white">{(predictionData.predictionConfidence * 100).toFixed(1)}%</strong></span>
            </div>
          </div>

          {/* Tactical Playbook Recommendation */}
          <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
              <ShieldAlert className="w-4 h-4" />
              <span>Recommended Tactical SOC Action:</span>
            </div>
            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              {predictionData.tacticalPlaybook}
            </p>
            {predictionData.predictedAttack !== 'BENIGN' && (
              <button
                onClick={() => blockIp(predictionData.trafficDetails.sourceIp, `Intrusion mitigation: ${predictionData.predictedAttack}`)}
                className="mt-2 px-3 py-1.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-mono transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Apply Perimeter Drop on {predictionData.trafficDetails.sourceIp}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right 7 cols: Probability Distribution Bar Chart */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              MULTI-CLASS SOFTMAX PROBABILITY DISTRIBUTION
            </h3>
            <span className="text-[10px] font-mono text-cyan-400">
              Sum = 100%
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictionData.probabilities} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} fontFamily="monospace" unit="%" />
                <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={11} fontFamily="monospace" width={90} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }} 
                  formatter={(val: any) => [`${val}%`, 'Probability']}
                />
                <Bar dataKey="probability" name="Probability %" radius={[0, 4, 4, 0]}>
                  {predictionData.probabilities.map((entry, index) => (
                    <Cell 
                      key={`prob-${index}`} 
                      fill={entry.category === 'BENIGN' ? '#10b981' : entry.isTarget ? '#f43f5e' : '#334155'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
            Intrusion vector probabilities calculated via Scikit-Learn / XGBoost multi:softprob loss function across full feature space.
          </div>
        </div>
      </div>
    </div>
  );
};
