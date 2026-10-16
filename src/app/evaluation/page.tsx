'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/AppShell';
import { ConfusionMatrix, MetricBar } from '@/components/charts/charts';
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
  Panel,
  ProgressBar,
  SampleBadge,
  Select,
} from '@/components/ui/primitives';
import { useAnalysis } from '@/context/AnalysisContext';
import { api } from '@/lib/api';
import { formatDateTime, formatDecimal, formatNumber, formatPercent } from '@/lib/format';
import { useJob } from '@/lib/useJob';
import type { EvaluationComparisonRow, EvaluationRecord } from '@/lib/types';

export default function ModelEvaluationPage() {
  const { models, datasets, activeModel, connection, evaluation, setEvaluationLocally, refresh, notify } = useAnalysis();

  const [modelId, setModelId] = useState('');
  const [testDatasetId, setTestDatasetId] = useState('');
  const [records, setRecords] = useState<EvaluationRecord[]>([]);
  const [comparison, setComparison] = useState<EvaluationComparisonRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const job = useJob();

  useEffect(() => {
    if (models.length === 0) return;
    setModelId((current) =>
      current && models.some((model) => model.id === current) ? current : (activeModel?.id ?? models[0].id),
    );
  }, [activeModel, models]);

  useEffect(() => {
    const testingFirst =
      datasets.find((dataset) => /test/i.test(dataset.filename)) ??
      datasets.find((dataset) => dataset.id !== activeModel?.datasetName) ??
      datasets[0];
    setTestDatasetId((current) =>
      current && datasets.some((dataset) => dataset.id === current) ? current : (testingFirst?.id ?? ''),
    );
  }, [activeModel, datasets]);

  const loadEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.evaluations.list();
      setRecords(response.items ?? []);
      setComparison(response.comparison ?? []);
      setSelectedId((current) => current ?? response.items?.[0]?.id ?? null);
      setLoadError(null);
    } catch (error) {
      setRecords([]);
      setComparison([]);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvaluations();
  }, [loadEvaluations]);

  const selected = useMemo(
    () => records.find((record) => record.id === selectedId) ?? evaluation ?? records[0] ?? null,
    [evaluation, records, selectedId],
  );

  const canRun = connection === 'online' && Boolean(modelId) && Boolean(testDatasetId) && !job.running;

  const handleRun = useCallback(async () => {
    if (!modelId || !testDatasetId) {
      notify('danger', 'Select both a model and a testing dataset.');
      return;
    }
    job.reset();
    const finished = await job.start(() => api.evaluations.run({ modelId, testDatasetId }));
    if (finished?.status === 'succeeded') {
      const result = finished.result as { evaluation?: EvaluationRecord } | null;
      const record = result?.evaluation ?? null;
      if (record) {
        setEvaluationLocally(record);
        setSelectedId(record.id);
      }
      await loadEvaluations();
      await refresh({ silent: true });
      notify('success', `Evaluation complete on ${formatNumber(record?.rowsEvaluated ?? 0)} records.`);
    } else if (finished?.status === 'failed') {
      notify('danger', finished.error ?? 'Evaluation failed.');
    }
  }, [job, loadEvaluations, modelId, notify, refresh, setEvaluationLocally, testDatasetId]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Model Evaluation"
        description="Scores the trained model against a separate, held-out testing dataset. The saved preprocessing is loaded, never re-fitted, and every metric below is computed from the model's actual predictions."
        actions={
          selected && <LinkButton href={api.evaluations.reportUrl(selected.id)} variant="primary">Export evaluation CSV</LinkButton>
        }
      />

      {models.length === 0 && (
        <EmptyState
          title="No trained model available"
          description="Train a model first — evaluation needs a persisted pipeline. Nothing is simulated here."
        />
      )}

      {models.length > 0 && datasets.length === 0 && (
        <EmptyState
          title="No testing dataset available"
          description="Upload UNSW_NB15_testing-set.csv on the Dataset Analysis page. Evaluating on the training set would overstate performance."
        />
      )}

      <Panel title="Run an evaluation" subtitle="Choose the model to evaluate and the held-out dataset to score it on">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="soc-label" htmlFor="eval-model">
              Trained model
            </label>
            <Select
              id="eval-model"
              value={modelId}
              onChange={setModelId}
              options={models.map((model) => ({
                value: model.id,
                label: `${model.algorithmLabel} · ${model.targetLabel} · trained ${formatDateTime(model.trainedAt)}`,
              }))}
              placeholder={models.length ? undefined : 'No models trained'}
              disabled={models.length === 0}
            />
          </div>
          <div>
            <label className="soc-label" htmlFor="eval-dataset">
              Testing dataset
            </label>
            <Select
              id="eval-dataset"
              value={testDatasetId}
              onChange={setTestDatasetId}
              options={datasets.map((dataset) => ({
                value: dataset.id,
                label: `${dataset.filename} · ${formatNumber(dataset.rows ?? 0)} rows${dataset.isSample ? ' · sample' : ''}`,
              }))}
              placeholder={datasets.length ? undefined : 'No datasets loaded'}
              disabled={datasets.length === 0}
            />
            {datasets.find((dataset) => dataset.id === testDatasetId)?.isSample && (
              <p className="mt-1 text-[11px] text-soc-medium">
                The selected testing dataset is synthetic sample data — results are not UNSW-NB15 measurements.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="primary" loading={job.running} disabled={!canRun} onClick={() => void handleRun()}>
            {job.running ? 'Evaluating…' : 'Evaluate model'}
          </Button>
          <Button variant="ghost" disabled={job.running} onClick={job.reset}>
            Clear
          </Button>
          {connection !== 'online' && <span className="text-xs text-soc-critical">Backend offline.</span>}
        </div>

        {(job.running || job.job) && (
          <div className="mt-4">
            <ProgressBar value={job.job?.progress ?? (job.running ? 1 : 0)} label={job.job?.message ?? 'Submitting'} />
          </div>
        )}

        {job.error && (
          <div className="mt-4">
            <ErrorState title="Evaluation failed" message={job.error} details={job.details} />
          </div>
        )}
      </Panel>

      {loading && <LoadingBlock label="Loading evaluation history…" />}

      {loadError && <ErrorState title="Could not load evaluations" message={loadError} />}

      {!loading && !selected && (
        <EmptyState
          title="No evaluation recorded yet"
          description="Run an evaluation above. Metrics are only ever displayed after the backend has actually predicted on the held-out data."
        />
      )}

      {selected && (
        <>
          {(selected.modelDatasetIsSample || selected.evaluationDatasetIsSample) && (
            <Notice tone="warning" title="Sample data in use">
              At least one of the datasets involved is synthetic sample data. These metrics must not be reported as
              UNSW-NB15 performance.
            </Notice>
          )}

          {selected.warnings?.length > 0 && (
            <Notice tone="warning" title="Evaluation warnings">
              <ul className="list-disc space-y-1 pl-4">
                {selected.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </Notice>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Accuracy" value={formatPercent(selected.accuracy)} hint={`${formatNumber(selected.correct)} / ${formatNumber(selected.support)} correct`} accent="cyan" />
            <MetricCard label="Precision (macro)" value={formatPercent(selected.macroPrecision)} accent="purple" />
            <MetricCard label="Recall (macro)" value={formatPercent(selected.macroRecall)} accent="purple" />
            <MetricCard label="F1 (macro)" value={formatPercent(selected.macroF1)} accent="low" />
            <MetricCard label="False-positive rate" value={formatPercent(selected.macroFalsePositiveRate)} hint="macro one-vs-rest" accent="high" />
            <MetricCard label="False-negative rate" value={formatPercent(selected.macroFalseNegativeRate)} hint="macro one-vs-rest" accent="critical" />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2" title="Confusion matrix" subtitle="Rows = actual class, columns = predicted class">
              <ConfusionMatrix
                labels={selected.labels}
                displayLabels={selected.displayLabels}
                matrix={selected.confusionMatrix}
              />
            </Panel>

            <Panel title="Evaluation context" subtitle="Model, data and configuration used">
              <KeyValue
                items={[
                  { label: 'Algorithm', value: selected.algorithmLabel },
                  { label: 'Target', value: selected.targetLabel },
                  { label: 'Training dataset', value: selected.modelDatasetName },
                  { label: 'Testing dataset', value: selected.evaluationDatasetName },
                  { label: 'Rows evaluated', value: formatNumber(selected.rowsEvaluated) },
                  { label: 'Rows dropped (no target)', value: formatNumber(selected.rowsDroppedMissingTarget) },
                  { label: 'Classes', value: selected.displayLabels.join(', ') },
                  { label: 'Evaluated at', value: formatDateTime(selected.evaluatedAt) },
                  { label: 'Classification type', value: selected.isMulticlass ? 'Multiclass' : 'Binary' },
                ]}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <SampleBadge show={selected.modelDatasetIsSample} />
                <SampleBadge show={selected.evaluationDatasetIsSample} />
              </div>
            </Panel>
          </div>

          {selected.binary && selected.binary.precision !== undefined && (
            <Panel
              title="Binary metrics"
              subtitle={`Positive class: ${selected.binary.positiveClass ?? '—'} · negative class: ${selected.binary.negativeClass ?? '—'}`}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricBar label="Precision" value={selected.binary.precision ?? null} />
                <MetricBar label="Recall (detection rate)" value={selected.binary.recall ?? null} />
                <MetricBar label="F1" value={selected.binary.f1 ?? null} />
                <MetricBar label="False-positive rate" value={selected.binary.falsePositiveRate ?? null} tone="critical" />
              </div>
              <div className="mt-4 grid gap-4 text-xs sm:grid-cols-4">
                <div className="rounded-lg border border-soc-border bg-soc-panel2/40 px-3 py-2">
                  <p className="text-soc-muted">True positives</p>
                  <p className="text-lg tabular-nums text-soc-low">{formatNumber(selected.binary.truePositive)}</p>
                </div>
                <div className="rounded-lg border border-soc-border bg-soc-panel2/40 px-3 py-2">
                  <p className="text-soc-muted">False positives</p>
                  <p className="text-lg tabular-nums text-soc-critical">{formatNumber(selected.binary.falsePositive)}</p>
                </div>
                <div className="rounded-lg border border-soc-border bg-soc-panel2/40 px-3 py-2">
                  <p className="text-soc-muted">False negatives</p>
                  <p className="text-lg tabular-nums text-soc-high">{formatNumber(selected.binary.falseNegative)}</p>
                </div>
                <div className="rounded-lg border border-soc-border bg-soc-panel2/40 px-3 py-2">
                  <p className="text-soc-muted">True negatives</p>
                  <p className="text-lg tabular-nums text-soc-text">{formatNumber(selected.binary.trueNegative)}</p>
                </div>
              </div>
            </Panel>
          )}

          <Panel
            title="Classification report"
            subtitle="Per-class precision, recall, F1 and support — computed from the confusion matrix"
          >
            <div className="overflow-auto">
              <table className="soc-table text-xs">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th className="text-right">Support</th>
                    <th className="text-right">TP</th>
                    <th className="text-right">FP</th>
                    <th className="text-right">FN</th>
                    <th className="text-right">Precision</th>
                    <th className="text-right">Recall</th>
                    <th className="text-right">F1</th>
                    <th className="text-right">FPR</th>
                    <th className="text-right">FNR</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.perClass.map((metric) => (
                    <tr key={metric.label}>
                      <td className="font-medium">{metric.displayLabel ?? metric.label}</td>
                      <td className="text-right tabular-nums">{formatNumber(metric.support)}</td>
                      <td className="text-right tabular-nums">{formatNumber(metric.truePositive)}</td>
                      <td className="text-right tabular-nums">{formatNumber(metric.falsePositive)}</td>
                      <td className="text-right tabular-nums">{formatNumber(metric.falseNegative)}</td>
                      <td className="text-right tabular-nums">{formatPercent(metric.precision)}</td>
                      <td className="text-right tabular-nums">{formatPercent(metric.recall)}</td>
                      <td className="text-right tabular-nums">{formatPercent(metric.f1)}</td>
                      <td className="text-right tabular-nums">{formatPercent(metric.falsePositiveRate)}</td>
                      <td className="text-right tabular-nums">{formatPercent(metric.falseNegativeRate)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-soc-border text-soc-muted">
                    <td>Macro average</td>
                    <td className="text-right tabular-nums">{formatNumber(selected.support)}</td>
                    <td colSpan={3} />
                    <td className="text-right tabular-nums">{formatPercent(selected.macroPrecision)}</td>
                    <td className="text-right tabular-nums">{formatPercent(selected.macroRecall)}</td>
                    <td className="text-right tabular-nums">{formatPercent(selected.macroF1)}</td>
                    <td className="text-right tabular-nums">{formatPercent(selected.macroFalsePositiveRate)}</td>
                    <td className="text-right tabular-nums">{formatPercent(selected.macroFalseNegativeRate)}</td>
                  </tr>
                  <tr className="text-soc-muted">
                    <td>Weighted average</td>
                    <td className="text-right tabular-nums">{formatNumber(selected.support)}</td>
                    <td colSpan={3} />
                    <td className="text-right tabular-nums">{formatPercent(selected.weightedPrecision)}</td>
                    <td className="text-right tabular-nums">{formatPercent(selected.weightedRecall)}</td>
                    <td className="text-right tabular-nums">{formatPercent(selected.weightedF1)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-3 rounded-lg border border-soc-border bg-soc-panel2/40 px-3 py-2 text-[11px] leading-relaxed text-soc-muted">
              <strong className="text-soc-text">How FPR / FNR are calculated:</strong> {selected.fprFnrExplanation}
              {' '}Undefined values (a class with a zero-sized denominator) are shown as “—” and excluded from the average
              instead of being reported as 0.
            </p>
          </Panel>

          <Panel
            title="Model comparison"
            subtitle="Every evaluation recorded by the backend, newest first"
            actions={
              <Button variant="ghost" onClick={() => void loadEvaluations()}>
                Reload
              </Button>
            }
          >
            {comparison.length === 0 ? (
              <EmptyState title="Nothing to compare yet" />
            ) : (
              <div className="overflow-auto">
                <table className="soc-table text-xs">
                  <thead>
                    <tr>
                      <th>Algorithm</th>
                      <th>Target</th>
                      <th>Testing dataset</th>
                      <th className="text-right">Rows</th>
                      <th className="text-right">Accuracy</th>
                      <th className="text-right">Precision</th>
                      <th className="text-right">Recall</th>
                      <th className="text-right">F1</th>
                      <th className="text-right">FPR</th>
                      <th className="text-right">FNR</th>
                      <th>Evaluated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((row) => (
                      <tr key={row.modelId + row.evaluatedAt}>
                        <td className="font-medium">{row.algorithmLabel}</td>
                        <td>{row.targetLabel}</td>
                        <td className="max-w-[12rem] truncate" title={row.evaluationDatasetName}>
                          {row.evaluationDatasetName}
                        </td>
                        <td className="text-right tabular-nums">{formatNumber(row.rowsEvaluated)}</td>
                        <td className="text-right tabular-nums">{formatPercent(row.accuracy)}</td>
                        <td className="text-right tabular-nums">{formatPercent(row.macroPrecision)}</td>
                        <td className="text-right tabular-nums">{formatPercent(row.macroRecall)}</td>
                        <td className="text-right tabular-nums">{formatPercent(row.macroF1)}</td>
                        <td className="text-right tabular-nums">{formatPercent(row.macroFalsePositiveRate)}</td>
                        <td className="text-right tabular-nums">{formatPercent(row.macroFalseNegativeRate)}</td>
                        <td>{formatDateTime(row.evaluatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Evaluation history" subtitle="Select an earlier run to inspect it">
            <div className="flex flex-wrap gap-2">
              {records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedId(record.id)}
                  className={
                    record.id === selected.id
                      ? 'rounded-lg border border-soc-accent/50 bg-soc-accent/15 px-3 py-2 text-left text-xs text-soc-accent'
                      : 'rounded-lg border border-soc-border bg-soc-panel2 px-3 py-2 text-left text-xs text-soc-muted hover:text-soc-text'
                  }
                >
                  <span className="block font-medium">{record.algorithmLabel}</span>
                  <span className="block">{record.targetLabel} · {formatPercent(record.accuracy)} accuracy</span>
                  <span className="block text-[10px]">{formatDateTime(record.evaluatedAt)}</span>
                </button>
              ))}
            </div>
            {records.length > 0 && (
              <p className="mt-3 text-[11px] text-soc-muted">
                {records.length} evaluation run(s) stored. Accuracy of the selected run:{' '}
                <span className="tabular-nums text-soc-text">{formatDecimal(selected.accuracy, 4)}</span>
              </p>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
