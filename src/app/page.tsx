'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/AppShell';
import { BarChart, ChartLegend, DonutChart } from '@/components/charts/charts';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  KeyValue,
  LoadingBlock,
  MetricCard,
  Notice,
  Panel,
  SampleBadge,
  StatusDot,
} from '@/components/ui/primitives';
import { useAnalysis } from '@/context/AnalysisContext';
import { api, ApiError } from '@/lib/api';
import { formatDateTime, formatNumber, formatPercent, formatRelative } from '@/lib/format';
import { SEVERITY_ORDER, chartColor, severityMeta, statusMeta } from '@/lib/severity';
import type { AlertRecord, DatasetProfile, DistributionEntry } from '@/lib/types';

export default function DashboardPage() {
  const {
    connection,
    connectionError,
    health,
    meta,
    datasets,
    selectedDataset,
    selectedDatasetId,
    activeModel,
    evaluation,
    detection,
    alertStats,
    storage,
    loading,
    refreshing,
    refresh,
    notify,
  } = useAnalysis();

  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [profileState, setProfileState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [profileError, setProfileError] = useState<{ message: string; details?: string[] } | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<AlertRecord[]>([]);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);

  /* ---------------- selected dataset profile ---------------- */
  useEffect(() => {
    let cancelled = false;
    if (!selectedDatasetId) {
      setProfile(null);
      setProfileState('idle');
      return () => {
        cancelled = true;
      };
    }
    setProfileState('loading');
    setProfileError(null);
    api.datasets
      .summary(selectedDatasetId)
      .then((response) => {
        if (cancelled) return;
        setProfile(response.profile);
        setProfileState('idle');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setProfile(null);
        setProfileState('error');
        setProfileError(
          error instanceof ApiError
            ? { message: error.message, details: error.details }
            : { message: error instanceof Error ? error.message : String(error) },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDatasetId]);

  /* ---------------- recent alerts ---------------- */
  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const response = await api.alerts.list({ page: 1, pageSize: 6, sort: 'createdAt', order: 'desc' });
      setRecentAlerts(response.items ?? []);
      setAlertsError(null);
    } catch (error) {
      setRecentAlerts([]);
      setAlertsError(error instanceof Error ? error.message : String(error));
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), loadAlerts()]);
    notify('info', 'Dashboard refreshed from the backend.');
  }, [loadAlerts, notify, refresh]);

  /* ---------------- derived numbers (never invented) ---------------- */
  const counts = useMemo(() => {
    const labelEntries = profile?.labelDistribution ?? [];
    const attack = labelEntries.find((entry) => entry.name.toLowerCase() === 'attack')?.value ?? null;
    const normal = labelEntries.find((entry) => entry.name.toLowerCase() === 'normal')?.value ?? null;
    return { attack, normal, labelEntries };
  }, [profile]);

  const severityEntries: DistributionEntry[] = useMemo(() => {
    if (!alertStats?.bySeverity) return [];
    return SEVERITY_ORDER.map((severity) => ({
      name: severityMeta(severity).label,
      value: alertStats.bySeverity[severity] ?? 0,
    }));
  }, [alertStats]);

  const statusEntries: DistributionEntry[] = useMemo(() => {
    if (!alertStats?.byStatus) return [];
    return (['open', 'acknowledged', 'resolved'] as const).map((status) => ({
      name: statusMeta(status).label,
      value: alertStats.byStatus[status] ?? 0,
    }));
  }, [alertStats]);

  const highRisk =
    (alertStats?.bySeverity?.critical ?? 0) + (alertStats?.bySeverity?.high ?? 0);

  const protoDistribution = profile?.distributions?.proto ?? [];
  const serviceDistribution = profile?.distributions?.service ?? [];
  const stateDistribution = profile?.distributions?.state ?? [];

  const realDatasets = datasets.filter((item) => !item.isSample);

  if (loading) {
    return <LoadingBlock label="Connecting to the NetShield backend…" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Security Dashboard"
        description="Aggregated posture built from the datasets, models, detection runs and alerts that actually exist on the backend. Nothing on this page is simulated traffic."
        actions={
          <>
            <Button variant="ghost" loading={refreshing} onClick={() => void handleRefresh()}>
              Refresh
            </Button>
            {selectedDataset ? (
              <Link href="/dataset" className="soc-btn-primary">
                Open dataset analysis
              </Link>
            ) : (
              <Link href="/dataset" className="soc-btn-primary">
                Load a dataset
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="soc-panel flex items-center gap-2.5 px-3 py-2 text-xs">
          <StatusDot className={connection === 'online' ? 'bg-soc-low' : connection === 'connecting' ? 'bg-soc-medium' : 'bg-soc-critical'} />
          <span className="text-soc-muted">Backend</span>
          <span className="text-soc-text">{connection}</span>
          {health?.scikitLearn && <Badge className="ml-auto border-soc-border">scikit-learn {health.scikitLearn}</Badge>}
        </div>
        <div className="soc-panel flex items-center gap-2 px-3 py-2 text-xs">
          <span className="text-soc-muted">Last analysis</span>
          <span className="ml-auto text-soc-text">{formatDateTime(selectedDataset?.analyzedAt ?? storage?.serverTime)}</span>
        </div>
        <div className="soc-panel flex items-center gap-2 px-3 py-2 text-xs">
          <span className="text-soc-muted">Server time</span>
          <span className="ml-auto text-soc-text">{formatDateTime(storage?.serverTime ?? health?.time)}</span>
        </div>
        <div className="soc-panel flex items-center gap-2 px-3 py-2 text-xs">
          <span className="text-soc-muted">Storage used</span>
          <span className="ml-auto text-soc-text">{formatNumber(storage?.storageBytes ?? 0)} B</span>
        </div>
      </div>

      {connection === 'offline' && (
        <Notice tone="danger" title="Backend unreachable">
          {connectionError ??
            'Start the FastAPI backend (cd backend && .venv\\Scripts\\python -m uvicorn app.main:app --port 8000) and retry.'}
        </Notice>
      )}

      {!selectedDataset && (
        <EmptyState
          title="No dataset loaded"
          description="Upload UNSW_NB15_training-set.csv and UNSW_NB15_testing-set.csv on the Dataset Analysis page, or place them in the project data/ directory. The dashboard populates from real records only."
          action={
            <Link href="/dataset" className="soc-btn-primary">
              Go to Dataset Analysis
            </Link>
          }
        />
      )}

      {profileError && (
        <ErrorState
          title="Could not load the dataset profile"
          message={profileError.message}
          details={profileError.details}
          action={
            <Button variant="ghost" onClick={() => void handleRefresh()}>
              Retry
            </Button>
          }
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          label="Records analysed"
          value={profile ? formatNumber(profile.rows) : selectedDataset ? formatNumber(selectedDataset.rows ?? 0) : '—'}
          hint={selectedDataset ? selectedDataset.filename : 'No dataset selected'}
          accent="cyan"
        />
        <MetricCard
          label="Normal traffic"
          value={counts.normal === null ? '—' : formatNumber(counts.normal)}
          hint={counts.normal === null ? 'Requires a label column' : 'Rows with label = 0'}
          accent="low"
        />
        <MetricCard
          label="Attack records"
          value={counts.attack === null ? '—' : formatNumber(counts.attack)}
          hint={counts.attack === null ? 'Requires a label column' : 'Rows with label = 1'}
          accent="critical"
        />
        <MetricCard
          label="High + critical alerts"
          value={formatNumber(highRisk)}
          hint={`${formatNumber(alertStats?.total ?? 0)} alerts total`}
          accent="high"
        />
        <MetricCard
          label="Open alerts"
          value={formatNumber(alertStats?.byStatus?.open ?? 0)}
          hint={`${formatNumber(alertStats?.byStatus?.acknowledged ?? 0)} acknowledged · ${formatNumber(alertStats?.byStatus?.resolved ?? 0)} resolved`}
          accent="medium"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Attack category distribution"
          subtitle="Distribution of the attack_cat column across the analysed records"
        >
          <BarChart
            data={profile?.attackCategoryDistribution ?? []}
            emptyLabel="No attack_cat column in the selected dataset."
            height={220}
          />
        </Panel>

        <Panel
          title="Label distribution"
          subtitle="Binary label mapping produced by the backend profile"
        >
          {profile && counts.labelEntries.length > 0 ? (
            <DonutChart
              data={counts.labelEntries}
              centerLabel="records"
              centerValue={formatNumber(profile.rows)}
            />
          ) : (
            <p className="py-6 text-center text-xs text-soc-muted">No label column in the selected dataset.</p>
          )}
        </Panel>

        <Panel title="Protocol distribution" subtitle="Traffic by protocol (proto column)">
          <BarChart data={protoDistribution} emptyLabel="No proto column in the selected dataset." height={220} />
        </Panel>

        <Panel title="Service distribution" subtitle="Traffic by network service (service column)">
          <BarChart data={serviceDistribution} emptyLabel="No service column in the selected dataset." height={220} />
        </Panel>

        <Panel title="Risk severity distribution" subtitle="Severity assigned to generated security alerts">
          {severityEntries.length > 0 && (alertStats?.total ?? 0) > 0 ? (
            <div className="space-y-3">
              <BarChart data={severityEntries} height={160} />
              <ChartLegend
                items={SEVERITY_ORDER.map((severity, index) => ({
                  label: severityMeta(severity).label,
                  color: chartColor(index),
                  value: formatNumber(alertStats?.bySeverity?.[severity] ?? 0),
                }))}
              />
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-soc-muted">
              No alerts have been generated yet. Run a detection with a trained model first.
            </p>
          )}
        </Panel>

        <Panel title="Alert status distribution" subtitle="Open / acknowledged / resolved">
          {statusEntries.length > 0 && (alertStats?.total ?? 0) > 0 ? (
            <DonutChart data={statusEntries} centerLabel="alerts" />
          ) : (
            <p className="py-6 text-center text-xs text-soc-muted">No alerts recorded.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Model status" subtitle="Active trained model on the backend">
          {activeModel ? (
            <>
              <KeyValue
                items={[
                  { label: 'Algorithm', value: activeModel.algorithmLabel },
                  { label: 'Target', value: activeModel.targetLabel },
                  { label: 'Training dataset', value: activeModel.datasetName },
                  { label: 'Training rows', value: formatNumber(activeModel.trainingRows) },
                  { label: 'Feature count', value: formatNumber(activeModel.featureCount) },
                  { label: 'Trained at', value: formatDateTime(activeModel.trainedAt) },
                ]}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SampleBadge show={activeModel.datasetIsSample} />
                <Badge className="border-soc-border">classes: {activeModel.classes.join(', ')}</Badge>
              </div>
            </>
          ) : (
            <EmptyState
              title="No trained model"
              description="Training is a real scikit-learn fit. Nothing is reported as trained until the backend finishes the job."
              action={
                <Link href="/training" className="soc-btn-primary">
                  Train a model
                </Link>
              }
            />
          )}
        </Panel>

        <Panel title="Evaluation status" subtitle="Latest held-out evaluation">
          {evaluation ? (
            <>
              <KeyValue
                items={[
                  { label: 'Algorithm', value: evaluation.algorithmLabel },
                  { label: 'Test dataset', value: evaluation.evaluationDatasetName },
                  { label: 'Rows evaluated', value: formatNumber(evaluation.rowsEvaluated) },
                  { label: 'Accuracy', value: formatPercent(evaluation.accuracy) },
                  { label: 'Macro F1', value: formatPercent(evaluation.macroF1) },
                  { label: 'Evaluated at', value: formatDateTime(evaluation.evaluatedAt) },
                ]}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="border-soc-border">
                  FPR {formatPercent(evaluation.macroFalsePositiveRate)}
                </Badge>
                <Badge className="border-soc-border">
                  FNR {formatPercent(evaluation.macroFalseNegativeRate)}
                </Badge>
                <Link href="/evaluation" className="text-xs text-soc-accent hover:underline">
                  Full evaluation →
                </Link>
              </div>
            </>
          ) : (
            <EmptyState
              title="Not evaluated"
              description="Metrics appear only after the model has actually been scored against a separate testing dataset."
              action={
                <Link href="/evaluation" className="soc-btn-primary">
                  Evaluate model
                </Link>
              }
            />
          )}
        </Panel>

        <Panel title="Latest detection run" subtitle="Threat detection activity">
          {detection ? (
            <>
              <KeyValue
                items={[
                  { label: 'Source file', value: detection.sourceFilename },
                  { label: 'Mode', value: detection.modeLabel },
                  { label: 'Rows scanned', value: formatNumber(detection.rowsScanned) },
                  { label: 'Predicted attacks', value: formatNumber(detection.predictedAttackCount) },
                  { label: 'Attack rate', value: formatPercent(detection.attackRate, { alreadyPercent: true }) },
                  { label: 'Run at', value: formatDateTime(detection.createdAt) },
                ]}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="border-soc-border">alerts created: {formatNumber(detection.alertsCreated)}</Badge>
                <Link href="/detection" className="text-xs text-soc-accent hover:underline">
                  Open detection →
                </Link>
              </div>
            </>
          ) : (
            <EmptyState
              title="No detection run yet"
              description="Threat Detection scores an uploaded CSV with the active model and persists every prediction."
              action={
                <Link href="/detection" className="soc-btn-primary">
                  Run detection
                </Link>
              }
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Recent security alerts"
          subtitle="Newest alerts raised from machine-learning detections"
          actions={
            <>
              <Button variant="ghost" loading={alertsLoading} onClick={() => void loadAlerts()}>
                Reload
              </Button>
              <Link href="/alerts" className="soc-btn-ghost">
                Manage alerts
              </Link>
            </>
          }
        >
          {alertsError && <ErrorState title="Could not load alerts" message={alertsError} />}
          {!alertsError && recentAlerts.length === 0 && (
            <EmptyState
              title="No alerts yet"
              description="Alerts are created only from model-flagged threats. Rule-based assessments never raise alerts."
            />
          )}
          {recentAlerts.length > 0 && (
            <div className="overflow-auto">
              <table className="soc-table text-xs">
                <thead>
                  <tr>
                    <th>Alert</th>
                    <th>Detected</th>
                    <th>Class / category</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAlerts.map((alert) => {
                    const severity = severityMeta(alert.severity);
                    const status = statusMeta(alert.status);
                    return (
                      <tr key={alert.id}>
                        <td className="font-mono text-[11px]">{alert.id}</td>
                        <td>{formatRelative(alert.createdAt)}</td>
                        <td className="max-w-[16rem] truncate" title={alert.attackCategory ?? alert.predictedClass ?? ''}>
                          {alert.attackCategory ?? alert.predictedClass ?? '—'}
                        </td>
                        <td>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${severity.badgeClass}`}>
                            {severity.label}
                          </span>
                        </td>
                        <td>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${status.badgeClass}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Dataset loading status" subtitle="Every dataset the backend currently knows about">
          {datasets.length === 0 ? (
            <EmptyState title="No datasets" description="Upload a CSV on the Dataset Analysis page to begin." />
          ) : (
            <ul className="space-y-2 text-xs">
              {datasets.slice(0, 6).map((dataset) => (
                <li key={dataset.id} className="rounded-lg border border-soc-border bg-soc-panel2/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-soc-text" title={dataset.filename}>
                      {dataset.filename}
                    </span>
                    <SampleBadge show={dataset.isSample} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-soc-muted">
                    <span>{formatNumber(dataset.rows ?? 0)} rows</span>
                    <span>{dataset.columns ?? 0} cols</span>
                    <span>{dataset.source === 'project' ? 'data/ directory' : 'uploaded'}</span>
                    <span>{formatRelative(dataset.analyzedAt)}</span>
                  </div>
                </li>
              ))}
              {realDatasets.length === 0 && datasets.length > 0 && (
                <li className="text-[11px] text-soc-medium">
                  Only sample data is loaded — these numbers are not UNSW-NB15 measurements.
                </li>
              )}
            </ul>
          )}
          {meta && (
            <p className="mt-3 border-t border-soc-border pt-2 text-[11px] text-soc-muted">
              Severity thresholds: critical ≥ {meta.severityRules.critical}, high ≥ {meta.severityRules.high}, medium ≥{' '}
              {meta.severityRules.medium}. {stateDistribution.length > 0 && `TCP-state distribution available (${stateDistribution.length} states).`}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
