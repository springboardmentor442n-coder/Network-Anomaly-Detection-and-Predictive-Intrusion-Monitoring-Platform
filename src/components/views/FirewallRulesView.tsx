import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Search, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Zap,
  Filter
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const FirewallRulesView: React.FC = () => {
  const { blockedIps, unblockIp, blockIp, addToast } = useSecurity();
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newAction, setNewAction] = useState<'DROP' | 'REJECT' | 'ALLOW'>('DROP');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp) return;
    blockIp(newIp, newReason || 'Manual SOC administrator perimeter rule');
    setNewIp('');
    setNewReason('');
  };

  const filteredIps = blockedIps.filter(ip => ip.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              AUTOMATED FIREWALL & PERIMETER ACL CONTROLS
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Dynamic iptables / nftables and edge cloud firewall rule enforcement table with instant null-route drops
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 text-xs font-mono font-bold">
          Active Drop Rules: {blockedIps.length}
        </div>
      </div>

      {/* Add New Rule Bar */}
      <form onSubmit={handleAddRule} className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl flex flex-col md:flex-row gap-3 items-center">
        <input
          type="text"
          required
          value={newIp}
          onChange={(e) => setNewIp(e.target.value)}
          placeholder="Enter IP or CIDR (e.g. 192.0.2.1 or 10.0.0.0/24)..."
          className="w-full md:w-64 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
        />

        <input
          type="text"
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
          placeholder="Rule Justification / Reason..."
          className="w-full md:flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
        />

        <select
          value={newAction}
          onChange={(e) => setNewAction(e.target.value as any)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-rose-400 focus:outline-none"
        >
          <option value="DROP">DROP (Silent Discard)</option>
          <option value="REJECT">REJECT (TCP RST)</option>
          <option value="ALLOW">ALLOW (Bypass)</option>
        </select>

        <button
          type="submit"
          className="w-full md:w-auto px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Deploy Rule</span>
        </button>
      </form>

      {/* Rules Table */}
      <div className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl overflow-hidden font-mono text-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <h3 className="font-bold text-white uppercase">ACTIVE DROP / PERIMETER BLOCK RULES</h3>
          <span className="text-slate-400 text-[11px]">Synced with Kernel netfilter subsystem</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                <th className="py-2.5 px-3">Rule Target (IP / CIDR)</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Protocol / Port</th>
                <th className="py-2.5 px-3">Enforcement Target</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Delete Rule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredIps.map((ip, idx) => (
                <tr key={ip} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 text-rose-400 font-bold">{ip}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      DROP
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">ALL / INGRESS</td>
                  <td className="py-2.5 px-3 text-slate-400">Border Gateway eBPF Hook</td>
                  <td className="py-2.5 px-3 text-emerald-400">Enforced</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => unblockIp(ip)}
                      className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Remove Drop Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
