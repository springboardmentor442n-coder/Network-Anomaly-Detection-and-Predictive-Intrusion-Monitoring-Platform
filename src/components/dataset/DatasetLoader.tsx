'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAnalysis } from '@/context/AnalysisContext';
import { Badge, Button, Panel, SampleBadge, Select } from '@/components/ui/primitives';
import { cn, formatNumber } from '@/lib/format';
import type { ProjectFile } from '@/lib/types';

/**
 * Shared dataset picker + CSV uploader.
 *
 * Used by the Dataset Analysis, Model Training, Model Evaluation and
 * Threat Detection pages so all of them see exactly the same dataset list.
 */
export function DatasetLoader({
  title = 'Datasets',
  subtitle,
  filter,
  allowDelete = true,
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  /** Restrict the selectable datasets (e.g. only datasets that contain a `label` column). */
  filter?: (dataset: NonNullable<ReturnType<typeof useAnalysis>['selectedDataset']>) => boolean;
  allowDelete?: boolean;
  compact?: boolean;
}) {
  const {
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    selectedDataset,
    reloadDatasets,
    notify,
    connection,
  } = useAnalysis();

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [projectInfo, setProjectInfo] = useState<{ directory: string; exists: boolean; hint: string | null } | null>(
    null,
  );
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadProjectFiles = useCallback(async () => {
    try {
      const response = await api.datasets.projectFiles();
      setProjectFiles(response.files ?? []);
      setProjectInfo({ directory: response.directory, exists: response.exists, hint: response.hint });
    } catch {
      setProjectFiles([]);
    }
  }, []);

  useEffect(() => {
    void loadProjectFiles();
  }, [loadProjectFiles]);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError({ message: 'Only .csv files are supported.', details: [file.name] });
        notify('danger', 'Rejected: only .csv files can be uploaded.');
        return;
      }
      setUploading(true);
      try {
        const dataset = await api.datasets.upload(file);
        await reloadDatasets();
        setSelectedDatasetId(dataset.id);
        notify(
          'success',
          `Loaded ${dataset.filename} (${formatNumber(dataset.rows ?? 0)} rows, ${dataset.columns ?? 0} columns).`,
        );
        if (dataset.isSample) {
          notify('warning', 'This file looks like sample data. It is not the real UNSW-NB15 dataset.');
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError({ message: err.message, details: err.details });
          notify('danger', err.message);
        } else {
          const message = err instanceof Error ? err.message : String(err);
          setError({ message });
          notify('danger', message);
        }
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [notify, reloadDatasets, setSelectedDatasetId],
  );

  const handleDelete = useCallback(
    async (id: string, filename: string) => {
      if (!window.confirm(`Delete dataset "${filename}" and its cached profile? This cannot be undone.`)) return;
      try {
        await api.datasets.remove(id);
        const remaining = await reloadDatasets();
        if (selectedDatasetId === id) setSelectedDatasetId(remaining[0]?.id ?? null);
        notify('success', `Deleted ${filename}.`);
      } catch (err) {
        notify('danger', err instanceof Error ? err.message : String(err));
      }
    },
    [notify, reloadDatasets, selectedDatasetId, setSelectedDatasetId],
  );

  const visible = filter ? datasets.filter(filter) : datasets;
  const options = visible.map((dataset) => ({
    value: dataset.id,
    label: `${dataset.filename} · ${formatNumber(dataset.rows ?? 0)} rows${dataset.hasLabel ? '' : ' · no label'}`,
  }));

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className={cn('grid gap-4', compact ? 'lg:grid-cols-1' : 'lg:grid-cols-2')}>
        {/* Uploader */}
        <div>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void handleUpload(file);
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors',
              dragActive ? 'border-soc-accent bg-soc-accent/5' : 'border-soc-border bg-soc-panel2/40',
            )}
          >
            <p className="text-sm font-medium text-soc-text">Drop a CSV here or choose a file</p>
            <p className="text-[11px] text-soc-muted">
              UNSW-NB15_training-set.csv / UNSW-NB15_testing-set.csv or any CSV with compatible columns. Max 200 MB.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              id="netshield-dataset-upload"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <Button
              variant="primary"
              loading={uploading}
              disabled={connection !== 'online'}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? 'Uploading & profiling…' : 'Choose CSV file'}
            </Button>
            {connection !== 'online' && (
              <p className="text-[11px] text-soc-critical">Backend offline — uploads are disabled.</p>
            )}
          </div>

          {error && (
            <div role="alert" className="mt-3 rounded-lg border border-soc-critical/40 bg-soc-critical/5 px-3 py-2 text-xs">
              <p className="font-medium text-soc-critical">{error.message}</p>
              {error.details && error.details.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-soc-muted">
                  {error.details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-3 rounded-lg border border-soc-border bg-soc-panel2/40 px-3 py-2 text-[11px] text-soc-muted">
            <div className="flex items-center justify-between gap-2">
              <span>
                Project <code className="text-soc-text">{projectInfo?.directory ?? 'data'}/</code> directory
              </span>
              <Button
                variant="ghost"
                className="px-2 py-1 text-[11px]"
                onClick={async () => {
                  await loadProjectFiles();
                  await reloadDatasets();
                  notify('info', 'Scanned the project data/ directory.');
                }}
              >
                Rescan
              </Button>
            </div>
            {projectInfo && !projectInfo.exists && (
              <p className="mt-1 text-soc-medium">{projectInfo.hint}</p>
            )}
            {projectFiles.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {projectFiles.slice(0, 6).map((file) => (
                  <li key={file.relativePath} className="truncate">
                    <span className="text-soc-text">{file.relativePath}</span> · {formatNumber(file.sizeBytes)} bytes
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Existing datasets */}
        <div className="space-y-3">
          <div>
            <label className="soc-label" htmlFor="netshield-dataset-select">
              Active dataset
            </label>
            <Select
              id="netshield-dataset-select"
              value={selectedDatasetId ?? ''}
              onChange={(value) => setSelectedDatasetId(value || null)}
              options={options}
              placeholder={options.length === 0 ? 'No datasets loaded yet' : undefined}
              disabled={options.length === 0}
            />
          </div>

          {selectedDataset ? (
            <div className="rounded-lg border border-soc-border bg-soc-panel2/40 px-3 py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-soc-text">{selectedDataset.filename}</span>
                <SampleBadge show={selectedDataset.isSample} />
                <Badge className="border-soc-border">
                  {selectedDataset.source === 'project' ? 'data/ directory' : 'uploaded'}
                </Badge>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-soc-muted sm:grid-cols-3">
                <div>
                  Rows <span className="block text-soc-text">{formatNumber(selectedDataset.rows ?? 0)}</span>
                </div>
                <div>
                  Columns <span className="block text-soc-text">{selectedDataset.columns ?? 0}</span>
                </div>
                <div>
                  Binary target{' '}
                  <span className="block text-soc-text">{selectedDataset.binaryTarget ?? 'not found'}</span>
                </div>
                <div>
                  Multiclass target{' '}
                  <span className="block text-soc-text">{selectedDataset.multiclassTarget ?? 'not found'}</span>
                </div>
                <div>
                  Size <span className="block text-soc-text">{formatNumber(selectedDataset.sizeBytes ?? 0)} B</span>
                </div>
                <div>
                  Analyzed <span className="block text-soc-text">{selectedDataset.analyzedAt?.slice(0, 19) ?? '—'}</span>
                </div>
              </dl>
              {selectedDataset.description && (
                <p className="mt-2 rounded border border-soc-medium/30 bg-soc-medium/5 px-2 py-1 text-[11px] text-soc-medium">
                  {selectedDataset.description}
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-soc-border px-3 py-4 text-center text-xs text-soc-muted">
              No dataset selected. Upload a CSV or place one in the project data/ directory.
            </p>
          )}

          {visible.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-lg border border-soc-border">
              <table className="soc-table text-xs">
                <thead>
                  <tr>
                    <th>File</th>
                    <th className="text-right">Rows</th>
                    <th className="text-right">Cols</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((dataset) => (
                    <tr key={dataset.id}>
                      <td className="max-w-[16rem] truncate" title={dataset.filename}>
                        <button
                          type="button"
                          className={cn(
                            'text-left hover:text-soc-accent',
                            dataset.id === selectedDatasetId && 'font-medium text-soc-accent',
                          )}
                          onClick={() => setSelectedDatasetId(dataset.id)}
                        >
                          {dataset.filename}
                        </button>
                        {dataset.isSample && <span className="ml-1 text-soc-medium">(sample)</span>}
                      </td>
                      <td className="text-right tabular-nums">{formatNumber(dataset.rows ?? 0)}</td>
                      <td className="text-right tabular-nums">{dataset.columns ?? 0}</td>
                      <td className="text-right">
                        {allowDelete && (
                          <button
                            type="button"
                            className="text-soc-muted hover:text-soc-critical"
                            onClick={() => void handleDelete(dataset.id, dataset.filename)}
                            aria-label={`Delete ${dataset.filename}`}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
