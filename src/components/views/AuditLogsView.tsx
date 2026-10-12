import React, { useState } from 'react';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Download, 
  ShieldCheck, 
  Clock, 
  User 
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const AuditLogsView: React.FC = () => {
  const { auditLogs, addToast } = useSecurity();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter(log => {
    const matchesCat = selectedCategory === 'ALL' || log.category === selectedCategory;
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const exportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      ["Timestamp,User,Category,Action", ...filteredLogs.map(l => `"${l.timestamp}","${l.user}","${l.category}","${l.action}"`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `netshield_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    addToast('Audit Log Exported', `Exported ${filteredLogs.length} audit trail records as CSV.`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              SOC AUDIT TRAIL & REGULATORY COMPLIANCE LOGS
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Immutable tamper-evident logging of administrative actions, incident status modifications, and ML inference queries
          </p>
        </div>

        <button
          onClick={exportLogs}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV Audit Trail</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, analyst..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="Analyst">Analyst Activity</option>
            <option value="System">System & Services</option>
            <option value="Model">ML Model Inferences</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl overflow-hidden font-mono text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor / User</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Action Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-2.5 px-3 text-cyan-300 font-semibold">{log.user}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      log.category === 'Analyst' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                      log.category === 'Model' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
