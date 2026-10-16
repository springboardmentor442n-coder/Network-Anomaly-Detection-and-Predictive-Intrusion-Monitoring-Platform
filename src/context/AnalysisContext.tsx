'use client';

/**
 * Single source of truth for everything the pages share:
 * server metadata, datasets, the active model, the latest evaluation,
 * the latest detection run and alert statistics.
 *
 * Every page reads from this context instead of fetching on its own, so the
 * dashboard, tables and reports can never disagree about what is loaded.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from '@/lib/api';
import type {
  AlertStats,
  AppState,
  DatasetSummary,
  DetectionSummary,
  EvaluationRecord,
  HealthResponse,
  MetaResponse,
  ModelInfo,
} from '@/lib/types';

export interface Toast {
  id: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
  message: string;
}

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

interface AnalysisContextValue {
  /* connection + metadata */
  connection: ConnectionStatus;
  connectionError: string | null;
  health: HealthResponse | null;
  meta: MetaResponse | null;

  /* shared data */
  datasets: DatasetSummary[];
  selectedDatasetId: string | null;
  setSelectedDatasetId: (id: string | null) => void;
  selectedDataset: DatasetSummary | null;

  models: ModelInfo[];
  activeModel: ModelInfo | null;
  activeModelId: string | null;

  evaluation: EvaluationRecord | null;
  detection: DetectionSummary | null;
  alertStats: AlertStats | null;
  storage: AppState['storage'] | null;

  /* loading state */
  loading: boolean;
  refreshing: boolean;

  /* actions */
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  reloadDatasets: () => Promise<DatasetSummary[]>;
  reloadModels: () => Promise<void>;
  setActiveModelLocally: (model: ModelInfo | null) => void;
  setEvaluationLocally: (evaluation: EvaluationRecord | null) => void;
  setDetectionLocally: (detection: DetectionSummary | null) => void;
  reloadAlerts: () => Promise<void>;
  notify: (tone: Toast['tone'], message: string) => void;
  dismissToast: (id: string) => void;
  toasts: Toast[];
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

let toastCounter = 0;

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [meta, setMeta] = useState<MetaResponse | null>(null);

  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationRecord | null>(null);
  const [detection, setDetection] = useState<DetectionSummary | null>(null);
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [storage, setStorage] = useState<AppState['storage'] | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const selectedRef = useRef<string | null>(null);

  /* Mirrored into a ref so `reloadDatasets` can read the *current* selection
     without being re-created on every selection change. Synced in an effect
     rather than during render (writing refs while rendering is unsafe). */
  useEffect(() => {
    selectedRef.current = selectedDatasetId;
  }, [selectedDatasetId]);

  const notify = useCallback((tone: Toast['tone'], message: string) => {
    const id = `toast-${++toastCounter}`;
    setToasts((current) => [...current, { id, tone, message }]);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 6000);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const applyState = useCallback((state: AppState) => {
    setDatasets(state.datasets ?? []);
    setStorage(state.storage ?? null);
    setAlertStats(state.alerts ?? null);
    setActiveModelId(state.model?.id ?? null);
    setEvaluation(state.evaluation ?? null);
    setDetection(state.detection ?? null);
    setSelectedDatasetId((current) => {
      if (current && (state.datasets ?? []).some((item) => item.id === current)) return current;
      return state.datasets?.[0]?.id ?? null;
    });
  }, []);

  const refresh = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) setRefreshing(true);
      try {
        const state = await api.state();
        applyState(state);
        setConnection('online');
        setConnectionError(null);
        try {
          const [healthResponse, metaResponse, modelList] = await Promise.all([
            api.health(),
            api.meta(),
            api.models.list(),
          ]);
          setHealth(healthResponse);
          setMeta(metaResponse);
          setModels(modelList.items ?? []);
          setActiveModelId(modelList.activeModelId ?? null);
        } catch {
          /* metadata is optional; the core state already loaded */
        }
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : error instanceof Error ? error.message : String(error);
        setConnection('offline');
        setConnectionError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyState],
  );

  const reloadDatasets = useCallback(async () => {
    const response = await api.datasets.list();
    setDatasets(response.items ?? []);
    if (!selectedRef.current || !(response.items ?? []).some((item) => item.id === selectedRef.current)) {
      setSelectedDatasetId(response.items?.[0]?.id ?? null);
    }
    return response.items ?? [];
  }, []);

  const reloadModels = useCallback(async () => {
    const response = await api.models.list();
    setModels(response.items ?? []);
    setActiveModelId(response.activeModelId ?? null);
  }, []);

  const reloadAlerts = useCallback(async () => {
    const stats = await api.alerts.stats();
    setAlertStats(stats);
  }, []);

  const setActiveModelLocally = useCallback((model: ModelInfo | null) => {
    setActiveModelId(model?.id ?? null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedDataset = useMemo(
    () => datasets.find((item) => item.id === selectedDatasetId) ?? null,
    [datasets, selectedDatasetId],
  );
  const activeModel = useMemo(
    () => models.find((item) => item.id === activeModelId) ?? models[0] ?? null,
    [models, activeModelId],
  );

  const value: AnalysisContextValue = {
    connection,
    connectionError,
    health,
    meta,
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    selectedDataset,
    models,
    activeModel,
    activeModelId,
    evaluation,
    detection,
    alertStats,
    storage,
    loading,
    refreshing,
    refresh,
    reloadDatasets,
    reloadModels,
    setActiveModelLocally,
    setEvaluationLocally: setEvaluation,
    setDetectionLocally: setDetection,
    reloadAlerts,
    notify,
    dismissToast,
    toasts,
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used inside <AnalysisProvider>');
  }
  return context;
}
