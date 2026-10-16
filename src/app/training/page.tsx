'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/AppShell';
import { BarChart, DonutChart } from '@/components/charts/charts';
import { DatasetLoader } from '@/components/dataset/DatasetLoader';
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
  ProgressBar,
  SampleBadge,
  Select,
} from '@/components/ui/primitives';
import { useAnalysis } from '@/context/AnalysisContext';
import { api, ApiError } from '@/lib/api';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useJob } from '@/lib/useJob';
import type { DatasetProfile, ModelInfo } from '@/lib/types';

export default function ModelTrainingPage() {
  const {
    selectedDataset,
    selectedDatasetId,
    meta,
    models,
    activeModel,
    activeModelId,
    connection,
    reloadModels,
    refresh,
    notify,
  } = useAnalysis();

  const [algorithm, setAlgorithm] = useState('random_forest');
  const [target, setTarget] = useState('');
  const [sampleLimit, setSampleLimit] = useState('');
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [lastModel, setLastModel] = useState<ModelInfo | null>(null);

  const job = useJob();

  /* ---------------- available targets for the selected dataset ---------------- */
  const targetOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    if (selectedDataset?.binaryTarget) {
      options.push({ value: selectedDataset.binaryTarget, label: `${selectedDataset.binaryTarget} — binary (Normal vs Attack)` });
    }
    if (selectedDataset?.multiclassTarget) {
      options.push({ value: selectedDataset.multiclassTarget, label: `${selectedDataset.multiclassTarget} — multiclass (attack category)` });
    }
    return options;
  }, [selectedDataset]);

  useEffect(() => {
    const first = targetOptions[0]?.value ?? '';
    setTarget((current) => (targetOptions.some((option) => option.value === current) ? current : first));
  }, [targetOptions]);

  useEffect(() => {
    if (!meta?.algorithms?.length) return;
    setAlgorithm((current) =>
      meta.algorithms.some((option) => option.id === current) ? current : meta.algorithms[0].id,
    );
  }, [meta]);

  /* ---------------- class distribution preview ---------------- */
  useEffect(() => {
    let cancelled = false;
    if (!selectedDatasetId) {
      setProfile(null);
      return () => {
        cancelled = true;
      };
    }
    api.datasets
      .summary(selectedDatasetId)
      .then((response) => {
        if (cancelled) return;
        setProfile(response.profile);
        setProfileError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setProfile(null);
        setProfileError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDatasetId]);

  const distribution = useMemo(() => {
    if (!profile || !target) return [];
    if (selectedDataset?.multiclassTarget && target === selectedDataset.multiclassTarget) {
      return profile.attackCategoryDistribution;
    }
    return profile.labelDistribution;
  }, [profile, selectedDataset, target]);

  const canTrain = connection === 'online' && Boolean(selectedDatasetId) && Boolean(target) && !job.running;

  const handleTrain = useCallback(async () => {
    if (!selectedDatasetId || !target) {
      notify('danger', 'Select a dataset and a target column before training.');
      return;
    }
    job.reset();
    const parsedLimit = sampleLimit.trim() === '' ? null : Number(sampleLimit);
    if (parsedLimit !== null && (!Number.isFinite(parsedLimit) || parsedLimit <= 0)) {
      notify('danger', 'Sample limit must be a positive number (or left blank).');
      return;
    }
    const finished = await job.start(() =>
      api.models.train({ datasetId: selectedDatasetId, target, algorithm, sampleLimit: parsedLimit }),
    );
    if (finished?.status === 'succeeded') {
      const result = finished.result as { model?: ModelInfo } | null;
      const trained = result?.model ?? null;
      setLastModel(trained);
      await reloadModels();
      await refresh({ silent: true });
      notify(
        'success',
        `Training completed: ${trained?.algorithmLabel ?? algorithm} on ${formatNumber(trained?.trainingRows ?? 0)} rows.`,
      );
    } else if (finished?.status === 'failed') {
      notify('danger', finished.error ?? 'Training failed.');
    }
  }, [algorithm, job, notify, refresh, reloadModels, sampleLimit, selectedDatasetId, target]);

  const handleActivate = useCallback(
    async (id: string) => {
      try {
        await api.models.activate(id);
        await reloadModels();
        await refresh({ silent: true });
        notify('success', 'Active model updated.');
      } catch (error) {
        notify('danger', error instanceof Error ? error.message : String(error));
      }
    },
    [notify, refresh, reloadModels],
  );

  const handleDelete = useCallback(
    async (id: string, label: string) => {
      if (!window.confirm(`Delete model "${label}"? Its saved pipeline file will be removed.`)) return;
      try {
        await api.models.remove(id);
        await reloadModels();
        await refresh({ silent: true });
        notify('success', 'Model deleted.');
      } catch (error) {
        notify('danger', error instanceof Error ? error.message : String(error));
      }
    },
    [notify, refresh, reloadModels],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Model Training"
        description="Fits a real scikit-learn pipeline (imputation + one-hot encoding + optional scaling + estimator) on the selected training dataset and persists it with joblib. A model is only reported as trained when the backend job actually succeeds."
      />

      <DatasetLoader
        title="Training data"
        subtitle="Use UNSW_NB15_training-set.csv for training. Never train on the testing set."
      />

      {!selectedDatasetId && (
        <EmptyState
          title="No training dataset selected"
          description="Upload a CSV above, or place UNSW_NB15_training-set.csv in the project data/ directory and rescan."
        />
      )}

      {selectedDataset && !targetOptions.length && (
        <ErrorState
          title="No usable target column"
          message="This dataset has no 'label' or 'attack_cat' column, so it cannot be used for supervised classification."
          details={['Expected a label column (binary) and/or an attack_cat column (multiclass).']}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Training configuration"
          subtitle="Preprocessing is fitted on the training split only — the testing set is never touched here."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="soc-label" htmlFor="train-target">
                Target column
              </label>
              <Select
                id="train-target"
                value={target}
                onChange={setTarget}
                options={targetOptions}
                placeholder={targetOptions.length ? undefined : 'No target column available'}
                disabled={targetOptions.length === 0}
              />
              <p className="mt-1 text-[11px] text-soc-muted">
                label → binary classification. attack_cat → multiclass classification.
              </p>
            </div>
            <div>
              <label className="soc-label" htmlFor="train-algorithm">
                Algorithm
              </label>
              <Select
                id="train-algorithm"
                value={algorithm}
                onChange={setAlgorithm}
                options={(meta?.algorithms ?? []).map((option) => ({ value: option.id, label: option.label }))}
                placeholder={meta?.algorithms?.length ? undefined : 'Backend metadata unavailable'}
                disabled={!meta?.algorithms?.length}
              />
              <p className="mt-1 text-[11px] text-soc-muted">
                Hyper-parameters are documented in the backend (app/ml/pipeline.py).
              </p>
            </div>
            <div>
              <label className="soc-label" htmlFor="train-limit">
                Row limit (optional)
              </label>
              <input
                id="train-limit"
                className="soc-input"
                inputMode="numeric"
                placeholder="e.g. 50000 — blank trains on every row"
                value={sampleLimit}
                onChange={(event) => setSampleLimit(event.target.value)}
              />
              <p className="mt-1 text-[11px] text-soc-muted">
                Caps the number of training rows for a quicker experiment. The cap is applied to the training set only.
              </p>
            </div>
            <div>
              <label className="soc-label" htmlFor="train-dataset">
                Training dataset
              </label>
              <input
                id="train-dataset"
                className="soc-input"
                value={selectedDataset?.filename ?? 'No dataset selected'}
                readOnly
              />
              <p className="mt-1 text-[11px] text-soc-muted">
                {selectedDataset ? `${formatNumber(selectedDataset.rows ?? 0)} rows · ${selectedDataset.columns ?? 0} columns` : '—'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="primary" loading={job.running} disabled={!canTrain} onClick={() => void handleTrain()}>
              {job.running ? 'Training…' : activeModel ? 'Train (retrain) model' : 'Train model'}
            </Button>
            <Button variant="ghost" disabled={job.running} onClick={job.reset}>
              Clear
            </Button>
            {connection !== 'online' && <span className="text-xs text-soc-critical">Backend offline.</span>}
          </div>

          {(job.running || job.job) && (
            <div className="mt-4">
              <ProgressBar
                value={job.job?.progress ?? (job.running ? 1 : 0)}
                label={job.job?.message ?? 'Submitting'}
              />
            </div>
          )}

          {job.error && (
            <div className="mt-4">
              <ErrorState title="Training failed" message={job.error} details={job.details} />
            </div>
          )}

          {job.job?.status === 'succeeded' && !job.error && (
            <div className="mt-4">
              <Notice tone="success" title="Training completed">
                The pipeline and its metadata were saved. Evaluation can now be run against the separate testing dataset.
              </Notice>
            </div>
          )}
        </Panel>

        <Panel title="Class distribution" subtitle="From the selected training dataset">
          {profileError && <ErrorState title="Could not load profile" message={profileError} />}
          {!profileError && distribution.length === 0 && (
            <p className="py-6 text-center text-xs text-soc-muted">
              Select a dataset with a target column to preview class balance.
            </p>
          )}
          {distribution.length > 0 && (
            <div className="space-y-4">
              <DonutChart data={distribution} centerLabel="training rows" />
              <BarChart data={distribution} height={160} />
              {distribution.some((entry) => entry.value < 10) && (
                <Notice tone="warning">
                  At least one class has fewer than 10 records. A classifier cannot learn a class with too few examples,
                  and scikit-learn will raise an error if only one class is present.
                </Notice>
              )}
            </div>
          )}
        </Panel>
      </div>

      {lastModel && (
        <Panel title="Last trained model" subtitle="Metadata recorded by the backend">
          <KeyValue
            items={[
              { label: 'Model id', value: lastModel.id },
              { label: 'Algorithm', value: lastModel.algorithmLabel },
              { label: 'Target', value: lastModel.targetLabel },
              { label: 'Training dataset', value: lastModel.datasetName },
              { label: 'Training rows', value: formatNumber(lastModel.trainingRows) },
              { label: 'Feature count', value: formatNumber(lastModel.featureCount) },
              { label: 'Classes', value: lastModel.classes.join(', ') },
              { label: 'Trained at', value: formatDateTime(lastModel.trainedAt) },
              { label: 'Duration', value: lastModel.durationSeconds ? `${lastModel.durationSeconds}s` : '—' },
            ]}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SampleBadge show={lastModel.datasetIsSample} />
            <Badge className="border-soc-border">
              numeric features: {lastModel.numericColumns.length} · categorical: {lastModel.categoricalColumns.length}
            </Badge>
          </div>
          {lastModel.hyperparameters && (
            <p className="mt-3 break-words rounded border border-soc-border bg-soc-panel2/50 px-3 py-2 font-mono text-[11px] text-soc-muted">
              {JSON.stringify(lastModel.hyperparameters)}
            </p>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-soc-accent">Feature columns used ({lastModel.featureColumns.length})</summary>
            <p className="mt-2 break-words font-mono text-[11px] text-soc-muted">
              {lastModel.featureColumns.join(', ')}
            </p>
          </details>
        </Panel>
      )}

      <Panel
        title="Trained models"
        subtitle="Saved pipelines (joblib) plus their recorded metadata"
        actions={
          <Button variant="ghost" onClick={() => void reloadModels()}>
            Reload list
          </Button>
        }
      >
        {models.length === 0 ? (
          <EmptyState
            title="No models trained yet"
            description="Configure the options above and press Train model. The saved artifact includes the fitted preprocessing, so evaluation and detection reuse exactly the same transformations."
          />
        ) : (
          <div className="overflow-auto">
            <table className="soc-table text-xs">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Target</th>
                  <th>Dataset</th>
                  <th className="text-right">Rows</th>
                  <th className="text-right">Features</th>
                  <th>Trained</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.id}>
                    <td className="font-medium">
                      {model.algorithmLabel}
                      {model.id === activeModelId && <span className="ml-2 text-[10px] text-soc-low">active</span>}
                      {model.datasetIsSample && <span className="ml-2 text-[10px] text-soc-medium">sample data</span>}
                    </td>
                    <td>{model.targetLabel}</td>
                    <td className="max-w-[14rem] truncate" title={model.datasetName}>
                      {model.datasetName}
                    </td>
                    <td className="text-right tabular-nums">{formatNumber(model.trainingRows)}</td>
                    <td className="text-right tabular-nums">{formatNumber(model.featureCount)}</td>
                    <td>{formatDateTime(model.trainedAt)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-[11px]"
                          disabled={model.id === activeModelId}
                          onClick={() => void handleActivate(model.id)}
                        >
                          Activate
                        </Button>
                        <Button
                          variant="danger"
                          className="px-2 py-1 text-[11px]"
                          onClick={() => void handleDelete(model.id, model.algorithmLabel)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="What happens during training" subtitle="Anti-leakage guarantees">
        <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-soc-muted">
          <li>`id`, `label` and `attack_cat` (and detected identifier columns) are always excluded from the input features.</li>
          <li>Numeric columns are imputed with the median, categorical columns with the most frequent value; logistic regression also standardises numeric features.</li>
          <li>Categorical values are one-hot encoded with `handle_unknown=&quot;ignore&quot;`, so unseen categories at detection time do not crash the model.</li>
          <li>The preprocessing and the estimator are stored as a single Pipeline — there is no separate scaler to re-fit later.</li>
          <li>The random seed is fixed, so identical inputs produce identical models.</li>
        </ul>
        <p className="mt-3 text-xs text-soc-muted">
          Next step: <Link href="/evaluation" className="text-soc-accent hover:underline">evaluate the model</Link> against the
          held-out testing dataset.
        </p>
      </Panel>

      {!profile && selectedDatasetId && !profileError && <LoadingBlock label="Loading class distribution…" />}
    </div>
  );
}
