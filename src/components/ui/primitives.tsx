'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/format';

/* -------------------------------------------------------------------------- */
/* Panel                                                                       */
/* -------------------------------------------------------------------------- */
export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('soc-panel flex flex-col', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-soc-border px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold tracking-wide text-soc-text">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-soc-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('flex-1 p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */
type ButtonVariant = 'primary' | 'ghost' | 'danger';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'soc-btn-primary',
  ghost: 'soc-btn-ghost',
  danger: 'soc-btn-danger',
};

export function Button({
  variant = 'ghost',
  className,
  loading = false,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(VARIANT_CLASS[variant], className)}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = 'ghost',
  className,
  children,
  download = true,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
  download?: boolean;
}) {
  return (
    <a href={href} download={download} className={cn(VARIANT_CLASS[variant], className)}>
      {children}
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* Badges / pills                                                              */
/* -------------------------------------------------------------------------- */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        'border-soc-border bg-soc-panel2 text-soc-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SampleBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Badge className="border-soc-medium/40 bg-soc-medium/10 text-soc-medium" >
      Sample data — not UNSW-NB15
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/* Metric card                                                                 */
/* -------------------------------------------------------------------------- */
export function MetricCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: 'cyan' | 'critical' | 'high' | 'medium' | 'low' | 'purple' | 'muted';
  icon?: ReactNode;
}) {
  const accents: Record<string, string> = {
    cyan: 'text-soc-accent',
    critical: 'text-soc-critical',
    high: 'text-soc-high',
    medium: 'text-soc-medium',
    low: 'text-soc-low',
    purple: 'text-soc-purple',
    muted: 'text-soc-muted',
  };
  return (
    <div className="soc-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-soc-muted">{label}</p>
        {icon && <span className={cn('opacity-80', accents[accent ?? 'muted'])}>{icon}</span>}
      </div>
      <p className={cn('mt-2 text-2xl font-semibold tabular-nums', accents[accent ?? 'cyan'])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-soc-muted">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                                    */
/* -------------------------------------------------------------------------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-soc-muted" role="status">
      <Spinner className="text-soc-accent" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-soc-border bg-soc-panel2/40 px-6 py-10 text-center">
      <p className="text-sm font-medium text-soc-text">{title}</p>
      {description && <p className="max-w-xl text-xs leading-relaxed text-soc-muted">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  details,
  action,
}: {
  title?: string;
  message: string;
  details?: string[];
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-soc-critical/40 bg-soc-critical/5 px-4 py-3 text-sm"
    >
      <p className="font-medium text-soc-critical">{title}</p>
      <p className="mt-1 text-soc-text/90">{message}</p>
      {details && details.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-soc-muted">
          {details.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: 'border-soc-info/40 bg-soc-info/5 text-soc-info',
    warning: 'border-soc-medium/40 bg-soc-medium/5 text-soc-medium',
    danger: 'border-soc-critical/40 bg-soc-critical/5 text-soc-critical',
    success: 'border-soc-low/40 bg-soc-low/5 text-soc-low',
  };
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone])}>
      {title && <p className="font-medium">{title}</p>}
      <div className={cn('text-xs leading-relaxed', title ? 'mt-1 text-soc-text/85' : 'text-soc-text/85')}>
        {children}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  tone = 'accent',
}: {
  value: number;
  label?: string;
  tone?: 'accent' | 'critical';
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-soc-panel3"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            tone === 'accent' ? 'bg-soc-accent' : 'bg-soc-critical',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label && (
        <p className="mt-1.5 text-xs text-soc-muted">
          {label} · {clamped}%
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Form controls                                                               */
/* -------------------------------------------------------------------------- */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="soc-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-soc-muted">{hint}</p>}
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
  id,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  id?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <select
      id={id}
      className="soc-input"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/* -------------------------------------------------------------------------- */
/* Tabs                                                                        */
/* -------------------------------------------------------------------------- */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 rounded-lg border border-soc-border bg-soc-panel2/60 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            active === tab.id
              ? 'bg-soc-accent/15 text-soc-accent'
              : 'text-soc-muted hover:bg-soc-panel3 hover:text-soc-text',
          )}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1.5 tabular-nums opacity-70">({tab.count})</span>}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 25, 50, 100],
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizes?: number[];
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-soc-border px-1 pt-3 text-xs text-soc-muted">
      <span className="tabular-nums">
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            Rows
            <select
              className="rounded border border-soc-border bg-soc-bg px-1.5 py-1 text-xs text-soc-text"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="soc-btn-ghost px-2 py-1"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="First page"
          >
            «
          </button>
          <button
            type="button"
            className="soc-btn-ghost px-2 py-1"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span className="px-2 tabular-nums text-soc-text">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="soc-btn-ghost px-2 py-1"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </button>
          <button
            type="button"
            className="soc-btn-ghost px-2 py-1"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */
export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-soc-muted">{item.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-soc-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatusDot({ className }: { className?: string }) {
  return <span className={cn('inline-block h-2 w-2 rounded-full', className)} aria-hidden="true" />;
}
