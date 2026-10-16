'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn, formatNumber } from '@/lib/format';
import { useAnalysis } from '@/context/AnalysisContext';
import { SampleBadge, StatusDot } from '@/components/ui/primitives';

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Security Dashboard', description: 'Live posture overview', icon: 'shield' },
  { href: '/dataset', label: 'Dataset Analysis', description: 'Upload & profile traffic', icon: 'database' },
  { href: '/training', label: 'Model Training', description: 'Fit RF / DT / LR', icon: 'cpu' },
  { href: '/evaluation', label: 'Model Evaluation', description: 'Metrics on held-out set', icon: 'target' },
  { href: '/detection', label: 'Threat Detection', description: 'Score uploaded traffic', icon: 'radar' },
  { href: '/alerts', label: 'Security Alerts', description: 'Triage & resolve', icon: 'bell' },
  { href: '/reports', label: 'Reports', description: 'CSV + project report', icon: 'file' },
  { href: '/about', label: 'About Project', description: 'Scope & limitations', icon: 'info' },
];

function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    shield: 'M12 3l7 3v6c0 4.5-3 7.9-7 9-4-1.1-7-4.5-7-9V6l7-3z',
    database: 'M12 3c4 0 7 1.1 7 2.5S16 8 12 8 5 6.9 5 5.5 8 3 12 3zM5 5.5v13C5 19.9 8 21 12 21s7-1.1 7-2.5v-13',
    cpu: 'M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M6 6h12v12H6zM10 10h4v4h-4z',
    target: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 100 8 4 4 0 000-8z',
    radar: 'M12 12l6-3M4 12a8 8 0 1116 0 8 8 0 01-16 0zM12 8a4 4 0 100 8',
    bell: 'M18 16H6l1.5-2.5V10a4.5 4.5 0 019 0v3.5L18 16zM10 19a2 2 0 004 0',
    file: 'M7 3h7l4 4v14H7zM14 3v5h4M10 13h6M10 17h6',
    info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 10v6M12 7h.01',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-[18px] w-[18px] shrink-0', className)}
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.info} />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { connection, datasets, activeModel, evaluation, alertStats, selectedDataset } = useAnalysis();

  const realDatasets = datasets.filter((item) => !item.isSample);
  const openAlerts = alertStats?.byStatus?.open ?? 0;

  const statusColor =
    connection === 'online' ? 'bg-soc-low' : connection === 'connecting' ? 'bg-soc-medium' : 'bg-soc-critical';

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const badge =
          item.href === '/alerts' && openAlerts > 0
            ? String(openAlerts)
            : item.href === '/dataset' && datasets.length > 0
              ? String(datasets.length)
              : undefined;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
              active
                ? 'border-soc-accent/40 bg-soc-accent/10 text-soc-accent'
                : 'border-transparent text-soc-muted hover:border-soc-border hover:bg-soc-panel2 hover:text-soc-text',
            )}
          >
            <Icon name={item.icon} className="mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{item.label}</span>
                {badge && (
                  <span className="rounded-full bg-soc-panel3 px-1.5 py-0.5 text-[10px] tabular-nums text-soc-text">
                    {badge}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-soc-muted">{item.description}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-2 border-t border-soc-border px-3 py-3 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-soc-muted">
          <StatusDot className={statusColor} />
          Backend {connection}
        </span>
        <span className="tabular-nums text-soc-muted">{formatNumber(datasets.length)} datasets</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5',
            activeModel
              ? 'border-soc-low/40 bg-soc-low/10 text-soc-low'
              : 'border-soc-border bg-soc-panel2 text-soc-muted',
          )}
        >
          {activeModel ? `Model: ${activeModel.algorithmLabel}` : 'No trained model'}
        </span>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5',
            evaluation ? 'border-soc-low/40 bg-soc-low/10 text-soc-low' : 'border-soc-border bg-soc-panel2 text-soc-muted',
          )}
        >
          {evaluation ? 'Evaluated' : 'Not evaluated'}
        </span>
        {realDatasets.length === 0 && datasets.length > 0 && <SampleBadge show />}
        {selectedDataset?.isSample && <SampleBadge show />}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-soc-border bg-soc-bg/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="text-sm font-semibold text-soc-text">NetShield AI</span>
        </Link>
        <button
          type="button"
          className="soc-btn-ghost px-3 py-1.5"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-soc-border bg-soc-panel">
            <div className="flex items-center justify-between border-b border-soc-border px-4 py-3">
              <Link href="/" className="flex items-center gap-2">
                <BrandMark />
                <span className="text-sm font-semibold text-soc-text">NetShield AI</span>
              </Link>
              <button type="button" className="soc-btn-ghost px-2 py-1" onClick={() => setMobileOpen(false)}>
                ✕
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-soc-border bg-soc-panel lg:flex">
        <Link href="/" className="flex items-center gap-2.5 border-b border-soc-border px-4 py-4">
          <BrandMark />
          <span className="min-w-0">
            <span className="block text-sm font-semibold tracking-wide text-soc-text">NetShield AI</span>
            <span className="block truncate text-[11px] text-soc-muted">Anomaly Detection & Intrusion Monitoring</span>
          </span>
        </Link>
        {nav}
        {footer}
      </aside>
    </>
  );
}

function BrandMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-soc-accent/40 bg-soc-accent/10">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-soc-accent" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l7 3v6c0 4.5-3 7.9-7 9-4-1.1-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
