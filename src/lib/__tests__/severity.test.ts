import { describe, expect, it } from 'vitest';
import { CHART_PALETTE, chartColor, severityMeta, statusMeta } from '@/lib/severity';

describe('severityMeta', () => {
  it('maps every known severity to a label', () => {
    expect(severityMeta('critical').label).toBe('Critical');
    expect(severityMeta('high').label).toBe('High');
    expect(severityMeta('medium').label).toBe('Medium');
    expect(severityMeta('low').label).toBe('Low');
  });

  it('is case insensitive', () => {
    expect(severityMeta('CRITICAL').label).toBe('Critical');
  });

  it('falls back to a neutral style for unknown severity values', () => {
    // A backend that adds a new severity must not crash the UI.
    const meta = severityMeta('catastrophic');
    expect(meta.label).toBe('catastrophic');
    expect(meta.textClass).toBe('text-soc-muted');
  });

  it('handles missing severity', () => {
    expect(severityMeta(null).label).toBe('Unknown');
    expect(severityMeta(undefined).label).toBe('Unknown');
  });
});

describe('statusMeta', () => {
  it('maps the three alert statuses', () => {
    expect(statusMeta('open').label).toBe('Open');
    expect(statusMeta('acknowledged').label).toBe('Acknowledged');
    expect(statusMeta('resolved').label).toBe('Resolved');
  });

  it('falls back safely for unknown statuses', () => {
    expect(statusMeta('escalated').label).toBe('escalated');
    expect(statusMeta(null).label).toBe('Unknown');
  });
});

describe('chartColor', () => {
  it('cycles through the palette', () => {
    expect(chartColor(0)).toBe(CHART_PALETTE[0]);
    expect(chartColor(CHART_PALETTE.length)).toBe(CHART_PALETTE[0]);
    expect(chartColor(CHART_PALETTE.length + 3)).toBe(CHART_PALETTE[3]);
  });
});
