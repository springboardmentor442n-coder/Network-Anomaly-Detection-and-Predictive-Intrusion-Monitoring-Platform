import React from 'react';
import { SeverityLevel, AttackCategory } from '../../types';

export const SeverityBadge: React.FC<{ severity: SeverityLevel; className?: string }> = ({ severity, className = '' }) => {
  const styles: Record<SeverityLevel, string> = {
    Low: 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60',
    Medium: 'bg-amber-950/70 text-amber-400 border-amber-800/60',
    High: 'bg-orange-950/70 text-orange-400 border-orange-800/60',
    Critical: 'bg-rose-950/80 text-rose-400 border-rose-800/70 shadow-sm shadow-rose-950/50'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${styles[severity]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        severity === 'Critical' ? 'bg-rose-400 animate-pulse' :
        severity === 'High' ? 'bg-orange-400' :
        severity === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'
      }`} />
      {severity}
    </span>
  );
};

export const AttackBadge: React.FC<{ attack: AttackCategory }> = ({ attack }) => {
  if (attack === 'BENIGN') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-950/50 text-emerald-300 border border-emerald-800/50">
        BENIGN
      </span>
    );
  }

  const isCritical = ['DDoS', 'Botnet', 'Infiltration'].includes(attack);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${
      isCritical 
        ? 'bg-rose-950/60 text-rose-300 border-rose-800/50' 
        : 'bg-amber-950/50 text-amber-300 border-amber-800/50'
    }`}>
      {attack}
    </span>
  );
};

export const RiskGaugeBadge: React.FC<{ score: number; showBar?: boolean }> = ({ score, showBar = true }) => {
  let level: SeverityLevel = 'Low';
  let color = 'text-emerald-400';
  let barColor = 'bg-emerald-500';
  let bgColor = 'bg-emerald-950/40 border-emerald-800/40';

  if (score >= 76) {
    level = 'Critical';
    color = 'text-rose-400';
    barColor = 'bg-rose-500';
    bgColor = 'bg-rose-950/50 border-rose-800/50';
  } else if (score >= 51) {
    level = 'High';
    color = 'text-orange-400';
    barColor = 'bg-orange-500';
    bgColor = 'bg-orange-950/50 border-orange-800/50';
  } else if (score >= 26) {
    level = 'Medium';
    color = 'text-amber-400';
    barColor = 'bg-amber-500';
    bgColor = 'bg-amber-950/50 border-amber-800/50';
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className={`font-mono font-bold text-sm ${color}`}>{score}/100</span>
        <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${bgColor} ${color}`}>
          {level}
        </span>
      </div>
      {showBar && (
        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
        </div>
      )}
    </div>
  );
};

export const SOCMetricCard: React.FC<{
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
  statusColor?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
  id?: string;
}> = ({ title, value, subValue, icon, trend, trendPositive, statusColor = 'cyan', id }) => {
  const colorMap = {
    cyan: 'border-cyan-500/20 text-cyan-400 bg-cyan-950/20 group-hover:border-cyan-500/40',
    emerald: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/20 group-hover:border-emerald-500/40',
    amber: 'border-amber-500/20 text-amber-400 bg-amber-950/20 group-hover:border-amber-500/40',
    rose: 'border-rose-500/20 text-rose-400 bg-rose-950/20 group-hover:border-rose-500/40',
    slate: 'border-slate-700/50 text-slate-300 bg-slate-900/40 group-hover:border-slate-600'
  };

  return (
    <div 
      id={id}
      className="group relative bg-[#0f172a]/90 backdrop-blur border border-slate-800/80 rounded-xl p-4 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-black/40"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">{title}</p>
          <p className="text-2xl font-bold font-mono text-white mt-1.5">{value}</p>
          {subValue && <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>}
        </div>
        <div className={`p-2.5 rounded-lg border ${colorMap[statusColor]} transition-colors`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className={trendPositive ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
            {trend}
          </span>
          <span className="text-slate-500 text-[11px]">vs previous cycle</span>
        </div>
      )}
    </div>
  );
};
