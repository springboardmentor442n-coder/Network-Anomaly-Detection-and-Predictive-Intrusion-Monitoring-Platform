import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  Filter, 
  CheckCircle, 
  Archive, 
  Flame, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowUpRight,
  Eye,
  X,
  Zap
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { SecurityAlert, SeverityLevel, AlertStatus } from '../../types';
import { SeverityBadge, AttackBadge, RiskGaugeBadge } from '../common/UIComponents';

export const ThreatAlertsView: React.FC = () => {
  const { 
    alerts, 
    acknowledgeAlert, 
    resolveAlert, 
    archiveAlert, 
    escalateAlertToIncident,
    blockIp
  } = useSecurity();

  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAlertForModal, setSelectedAlertForModal] = useState<SecurityAlert | null>(null);
  const [resolveNote, setResolveNote] = useState<string>('');

  // Counts by severity
  const criticalCount = alerts.filter(a => a.severity === 'Critical').length;
  const highCount = alerts.filter(a => a.severity === 'High').length;
  const mediumCount = alerts.filter(a => a.severity === 'Medium').length;
  const lowCount = alerts.filter(a => a.severity === 'Low').length;

  // Filter and sort by priority (Critical > High > Medium > Low, then by Risk Score desc)
  const filteredAlerts = alerts
    .filter(a => {
      const matchesSev = selectedSeverity === 'ALL' || a.severity === selectedSeverity;
      const matchesStatus = selectedStatus === 'ALL' || a.status === selectedStatus;
      const matchesSearch = 
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.threatType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.sourceIp.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.destIp.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSev && matchesStatus && matchesSearch;
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  const handleResolve = (alertId: string) => {
    resolveAlert(alertId, resolveNote || 'Threat remediated and perimeter rule verified.');
    setSelectedAlertForModal(null);
    setResolveNote('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white font-mono">
              REAL-TIME THREAT ALERTS & TRIAGE CONSOLE
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Dynamic prioritization queue ranked by severity tier, anomaly confidence, and risk score
          </p>
        </div>

        {/* Priority Counts Display */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'Critical' ? 'ALL' : 'Critical')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              selectedSeverity === 'Critical' ? 'ring-2 ring-rose-500' : ''
            } bg-rose-950/60 border-rose-800 text-rose-300`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            <span>Critical: <strong>{criticalCount}</strong></span>
          </button>

          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'High' ? 'ALL' : 'High')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              selectedSeverity === 'High' ? 'ring-2 ring-orange-500' : ''
            } bg-orange-950/60 border-orange-800 text-orange-300`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span>High: <strong>{highCount}</strong></span>
          </button>

          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'Medium' ? 'ALL' : 'Medium')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              selectedSeverity === 'Medium' ? 'ring-2 ring-amber-500' : ''
            } bg-amber-950/60 border-amber-800 text-amber-300`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Medium: <strong>{mediumCount}</strong></span>
          </button>

          <button
            onClick={() => setSelectedSeverity(selectedSeverity === 'Low' ? 'ALL' : 'Low')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              selectedSeverity === 'Low' ? 'ring-2 ring-emerald-500' : ''
            } bg-emerald-950/60 border-emerald-800 text-emerald-300`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Low: <strong>{lowCount}</strong></span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Alert ID, IP, Threat Type..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="active">Active Triage</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">ALL SEVERITIES</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                <th className="py-2.5 px-3">Alert ID</th>
                <th className="py-2.5 px-3">Threat Type</th>
                <th className="py-2.5 px-3">Source Endpoint</th>
                <th className="py-2.5 px-3">Destination</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Risk Score</th>
                <th className="py-2.5 px-3">Detection Time</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAlerts.map(alert => (
                <tr 
                  key={alert.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    alert.severity === 'Critical' && alert.status === 'active' ? 'bg-rose-950/15' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                    {alert.id}
                  </td>
                  <td className="py-2.5 px-3">
                    <AttackBadge attack={alert.threatType} />
                  </td>
                  <td className="py-2.5 px-3 text-cyan-300 font-semibold">
                    {alert.sourceIp}:{alert.sourcePort}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {alert.destIp}:{alert.destPort}
                  </td>
                  <td className="py-2.5 px-3">
                    <SeverityBadge severity={alert.severity} />
                  </td>
                  <td className="py-2.5 px-3">
                    <RiskGaugeBadge score={alert.riskScore} showBar={false} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                    {alert.detectionTime.split(' ')[1]} UTC
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      alert.status === 'active' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                      alert.status === 'acknowledged' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      alert.status === 'resolved' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedAlertForModal(alert)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {alert.status === 'active' && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
                        >
                          Ack
                        </button>
                      )}

                      {alert.status !== 'resolved' && (
                        <button
                          onClick={() => setSelectedAlertForModal(alert)}
                          className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[11px] transition-colors"
                        >
                          Resolve
                        </button>
                      )}

                      {alert.status !== 'archived' && (
                        <button
                          onClick={() => archiveAlert(alert.id)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                          title="Archive Alert"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert View & Action Modal */}
      {selectedAlertForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#0c121e] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  SECURITY ALERT DOSSIER & TRIAGE: {selectedAlertForModal.id}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedAlertForModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AttackBadge attack={selectedAlertForModal.threatType} />
                  <SeverityBadge severity={selectedAlertForModal.severity} />
                </div>
                <RiskGaugeBadge score={selectedAlertForModal.riskScore} />
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                <p className="text-slate-400 font-bold uppercase">Alert Description:</p>
                <p className="text-slate-200 leading-relaxed">{selectedAlertForModal.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500">Source:</span>
                  <p className="text-cyan-300 font-bold">{selectedAlertForModal.sourceIp}:{selectedAlertForModal.sourcePort}</p>
                </div>
                <div>
                  <span className="text-slate-500">Destination:</span>
                  <p className="text-slate-200 font-bold">{selectedAlertForModal.destIp}:{selectedAlertForModal.destPort}</p>
                </div>
                <div>
                  <span className="text-slate-500">MITRE Technique:</span>
                  <p className="text-slate-300">{selectedAlertForModal.mitreTechnique}</p>
                </div>
                <div>
                  <span className="text-slate-500">Detection Timestamp:</span>
                  <p className="text-slate-300">{selectedAlertForModal.detectionTime}</p>
                </div>
              </div>

              <div>
                <span className="text-amber-400 font-bold uppercase mb-1 block">
                  Recommended Tactical Action:
                </span>
                <p className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
                  {selectedAlertForModal.recommendedAction}
                </p>
              </div>

              {/* Resolution Note field */}
              <div>
                <label className="text-slate-400 font-bold uppercase block mb-1">
                  Resolution Comments / Remediation Log:
                </label>
                <input
                  type="text"
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="e.g. Edge WAF rule applied; suspect host isolated; confirmed false positive..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    blockIp(selectedAlertForModal.sourceIp, `Mitigated from Alert ${selectedAlertForModal.id}`);
                  }}
                  className="px-3 py-2 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold transition-colors flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Block Malicious IP ({selectedAlertForModal.sourceIp})</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      escalateAlertToIncident(selectedAlertForModal.id);
                      setSelectedAlertForModal(null);
                    }}
                    className="px-3 py-2 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 font-bold transition-colors"
                  >
                    Escalate to Incident &rarr;
                  </button>
                  <button
                    onClick={() => handleResolve(selectedAlertForModal.id)}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition-colors"
                  >
                    Mark as Resolved
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
