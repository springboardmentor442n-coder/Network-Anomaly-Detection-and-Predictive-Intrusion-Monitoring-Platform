import React, { useState } from 'react';
import { 
  Globe, 
  Search, 
  ShieldAlert, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Layers,
  Lock
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const ThreatIntelligenceView: React.FC = () => {
  const { blockIp, blockedIps, addToast } = useSecurity();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFeed, setActiveFeed] = useState<'All' | 'Tor' | 'C2' | 'Phishing' | 'Malware'>('All');

  const intelFeeds = [
    {
      id: 'IOC-991',
      indicator: '185.220.101.5',
      type: 'Tor Exit Node / Bulletproof Hosting',
      actor: 'APT29 / Cozy Bear',
      confidence: 'High (98%)',
      category: 'Tor',
      status: 'Active Threat',
      lastSeen: '10 mins ago',
      tags: ['Tor', 'Scanner', 'DDoS Source']
    },
    {
      id: 'IOC-992',
      indicator: '91.240.118.172',
      type: 'Mirai Botnet C2 Controller',
      actor: 'Mozi Botnet Operator',
      confidence: 'Verified (99%)',
      category: 'C2',
      status: 'Active Threat',
      lastSeen: '25 mins ago',
      tags: ['C2', 'IRC', 'Botnet']
    },
    {
      id: 'IOC-993',
      indicator: 'auth-update-microsoft.sec-portal.net',
      type: 'Credential Harvester Domain',
      actor: 'Storm-0558',
      confidence: 'High (94%)',
      category: 'Phishing',
      status: 'Active Threat',
      lastSeen: '1 hour ago',
      tags: ['DNS', 'Phishing', 'OIDC']
    },
    {
      id: 'IOC-994',
      indicator: '103.251.167.20',
      type: 'Brute Force / Shodan Probe Host',
      actor: 'ShadowServer Scanner Network',
      confidence: 'Medium (86%)',
      category: 'Malware',
      status: 'Monitored',
      lastSeen: '2 hours ago',
      tags: ['RDP', 'SSH', 'Recon']
    },
    {
      id: 'IOC-995',
      indicator: '45.33.32.156',
      type: 'Log4Shell & SQLi Exploit Injector',
      actor: 'Lazarus Group Sub-cluster',
      confidence: 'Verified (99%)',
      category: 'Malware',
      status: 'Active Threat',
      lastSeen: '4 hours ago',
      tags: ['Exploit', 'Web Attack', 'CVE-2021-44228']
    }
  ];

  const filtered = intelFeeds.filter(feed => {
    const matchesCategory = activeFeed === 'All' || feed.category === activeFeed;
    const matchesSearch = 
      feed.indicator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feed.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feed.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              GLOBAL THREAT INTELLIGENCE & ADVERSARY ATTRIBUTION
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Aggregated IoC feeds: AlienVault OTX, MISP, AbuseIPDB, Tor exit listings, and APT nation-state campaign signatures
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Feeds Synced: 2.4M Indicators
          </span>
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
            placeholder="Search IP, Domain, Threat Actor..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          {(['All', 'Tor', 'C2', 'Phishing', 'Malware'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFeed(f)}
              className={`px-2.5 py-1 rounded transition-all ${
                activeFeed === f ? 'bg-cyan-950 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Intelligence Cards */}
      <div className="space-y-3 font-mono text-xs">
        {filtered.map(ioc => {
          const isBlocked = blockedIps.includes(ioc.indicator);
          return (
            <div
              key={ioc.id}
              className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-bold">{ioc.id}</span>
                  <span className="text-sm font-bold text-white">{ioc.indicator}</span>
                  {isBlocked && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-400 border border-rose-800">
                      NULL-ROUTED
                    </span>
                  )}
                </div>
                <p className="text-cyan-300 font-medium">{ioc.type}</p>
                <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px] pt-1">
                  <span>Attribution: <strong className="text-amber-400">{ioc.actor}</strong></span>
                  <span>Confidence: <strong className="text-slate-200">{ioc.confidence}</strong></span>
                  <span>Last Detected: {ioc.lastSeen}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isBlocked ? (
                  <button
                    onClick={() => blockIp(ioc.indicator, `Blocked via Threat Intel IOC (${ioc.type})`)}
                    className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Block IoC</span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 text-xs border border-slate-800">
                    Rule Active
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
