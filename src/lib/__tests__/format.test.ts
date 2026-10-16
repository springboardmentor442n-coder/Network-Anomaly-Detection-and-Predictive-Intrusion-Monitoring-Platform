import { describe, expect, it } from 'vitest';
import {
  cn,
  formatBytes,
  formatDateTime,
  formatDecimal,
  formatNumber,
  formatPercent,
  formatRelative,
  sortEntries,
  titleCase,
  truncate,
} from '@/lib/format';

describe('formatNumber', () => {
  it('renders an em dash instead of zero for undefined values', () => {
    // Undefined metrics must never be displayed as a measured 0.
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatNumber(Number.NaN)).toBe('—');
  });

  it('renders a real zero as 0', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('groups thousands', () => {
    expect(formatNumber(257673)).toBe('257,673');
  });
});

describe('formatDecimal', () => {
  it('keeps the requested precision', () => {
    expect(formatDecimal(0.123456, 3)).toBe('0.123');
    expect(formatDecimal(1, 2)).toBe('1.00');
  });

  it('returns an em dash for missing values', () => {
    expect(formatDecimal(null)).toBe('—');
    expect(formatDecimal(undefined)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('converts a ratio to a percentage', () => {
    expect(formatPercent(0.7321)).toBe('73.21%');
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('leaves already-percentage values alone when asked', () => {
    expect(formatPercent(73.21, { alreadyPercent: true })).toBe('73.21%');
  });

  it('returns an em dash for missing values', () => {
    expect(formatPercent(null)).toBe('—');
  });
});

describe('formatBytes', () => {
  it('scales units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('date helpers', () => {
  it('returns an em dash when there is no timestamp', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatRelative(undefined)).toBe('—');
  });

  it('passes unparseable timestamps through untouched', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });

  it('describes recent timestamps relatively', () => {
    expect(formatRelative(new Date().toISOString())).toBe('just now');
    expect(formatRelative(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5 min ago');
    expect(formatRelative(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe('3 h ago');
  });
});

describe('text helpers', () => {
  it('truncates with an ellipsis', () => {
    expect(truncate('short', 16)).toBe('short');
    expect(truncate('a-very-long-column-name', 10)).toHaveLength(10);
    expect(truncate('a-very-long-column-name', 10).endsWith('…')).toBe(true);
  });

  it('title-cases snake_case and kebab-case labels', () => {
    expect(titleCase('attack_cat')).toBe('Attack Cat');
    expect(titleCase('generic-unknown')).toBe('Generic Unknown');
  });

  it('sorts distribution entries descending and can limit them', () => {
    const entries = [
      { name: 'a', value: 1 },
      { name: 'b', value: 9 },
      { name: 'c', value: 5 },
    ];
    expect(sortEntries(entries).map((entry) => entry.name)).toEqual(['b', 'c', 'a']);
    expect(sortEntries(entries, 2).map((entry) => entry.name)).toEqual(['b', 'c']);
  });

  it('joins class names and drops falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
});
