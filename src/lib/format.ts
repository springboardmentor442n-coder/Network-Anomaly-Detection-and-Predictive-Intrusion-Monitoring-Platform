export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

const numberFormatter = new Intl.NumberFormat('en-US');

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return numberFormatter.format(value);
}

export function formatDecimal(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

export function formatPercent(
  value: number | null | undefined,
  options: { digits?: number; alreadyPercent?: boolean } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const digits = options.digits ?? 2;
  const asPercent = options.alreadyPercent ? value : value * 100;
  return `${asPercent.toFixed(digits)}%`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const deltaSeconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (Math.abs(deltaSeconds) < 60) return 'just now';
  const minutes = Math.round(deltaSeconds / 60);
  if (Math.abs(minutes) < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** Truncate long category / column names for chart axes. */
export function truncate(text: string, max = 16): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function sortEntries(
  entries: { name: string; value: number }[],
  limit?: number,
): { name: string; value: number }[] {
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  return limit ? sorted.slice(0, limit) : sorted;
}
