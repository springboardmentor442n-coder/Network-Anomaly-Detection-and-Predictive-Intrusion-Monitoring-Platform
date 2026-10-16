'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/AppShell';
import { BarChart, DonutChart } from '@/components/charts/charts';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingBlock,
  MetricCard,
  Notice,
  Pagination,
  Panel,
  Select,
  Tabs,
} from '@/components/ui/primitives';
import { useAnalysis } from '@/context/AnalysisContext';
import { api } from '@/lib/api';
import { formatDateTime, formatNumber, formatPercent, formatRelative } from '@/lib/format';
import { SEVERITY_ORDER, severityMeta, statusMeta } from '@/lib/severity';
import type { AlertRecord, AlertStats } from '@/lib/types';

const STATUS_TABS = ['all', 'open', 'acknowledged', 'resolved'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Detected (newest first)' },
  { value: 'severity', label: 'Severity' },
  { value: 'status', label: 'Status' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'predictedClass', label: 'Predicted class' },
  { value: 'category', label: 'Attack category' },
];

export default function SecurityAlertsPage() {
  const { connection, alertStats, reloadAlerts, refresh, notify } = useAnalysis();

  const [stats, setStats] = useState<AlertStats | null>(alertStats);
  const [tab, setTab] = useState<StatusTab>('all');
  const [severity, setSeverity] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [items, setItems] = useState<AlertRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (alertStats) setStats(alertStats);
  }, [alertStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.alerts.list({
        status: tab === 'all' ? undefined : tab,
        severity: severity || undefined,
        q: debouncedSearch || undefined,
        sort,
        order,
        page,
        pageSize,
      });
      setItems(response.items ?? []);
      setTotal(response.total ?? 0);
      setTotalPages(response.totalPages ?? 1);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, order, page, pageSize, severity, sort, tab]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      setBusy(true);
      try {
        const response = await api.alerts.update(id, status);
        setStats(response.stats);
        await Promise.all([loadAlerts(), reloadAlerts()]);
        notify('success', `Alert ${id} marked ${status}.`);
      } catch (err) {
        notify('danger', err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [loadAlerts, notify, reloadAlerts],
  );

  const handleBulk = useCallback(
    async (status: string) => {
      if (selected.size === 0) {
        notify('info', 'Select at least one alert first.');
        return;
      }
      setBusy(true);
      try {
        await api.alerts.bulkStatus(Array.from(selected), status);
        setSelected(new Set());
        await Promise.all([loadAlerts(), reloadAlerts(), refresh({ silent: true })]);
        notify('success', `${selected.size} alert(s) marked ${status}.`);
      } catch (err) {
        notify('danger', err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [loadAlerts, notify, refresh, reloadAlerts, selected],
  );

  const handleDelete = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      if (!window.confirm(`Delete ${ids.length} alert(s)? This cannot be undone.`)) return;
      setBusy(true);
      try {
        const response = await api.alerts.remove(ids);
        setSelected(new Set());
        setStats(response.stats);
        await Promise.all([loadAlerts(), reloadAlerts(), refresh({ silent: true })]);
        notify('success', `${response.deleted} alert(s) deleted.`);
      } catch (err) {
        notify('danger', err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [loadAlerts, notify, refresh, reloadAlerts],
  );

  const severityBars = useMemo(
    () =>
      SEVERITY_ORDER.map((key) => ({
        name: severityMeta(key).label,
        value: stats?.bySeverity?.[key] ?? 0,
      })),
    [stats],
  );

  const statusDonut = useMemo(
    () =>
      (['open', 'acknowledged', 'resolved'] as const).map((key) => ({
        name: statusMeta(key).label,
        value: stats?.byStatus?.[key] ?? 0,
      })),
    [stats],
  );

  const allOnPageSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  const reportUrl = api.alerts.reportUrl({
    status: tab === 'all' ? undefined : tab,
    severity: severity || undefined,
    q: debouncedSearch || undefined,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Security Alerts"
        description="Alerts are created only from records a trained model flagged as threats. A stable fingerprint prevents duplicate alerts, and status changes are persisted in the backend database."
        actions={
          <>
            <Button variant="ghost" loading={loading} onClick={() => void loadAlerts()}>
              Reload
            </Button>
            <LinkButton href={reportUrl} variant="primary">
              Export alerts (CSV)
            </LinkButton>
          </>
        }
      />

      {connection === 'offline' && (
        <Notice tone="danger" title="Backend unreachable">
          Alerts are stored by the backend. Start it and reload this page.
        </Notice>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Total alerts" value={formatNumber(stats?.total ?? 0)} accent="cyan" />
        <MetricCard label="Open" value={formatNumber(stats?.byStatus?.open ?? 0)} accent="critical" />
        <MetricCard label="Acknowledged" value={formatNumber(stats?.byStatus?.acknowledged ?? 0)} accent="medium" />
        <MetricCard label="Resolved" value={formatNumber(stats?.byStatus?.resolved ?? 0)} accent="low" />
        <MetricCard label="Critical" value={formatNumber(stats?.bySeverity?.critical ?? 0)} accent="critical" />
        <MetricCard label="High" value={formatNumber(stats?.bySeverity?.high ?? 0)} accent="high" />
      </div>

      {stats && stats.total > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Alerts by severity" subtitle="All alerts recorded by the backend">
            <BarChart data={severityBars} height={160} />
          </Panel>
          <Panel title="Alerts by status" subtitle="Open / acknowledged / resolved">
            <DonutChart data={statusDonut} centerLabel="alerts" />
          </Panel>
        </div>
      )}

      <Panel
        title="Alert queue"
        subtitle="Severity, status, sorting and text search are applied by the backend"
        actions={
          selected.size > 0 && (
            <>
              <span className="text-xs text-soc-muted">{selected.size} selected</span>
              <Button variant="ghost" disabled={busy} onClick={() => void handleBulk('acknowledged')}>
                Acknowledge
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => void handleBulk('resolved')}>
                Resolve
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => void handleDelete(Array.from(selected))}>
                Delete
              </Button>
            </>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            active={tab}
            onChange={(id) => {
              setTab(id as StatusTab);
              setPage(1);
            }}
            tabs={[
              { id: 'all', label: 'All' },
              { id: 'open', label: 'Open', count: stats?.byStatus?.open },
              { id: 'acknowledged', label: 'Acknowledged', count: stats?.byStatus?.acknowledged },
              { id: 'resolved', label: 'Resolved', count: stats?.byStatus?.resolved },
            ]}
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="soc-label" htmlFor="alert-search">
              Search
            </label>
            <input
              id="alert-search"
              className="soc-input"
              placeholder="Alert id, class, category, source record, reason…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="soc-label" htmlFor="alert-severity">
              Severity
            </label>
            <Select
              id="alert-severity"
              value={severity}
              onChange={(value) => {
                setSeverity(value);
                setPage(1);
              }}
              options={SEVERITY_ORDER.map((key) => ({ value: key, label: severityMeta(key).label }))}
              placeholder="All severities"
            />
          </div>
          <div>
            <label className="soc-label" htmlFor="alert-sort">
              Sort by
            </label>
            <div className="flex gap-2">
              <Select
                id="alert-sort"
                value={sort}
                onChange={(value) => {
                  setSort(value);
                  setPage(1);
                }}
                options={SORT_OPTIONS}
              />
              <Button
                variant="ghost"
                className="shrink-0"
                onClick={() => setOrder((current) => (current === 'desc' ? 'asc' : 'desc'))}
                aria-label={`Sort ${order === 'desc' ? 'ascending' : 'descending'}`}
              >
                {order === 'desc' ? '↓' : '↑'}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-soc-muted">
          <Button
            variant="ghost"
            onClick={() => {
              setSeverity('');
              setSearch('');
              setSort('createdAt');
              setOrder('desc');
              setTab('all');
              setPage(1);
            }}
          >
            Clear filters
          </Button>
          <span>{formatNumber(total)} alert(s) matching</span>
        </div>

        {error && (
          <div className="mt-3">
            <ErrorState title="Could not load alerts" message={error} />
          </div>
        )}

        <div className="mt-3 overflow-auto rounded-lg border border-soc-border">
          {loading && items.length === 0 ? (
            <LoadingBlock label="Loading alerts…" />
          ) : items.length === 0 && !error ? (
            <EmptyState
              title="No alerts match"
              description="Alerts appear here after a machine-learning detection flags threats. Rule-based assessments never create alerts."
            />
          ) : (
            <table className="soc-table text-xs">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-soc-accent"
                      aria-label="Select all alerts on this page"
                      checked={allOnPageSelected}
                      onChange={(event) => {
                        setSelected((current) => {
                          const next = new Set(current);
                          if (event.target.checked) items.forEach((item) => next.add(item.id));
                          else items.forEach((item) => next.delete(item.id));
                          return next;
                        });
                      }}
                    />
                  </th>
                  <th />
                  <th>Alert id</th>
                  <th>Detected</th>
                  <th>Source record</th>
                  <th>Class / category</th>
                  <th className="text-right">Confidence</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((alert) => {
                  const severityInfo = severityMeta(alert.severity);
                  const statusInfo = statusMeta(alert.status);
                  const open = expanded === alert.id;
                  return (
                    <Fragment key={alert.id}>
                      <tr>
                        <td>
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-soc-accent"
                            aria-label={`Select alert ${alert.id}`}
                            checked={selected.has(alert.id)}
                            onChange={(event) => {
                              setSelected((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.add(alert.id);
                                else next.delete(alert.id);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="text-soc-accent hover:underline"
                            aria-expanded={open}
                            onClick={() => setExpanded(open ? null : alert.id)}
                          >
                            {open ? '−' : '+'}
                          </button>
                        </td>
                        <td className="font-mono text-[11px]">{alert.id}</td>
                        <td>{formatRelative(alert.createdAt)}</td>
                        <td className="font-mono text-[11px]">{alert.sourceRecord ?? '—'}</td>
                        <td className="max-w-[12rem] truncate" title={alert.attackCategory ?? alert.predictedClass ?? ''}>
                          {alert.attackCategory ?? alert.predictedClass ?? '—'}
                        </td>
                        <td className="text-right tabular-nums">
                          {alert.confidence === null || alert.confidence === undefined
                            ? '—'
                            : formatPercent(alert.confidence)}
                        </td>
                        <td>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${severityInfo.badgeClass}`}>
                            {severityInfo.label}
                          </span>
                        </td>
                        <td>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {alert.status === 'open' && (
                              <Button
                                variant="ghost"
                                className="px-2 py-1 text-[11px]"
                                disabled={busy}
                                onClick={() => void handleStatusChange(alert.id, 'acknowledged')}
                              >
                                Acknowledge
                              </Button>
                            )}
                            {alert.status !== 'resolved' && (
                              <Button
                                variant="ghost"
                                className="px-2 py-1 text-[11px]"
                                disabled={busy}
                                onClick={() => void handleStatusChange(alert.id, 'resolved')}
                              >
                                Resolve
                              </Button>
                            )}
                            {alert.status !== 'open' && (
                              <Button
                                variant="ghost"
                                className="px-2 py-1 text-[11px]"
                                disabled={busy}
                                onClick={() => void handleStatusChange(alert.id, 'open')}
                              >
                                Reopen
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-soc-panel2/60">
                          <td colSpan={10} className="whitespace-normal">
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                              <Detail label="Alert identifier" value={alert.id} mono />
                              <Detail label="Fingerprint (deduplication key)" value={alert.fingerprint} mono />
                              <Detail label="Detection timestamp" value={formatDateTime(alert.createdAt)} />
                              <Detail label="Last updated" value={formatDateTime(alert.updatedAt)} />
                              <Detail label="Detection run" value={alert.detectionId ?? '—'} mono />
                              <Detail label="Source record" value={alert.sourceRecord ?? '—'} mono />
                              <Detail label="Model algorithm" value={alert.modelAlgorithm ?? '—'} />
                              <Detail label="Predicted class" value={alert.predictedClass ?? '—'} />
                              <Detail label="Attack category" value={alert.attackCategory ?? '—'} />
                              <Detail
                                label="Model confidence"
                                value={
                                  alert.confidence === null || alert.confidence === undefined
                                    ? 'Not available for this model'
                                    : `${formatPercent(alert.confidence)} (model output, not a guarantee)`
                                }
                              />
                              <Detail label="Detection source" value={alert.detectionSource ?? '—'} />
                              <Detail label="Severity" value={severityInfo.label} />
                            </dl>
                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-soc-muted">
                                  Explanation
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-soc-text">{alert.reason ?? '—'}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-soc-muted">
                                  Recommended defensive action
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-soc-text">
                                  {alert.recommendedAction ?? '—'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge className={severityInfo.badgeClass}>{severityInfo.label} severity</Badge>
                              <Badge className={statusInfo.badgeClass}>{statusInfo.label}</Badge>
                              <Button variant="danger" className="px-2 py-1 text-[11px]" disabled={busy} onClick={() => void handleDelete([alert.id])}>
                                Delete alert
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {items.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </Panel>

      <Panel title="How alerts work" subtitle="What NetShield AI does and does not do">
        <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-soc-muted">
          <li>Only records the model classified as attacks become alerts; normal traffic never raises one.</li>
          <li>A stable fingerprint (detection mode + class + category + severity + input features) prevents the same record from creating duplicate alerts.</li>
          <li>Statuses are persisted in the backend database, so acknowledging an alert survives a page refresh.</li>
          <li>
            NetShield AI <strong>does not</strong> block traffic, quarantine hosts or reconfigure network devices.
            Recommended actions are advice for an analyst.
          </li>
          <li>
            Severity thresholds can be changed on the{' '}
            <a href="/detection" className="text-soc-accent hover:underline">
              Threat Detection
            </a>{' '}
            page before a run; they apply to new detections only.
          </li>
        </ul>
      </Panel>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-soc-muted">{label}</dt>
      <dd className={`break-words text-xs text-soc-text ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
