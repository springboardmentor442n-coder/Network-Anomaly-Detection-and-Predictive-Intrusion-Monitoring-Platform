import type { AlertStatus, Severity } from './types';

/** Consistent chart palette used by every chart component. */
export const CHART_PALETTE = [
  '#22D3EE',
  '#8B5CF6',
  '#38BDF8',
  '#F97316',
  '#22C55E',
  '#FACC15',
  '#F43F5E',
  '#14B8A6',
  '#A855F7',
  '#84CC16',
  '#EC4899',
  '#0EA5E9',
];

export function chartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; textClass: string; badgeClass: string; dotClass: string }
> = {
  critical: {
    label: 'Critical',
    color: '#F43F5E',
    textClass: 'text-soc-critical',
    badgeClass: 'border-soc-critical/40 bg-soc-critical/15 text-soc-critical',
    dotClass: 'bg-soc-critical',
  },
  high: {
    label: 'High',
    color: '#F97316',
    textClass: 'text-soc-high',
    badgeClass: 'border-soc-high/40 bg-soc-high/15 text-soc-high',
    dotClass: 'bg-soc-high',
  },
  medium: {
    label: 'Medium',
    color: '#FACC15',
    textClass: 'text-soc-medium',
    badgeClass: 'border-soc-medium/40 bg-soc-medium/15 text-soc-medium',
    dotClass: 'bg-soc-medium',
  },
  low: {
    label: 'Low',
    color: '#22C55E',
    textClass: 'text-soc-low',
    badgeClass: 'border-soc-low/40 bg-soc-low/15 text-soc-low',
    dotClass: 'bg-soc-low',
  },
};

export function severityMeta(severity: string | null | undefined) {
  const key = (severity ?? '').toLowerCase() as Severity;
  return SEVERITY_META[key] ?? {
    label: severity ? severity : 'Unknown',
    color: '#8194AE',
    textClass: 'text-soc-muted',
    badgeClass: 'border-soc-border bg-soc-panel2 text-soc-muted',
    dotClass: 'bg-soc-muted',
  };
}

export const STATUS_META: Record<AlertStatus, { label: string; badgeClass: string; color: string }> = {
  open: {
    label: 'Open',
    badgeClass: 'border-soc-critical/40 bg-soc-critical/10 text-soc-critical',
    color: '#F43F5E',
  },
  acknowledged: {
    label: 'Acknowledged',
    badgeClass: 'border-soc-medium/40 bg-soc-medium/10 text-soc-medium',
    color: '#FACC15',
  },
  resolved: {
    label: 'Resolved',
    badgeClass: 'border-soc-low/40 bg-soc-low/10 text-soc-low',
    color: '#22C55E',
  },
};

export function statusMeta(status: string | null | undefined) {
  const key = (status ?? '').toLowerCase() as AlertStatus;
  return (
    STATUS_META[key] ?? {
      label: status ?? 'Unknown',
      badgeClass: 'border-soc-border bg-soc-panel2 text-soc-muted',
      color: '#8194AE',
    }
  );
}
