import React, { useState } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  Trash2, 
  Pause, 
  Play, 
  Eye, 
  Download, 
  Radio, 
  Maximize2, 
  X, 
  Zap,
  ArrowUpDown,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useSecurity } from '../../context/SecurityContext';
import { NetworkPacket, Protocol } from '../../types';
import { AttackBadge, SeverityBadge, RiskGaugeBadge } from '../common/UIComponents';

export const NetworkMonitoringView: React.FC = () => {
  const { 
    packets, 
    clearPackets, 
    isLiveStreamActive, 
    toggleLiveStream, 
    blockIp, 
    blockedIps,
    addToast 
  } = useSecurity();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [inspectPacket, setInspectPacket] = useState<NetworkPacket | null>(null);

  // Filter packets
  const filteredPackets = packets.filter(pkt => {
    const matchesSearch = 
      pkt.sourceIp.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkt.destIp.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkt.attackType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(pkt.sourcePort).includes(searchQuery) ||
      String(pkt.destPort).includes(searchQuery);

    const matchesProto = selectedProtocol === 'ALL' || pkt.protocol === selectedProtocol;
    const matchesStatus = selectedStatus === 'ALL' || pkt.status === selectedStatus;

    return matchesSearch && matchesProto && matchesStatus;
  });

  // Calculate protocol shares
  const protocolCounts = packets.reduce((acc, p) => {
    acc[p.protocol] = (acc[p.protocol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const protocolChartData = Object.entries(protocolCounts).map(([name, count]) => ({
    name,
    value: count
  }));

  const COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const exportPacketCapture = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredPackets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `netshield_packet_stream_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Capture Exported', `Exported ${filteredPackets.length} captured flow frames as JSON.`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Title and Sensor Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              REAL-TIME NETWORK MONITORING & PACKET INGRESS
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Continuous packet capture interface, bidirectional flow telemetry, protocol analysis, and active socket inspection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLiveStream}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-semibold transition-colors border ${
              isLiveStreamActive
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-800 hover:bg-cyan-900/60'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isLiveStreamActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Sensor Feed</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Feed</span>
              </>
            )}
          </button>

          <button
            onClick={exportPacketCapture}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PCAP/JSON</span>
          </button>

          <button
            onClick={clearPackets}
            className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
            title="Clear Buffer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visualizations: Throughput & Protocol Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Protocol Share Chart */}
        <div className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800">
          <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-2">
            PROTOCOL DISTRIBUTION
          </h3>
          <div className="h-44 w-full flex items-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={protocolChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {protocolChartData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-1 text-xs font-mono">
              {protocolChartData.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-slate-300">{p.name}</span>
                  </div>
                  <span className="text-slate-400 font-bold">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Traffic Volume Summary */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              FLOW BANDWIDTH & PACKET SURGE TELEMETRY
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">
              Sensor Buffer: {packets.length} captured frames
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 my-2">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <p className="text-[10px] text-slate-400 font-mono">FLOW PACKET RATE</p>
              <p className="text-xl font-bold font-mono text-white mt-1">2,420 pkts/s</p>
              <p className="text-[10px] text-emerald-400 font-mono mt-0.5">&plusmn; 4.2% jitter</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <p className="text-[10px] text-slate-400 font-mono">SENSOR LATENCY</p>
              <p className="text-xl font-bold font-mono text-white mt-1">0.42 ms</p>
              <p className="text-[10px] text-cyan-400 font-mono mt-0.5">eBPF Kernel Hook</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <p className="text-[10px] text-slate-400 font-mono">FIREWALL BLOCKED IPs</p>
              <p className="text-xl font-bold font-mono text-rose-400 mt-1">{blockedIps.length}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Active drop rules</p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>Normal Packets: <strong className="text-emerald-400">{packets.filter(p => p.status === 'BENIGN').length}</strong></span>
            <span>Anomalies / Attacks: <strong className="text-rose-400">{packets.filter(p => p.status === 'ATTACK').length}</strong></span>
            <span>Inspection Engine: <strong className="text-cyan-300">FastAPI + Scikit-Learn Streamer</strong></span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search IP, Port, Attack, Protocol..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Protocol:</span>
            <select
              value={selectedProtocol}
              onChange={(e) => setSelectedProtocol(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">ALL PROTOCOLS</option>
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
              <option value="HTTP">HTTP</option>
              <option value="TLS">TLS</option>
              <option value="DNS">DNS</option>
              <option value="ICMP">ICMP</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="BENIGN">BENIGN ONLY</option>
              <option value="ATTACK">ATTACK / ANOMALOUS</option>
            </select>
          </div>
        </div>
      </div>

      {/* High-density Packet Flow Table */}
      <div className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Source IP : Port</th>
                <th className="py-2.5 px-3">Destination IP : Port</th>
                <th className="py-2.5 px-3">Protocol</th>
                <th className="py-2.5 px-3">Packets / Volume</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Attack Class</th>
                <th className="py-2.5 px-3">Risk</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPackets.map(pkt => {
                const isBlocked = blockedIps.includes(pkt.sourceIp);
                return (
                  <tr 
                    key={pkt.id} 
                    className={`hover:bg-slate-800/50 transition-colors ${
                      pkt.status === 'ATTACK' ? 'bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{pkt.timestamp}</td>
                    <td className="py-2.5 px-3 text-cyan-300 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span>{pkt.sourceIp}:{pkt.sourcePort}</span>
                        {isBlocked && (
                          <span className="px-1 py-0.2 rounded text-[9px] bg-rose-950 text-rose-400 border border-rose-800">
                            BLOCKED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {pkt.destIp}:{pkt.destPort}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-200 border border-slate-700">
                        {pkt.protocol}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {pkt.packetCount} pkts ({(pkt.byteSize / 1024).toFixed(1)} KB)
                    </td>
                    <td className="py-2.5 px-3">
                      {pkt.status === 'BENIGN' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          BENIGN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                          ANOMALOUS
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <AttackBadge attack={pkt.attackType} />
                    </td>
                    <td className="py-2.5 px-3">
                      <RiskGaugeBadge score={pkt.riskScore} showBar={false} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setInspectPacket(pkt)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                        title="Deep Packet Inspection"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Packet Deep Inspection Modal */}
      {inspectPacket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#0c121e] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-mono">
                  DEEP FLOW & PACKET TELEMETRY INSPECTOR
                </h3>
              </div>
              <button 
                onClick={() => setInspectPacket(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-500">Flow ID:</span>
                  <p className="text-slate-200 font-bold">{inspectPacket.id}</p>
                </div>
                <div>
                  <span className="text-slate-500">Capture Timestamp:</span>
                  <p className="text-slate-200">{inspectPacket.timestamp}</p>
                </div>
                <div>
                  <span className="text-slate-500">Source Socket:</span>
                  <p className="text-cyan-300 font-bold">{inspectPacket.sourceIp}:{inspectPacket.sourcePort}</p>
                </div>
                <div>
                  <span className="text-slate-500">Destination Socket:</span>
                  <p className="text-slate-200 font-bold">{inspectPacket.destIp}:{inspectPacket.destPort}</p>
                </div>
                <div>
                  <span className="text-slate-500">Protocol & Flags:</span>
                  <p className="text-slate-200">{inspectPacket.protocol} [{inspectPacket.flags.join(', ')}]</p>
                </div>
                <div>
                  <span className="text-slate-500">Flow Duration:</span>
                  <p className="text-slate-200">{inspectPacket.flowDurationMs} ms</p>
                </div>
              </div>

              {/* AI Classification result */}
              <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase tracking-wider font-bold">ML Prediction Result:</span>
                  <AttackBadge attack={inspectPacket.attackType} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Inference Confidence:</span>
                  <span className="text-white font-bold">{Math.round(inspectPacket.confidence * 100)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Risk Assessment:</span>
                  <RiskGaugeBadge score={inspectPacket.riskScore} />
                </div>
              </div>

              {/* Payload Preview */}
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider">Payload Content Hex / ASCII:</span>
                <pre className="mt-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {inspectPacket.payloadPreview || '0000  45 00 00 3c 1a 4b 40 00 40 06 b2 e4 c0 a8 01 68\n0010  0a 00 00 0f d3 70 01 bb 9e 2e 4b 01 00 00 00 00\n0020  a0 02 72 10 a3 f0 00 00 02 04 05 b4 04 02 08 0a'}
                </pre>
              </div>

              {/* Firewall actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    blockIp(inspectPacket.sourceIp, `Intrusion flow: ${inspectPacket.attackType}`);
                    setInspectPacket(null);
                  }}
                  className="px-3 py-2 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Null-Route Source IP ({inspectPacket.sourceIp})</span>
                </button>
                <button
                  onClick={() => setInspectPacket(null)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
