/**
 * Shared UI primitives for the SOC console.
 *
 * All text rendering goes through React's default escaping - no dangerouslySet
 * HTML anywhere in this app, so backend-supplied strings (IPs, labels, notes)
 * cannot inject markup.
 */

import { Component } from 'react'
import { fieldProblems } from '../lib/api'

export const SEVERITY_STYLE = {
  LOW: 'bg-low/15 text-low border-low/40',
  MEDIUM: 'bg-medium/15 text-medium border-medium/40',
  HIGH: 'bg-high/15 text-high border-high/40',
  CRITICAL: 'bg-critical/15 text-critical border-critical/40',
}

export const STATUS_STYLE = {
  NEW: 'bg-critical/15 text-critical border-critical/40',
  ACKNOWLEDGED: 'bg-medium/15 text-medium border-medium/40',
  INVESTIGATING: 'bg-low/15 text-low border-low/40',
  RESOLVED: 'bg-accent/15 text-accent border-accent/40',
  FALSE_POSITIVE: 'bg-muted/15 text-muted border-muted/40',
  OPEN: 'bg-critical/15 text-critical border-critical/40',
  CLOSED: 'bg-muted/15 text-muted border-muted/40',
}

export function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  )
}

export function SeverityBadge({ severity }) {
  const key = String(severity || '').toUpperCase()
  return <Badge className={SEVERITY_STYLE[key] || SEVERITY_STYLE.LOW}>{key || 'N/A'}</Badge>
}

export function StatusBadge({ status }) {
  const key = String(status || '').toUpperCase()
  return (
    <Badge className={STATUS_STYLE[key] || 'bg-muted/15 text-muted border-muted/40'}>
      {key.replace(/_/g, ' ') || 'N/A'}
    </Badge>
  )
}

export function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`rounded-lg border border-edge bg-panel ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-100">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Stat({ label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'text-slate-100',
    accent: 'text-accent',
    warn: 'text-medium',
    danger: 'text-critical',
  }
  return (
    <div className="rounded-lg border border-edge bg-panel p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...rest
}) {
  const variants = {
    primary: 'bg-accent text-ink hover:bg-accent/85 disabled:bg-accent/40',
    secondary:
      'border border-edge bg-transparent text-slate-200 hover:border-accent/60 hover:text-accent',
    danger: 'border border-critical/50 text-critical hover:bg-critical/10',
    ghost: 'text-muted hover:text-slate-100',
  }
  return (
    <button
      type={type}
      className={`rounded px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] text-critical">{error}</span>}
    </label>
  )
}

export function Input({ className = '', ...rest }) {
  return (
    <input
      className={`mt-1 w-full rounded border border-edge bg-ink px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-muted/60 focus:border-accent ${className}`}
      {...rest}
    />
  )
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select
      className={`mt-1 w-full rounded border border-edge bg-ink px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...rest }) {
  return (
    <textarea
      className={`mt-1 w-full rounded border border-edge bg-ink px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-muted/60 focus:border-accent ${className}`}
      {...rest}
    />
  )
}

/** Renders an ApiError with any field-level problems the backend reported. */
export function ErrorNotice({ error, onDismiss }) {
  if (!error) return null
  const problems = fieldProblems(error)
  return (
    <div className="rounded border border-critical/40 bg-critical/10 px-4 py-3 text-sm text-critical">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{error.message || String(error)}</p>
          {problems.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
          {error.code && <p className="mt-1 text-[11px] opacity-70">code: {error.code}</p>}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-xs underline opacity-80">
            dismiss
          </button>
        )}
      </div>
    </div>
  )
}

export function InfoNotice({ children, tone = 'info' }) {
  const tones = {
    info: 'border-low/40 bg-low/10 text-low',
    warn: 'border-medium/40 bg-medium/10 text-medium',
    ok: 'border-accent/40 bg-accent/10 text-accent',
  }
  return (
    <div className={`rounded border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
  )
}

export function Empty({ children }) {
  return (
    <p className="py-6 text-center text-sm text-muted">{children}</p>
  )
}

export function Spinner({ label = 'Loading' }) {
  return (
    <p className="py-6 text-center text-sm text-muted" role="status">
      {label}...
    </p>
  )
}

export function Table({ columns, rows, renderRow, empty = 'No records.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-edge text-left text-[11px] uppercase tracking-wider text-muted">
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map(renderRow)
          )}
        </tbody>
      </table>
    </div>
  )
}

export function ConfigPill({ configured, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] ${
        configured
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-muted/30 bg-muted/10 text-muted'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${configured ? 'bg-accent' : 'bg-muted'}`}
      />
      {label}: {configured ? 'configured' : 'not configured'}
    </span>
  )
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <ErrorNotice
            error={{
              message: 'This view failed to render.',
              details: { problems: [String(this.state.error?.message || this.state.error)] },
            }}
            onDismiss={() => this.setState({ error: null })}
          />
        </div>
      )
    }
    return this.props.children
  }
}

export const fmt = {
  number: (value) => (value === null || value === undefined ? '-' : Number(value).toLocaleString()),
  percent: (value) =>
    value === null || value === undefined ? '-' : `${(Number(value) * 100).toFixed(2)}%`,
  decimal: (value, digits = 3) =>
    value === null || value === undefined ? '-' : Number(value).toFixed(digits),
  date: (value) => {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
  },
  time: (value) => {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString()
  },
}
