import React, { useState } from 'react';
import { 
  Award, 
  BarChart2, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Cpu, 
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { mockModelMetrics, mockConfusionMatrix, mockFeatureImportance } from '../../data/mockData';

export const ModelPerformanceView: React.FC = () => {
  const [selectedModelName, setSelectedModelName] = useState<string>(mockModelMetrics[0]?.modelName || 'Random Forest');

  const selectedModel = mockModelMetrics.find(m => m.modelName === selectedModelName) || mockModelMetrics[0];

  const comparisonData = mockModelMetrics.map(m => ({
    name: m.modelName.replace('Classifier', '').replace('Gradient Boosted Trees', '').trim(),
    Accuracy: Number(m.accuracy.toFixed(1)),
    Precision: Number(m.precision.toFixed(1)),
    Recall: Number(m.recall.toFixed(1)),
    F1Score: Number(m.f1Score.toFixed(1))
  }));

  const confusionStats = {
    trueNegative: 9970,
    falsePositive: 30,
    falseNegative: 56,
    truePositive: 10944
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              AI MODEL BENCHMARKS &amp; PERFORMANCE EVALUATION
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Comparative evaluation across Random Forest, XGBoost, Deep Neural Net, and Isolation Forest on CICIDS2017 &amp; UNSW-NB15 test sets
          </p>
        </div>

        {/* Model Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          {mockModelMetrics.map(m => (
            <button
              key={m.modelName}
              onClick={() => setSelectedModelName(m.modelName)}
              className={`px-3 py-1.5 rounded transition-all ${
                selectedModelName === m.modelName
                  ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m.modelName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Model Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0f172a]/90 border border-slate-800">
          <p className="text-[10px] text-slate-400 font-mono uppercase">Accuracy</p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {selectedModel.accuracy.toFixed(2)}%
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Test split 20%</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f172a]/90 border border-slate-800">
          <p className="text-[10px] text-slate-400 font-mono uppercase">Precision</p>
          <p className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {selectedModel.precision.toFixed(2)}%
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Low false alarms</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f172a]/90 border border-slate-800">
          <p className="text-[10px] text-slate-400 font-mono uppercase">Recall</p>
          <p className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {selectedModel.recall.toFixed(2)}%
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Threat catch rate</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f172a]/90 border border-slate-800">
          <p className="text-[10px] text-slate-400 font-mono uppercase">F1-Score</p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {selectedModel.f1Score.toFixed(2)}%
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Harmonic mean</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f172a]/90 border border-slate-800">
          <p className="text-[10px] text-slate-400 font-mono uppercase">Detection Rate</p>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">
            {selectedModel.detectionRate.toFixed(2)}%
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">True Positive Rate</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f172a]/90 border border-slate-800">
          <p className="text-[10px] text-slate-400 font-mono uppercase">Train Time</p>
          <p className="text-xl font-bold font-mono text-slate-200 mt-1">
            {selectedModel.trainingTimeSec}s
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Distributed CPU/GPU</p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0f172a]/90 border border-slate-800">
          <p className="text-[10px] text-slate-400 font-mono uppercase">Inference / Flow</p>
          <p className="text-xl font-bold font-mono text-cyan-300 mt-1">
            {selectedModel.inferenceSpeedMs} ms
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Real-time wire-speed</p>
        </div>
      </div>

      {/* Model Benchmark Comparison Chart */}
      <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-mono uppercase">
            MODEL PERFORMANCE COMPARISON (METRIC BENCHMARKS)
          </h3>
          <span className="text-xs font-mono text-slate-400">Values represented in %</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontFamily="monospace" />
              <YAxis domain={[90, 100]} stroke="#64748b" fontSize={11} fontFamily="monospace" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
              <Bar dataKey="Accuracy" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Precision" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Recall" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="F1Score" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Confusion Matrix & Feature Importance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Confusion Matrix (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              CONFUSION MATRIX ({selectedModel.modelName.split(' ')[0]})
            </h3>
            <span className="text-[10px] font-mono text-cyan-400">Total: 21,000 test vectors</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              {/* True Negative */}
              <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/80">
                <p className="text-[10px] text-emerald-400 uppercase font-bold">True Negative (TN)</p>
                <p className="text-xl font-bold text-white mt-1">
                  {confusionStats.trueNegative.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Actual Benign &rarr; Predicted Benign</p>
              </div>

              {/* False Positive */}
              <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/60">
                <p className="text-[10px] text-rose-400 uppercase font-bold">False Positive (FP)</p>
                <p className="text-xl font-bold text-rose-300 mt-1">
                  {confusionStats.falsePositive.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Actual Benign &rarr; Predicted Attack</p>
              </div>

              {/* False Negative */}
              <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/60">
                <p className="text-[10px] text-rose-400 uppercase font-bold">False Negative (FN)</p>
                <p className="text-xl font-bold text-rose-300 mt-1">
                  {confusionStats.falseNegative.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Actual Attack &rarr; Predicted Benign</p>
              </div>

              {/* True Positive */}
              <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/80">
                <p className="text-[10px] text-emerald-400 uppercase font-bold">True Positive (TP)</p>
                <p className="text-xl font-bold text-white mt-1">
                  {confusionStats.truePositive.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Actual Attack &rarr; Predicted Attack</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center">
              Calculated Specificity: 99.7% | False Discovery Rate (FDR): 0.27%
            </p>
          </div>
        </div>

        {/* Feature Importance Bar Chart (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              FEATURE IMPORTANCE RANKINGS (GINI IMPURITY / SHAP GAIN)
            </h3>
            <span className="text-[10px] font-mono text-cyan-400">Top Predictive Signals</span>
          </div>

          <div className="space-y-2.5">
            {mockFeatureImportance.map(feat => (
              <div key={feat.feature} className="space-y-1 font-mono text-xs">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">{feat.feature}</span>
                  <span className="text-cyan-400 font-bold">{(feat.importance * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                    style={{ width: `${feat.importance * 100 * 3.5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
            Flow duration, bytes/sec, and SYN flag rates represent &gt;60% cumulative decision weight across tree ensemble splits.
          </p>
        </div>
      </div>
    </div>
  );
};
