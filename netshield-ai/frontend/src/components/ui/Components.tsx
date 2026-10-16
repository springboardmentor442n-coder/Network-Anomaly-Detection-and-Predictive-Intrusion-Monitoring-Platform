import React from 'react';
import { clsx } from 'clsx';

// ─── Risk Badge ──────────────────────────────────────────────────────────────
interface RiskBadgeProps {
  level: string;
  score?: number;
}

export function RiskBadge({ level, score }: RiskBadgeProps) {
  const cls = {
    Critical: 'badge badge-critical',
    High: 'badge badge-high',
    Medium: 'badge badge-medium',
    Low: 'badge badge-low',
  }[level] || 'badge badge-neutral';

  return (
    <span className={cls}>
      {level}{score !== undefined ? ` (${score})` : ''}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls: Record<string, string> = {
    NEW: 'badge badge-info',
    ACKNOWLEDGED: 'badge badge-medium',
    INVESTIGATING: 'badge badge-high',
    RESOLVED: 'badge badge-low',
    FALSE_POSITIVE: 'badge badge-neutral',
    OPEN: 'badge badge-critical',
    CONTAINED: 'badge badge-medium',
    CLOSED: 'badge badge-neutral',
    ACTIVE: 'badge badge-low',
    READY: 'badge badge-low',
    TRAINING: 'badge badge-info',
    FAILED: 'badge badge-critical',
    ARCHIVED: 'badge badge-neutral',
    RUNNING: 'badge badge-info',
    COMPLETED: 'badge badge-low',
    STOPPED: 'badge badge-neutral',
    PENDING: 'badge badge-neutral',
  };
  return <span className={cls[status] || 'badge badge-neutral'}>{status}</span>;
}

// ─── Status Indicator ────────────────────────────────────────────────────────
interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'error' | 'offline' | 'info';
  label: string;
}

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`status-dot ${status}`} />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  highlight?: 'critical' | 'high' | 'low' | 'blue';
}

export function MetricCard({ label, value, sub, icon, iconBg, highlight }: MetricCardProps) {
  const borderColor = {
    critical: 'var(--severity-critical-border)',
    high: 'var(--severity-high-border)',
    low: 'var(--severity-low-border)',
    blue: 'rgba(59,130,246,0.2)',
  }[highlight || ''] || undefined;

  return (
    <div className="metric-card" style={borderColor ? { borderColor } : {}}>
      {icon && (
        <div className="metric-icon" style={{ background: iconBg || 'var(--bg-elevated)' }}>
          {icon}
        </div>
      )}
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function Card({ title, subtitle, children, action, className }: CardProps) {
  return (
    <div className={clsx('card', className)}>
      {(title || action) && (
        <div className="card-header">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{message}</span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ title, message, icon }: { title: string; message?: string; icon?: React.ReactNode }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <div className="empty-state-title">{title}</div>
      {message && <div className="empty-state-sub">{message}</div>}
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state-title" style={{ color: 'var(--severity-critical)' }}>Error</div>
      <div className="empty-state-sub">{message}</div>
      {retry && (
        <button className="btn btn-secondary btn-sm" onClick={retry} style={{ marginTop: 8 }}>
          Retry
        </button>
      )}
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{ width: `${pct}%`, background: color || 'var(--brand-blue)' }}
      />
    </div>
  );
}

// ─── Demo Banner ──────────────────────────────────────────────────────────────
export function DemoBanner({ message }: { message?: string }) {
  return (
    <div className="demo-banner">
      <span>⚠️</span>
      <span>
        <strong>DEMO MODE</strong> — {message || 'No trained CICIDS2017 model is currently active. Train and activate a model to use real ML predictions.'}
      </span>
    </div>
  );
}

export function ModelActiveBanner({ modelName }: { modelName: string }) {
  return (
    <div className="model-active-banner">
      <span>✅</span>
      <span>
        <strong>CICIDS2017 MODEL ACTIVE</strong> — {modelName}
      </span>
    </div>
  );
}

// ─── Confidence Bar ───────────────────────────────────────────────────────────
export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? 'var(--severity-critical)' : pct >= 75 ? 'var(--severity-high)' : 'var(--brand-blue)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 3, background: 'var(--bg-elevated)', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', minWidth: 36 }}>
        {pct}%
      </span>
    </div>
  );
}
