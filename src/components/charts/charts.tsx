'use client';

/**
 * Dependency-free SVG charts tuned for the SOC dark theme.
 * Keeping them local avoids pulling a heavy charting library into the bundle
 * and lets every chart share the same colour tokens as the rest of the UI.
 */

import { useId, useMemo } from 'react';
import { CHART_PALETTE, chartColor } from '@/lib/severity';
import { cn, formatNumber } from '@/lib/format';
import type { DistributionEntry } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/* Horizontal bar chart                                                        */
/* -------------------------------------------------------------------------- */
export function BarChart({
  data,
  max,
  valueFormat = formatNumber,
  emptyLabel = 'No data',
  height,
}: {
  data: DistributionEntry[];
  max?: number;
  valueFormat?: (value: number) => string;
  emptyLabel?: string;
  height?: number;
}) {
  const rows = useMemo(() => {
    const sorted = [...(data ?? [])].sort((a, b) => b.value - a.value);
    return sorted.length > 16 ? sorted.slice(0, 16) : sorted;
  }, [data]);

  if (rows.length === 0) {
    return <p className="py-6 text-center text-xs text-soc-muted">{emptyLabel}</p>;
  }

  const peak = max ?? Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="space-y-2" style={height ? { maxHeight: height, overflowY: 'auto' } : undefined}>
      {rows.map((row, index) => {
        const pct = peak > 0 ? (row.value / peak) * 100 : 0;
        return (
          <div key={`${row.name}-${index}`} className="group">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-soc-text" title={row.name}>
                {row.name || '(empty)'}
              </span>
              <span className="tabular-nums text-soc-muted">{valueFormat(row.value)}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-soc-panel3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: chartColor(index) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Donut chart                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Arc lengths plus prefix-summed start offsets for every donut segment.
 * Computed in a plain function (outside a component render) so no value is
 * reassigned while React is rendering.
 */
function donutSegments(entries: DistributionEntry[], total: number, circumference: number) {
  return entries.reduce<{ entry: DistributionEntry; dash: number; start: number }[]>((acc, entry, index) => {
    const previous = acc[index - 1];
    const start = previous ? previous.start + previous.dash : 0;
    const dash = total > 0 ? (entry.value / total) * circumference : 0;
    acc.push({ entry, dash, start });
    return acc;
  }, []);
}

export function DonutChart({
  data,
  size = 168,
  thickness = 22,
  centerLabel,
  centerValue,
  valueFormat = formatNumber,
}: {
  data: DistributionEntry[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  valueFormat?: (value: number) => string;
}) {
  const gid = useId().replace(/:/g, '');
  const entries = useMemo(() => (data ?? []).filter((item) => item.value > 0), [data]);
  const total = entries.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => donutSegments(entries, total, circumference), [entries, total, circumference]);

  if (entries.length === 0 || total === 0) {
    return (
      <div
        className="mx-auto flex items-center justify-center rounded-full border border-dashed border-soc-border text-xs text-soc-muted"
        style={{ width: size, height: size }}
      >
        No data
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="distribution">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map(({ entry, dash, start }, index) => (
            <circle
              key={`${entry.name}-${index}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={chartColor(index)}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-start}
              strokeLinecap="butt"
            />
          ))}
        </g>
        <circle cx={size / 2} cy={size / 2} r={radius - thickness / 2 - 1} fill={`url(#${gid})`} opacity="0" />
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          className="fill-soc-text"
          style={{ fontSize: 20, fontWeight: 600 }}
        >
          {centerValue ?? formatNumber(total)}
        </text>
        {centerLabel && (
          <text x="50%" y="60%" textAnchor="middle" className="fill-soc-muted" style={{ fontSize: 10 }}>
            {centerLabel}
          </text>
        )}
      </svg>
      <ul className="space-y-1.5 text-xs">
        {entries.map((entry, index) => (
          <li key={`${entry.name}-legend-${index}`} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: chartColor(index) }}
              aria-hidden="true"
            />
            <span className="text-soc-text">{entry.name || '(empty)'}</span>
            <span className="tabular-nums text-soc-muted">
              {valueFormat(entry.value)} · {((entry.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Correlation heatmap                                                         */
/* -------------------------------------------------------------------------- */
export function Heatmap({
  columns,
  matrix,
}: {
  columns: string[];
  matrix: (number | null)[][];
}) {
  if (!columns || columns.length === 0) {
    return <p className="py-6 text-center text-xs text-soc-muted">Not enough numeric features for a correlation matrix.</p>;
  }

  const cell = Math.max(28, Math.min(48, Math.floor(520 / columns.length)));

  return (
    <div className="overflow-auto">
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: `minmax(96px, max-content) repeat(${columns.length}, ${cell}px)` }}
      >
        <div />
        {columns.map((column) => (
          <div
            key={`h-${column}`}
            className="truncate pb-1 text-center text-[10px] text-soc-muted"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 96 }}
            title={column}
          >
            {column}
          </div>
        ))}
        {matrix.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="contents">
            <div className="truncate pr-2 text-right text-[10px] text-soc-muted" title={columns[rowIndex]}>
              {columns[rowIndex]}
            </div>
            {row.map((value, colIndex) => (
              <div
                key={`c-${rowIndex}-${colIndex}`}
                className="flex items-center justify-center text-[10px] tabular-nums text-soc-text/90"
                style={{
                  height: cell,
                  backgroundColor: correlationColor(value),
                  color: Math.abs(value ?? 0) > 0.6 ? '#04121F' : undefined,
                }}
                title={`${columns[rowIndex]} × ${columns[colIndex]}: ${value === null ? 'n/a' : value.toFixed(3)}`}
              >
                {value === null ? '—' : value.toFixed(2)}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-soc-muted">
        <span>-1</span>
        <span className="h-2 w-40 rounded-full" style={{ background: 'linear-gradient(90deg,#F43F5E,#0B1424,#22D3EE)' }} />
        <span>+1</span>
        <span className="ml-2">Pearson correlation (numeric columns, capped at 12)</span>
      </div>
    </div>
  );
}

function correlationColor(value: number | null): string {
  if (value === null) return '#0B1424';
  const v = Math.max(-1, Math.min(1, value));
  if (v >= 0) {
    const alpha = 0.12 + v * 0.78;
    return `rgba(34, 211, 238, ${alpha})`;
  }
  const alpha = 0.12 + Math.abs(v) * 0.78;
  return `rgba(244, 63, 94, ${alpha})`;
}

/* -------------------------------------------------------------------------- */
/* Confusion matrix                                                            */
/* -------------------------------------------------------------------------- */
export function ConfusionMatrix({
  labels,
  matrix,
  displayLabels,
}: {
  labels: string[];
  matrix: number[][];
  displayLabels?: string[];
}) {
  const total = matrix.flat().reduce((sum, value) => sum + value, 0);
  const max = Math.max(...matrix.flat(), 1);
  const names = displayLabels && displayLabels.length === labels.length ? displayLabels : labels;

  if (!labels.length || !matrix.length) {
    return <p className="py-6 text-center text-xs text-soc-muted">No evaluation data available.</p>;
  }

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left text-soc-muted">Actual ↓ / Predicted →</th>
            {names.map((name) => (
              <th key={name} className="p-2 text-center font-medium text-soc-muted">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIndex) => (
            <tr key={`cm-${rowIndex}`}>
              <th className="p-2 text-left font-medium text-soc-muted">{names[rowIndex] ?? labels[rowIndex]}</th>
              {row.map((value, colIndex) => {
                const isDiagonal = rowIndex === colIndex;
                const intensity = value / max;
                const background = isDiagonal
                  ? `rgba(34, 211, 238, ${0.1 + intensity * 0.7})`
                  : value > 0
                    ? `rgba(244, 63, 94, ${0.08 + intensity * 0.65})`
                    : 'rgba(15,27,46,0.6)';
                return (
                  <td
                    key={`cm-${rowIndex}-${colIndex}`}
                    className="p-2 text-center tabular-nums text-soc-text"
                    style={{ background }}
                    title={`${names[rowIndex]} → ${names[colIndex]}: ${formatNumber(value)}`}
                  >
                    <div className="font-semibold">{formatNumber(value)}</div>
                    <div className="text-[10px] text-soc-text/70">
                      {total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '—'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-soc-muted">
        Diagonal cells are correct predictions; off-diagonal cells are errors (false positives / false negatives).
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Metric bar (single 0-1 value)                                               */
/* -------------------------------------------------------------------------- */
export function MetricBar({
  label,
  value,
  tone = 'accent',
  hint,
}: {
  label: string;
  value: number | null;
  tone?: 'accent' | 'critical' | 'medium';
  hint?: string;
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
  const colors = {
    accent: 'bg-soc-accent',
    critical: 'bg-soc-critical',
    medium: 'bg-soc-medium',
  };
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-soc-muted">{label}</span>
        <span className="tabular-nums text-soc-text">{value === null ? 'undefined' : `${pct.toFixed(1)}%`}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-soc-panel3">
        <div className={cn('h-full rounded-full', colors[tone])} style={{ width: `${pct}%` }} />
      </div>
      {hint && <p className="mt-1 text-[10px] text-soc-muted">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Legend swatches                                                             */
/* -------------------------------------------------------------------------- */
export function ChartLegend({ items }: { items: { label: string; color?: string; value?: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
      {items.map((item, index) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: item.color ?? CHART_PALETTE[index % CHART_PALETTE.length] }}
          />
          <span className="text-soc-muted">{item.label}</span>
          {item.value && <span className="tabular-nums text-soc-text">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}
