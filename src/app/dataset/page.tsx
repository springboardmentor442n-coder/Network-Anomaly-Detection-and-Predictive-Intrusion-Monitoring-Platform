'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/AppShell';
import { BarChart, DonutChart, Heatmap } from '@/components/charts/charts';
import { DatasetLoader } from '@/components/dataset/DatasetLoader';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  KeyValue,
  LinkButton,
  LoadingBlock,
  MetricCard,
  Notice,
  Pagination,
  Panel,
  SampleBadge,
  Select,
  Tabs,
} from '@/components/ui/primitives';
import { useAnalysis } from '@/context/AnalysisContext';
import { api, ApiError } from '@/lib/api';
import { formatDateTime, formatDecimal, formatNumber, formatPercent } from '@/lib/format';
import type { DatasetProfile, FilterOptions, TablePage } from '@/lib/types';

type TabId = 'overview' | 'columns' | 'statistics' | 'distributions' | 'correlation' | 'data';

export default function DatasetAnalysisPage() {
  const { selectedDataset, selectedDatasetId, connection, notify } = useAnalysis();

  const [tab, setTab] = useState<TabId>('overview');
  const [summary, setSummary] = useState<{ dataset: typeof selectedDataset; profile: DatasetProfile } | null>(null);
  const [summaryState, setSummaryState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [summaryError, setSummaryError] = useState<{ message: string; details?: string[] } | null>(null);

  const [options, setOptions] = useState<FilterOptions | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [attackCat, setAttackCat] = useState('');
  const [proto, setProto] = useState('');
  const [service, setService] = useState('');
  const [label, setLabel] = useState('');
  const [table, setTable] = useState<TablePage | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  /* ---------------- profile ---------------- */
  const loadSummary = useCallback(async () => {
    if (!selectedDatasetId) {
      setSummary(null);
      setSummaryState('idle');
      return;
    }
    setSummaryState('loading');
    setSummaryError(null);
    try {
      const [summaryResponse, optionsResponse] = await Promise.all([
        api.datasets.summary(selectedDatasetId),
        api.datasets.filterOptions(selectedDatasetId),
      ]);
      setSummary({ dataset: summaryResponse.dataset, profile: summaryResponse.profile });
      setOptions(optionsResponse);
      setSummaryState('idle');
    } catch (error) {
      setSummary(null);
      setSummaryState('error');
      setSummaryError(
        error instanceof ApiError
          ? { message: error.message, details: error.details }
          : { message: error instanceof Error ? error.message : String(error) },
      );
    }
  }, [selectedDatasetId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  /* reset filters when the dataset changes */
  useEffect(() => {
    setPage(1);
    setSearch('');
    setDebouncedSearch('');
    setAttackCat('');
    setProto('');
    setService('');
    setLabel('');
    setExpandedRow(null);
  }, [selectedDatasetId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  /* ---------------- data table ---------------- */
  const loadTable = useCallback(async () => {
    if (!selectedDatasetId) {
      setTable(null);
      return;
    }
    setTableLoading(true);
    setTableError(null);
    try {
      const response = await api.datasets.rows(selectedDatasetId, {
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        attack_cat: attackCat || undefined,
        proto: proto || undefined,
        service: service || undefined,
        label: label || undefined,
      });
      setTable(response);
    } catch (error) {
      setTable(null);
      setTableError(error instanceof Error ? error.message : String(error));
    } finally {
      setTableLoading(false);
    }
  }, [attackCat, debouncedSearch, label, page, pageSize, proto, selectedDatasetId, service]);

  useEffect(() => {
    if (tab !== 'data') return;
    void loadTable();
  }, [tab, loadTable]);

  const columns = useMemo(() => table?.columns ?? summary?.profile.columnProfile.map((entry) => entry.name) ?? [], [table, summary]);
  const rows = table?.rows ?? [];

  const exportUrl = selectedDatasetId
    ? api.datasets.exportUrl(selectedDatasetId, {
        search: debouncedSearch || undefined,
        attack_cat: attackCat || undefined,
        proto: proto || undefined,
        service: service || undefined,
        label: label || undefined,
      })
    : '';

  const profile = summary?.profile ?? null;

  const handleReset = () => {
    setSearch('');
    setAttackCat('');
    setProto('');
    setService('');
    setLabel('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dataset Analysis"
        description="Upload UNSW-NB15 CSV files (or point at the project data/ directory), then profile them: dimensions, data types, missing values, duplicates, statistics, distributions and filtered exports. Every figure below is computed by the backend from the file on disk."
        actions={
          <>
            <Button variant="ghost" loading={summaryState === 'loading'} onClick={() => void loadSummary()}>
              Re-profile
            </Button>
            {selectedDatasetId && (
              <LinkButton href={api.datasets.reportUrl(selectedDatasetId)} variant="primary">
                Download dataset summary (CSV)
              </LinkButton>
            )}
          </>
        }
      />

      {connection === 'offline' && (
        <Notice tone="danger" title="Backend unreachable">
          Dataset validation and profiling run on the Python backend. Start it and reload this page.
        </Notice>
      )}

      <DatasetLoader
        title="Load data"
        subtitle="Accepted: any .csv with a header. 'label' enables binary classification, 'attack_cat' enables multiclass."
      />

      {!selectedDatasetId && (
        <EmptyState
          title="No dataset selected"
          description="Upload a CSV above, or place UNSW_NB15_training-set.csv / UNSW_NB15_testing-set.csv in the project data/ directory and press Rescan."
        />
      )}

      {summaryError && (
        <ErrorState
          title="Profiling failed"
          message={summaryError.message}
          details={summaryError.details}
          action={
            <Button variant="ghost" onClick={() => void loadSummary()}>
              Retry
            </Button>
          }
        />
      )}

      {selectedDatasetId && summaryState === 'loading' && !profile && <LoadingBlock label="Profiling dataset…" />}

      {profile && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="Rows" value={formatNumber(profile.rows)} hint="Data records" accent="cyan" />
            <MetricCard label="Columns" value={formatNumber(profile.columns)} hint={`${profile.numericCount} numeric · ${profile.categoricalCount} categorical`} accent="purple" />
            <MetricCard label="Missing cells" value={formatNumber(profile.totalMissing)} hint={formatPercent(profile.missingPct, { alreadyPercent: true })} accent="medium" />
            <MetricCard label="Duplicate rows" value={formatNumber(profile.duplicateRows)} hint={formatPercent(profile.duplicatePct, { alreadyPercent: true })} accent="high" />
            <MetricCard label="Complete rows" value={formatNumber(profile.completeRows)} hint="No missing values" accent="low" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SampleBadge show={Boolean(selectedDataset?.isSample)} />
            <Badge className="border-soc-border">binary target: {profile.targets.binary ?? 'not found'}</Badge>
            <Badge className="border-soc-border">multiclass target: {profile.targets.multiclass ?? 'not found'}</Badge>
            {profile.identifierColumns.length > 0 && (
              <Badge className="border-soc-medium/40 bg-soc-medium/10 text-soc-medium">
                excluded identifiers: {profile.identifierColumns.join(', ')}
              </Badge>
            )}
          </div>

          {selectedDataset?.description && <Notice tone="warning">{selectedDataset.description}</Notice>}

          <Tabs
            active={tab}
            onChange={(id) => setTab(id as TabId)}
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'columns', label: 'Columns', count: profile.columnProfile.length },
              { id: 'statistics', label: 'Numeric statistics' },
              { id: 'distributions', label: 'Distributions' },
              { id: 'correlation', label: 'Correlation' },
              { id: 'data', label: 'Data table' },
            ]}
          />

          {tab === 'overview' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Dataset overview" subtitle="Dimensions and integrity checks">
                <KeyValue
                  items={[
                    { label: 'Filename', value: selectedDataset?.filename ?? '—' },
                    { label: 'Source', value: selectedDataset?.source === 'project' ? 'project data/ directory' : 'uploaded' },
                    { label: 'Rows', value: formatNumber(profile.rows) },
                    { label: 'Columns', value: formatNumber(profile.columns) },
                    { label: 'Total cells', value: formatNumber(profile.totalCells) },
                    { label: 'Missing cells', value: `${formatNumber(profile.totalMissing)} (${profile.missingPct}%)` },
                    { label: 'Duplicate rows', value: `${formatNumber(profile.duplicateRows)} (${profile.duplicatePct}%)` },
                    { label: 'Complete rows', value: formatNumber(profile.completeRows) },
                    { label: 'Numeric columns', value: formatNumber(profile.numericCount) },
                    { label: 'Categorical columns', value: formatNumber(profile.categoricalCount) },
                    { label: 'Analyzed at', value: formatDateTime(summary?.dataset?.analyzedAt) },
                  ]}
                />
              </Panel>

              <Panel title="Missing values by column" subtitle="Top 30 columns, ordered by missing count">
                {profile.missingByColumn.filter((item) => item.missing > 0).length === 0 ? (
                  <EmptyState title="No missing values" description="Every cell in this dataset is populated." />
                ) : (
                  <div className="max-h-80 overflow-auto">
                    <table className="soc-table text-xs">
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th className="text-right">Missing</th>
                          <th className="text-right">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.missingByColumn
                          .filter((item) => item.missing > 0)
                          .map((item) => (
                            <tr key={item.column}>
                              <td className="max-w-[14rem] truncate" title={item.column}>
                                {item.column}
                              </td>
                              <td className="text-right tabular-nums">{formatNumber(item.missing)}</td>
                              <td className="text-right tabular-nums">{item.missingPct}%</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          )}

          {tab === 'columns' && (
            <Panel title="Column profile" subtitle="Name, inferred type, pandas dtype, missing values and cardinality">
              <div className="max-h-[32rem] overflow-auto">
                <table className="soc-table text-xs">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Column</th>
                      <th>Kind</th>
                      <th>dtype</th>
                      <th className="text-right">Missing</th>
                      <th className="text-right">Missing %</th>
                      <th className="text-right">Unique</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.columnProfile.map((entry, index) => (
                      <tr key={entry.name}>
                        <td className="tabular-nums text-soc-muted">{index + 1}</td>
                        <td className="font-medium">{entry.name}</td>
                        <td>
                          <span
                            className={
                              entry.kind === 'numeric'
                                ? 'rounded border border-soc-accent/40 bg-soc-accent/10 px-1.5 py-0.5 text-[10px] text-soc-accent'
                                : 'rounded border border-soc-purple/40 bg-soc-purple/10 px-1.5 py-0.5 text-[10px] text-soc-purple'
                            }
                          >
                            {entry.kind}
                          </span>
                        </td>
                        <td className="text-soc-muted">{entry.dtype}</td>
                        <td className="text-right tabular-nums">{formatNumber(entry.missing)}</td>
                        <td className="text-right tabular-nums">{entry.missingPct}%</td>
                        <td className="text-right tabular-nums">{formatNumber(entry.unique)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {tab === 'statistics' && (
            <Panel
              title="Numeric statistics"
              subtitle="Computed with pandas on the coerced numeric columns (first 40)"
            >
              {profile.numericStats.length === 0 ? (
                <EmptyState title="No numeric columns detected" />
              ) : (
                <div className="max-h-[32rem] overflow-auto">
                  <table className="soc-table text-xs">
                    <thead>
                      <tr>
                        <th>Column</th>
                        <th className="text-right">Count</th>
                        <th className="text-right">Mean</th>
                        <th className="text-right">Median</th>
                        <th className="text-right">Std</th>
                        <th className="text-right">Min</th>
                        <th className="text-right">Max</th>
                        <th className="text-right">Missing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.numericStats.map((stat) => (
                        <tr key={stat.column}>
                          <td className="font-medium">{stat.column}</td>
                          <td className="text-right tabular-nums">{formatNumber(stat.count)}</td>
                          <td className="text-right tabular-nums">{formatDecimal(stat.mean, 3)}</td>
                          <td className="text-right tabular-nums">{formatDecimal(stat.median, 3)}</td>
                          <td className="text-right tabular-nums">{formatDecimal(stat.std, 3)}</td>
                          <td className="text-right tabular-nums">{formatDecimal(stat.min, 3)}</td>
                          <td className="text-right tabular-nums">{formatDecimal(stat.max, 3)}</td>
                          <td className="text-right tabular-nums">{formatNumber(stat.missing)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {tab === 'distributions' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Attack category distribution" subtitle="attack_cat column">
                <BarChart
                  data={profile.attackCategoryDistribution}
                  emptyLabel="No attack_cat column in this dataset."
                  height={260}
                />
              </Panel>
              <Panel title="Label distribution" subtitle="label column mapped to Normal / Attack">
                {profile.labelDistribution.length === 0 ? (
                  <p className="py-6 text-center text-xs text-soc-muted">No label column in this dataset.</p>
                ) : (
                  <DonutChart data={profile.labelDistribution} centerLabel="records" />
                )}
              </Panel>
              {(['proto', 'service', 'state'] as const).map((column) => (
                <Panel key={column} title={`${column} distribution`} subtitle={`Top ${column} values`}>
                  <BarChart data={profile.distributions?.[column] ?? []} emptyLabel={`No ${column} column in this dataset.`} height={240} />
                </Panel>
              ))}
            </div>
          )}

          {tab === 'correlation' && (
            <Panel
              title="Correlation heatmap"
              subtitle="Pearson correlation across the highest-variance numeric columns (max 12)"
            >
              <Heatmap columns={profile.correlation?.columns ?? []} matrix={profile.correlation?.matrix ?? []} />
            </Panel>
          )}

          {tab === 'data' && (
            <Panel
              title="Data table"
              subtitle="Server-side paginated; filters are applied by the backend before paging"
              actions={
                <>
                  <Button variant="ghost" loading={tableLoading} onClick={() => void loadTable()}>
                    Reload
                  </Button>
                  {selectedDatasetId && (
                    <LinkButton href={exportUrl} variant="primary">
                      Export filtered CSV
                    </LinkButton>
                  )}
                </>
              }
            >
              <div className="grid gap-3 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <label className="soc-label" htmlFor="dataset-search">
                    Search
                  </label>
                  <input
                    id="dataset-search"
                    className="soc-input"
                    placeholder="Search any column…"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div>
                  <label className="soc-label" htmlFor="dataset-attack">
                    Attack category
                  </label>
                  <Select
                    id="dataset-attack"
                    value={attackCat}
                    onChange={(value) => {
                      setAttackCat(value);
                      setPage(1);
                    }}
                    options={(options?.attackCategories ?? []).map((value) => ({ value, label: value }))}
                    placeholder="All categories"
                    disabled={(options?.attackCategories ?? []).length === 0}
                  />
                </div>
                <div>
                  <label className="soc-label" htmlFor="dataset-proto">
                    Protocol
                  </label>
                  <Select
                    id="dataset-proto"
                    value={proto}
                    onChange={(value) => {
                      setProto(value);
                      setPage(1);
                    }}
                    options={(options?.protocols ?? []).map((value) => ({ value, label: value }))}
                    placeholder="All protocols"
                    disabled={(options?.protocols ?? []).length === 0}
                  />
                </div>
                <div>
                  <label className="soc-label" htmlFor="dataset-service">
                    Service
                  </label>
                  <Select
                    id="dataset-service"
                    value={service}
                    onChange={(value) => {
                      setService(value);
                      setPage(1);
                    }}
                    options={(options?.services ?? []).map((value) => ({ value, label: value }))}
                    placeholder="All services"
                    disabled={(options?.services ?? []).length === 0}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="w-40">
                  <label className="soc-label" htmlFor="dataset-label">
                    Label
                  </label>
                  <Select
                    id="dataset-label"
                    value={label}
                    onChange={(value) => {
                      setLabel(value);
                      setPage(1);
                    }}
                    options={(options?.labels ?? []).map((value) => ({ value, label: value }))}
                    placeholder="All labels"
                    disabled={(options?.labels ?? []).length === 0}
                  />
                </div>
                <Button variant="ghost" className="mt-4" onClick={handleReset}>
                  Clear filters
                </Button>
                {table && (
                  <span className="mt-4 text-xs text-soc-muted">
                    {formatNumber(table.total)} matching row(s) · page {table.page} of {table.totalPages}
                  </span>
                )}
              </div>

              {tableError && (
                <div className="mt-3">
                  <ErrorState title="Could not load rows" message={tableError} />
                </div>
              )}

              <div className="mt-3 overflow-auto rounded-lg border border-soc-border">
                {tableLoading && rows.length === 0 ? (
                  <LoadingBlock label="Loading rows…" />
                ) : rows.length === 0 && !tableError ? (
                  <EmptyState title="No matching rows" description="Adjust or clear the filters above." />
                ) : (
                  <table className="soc-table text-xs">
                    <thead>
                      <tr>
                        <th />
                        {columns.map((column) => (
                          <th key={column} title={column}>
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, rowIndex) => {
                        const absolute = (page - 1) * pageSize + rowIndex;
                        const expanded = expandedRow === absolute;
                        return (
                          <Fragment key={`row-${absolute}`}>
                            <tr>
                              <td>
                                <button
                                  type="button"
                                  className="text-soc-accent hover:underline"
                                  aria-expanded={expanded}
                                  onClick={() => setExpandedRow(expanded ? null : absolute)}
                                >
                                  {expanded ? '−' : '+'}
                                </button>
                              </td>
                              {columns.map((column) => (
                                <td key={`${absolute}-${column}`} className="max-w-[12rem] truncate" title={String(row[column] ?? '')}>
                                  {formatCell(row[column])}
                                </td>
                              ))}
                            </tr>
                            {expanded && (
                              <tr className="bg-soc-panel2/60">
                                <td colSpan={columns.length + 1} className="whitespace-normal">
                                  <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                                    {columns.map((column) => (
                                      <div key={`detail-${absolute}-${column}`} className="min-w-0">
                                        <dt className="text-[10px] uppercase tracking-wide text-soc-muted">{column}</dt>
                                        <dd className="break-words text-xs text-soc-text">{formatCell(row[column])}</dd>
                                      </div>
                                    ))}
                                  </dl>
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

              {table && (
                <Pagination
                  page={table.page}
                  totalPages={table.totalPages}
                  total={table.total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              )}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? formatNumber(value) : formatDecimal(value, 4);
  return String(value);
}
