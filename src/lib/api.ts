/**
 * Typed client for the NetShield AI Python backend.
 *
 * Works both:
 *  - directly against the backend (`NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000`), or
 *  - through the Next.js dev-server proxy (`NEXT_PUBLIC_API_BASE=/pyapi`),
 *    which is the default and avoids cross-origin requests entirely.
 */

import type {
  AlertRecord,
  AlertStats,
  AppState,
  DatasetSummary,
  DatasetSummaryResponse,
  DetectionRow,
  DetectionSummary,
  EvaluationComparisonRow,
  EvaluationRecord,
  FilterOptions,
  HealthResponse,
  JobState,
  MetaResponse,
  ModelInfo,
  ProjectFile,
  TablePage,
} from './types';

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '/pyapi').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  details: string[];
  code: string;

  constructor(message: string, status: number, details: string[] = [], code = 'error') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

function extractError(payload: unknown, status: number): ApiError {
  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>;
    const detail = record.detail;
    if (typeof detail === 'object' && detail !== null) {
      const nested = detail as Record<string, unknown>;
      const details = Array.isArray(nested.details)
        ? (nested.details as unknown[]).map((item) => String(item))
        : [];
      return new ApiError(
        String(nested.message ?? 'Request failed'),
        status,
        details,
        String(nested.error ?? 'error'),
      );
    }
    if (typeof detail === 'string') return new ApiError(detail, status);
    if (typeof record.message === 'string') return new ApiError(record.message, status);
  }
  return new ApiError(`Request failed with status ${status}`, status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
  } catch (error) {
    throw new ApiError(
      'Cannot reach the NetShield backend. Start it with "cd backend && .venv\\Scripts\\python -m uvicorn app.main:app --port 8000".',
      0,
      [error instanceof Error ? error.message : String(error)],
      'network_error',
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) throw extractError(payload, response.status);
  return payload as T;
}

