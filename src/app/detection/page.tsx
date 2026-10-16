'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/layout/AppShell';
import { BarChart, ChartLegend } from '@/components/charts/charts';
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
  ProgressBar,
  Select,
} from '@/components/ui/primitives';
import { useAnalysis } from '@/context/AnalysisContext';
import { api } from '@/lib/api';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { SEVERITY_ORDER, chartColor, severityMeta } from '@/lib/severity';
import { useJob } from '@/lib/useJob';
import type { DetectionRow, DetectionSummary, TablePage } from '@/lib/types';

export default function ThreatDetectionPage() {
  const {
    models,
    activeModel,
    connection,
    detection,
    setDetectionLocally,
    reloadAlerts,
    refresh,
    notify,
  } = useAnalysis();

  const [mode, setMode] = useState<'model' | 'heuristic'>('model');
  const [modelId, setModelId] = useState('');
  const [createAlerts, setCreateAlerts] = useState(true);
  const [critical, setCritical] = useState('0.9');
  const [high, setHigh] = useState('0.75');
  const [medium, setMedium] = useState('0.6');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingFile = useRef<File | null>(null);

  const [run, setRun] = useState<DetectionSummary | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [severity, setSeverity] = useState('');
  const [predictedClass, setPredictedClass] = useState('');
  const [category, setCategory] = useState('');
  const [minConfidence, setMinConfidence] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [onlyThreats, setOnlyThreats] = useState(false);
  const [table, setTable] = useState<(TablePage & { detection: DetectionSummary }) | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const job = useJob();

  useEffect(() => {
    if (models.length === 0) return;
    setModelId((current) =>
      current && models.some((model) => model.id === current) ? current : (activeModel?.id ?? models[0].id),
    );
  }, [activeModel, models]);

  /* latest detection from the shared context */
  useEffect(() => {
    if (detection && (!run || detection.id !== run.id)) setRun(detection);
  }, [detection, run]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const detectionId = run?.id ?? null;

  const loadRows = useCallback(async () => {
    if (!detectionId) {
      setTable(null);
      return;
    }
    setTableLoading(true);
    setTableError(null);
    try {
      const parsedMin = minConfidence.trim() === '' ? undefined : Number(minConfidence);
      const response = await api.detection.rows(detectionId, {
        page,
        page_size: pageSize,
        severity: severity || undefined,
        predicted_class: predictedClass || undefined,
        category: category || undefined,
        min_confidence: parsedMin !== undefined && Number.isFinite(parsedMin) ? parsedMin : undefined,
        search: debouncedSearch || undefined,
        only_threats: onlyThreats || undefined,
      });
      setTable(response);
    } catch (error) {
      setTable(null);
      setTableError(error instanceof Error ? error.message : String(error));
    } finally {
      setTableLoading(false);
    }
  }, [category, debouncedSearch, detectionId, minConfidence, onlyThreats, page, pageSize, predictedClass, severity]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setFileError('Only .csv files can be scored.');
        pendingFile.current = null;
        setFileName(null);
        return;
      }
      setFileError(null);
      pendingFile.current = file;
      setFileName(file.name);
    },
    [],
  );

  const handleRun = useCallback(async () => {
    const file = pendingFile.current;
    if (!file) {
      setFileError('Choose a CSV file of traffic records to score.');
      notify('danger', 'No traffic file selected.');
      return;
    }
    if (mode === 'model' && !modelId) {
      notify('danger', 'Select a trained model, or switch to the rule-based assessment mode.');
      return;
    }
    const parsedThresholds = {
      critical: Number(critical),
      high: Number(high),
      medium: Number(medium),
    };
    if (Object.values(parsedThresholds).some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
      notify('danger', 'Severity thresholds must be numbers between 0 and 1.');
      return;
    }
    if (!(parsedThresholds.critical >= parsedThresholds.high && parsedThresholds.high >= parsedThresholds.medium)) {
      notify('danger', 'Thresholds must satisfy critical ≥ high ≥ medium.');
      return;
    }

    job.reset();
    setTable(null);
    setExpanded(null);
    setPage(1);

    const finished = await job.start(() =>
      api.detection.run({
        file,
        modelId: mode === 'model' ? modelId : null,
        mode,
        critical: parsedThresholds.critical,
        high: parsedThresholds.high,
        medium: parsedThresholds.medium,
        createAlerts,
      }),
    );

    if (finished?.status === 'succeeded') {
      const result = finished.result as { detection?: DetectionSummary } | null;
      const summary = result?.detection ?? null;
      if (summary) {
        setRun(summary);
        setDetectionLocally(summary);
      }
      await Promise.all([reloadAlerts(), refresh({ silent: true })]);
      notify(
        'success',
        `Detection complete: ${formatNumber(summary?.rowsScanned ?? 0)} records scored, ${formatNumber(summary?.predictedAttackCount ?? 0)} flagged.`,
      );
    } else if (finished?.status === 'failed') {
      notify('danger', finished.error ?? 'Detection failed.');
    }
  }, [createAlerts, critical, high, job, medium, mode, modelId, notify, refresh, reloadAlerts, setDetectionLocally]);

  const handleRaiseAlerts = useCallback(async () => {
    if (!detectionId) return;
    try {
      const outcome = await api.detection.raiseAlerts(detectionId);
      await Promise.all([reloadAlerts(), refresh({ silent: true })]);
      notify(
        outcome.created > 0 ? 'success' : 'info',
        outcome.created > 0
          ? `Created ${outcome.created} alert(s); ${outcome.duplicates} duplicate(s) skipped.`
          : outcome.message ?? 'No new alerts were required (all already exist).',
      );
    } catch (error) {
      notify('danger', error instanceof Error ? error.message : String(error));
    }
  }, [detectionId, notify, refresh, reloadAlerts]);

  const rows: DetectionRow[] = (table?.rows ?? []) as unknown as DetectionRow[];
  const severityEntries = SEVERITY_ORDER.map((key) => ({
    name: severityMeta(key).label,
    value: run?.severityCounts?.[key] ?? 0,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Threat Detection"
        description="Scores an uploaded CSV of network traffic records with the trained model and its saved preprocessing pipeline. Predictions, confidences and severities come from the model — never from made-up scores."
        actions={
          detectionId && (
            <LinkButton href={api.detection.reportUrl(detectionId)} variant="primary">
              Export detection results (CSV)
            </LinkButton>
          )
        }
      />

      {models.length === 0 && (
        <Notice tone="warning" title="No trained model available">
          Machine-learning detection requires a trained model. Go to{' '}
          <Link href="/training" className="underline">
            Model Training
          </Link>{' '}
          and fit one first. Alternatively you may run the clearly-labelled rule-based assessment below, which is
          <strong> not </strong> a machine-learning prediction and never raises alerts.
        </Notice>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Score traffic records"
          subtitle="Upload a CSV with the same feature columns as the training data (a target column is optional)"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="soc-label" htmlFor="detect-mode">
                Detection mode
              </label>
              <Select
                id="detect-mode"
                value={mode}
                onChange={(value) => setMode(value as 'model' | 'heuristic')}
                options={[
                  { value: 'model', label: 'Machine-learning model (recommended)' },
                  { value: 'heuristic', label: 'Rule-based assessment (explicitly not ML)' },
                ]}
              />
            </div>
            <div>
              <label className="soc-label" htmlFor="detect-model">
                Model
              </label>
              <Select
                id="detect-model"
                value={modelId}
                onChange={setModelId}
                options={models.map((model) => ({
                  value: model.id,
                  label: `${model.algorithmLabel} · ${model.targetLabel}`,
                }))}
                placeholder={models.length ? undefined : 'No trained model'}
                disabled={models.length === 0 || mode === 'heuristic'}
              />
            </div>
          </div>

          <div className="mt-4">
            <span className="soc-label">Traffic CSV</span>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-soc-border bg-soc-panel2/40 px-3 py-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                id="detect-file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                Choose CSV file
              </Button>
              <span className="text-xs text-soc-muted">{fileName ?? 'No file selected'}</span>
            </div>
            {fileError && <p className="mt-1 text-xs text-soc-critical">{fileError}</p>}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="soc-label" htmlFor="detect-critical">
                Critical ≥
              </label>
              <input
                id="detect-critical"
                className="soc-input"
                inputMode="decimal"
                value={critical}
                onChange={(event) => setCritical(event.target.value)}
              />
            </div>
            <div>
              <label className="soc-label" htmlFor="detect-high">
                High ≥
              </label>
              <input
                id="detect-high"
                className="soc-input"
                inputMode="decimal"
                value={high}
                onChange={(event) => setHigh(event.target.value)}
              />
            </div>
            <div>
              <label className="soc-label" htmlFor="detect-medium">
                Medium ≥
              </label>
              <input
                id="detect-medium"
                className="soc-input"
                inputMode="decimal"
                value={medium}
                onChange={(event) => setMedium(event.target.value)}
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-xs text-soc-muted">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-soc-accent"
              checked={createAlerts}
              onChange={(event) => setCreateAlerts(event.target.checked)}
              disabled={mode === 'heuristic'}
            />
            Create security alerts for records the model flags as threats (duplicates are skipped by fingerprint).
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              loading={job.running}
              disabled={connection !== 'online' || (mode === 'model' && models.length === 0)}
              onClick={() => void handleRun()}
            >
              {job.running ? 'Scoring…' : 'Run detection'}
            </Button>
            <Button variant="ghost" disabled={job.running} onClick={job.reset}>
              Clear
            </Button>
            {detectionId && (
              <Button variant="ghost" onClick={() => void handleRaiseAlerts()}>
                Generate alerts for this run
              </Button>
            )}
          </div>

          {(job.running || job.job) && (
            <div className="mt-4">
              <ProgressBar value={job.job?.progress ?? (job.running ? 1 : 0)} label={job.job?.message ?? 'Submitting'} />
            </div>
          )}

          {job.error && (
            <div className="mt-4">
              <ErrorState
                title="Detection failed"
                message={job.error}
                details={job.details}
                action={
                  <Link href="/training" className="soc-btn-ghost">
                    Train a model
                  </Link>
                }
              />
            </div>
          )}
        </Panel>

        <Panel title="Severity rules" subtitle="Applied only to records the model classified as attacks">
          <p className="text-xs leading-relaxed text-soc-muted">
            {run?.severityDocumentation ??
              'A record classified as Normal is always Low (informational). An attack is graded by the model confidence: critical ≥ threshold, high ≥ threshold, medium ≥ threshold, otherwise medium with a low-confidence note. When a model cannot output a probability the record is graded medium and the reason states so.'}
          </p>
          {run?.severityRules && (
            <div className="mt-3">
              <KeyValue
                items={Object.entries(run.severityRules).map(([key, value]) => ({
                  label: key,
                  value: String(value),
                }))}
              />
            </div>
          )}
          <p className="mt-3 text-[11px] text-soc-muted">
            Confidence is the model&apos;s own probability output. It is not a guarantee that a threat exists.
          </p>
        </Panel>
      </div>

      {run && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Records scored" value={formatNumber(run.rowsScanned)} hint={run.sourceFilename} accent="cyan" />
            <MetricCard label="Predicted attacks" value={formatNumber(run.predictedAttackCount)} hint={formatPercent(run.attackRate, { alreadyPercent: true })} accent="critical" />
            <MetricCard label="Predicted normal" value={formatNumber(run.predictedNormalCount)} accent="low" />
            <MetricCard label="Critical" value={formatNumber(run.severityCounts?.critical ?? 0)} accent="critical" />
            <MetricCard label="High" value={formatNumber(run.severityCounts?.high ?? 0)} accent="high" />
            <MetricCard label="Alerts created" value={formatNumber(run.alertsCreated)} hint={run.alertDuplicates ? `${run.alertDuplicates} duplicate(s) skipped` : undefined} accent="medium" />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Run details" subtitle="What produced these results">
              <KeyValue
                items={[
                  { label: 'Detection id', value: run.id },
                  { label: 'Mode', value: run.modeLabel },
                  { label: 'Source file', value: run.sourceFilename },
                  { label: 'Model', value: run.algorithmLabel ?? '—' },
                  { label: 'Target', value: run.targetLabel ?? '—' },
                  { label: 'Training dataset', value: run.modelDatasetName ?? '—' },
                  { label: 'Model trained at', value: formatDateTime(run.modelTrainedAt) },
                  { label: 'Confidence output', value: run.confidenceSupported ? 'Available' : 'Not available' },
                  { label: 'Run at', value: formatDateTime(run.createdAt) },
                  { label: 'Duration', value: `${run.durationSeconds}s` },
                ]}
              />
              {run.mode === 'heuristic' && (
                <div className="mt-3">
                  <Notice tone="warning" title="Rule-based assessment">
                    These rows are produced by documented thresholds, not by a machine-learning model. No alerts are
                    generated from this mode.
                  </Notice>
                </div>
              )}
              {run.warnings?.length > 0 && (
                <div className="mt-3">
                  <Notice tone="warning" title="Warnings">
                    <ul className="list-disc space-y-1 pl-4">
                      {run.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </Notice>
                </div>
              )}
            </Panel>

            <Panel title="Severity distribution" subtitle="Assigned to every scored record">
              {severityEntries.some((entry) => entry.value > 0) ? (
                <div className="space-y-3">
                  <BarChart data={severityEntries} height={160} />
                  <ChartLegend
                    items={severityEntries.map((entry, index) => ({
                      label: entry.name,
                      color: chartColor(index),
                      value: formatNumber(entry.value),
                    }))}
                  />
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-soc-muted">No records scored yet.</p>
              )}
            </Panel>

            <Panel title="Predicted categories" subtitle="attack_cat values predicted by a multiclass model">
              {run.categoryCounts && Object.keys(run.categoryCounts).length > 0 ? (
                <BarChart
                  data={Object.entries(run.categoryCounts).map(([name, value]) => ({ name, value }))}
                  height={200}
                />
              ) : (
                <p className="py-6 text-center text-xs text-soc-muted">
                  No category predictions. Train a model on the attack_cat target to obtain them.
                </p>
              )}
            </Panel>
          </div>

          {run.recommendationSummary && run.recommendationSummary.length > 0 && (
            <Panel title="Defensive recommendations" subtitle="Grouped by detected threat">
              <div className="grid gap-3 md:grid-cols-2">
                {run.recommendationSummary.map((item) => (
                  <div key={item.threat} className="rounded-lg border border-soc-border bg-soc-panel2/40 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-soc-text">{item.threat}</p>
                      <Badge className="border-soc-border">{formatNumber(item.count)} record(s)</Badge>
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-soc-muted">
                      {item.actions.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-soc-muted">
                These are defensive recommendations for an analyst. NetShield AI does not block traffic or change any
                network device.
              </p>
            </Panel>
          )}

          <Panel
            title="Detection records"
            subtitle="Filter, search and inspect the scored rows"
            actions={
              <>
                <Button variant="ghost" loading={tableLoading} onClick={() => void loadRows()}>
                  Reload
                </Button>
                <LinkButton href={api.detection.reportUrl(run.id)}>Export CSV</LinkButton>
              </>
            }
          >
            <div className="grid gap-3 lg:grid-cols-6">
              <div className="lg:col-span-2">
                <label className="soc-label" htmlFor="det-search">
                  Search
                </label>
                <input
                  id="det-search"
                  className="soc-input"
                  placeholder="Record reference, reason, class…"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <label className="soc-label" htmlFor="det-severity">
                  Severity
                </label>
                <Select
                  id="det-severity"
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
                <label className="soc-label" htmlFor="det-class">
                  Predicted class
                </label>
                <Select
                  id="det-class"
                  value={predictedClass}
                  onChange={(value) => {
                    setPredictedClass(value);
                    setPage(1);
                  }}
                  options={(run.displayClasses ?? run.classes ?? []).map((value) => ({ value, label: value }))}
                  placeholder="All classes"
                  disabled={(run.classes ?? []).length === 0}
                />
              </div>
              <div>
                <label className="soc-label" htmlFor="det-category">
                  Category
                </label>
                <Select
                  id="det-category"
                  value={category}
                  onChange={(value) => {
                    setCategory(value);
                    setPage(1);
                  }}
                  options={Object.keys(run.categoryCounts ?? {}).map((value) => ({ value, label: value }))}
                  placeholder="All categories"
                  disabled={Object.keys(run.categoryCounts ?? {}).length === 0}
                />
              </div>
              <div>
                <label className="soc-label" htmlFor="det-confidence">
                  Min confidence
                </label>
                <input
                  id="det-confidence"
                  className="soc-input"
                  inputMode="decimal"
                  placeholder={run.confidenceSupported ? '0 – 1' : 'not supported'}
                  value={minConfidence}
                  disabled={!run.confidenceSupported}
                  onChange={(event) => {
                    setMinConfidence(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-soc-muted">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-soc-accent"
                  checked={onlyThreats}
                  onChange={(event) => {
                    setOnlyThreats(event.target.checked);
                    setPage(1);
                  }}
                />
                Threats only
              </label>
              <Button
                variant="ghost"
                onClick={() => {
                  setSeverity('');
                  setPredictedClass('');
                  setCategory('');
                  setMinConfidence('');
                  setSearch('');
                  setOnlyThreats(false);
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
              {table && (
                <span className="text-xs text-soc-muted">{formatNumber(table.total)} matching record(s)</span>
              )}
              {!run.confidenceSupported && (
                <span className="text-xs text-soc-muted">
                  This model does not expose a probability output, so confidence is not shown.
                </span>
              )}
            </div>

            {tableError && (
              <div className="mt-3">
                <ErrorState title="Could not load detection rows" message={tableError} />
              </div>
            )}

            <div className="mt-3 overflow-auto rounded-lg border border-soc-border">
              {tableLoading && rows.length === 0 ? (
                <LoadingBlock label="Loading records…" />
              ) : rows.length === 0 && !tableError ? (
                <EmptyState title="No records match" description="Adjust or clear the filters above." />
              ) : (
                <table className="soc-table text-xs">
                  <thead>
                    <tr>
                      <th />
                      <th>Record</th>
                      <th>Predicted class</th>
                      <th>Category</th>
                      <th className="text-right">Confidence</th>
                      <th>Severity</th>
                      <th>Explanation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const severityInfo = severityMeta(row.severity);
                      const key = row.recordIndex;
                      const open = expanded === key;
                      return (
                        <Fragment key={`det-${key}`}>
                          <tr>
                            <td>
                              <button
                                type="button"
                                className="text-soc-accent hover:underline"
                                aria-expanded={open}
                                onClick={() => setExpanded(open ? null : key)}
                              >
                                {open ? '−' : '+'}
                              </button>
                            </td>
                            <td className="font-mono text-[11px]">{row.recordReference}</td>
                            <td>{row.predictedLabel}</td>
                            <td>{row.attackCategory ?? '—'}</td>
                            <td className="text-right tabular-nums">
                              {row.confidenceSupported && row.confidence !== null ? formatPercent(row.confidence) : '—'}
                            </td>
                            <td>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${severityInfo.badgeClass}`}>
                                {severityInfo.label}
                              </span>
                            </td>
                            <td className="max-w-[26rem] truncate" title={row.detectionReason}>
                              {row.detectionReason}
                            </td>
                          </tr>
                          {open && (
                            <tr className="bg-soc-panel2/60">
                              <td colSpan={7} className="whitespace-normal">
                                <div className="grid gap-3 lg:grid-cols-2">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-soc-muted">
                                      Detection reason
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-soc-text">{row.detectionReason}</p>
                                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-soc-muted">
                                      Recommended action
                                    </p>
                                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-soc-text">
                                      {(row.recommendedActions ?? [row.recommendedAction]).map((action, index) => (
                                        <li key={index}>{action}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-soc-muted">
                                      Input features passed to the model
                                    </p>
                                    <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                                      {Object.entries(row.inputFeatures ?? {}).map(([name, value]) => (
                                        <div key={name} className="min-w-0">
                                          <dt className="truncate text-[10px] text-soc-muted" title={name}>
                                            {name}
                                          </dt>
                                          <dd className="truncate text-[11px] text-soc-text">
                                            {value === null || value === undefined ? '—' : String(value)}
                                          </dd>
                                        </div>
                                      ))}
                                    </dl>
                                  </div>
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
        </>
      )}

      {!run && !job.running && (
        <EmptyState
          title="No detection run loaded"
          description="Upload a traffic CSV and run detection. Results, severities and alerts are persisted by the backend and appear here and on the Security Alerts page."
        />
      )}
    </div>
  );
}
