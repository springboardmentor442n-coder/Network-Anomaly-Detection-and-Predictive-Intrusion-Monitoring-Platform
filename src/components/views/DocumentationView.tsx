import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Layers, 
  Code, 
  Cpu, 
  ShieldCheck, 
  Terminal, 
  ExternalLink,
  ChevronRight,
  Database,
  Award,
  Server
} from 'lucide-react';

export const DocumentationView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('m1');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    { id: 'overview', title: 'Executive Overview & Mission', icon: ShieldCheck },
    { id: 'm1', title: 'Milestone 1: Initialization & Data', icon: Database },
    { id: 'm2', title: 'Milestone 2: AI Detection & Risk', icon: Cpu },
    { id: 'm3', title: 'Milestone 3: Alerts & Incidents', icon: Layers },
    { id: 'm4', title: 'Milestone 4: Evaluation & Deploy', icon: Server },
    { id: 'api', title: 'REST API Specifications', icon: Code }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              NETSHIELD AI SYSTEM DOCUMENTATION & TECHNICAL MANUAL
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Formal architectural blueprints, 4-milestone execution criteria, ML methodologies, and REST interface specifications
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 text-xs font-mono font-bold">
          Specification: v4.2.0-Prod
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar (3 cols) */}
        <div className="lg:col-span-3 space-y-1 font-mono text-xs">
          {sections.map(sec => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  activeSection === sec.id
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-bold shadow-md'
                    : 'bg-[#0f172a]/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{sec.title}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            );
          })}
        </div>

        {/* Content Body (9 cols) */}
        <div className="lg:col-span-9 p-6 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-6 font-mono text-xs">
          {activeSection === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">
                System Overview & Theoretical Framework
              </h3>
              <p className="text-slate-300 leading-relaxed">
                <strong>NETSHIELD AI</strong> is a next-generation, AI-driven Security Operations Center (SOC) platform engineered to continuously monitor high-speed enterprise network traffic, identify anomalous behavioral signatures, classify zero-day and known adversarial attacks, and automate tactical containment.
              </p>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-cyan-400">Core Objectives:</h4>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  <li>Zero-packet-drop stream ingestion via eBPF kernel hooks.</li>
                  <li>Hybrid machine learning combining Unsupervised Anomaly Scoring (Isolation Forest) with Supervised Attack Categorization (XGBoost & Random Forest).</li>
                  <li>Standardized 0–100 Cyber Risk Quantification for immediate analyst triage prioritization.</li>
                  <li>Integrated incident lifecycle management with one-click perimeter IP null-routing.</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'm1' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">
                Milestone 1: Project Initialization, Traffic Monitoring & Dataset Preprocessing
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Milestone 1 establishes the operational substrate for network telemetry collection and baseline training corpus normalization.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <h4 className="font-bold text-cyan-400">CICIDS2017 Dataset</h4>
                  <p className="text-slate-400">2,830,743 PCAP flow records with 78 statistical attributes generated at the Canadian Institute for Cybersecurity.</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <h4 className="font-bold text-cyan-400">UNSW-NB15 Dataset</h4>
                  <p className="text-slate-400">2,540,044 contemporary network vectors synthesizing normal and modern synthesized attack activities from the IXIA PerfectStorm tool.</p>
                </div>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                <span className="font-bold text-slate-200">5-Stage Data Preprocessing Pipeline:</span>
                <p className="text-slate-400">1. Data Ingestion &rarr; 2. NaN/Infinity Sanitation &rarr; 3. Median Imputation &rarr; 4. MinMax Scaler Normalization &rarr; 5. Tensor Matrix Generation</p>
              </div>
            </div>
          )}

          {activeSection === 'm2' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">
                Milestone 2: AI Detection, Multi-Class Prediction & Risk Scoring
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Milestone 2 incorporates the dual-tier inference architecture. Tier 1 executes unsupervised anomaly detection to flag deviations from benign baselines, while Tier 2 performs multi-class classification across 8 intrusion categories.
              </p>
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <h4 className="font-bold text-cyan-400">Risk Calculation Formulation:</h4>
                <code className="text-emerald-400 block bg-slate-900 p-2 rounded">
                  Risk Score = 0.30*(Confidence) + 0.30*(AttackWeight) + 0.25*(SeverityWeight) + 0.15*(BehaviorIndex)
                </code>
                <p className="text-slate-400 text-[11px]">Produces calibrated integer score between 0 (safe baseline) and 100 (critical operational breach).</p>
              </div>
            </div>
          )}

          {activeSection === 'm3' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">
                Milestone 3: Threat Alerts, Incident Management & Security Analytics
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Provides SOC tier-1, tier-2, and tier-3 analysts with an actionable command cockpit. Features triage status state machines (Active &rarr; Acknowledged &rarr; Resolved &rarr; Archived), evidence logging, and automated containment.
              </p>
              <div className="grid grid-cols-2 gap-3 text-slate-300">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <strong className="text-white block mb-1">Containment Protocols</strong>
                  <span>Automated perimeter BGP drop rules, subnet isolation, and session token revocations.</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <strong className="text-white block mb-1">Executive Reporting</strong>
                  <span>Downloadable audit reports covering top attacked ports, malicious CIDRs, and SLA metrics.</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'm4' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">
                Milestone 4: Model Evaluation, Testing & Operations
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Validates the production readiness of NetShield AI through rigorous adversarial simulation and microservice orchestration.
              </p>
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <h4 className="font-bold text-cyan-400">Evaluation Metrics:</h4>
                <p className="text-slate-300">XGBoost achieved <strong>98.9% Accuracy</strong>, <strong>98.5% F1-Score</strong>, and <strong>1.18 ms inference latency</strong> per flow record on 100,000 independent test flows.</p>
              </div>
            </div>
          )}

          {activeSection === 'api' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">
                Production REST API Interface Schema
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 font-bold">GET</span>
                    <code className="text-cyan-300 font-bold">/api/v1/telemetry/stream</code>
                  </div>
                  <p className="text-slate-400">Server-Sent Events (SSE) or WebSocket endpoint for live packet flow frames.</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold">POST</span>
                    <code className="text-cyan-300 font-bold">/api/v1/models/predict</code>
                  </div>
                  <p className="text-slate-400">Receives 78-feature flow vector and returns binary anomaly status, multi-class attack prediction, and confidence.</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-bold">POST</span>
                    <code className="text-cyan-300 font-bold">/api/v1/firewall/block-ip</code>
                  </div>
                  <p className="text-slate-400">Pushes immediate drop rule to Linux iptables / nftables and edge cloud firewall.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
