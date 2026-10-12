import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  ExternalLink, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { SeverityLevel, AttackCategory } from '../../types';
import { SeverityBadge, AttackBadge } from '../common/UIComponents';

interface ThreatDossier {
  id: string;
  threatType: AttackCategory;
  severity: SeverityLevel;
  confidence: number;
  description: string;
  recommendedAction: string;
  mitreTactic: string;
  mitreTechnique: string;
  cveReferences: string[];
  impactScore: number;
}

export const ThreatClassificationView: React.FC = () => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDossier, setActiveDossier] = useState<ThreatDossier | null>(null);

  const threatCatalog: ThreatDossier[] = [
    {
      id: 'TC-01',
      threatType: 'DDoS',
      severity: 'Critical',
      confidence: 0.965,
      description: 'Distributed Denial of Service attack utilizing botnets or volumetric packet flooding to exhaust target bandwidth, socket tables, or stateful firewall connections.',
      recommendedAction: 'Engage Edge CDN scrubbing filters, apply BGP Flowspec rate limits, and activate upstream ISP blackhole routing for targeted public endpoints.',
      mitreTactic: 'Impact (TA0040)',
      mitreTechnique: 'Network Denial of Service (T1498.001)',
      cveReferences: ['CVE-2023-44487 (HTTP/2 Rapid Reset)', 'CVE-2019-9512'],
      impactScore: 95
    },
    {
      id: 'TC-02',
      threatType: 'Botnet',
      severity: 'Critical',
      confidence: 0.942,
      description: 'Host infected with autonomous malware maintaining persistent Command & Control (C2) callbacks, exfiltrating telemetry, or receiving remote botmaster commands.',
      recommendedAction: 'Quarantine infected endpoint on isolated vLAN immediately. Harvest RAM dump for malware volatility analysis and sinkhole the identified C2 domain/IP.',
      mitreTactic: 'Command and Control (TA0011)',
      mitreTechnique: 'Application Layer Protocol: Web Protocols (T1071.001)',
      cveReferences: ['CVE-2021-44228 (Log4Shell C2 Delivery)'],
      impactScore: 92
    },
    {
      id: 'TC-03',
      threatType: 'Infiltration',
      severity: 'Critical',
      confidence: 0.938,
      description: 'Adversary successfully pivoted from external network perimeter into internal trusted subnets via compromised lateral movement credentials or exploit payloads.',
      recommendedAction: 'Initiate SOC emergency incident response (P-1). Reset all domain admin service account credentials and review Kerberos ticket grant logs.',
      mitreTactic: 'Lateral Movement (TA0008)',
      mitreTechnique: 'Remote Services: SMB/Windows Admin Shares (T1021.002)',
      cveReferences: ['CVE-2020-1472 (Zerologon)', 'CVE-2017-0144 (EternalBlue)'],
      impactScore: 90
    },
    {
      id: 'TC-04',
      threatType: 'Brute Force',
      severity: 'High',
      confidence: 0.945,
      description: 'High frequency credential dictionary attack against SSH, RDP, or HTTP login endpoints attempting unauthorized authentication access.',
      recommendedAction: 'Trigger automatic perimeter fail2ban IP jail, enforce MFA challenge on all remote access ingress, and migrate SSH to certificate-based authentication.',
      mitreTactic: 'Credential Access (TA0006)',
      mitreTechnique: 'Brute Force: Password Guessing (T1110.001)',
      cveReferences: ['CWE-307: Improper Restriction of Excessive Authentication Attempts'],
      impactScore: 78
    },
    {
      id: 'TC-05',
      threatType: 'Web Attack',
      severity: 'High',
      confidence: 0.920,
      description: 'Structured Query Language injection (SQLi) or Cross-Site Scripting (XSS) payload delivered within HTTP requests to tamper with backend databases or session cookies.',
      recommendedAction: 'Update Web Application Firewall (WAF) OWASP Core Rule Set (CRS), inspect database query audit logs, and enforce prepared SQL statements.',
      mitreTactic: 'Initial Access (TA0001)',
      mitreTechnique: 'Exploit Public-Facing Application (T1190)',
      cveReferences: ['CWE-89: SQL Injection', 'CWE-79: Cross-Site Scripting'],
      impactScore: 82
    },
    {
      id: 'TC-06',
      threatType: 'DoS',
      severity: 'Medium',
      confidence: 0.890,
      description: 'Targeted single-source denial of service (e.g. Slowloris, SYN flood, or Ping of Death) attempting to starve local worker thread processes.',
      recommendedAction: 'Tune web server client connection timeout thresholds, enable SYN cookies in the Linux kernel (`sysctl -w net.ipv4.tcp_syncookies=1`), and rate-limit client IPs.',
      mitreTactic: 'Impact (TA0040)',
      mitreTechnique: 'Endpoint Denial of Service: OS Exhaustion (T1499.001)',
      cveReferences: ['CWE-400: Uncontrolled Resource Consumption'],
      impactScore: 52
    },
    {
      id: 'TC-07',
      threatType: 'Port Scan',
      severity: 'Medium',
      confidence: 0.978,
      description: 'Systematic reconnaissance scanning across TCP/UDP ports (SYN, FIN, NULL, or XMAS scans) searching for active network services and vulnerable listening daemons.',
      recommendedAction: 'Deploy network tarpits to slow scanner traversal, drop unsolicited SYN packets on perimeter border routers, and obscure service banner banners.',
      mitreTactic: 'Reconnaissance (TA0043)',
      mitreTechnique: 'Network Service Discovery (T1046)',
      cveReferences: ['CWE-200: Exposure of Sensitive Information'],
      impactScore: 48
    },
    {
      id: 'TC-08',
      threatType: 'BENIGN',
      severity: 'Low',
      confidence: 0.995,
      description: 'Standard authorized enterprise traffic flows (DNS queries, HTTPS TLS handshakes, internal NTP time sync, and verified API service telemetry).',
      recommendedAction: 'Maintain baseline telemetry logging. No blocking or remediation action necessary.',
      mitreTactic: 'Baseline Operations',
      mitreTechnique: 'Standard Flow Behavior',
      cveReferences: ['N/A'],
      impactScore: 5
    }
  ];

  const filteredThreats = threatCatalog.filter(threat => {
    const matchesSev = selectedSeverity === 'ALL' || threat.severity === selectedSeverity;
    const matchesSearch = 
      threat.threatType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threat.mitreTechnique.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              THREAT CLASSIFICATION & MITRE ATT&CK PLAYBOOKS
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            4-tier threat severity taxonomy (Low, Medium, High, Critical) with MITRE ATT&CK enterprise matrices & tactical SOC playbooks
          </p>
        </div>

        {/* 4 Severity Counters */}
        <div className="flex items-center gap-2">
          {(['Critical', 'High', 'Medium', 'Low'] as SeverityLevel[]).map(sev => {
            const count = threatCatalog.filter(t => t.severity === sev).length;
            return (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(selectedSeverity === sev ? 'ALL' : sev)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all ${
                  selectedSeverity === sev ? 'ring-2 ring-cyan-500' : ''
                }`}
              >
                <SeverityBadge severity={sev} />
                <span className="font-bold text-white">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Threat Type, MITRE Tactic, Technique..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Severity Filter:</span>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">ALL SEVERITIES</option>
            <option value="Critical">CRITICAL ONLY</option>
            <option value="High">HIGH ONLY</option>
            <option value="Medium">MEDIUM ONLY</option>
            <option value="Low">LOW ONLY</option>
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredThreats.map(threat => (
          <div
            key={threat.id}
            className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">{threat.id}</span>
                  <AttackBadge attack={threat.threatType} />
                  <SeverityBadge severity={threat.severity} />
                </div>
                <span className="text-xs font-mono text-cyan-400">
                  Confidence: {Math.round(threat.confidence * 100)}%
                </span>
              </div>

              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                {threat.description}
              </p>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">MITRE ATT&CK Tactic:</span>
                  <span className="text-cyan-300 font-semibold">{threat.mitreTactic}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Technique:</span>
                  <span className="text-slate-300">{threat.mitreTechnique}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div>
                <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider block mb-1">
                  SOC Recommended Action:
                </span>
                <p className="text-[11px] font-mono text-slate-400">
                  {threat.recommendedAction}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-mono text-slate-500">
                  Impact Score: {threat.impactScore} / 100
                </span>
                <button
                  onClick={() => setActiveDossier(threat)}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <span>View Full Dossier</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Threat Dossier Deep Dive Modal */}
      {activeDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#0c121e] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  THREAT CLASSIFICATION DOSSIER: {activeDossier.threatType}
                </h3>
              </div>
              <button 
                onClick={() => setActiveDossier(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center gap-3">
                <SeverityBadge severity={activeDossier.severity} />
                <span className="text-slate-400">Impact Score: <strong className="text-white">{activeDossier.impactScore}/100</strong></span>
                <span className="text-slate-400">Detection Confidence: <strong className="text-cyan-400">{Math.round(activeDossier.confidence * 100)}%</strong></span>
              </div>

              <div>
                <h4 className="text-slate-400 font-bold uppercase mb-1">Threat Overview:</h4>
                <p className="text-slate-200 leading-relaxed p-3 bg-slate-950 rounded-lg border border-slate-800">
                  {activeDossier.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500">MITRE Enterprise Tactic:</span>
                  <p className="text-cyan-300 font-bold mt-0.5">{activeDossier.mitreTactic}</p>
                </div>
                <div>
                  <span className="text-slate-500">MITRE Technique:</span>
                  <p className="text-slate-200 font-bold mt-0.5">{activeDossier.mitreTechnique}</p>
                </div>
              </div>

              <div>
                <h4 className="text-slate-400 font-bold uppercase mb-1">Common Vulnerabilities (CVE/CWE):</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeDossier.cveReferences.map(cve => (
                    <span key={cve} className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300">
                      {cve}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-amber-400 font-bold uppercase mb-1">Detailed Incident Response Playbook:</h4>
                <p className="text-slate-300 leading-relaxed p-3 bg-slate-950 rounded-lg border border-slate-800">
                  {activeDossier.recommendedAction}
                </p>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  onClick={() => setActiveDossier(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