function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function downloadUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),
  meta: () => request<MetaResponse>('/api/meta'),
  state: () => request<AppState>('/api/state'),

  datasets: {
    list: () => request<{ items: DatasetSummary[] }>('/api/datasets'),
    projectFiles: () =>
      request<{ directory: string; exists: boolean; files: ProjectFile[]; hint: string | null }>(
        '/api/datasets/project-files',
      ),
    upload: (file: File, onProgress?: (percent: number) => void) => {
      const form = new FormData();
      form.append('file', file);
      // fetch() has no upload progress; the caller shows an indeterminate state.
      onProgress?.(0);
      return request<DatasetSummary>('/api/datasets/upload', { method: 'POST', body: form });
    },
    summary: (id: string) => request<DatasetSummaryResponse>(`/api/datasets/${id}/summary`),
    reanalyze: (id: string) =>
      request<DatasetSummary>(`/api/datasets/${id}/reanalyze`, { method: 'POST' }),
    rows: (
      id: string,
      params: {
        page?: number;
        page_size?: number;
        search?: string;
        attack_cat?: string;
        proto?: string;
        service?: string;
        label?: string;
      },
    ) => request<TablePage>(`/api/datasets/${id}/rows${query(params)}`),
    filterOptions: (id: string) => request<FilterOptions>(`/api/datasets/${id}/filter-options`),
    remove: (id: string) => request<{ deleted: string }>(`/api/datasets/${id}`, { method: 'DELETE' }),
    exportUrl: (
      id: string,
      params: {
        search?: string;
        attack_cat?: string;
        proto?: string;
        service?: string;
        label?: string;
      } = {},
    ) => downloadUrl(`/api/datasets/${id}/export${query(params)}`),
    reportUrl: (id: string) => downloadUrl(`/api/datasets/${id}/report`),
  },

  models: {
    list: () => request<{ items: ModelInfo[]; activeModelId: string | null }>('/api/models'),
    active: () => request<{ model: ModelInfo | null; message?: string }>('/api/models/active'),
    train: (body: {
      datasetId: string;
      target: string;
      algorithm: string;
      sampleLimit?: number | null;
    }) => request<{ jobId: string }>('/api/models/train', { method: 'POST', body: JSON.stringify(body) }),
    activate: (id: string) =>
      request<{ model: ModelInfo }>(`/api/models/${id}/activate`, { method: 'POST' }),
    remove: (id: string) => request<{ deleted: string }>(`/api/models/${id}`, { method: 'DELETE' }),
  },

  jobs: {
    get: (id: string) => request<JobState>(`/api/jobs/${id}`),
  },

  evaluations: {
    list: () =>
      request<{ items: EvaluationRecord[]; comparison: EvaluationComparisonRow[] }>('/api/evaluations'),
    latest: () =>
      request<{ evaluation: EvaluationRecord | null; message?: string }>('/api/evaluations/latest'),
    run: (body: { modelId: string; testDatasetId: string }) =>
      request<{ jobId: string }>('/api/evaluate', { method: 'POST', body: JSON.stringify(body) }),
    reportUrl: (id: string) => downloadUrl(`/api/evaluations/${id}/report`),
  },

  detection: {
    list: () => request<{ items: DetectionSummary[] }>('/api/detections'),
    latest: () =>
      request<{ detection: DetectionSummary | null; message?: string }>('/api/detections/latest'),
    get: (id: string) => request<{ detection: DetectionSummary }>(`/api/detections/${id}`),
    run: (body: {
      file: File;
      modelId?: string | null;
      mode?: 'model' | 'heuristic';
      critical?: number;
      high?: number;
      medium?: number;
      createAlerts?: boolean;
    }) => {
      const form = new FormData();
      form.append('file', body.file);
      if (body.modelId) form.append('model_id', body.modelId);
      form.append('mode', body.mode ?? 'model');
      if (body.critical !== undefined) form.append('critical', String(body.critical));
      if (body.high !== undefined) form.append('high', String(body.high));
      if (body.medium !== undefined) form.append('medium', String(body.medium));
      form.append('create_alerts', String(body.createAlerts ?? true));
      return request<{ jobId: string; detectionId: string }>('/api/detect', {
        method: 'POST',
        body: form,
      });
    },
    rows: (
      id: string,
      params: {
        page?: number;
        page_size?: number;
        severity?: string;
        predicted_class?: string;
        category?: string;
        min_confidence?: number;
        search?: string;
        only_threats?: boolean;
      },
    ) => request<TablePage & { detection: DetectionSummary }>(`/api/detections/${id}/rows${query(params)}`),
    raiseAlerts: (id: string) =>
      request<{ created: number; duplicates: number; message?: string }>(
        `/api/detections/${id}/alerts`,
        { method: 'POST' },
      ),
    remove: (id: string) => request<{ deleted: string }>(`/api/detections/${id}`, { method: 'DELETE' }),
    reportUrl: (id: string) => downloadUrl(`/api/detections/${id}/report`),
  },

  alerts: {
    list: (params: {
      severity?: string;
      status?: string;
      q?: string;
      detectionId?: string;
      sort?: string;
      order?: string;
      page?: number;
      pageSize?: number;
    }) =>
      request<{ page: number; pageSize: number; total: number; totalPages: number; items: AlertRecord[] }>(
        `/api/alerts${query(params)}`,
      ),
    stats: () => request<AlertStats>('/api/alerts/stats'),
    update: (id: string, status: string) =>
      request<{ alert: AlertRecord; stats: AlertStats }>(`/api/alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    bulkStatus: (ids: string[], status: string) =>
      request<{ updated: number; status: string }>('/api/alerts/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ ids, status }),
      }),
    remove: (ids: string[] | null) =>
      request<{ deleted: number; stats: AlertStats }>('/api/alerts/delete', {
        method: 'POST',
        body: JSON.stringify({ ids, confirm: true }),
      }),
    reportUrl: (params: { severity?: string; status?: string; q?: string } = {}) =>
      downloadUrl(`/api/alerts/report${query(params)}`),
  },
};
