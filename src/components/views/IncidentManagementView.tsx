import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  User, 
  ShieldCheck, 
  AlertOctagon, 
  CheckCircle2, 
  Zap, 
  X,
  MessageSquare,
  Shield,
  Layers
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { SecurityIncident, IncidentStatus, SeverityLevel, AttackCategory } from '../../types';
import { SeverityBadge, AttackBadge } from '../common/UIComponents';

export const IncidentManagementView: React.FC = () => {
  const { incidents, createIncident, updateIncidentStatus, addAuditLog, addToast, blockIp } = useSecurity();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New incident form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newThreatType, setNewThreatType] = useState<AttackCategory>('DDoS');
  const [newSeverity, setNewSeverity] = useState<SeverityLevel>('High');
  const [newSourceIp, setNewSourceIp] = useState('185.220.101.5');
  const [newDestIp, setNewDestIp] = useState('10.0.0.4');
  const [newAssignedTo, setNewAssignedTo] = useState('Senior Analyst (SOC-L2)');

  const filteredIncidents = incidents.filter(inc => {
    const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;
    const assignee = inc.assignedTo || inc.assignedAnalyst || '';
    const matchesSearch = 
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.threatType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignee.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    createIncident({
      title: newTitle,
      description: newDescription || 'Operational incident raised via SOC analyst console.',
      threatType: newThreatType,
      severity: newSeverity,
      sourceIp: newSourceIp,
      destIp: newDestIp,
      assignedTo: newAssignedTo,
      assignedAnalyst: newAssignedTo
    });

    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    addToast('Incident Created', `New incident ${newTitle} submitted to triage queue`, 'success');
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'New':
      case 'Open':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">OPEN / NEW</span>;
      case 'Investigating':
      case 'Under Investigation':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">INVESTIGATING</span>;
      case 'Contained':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">CONTAINED</span>;
      case 'Resolved':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">RESOLVED</span>;
      case 'Closed':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">CLOSED</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              INCIDENT MANAGEMENT & SOC FORENSIC CASEWORK
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            End-to-end incident lifecycle tracking: Triage &rarr; Forensic Analysis &rarr; Containment &rarr; Post-Incident Review
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-950"
        >
          <Plus className="w-4 h-4" />
          <span>Raise New Incident</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Incident ID, Title, Threat..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Status Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">ALL INCIDENTS</option>
            <option value="Open">Open</option>
            <option value="Under Investigation">Under Investigation</option>
            <option value="Contained">Contained</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Incidents Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Incidents List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {filteredIncidents.map(inc => (
            <div
              key={inc.id}
              onClick={() => setSelectedIncident(inc)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedIncident?.id === inc.id
                  ? 'bg-slate-800/80 border-cyan-500 shadow-md'
                  : 'bg-[#0f172a]/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">{inc.id}</span>
                  <SeverityBadge severity={inc.severity} />
                  <AttackBadge attack={inc.threatType} />
                </div>
                {getStatusBadge(inc.status)}
              </div>

              <h4 className="text-sm font-bold text-white font-mono mt-2">{inc.title}</h4>
              <p className="text-xs text-slate-400 font-mono mt-1 line-clamp-2">
                {inc.description || 'Elevated anomaly signature requiring forensic review and network containment.'}
              </p>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-3 mt-3 border-t border-slate-800/60">
                <span>Assignee: <strong className="text-slate-300">{inc.assignedTo || inc.assignedAnalyst}</strong></span>
                <span>Logged: {(inc.createdAt || inc.detectionTime || '').split(' ')[0]}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Selected Incident Detail Drawer (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">
          {selectedIncident ? (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] text-slate-500">{selectedIncident.id}</span>
                  <h3 className="text-sm font-bold text-white">{selectedIncident.title}</h3>
                </div>
                {getStatusBadge(selectedIncident.status)}
              </div>

              {/* Status Updater */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Update Case Status:</span>
                <select
                  value={selectedIncident.status}
                  onChange={(e) => updateIncidentStatus(selectedIncident.id, e.target.value as IncidentStatus)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 focus:outline-none"
                >
                  <option value="New">New / Open</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Contained">Contained</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-500">Source:</span>
                  <p className="text-cyan-300 font-bold">{selectedIncident.sourceIp || selectedIncident.affectedIps?.[0] || '185.220.101.5'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Target:</span>
                  <p className="text-slate-200">{selectedIncident.destIp || selectedIncident.affectedIps?.[1] || '10.0.0.4'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Assigned Analyst:</span>
                  <p className="text-slate-300">{selectedIncident.assignedTo || selectedIncident.assignedAnalyst}</p>
                </div>
                <div>
                  <span className="text-slate-500">Incident Severity:</span>
                  <p className="text-slate-300">{selectedIncident.severity}</p>
                </div>
              </div>

              {/* Evidence Artifacts */}
              <div>
                <h4 className="text-slate-400 font-bold uppercase mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Forensic Evidence Items ({(selectedIncident.evidence || ['eBPF Packet flow dump', 'CICFlowMeter feature vector', 'IoC signature match']).length})</span>
                </h4>
                <div className="space-y-1">
                  {(selectedIncident.evidence || [
                    'eBPF Socket Ring Buffer: 1,420 bytes payload capture',
                    'CICFlowMeter 78-feature statistical vector logged',
                    'Threat Intel IoC match with high reputation score'
                  ]).map((ev: string, i: number) => (
                    <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                      &bull; {ev}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline / Activity Logs */}
              <div>
                <h4 className="text-slate-400 font-bold uppercase mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Case Activity Audit Timeline</span>
                </h4>
                <div className="space-y-2 border-l-2 border-slate-800 pl-3 ml-1">
                  {selectedIncident.timeline.map((item, i) => (
                    <div key={i} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-cyan-400 font-bold">{item.actor || item.author}</span>
                        <span className="text-slate-500">{item.timestamp}</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{item.action}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Containment action trigger */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    const targetIp = selectedIncident.sourceIp || selectedIncident.affectedIps?.[0] || '185.220.101.5';
                    blockIp(targetIp, `Contained under Incident ${selectedIncident.id}`);
                    updateIncidentStatus(selectedIncident.id, 'Contained');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Null-Route Source IP & Quarantine Subnet</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 font-mono text-xs">
              <FileText className="w-10 h-10 mb-2 opacity-40 text-cyan-400" />
              <span>Select an incident from the queue to review forensic evidence and manage containment</span>
            </div>
          )}
        </div>
      </div>

      {/* Create Incident Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[#0c121e] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                CREATE NEW SECURITY INCIDENT CASE
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Incident Title / Summary:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Volumetric NTP amplification flood targeting API gateway"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Detailed Description:</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe observed network anomalies, affected assets, and scope..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Threat Type:</label>
                  <select
                    value={newThreatType}
                    onChange={(e) => setNewThreatType(e.target.value as AttackCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="DDoS">DDoS</option>
                    <option value="DoS">DoS</option>
                    <option value="Brute Force">Brute Force</option>
                    <option value="Botnet">Botnet</option>
                    <option value="Web Attack">Web Attack</option>
                    <option value="Infiltration">Infiltration</option>
                    <option value="Port Scan">Port Scan</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Severity Tier:</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as SeverityLevel)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Source IP Address:</label>
                  <input
                    type="text"
                    value={newSourceIp}
                    onChange={(e) => setNewSourceIp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Destination IP:</label>
                  <input
                    type="text"
                    value={newDestIp}
                    onChange={(e) => setNewDestIp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Assigned Analyst / Squad:</label>
                <input
                  type="text"
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold"
                >
                  Create Incident Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
