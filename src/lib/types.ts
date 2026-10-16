/**
 * Shared types describing the payloads returned by the FastAPI backend.
 * Keeping them in one place stops the pages from drifting apart.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type AlgorithmId = 'random_forest' | 'decision_tree' | 'logistic_regression';
export type TargetId = 'label' | 'attack_cat';

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  scikitLearn: string | null;
  time: string;
}

export interface AlgorithmOption {
  id: AlgorithmId;
  label: string;
}

export interface TargetOption {
  id: TargetId | string;
  label: string;
}

export interface MetaResponse {
  algorithms: AlgorithmOption[];
  targets: TargetOption[];
  severityRules: { critical: number; high: number; medium: number };
  severityDocumentation: string;
  limits: { maxUploadBytes: number; pageSizes: number[] };
  projectDataDir: string;
  projectDataDirExists: boolean;
}

export interface DatasetSummary {
  id: string;
  filename: string;
  source: 'upload' | 'project';
  sizeBytes: number | null;
  rows: number | null;
  columns: number | null;
  createdAt: string | null;
  analyzedAt: string | null;
  binaryTarget: string | null;
  multiclassTarget: string | null;
  hasLabel: boolean;
  hasAttackCat: boolean;
  isSample: boolean;
  description: string | null;
}

export interface ColumnProfileEntry {
  name: string;
  kind: 'numeric' | 'categorical';
  dtype: string;
  missing: number;
  missingPct: number;
  unique: number;
}

export interface NumericStat {
  column: string;
  count: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
  missing: number;
}

export interface DistributionEntry {
  name: string;
  value: number;
}

export interface DatasetProfile {
  rows: number;
  columns: number;
  totalCells: number;
  totalMissing: number;
  missingPct: number;
  duplicateRows: number;
  duplicatePct: number;
  completeRows: number;
  numericCount: number;
  categoricalCount: number;
  numericColumns: string[];
  categoricalColumns: string[];
  identifierColumns: string[];
  targets: { binary: string | null; multiclass: string | null };
  columnProfile: ColumnProfileEntry[];
  missingByColumn: { column: string; missing: number; missingPct: number }[];
  numericStats: NumericStat[];
  correlation: { columns: string[]; matrix: (number | null)[][] };
  labelDistribution: DistributionEntry[];
  attackCategoryDistribution: DistributionEntry[];
  distributions: Record<string, DistributionEntry[]>;
  sampleRows: Record<string, unknown>[];
}

export interface DatasetSummaryResponse {
  dataset: DatasetSummary;
  profile: DatasetProfile;
}

export interface FilterOptions {
  attackCategories: string[];
  protocols: string[];
  services: string[];
  labels: string[];
}

export interface TablePage {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  columns?: string[];
  rows: Record<string, unknown>[];
}

export interface ClassMetric {
  label: string;
  displayLabel?: string;
  support: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  falsePositiveRate: number | null;
  falseNegativeRate: number | null;
}

export interface BinaryMetrics {
  positiveClass: string;
  negativeClass: string;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  accuracy: number | null;
  falsePositiveRate: number | null;
  falseNegativeRate: number | null;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
}

export interface ModelInfo {
  id: string;
  algorithm: AlgorithmId;
  algorithmLabel: string;
  target: string;
  targetLabel: string;
  datasetName: string;
  datasetIsSample: boolean;
  trainedAt: string;
  trainingRows: number;
  featureCount: number;
  featureColumns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  classes: string[];
  displayClasses?: string[];
  classDistribution: { name: string; rawValue: string; value: number }[];
  trainFitMetrics: EvaluationMetrics | null;
  hyperparameters: Record<string, unknown> | null;
  durationSeconds: number | null;
  targetEncoding?: unknown;
  trainFitMetricsNote?: string;
}

export interface EvaluationMetrics {
  labels: string[];
  matrix: number[][];
  total: number;
  correct: number;
  accuracy: number | null;
  macroPrecision: number | null;
  macroRecall: number | null;
  macroF1: number | null;
  weightedPrecision: number | null;
  weightedRecall: number | null;
  weightedF1: number | null;
  macroFalsePositiveRate: number | null;
  macroFalseNegativeRate: number | null;
  perClass: ClassMetric[];
  support: number;
}

export interface EvaluationRecord {
  id: string;
  modelId: string;
  algorithm: AlgorithmId;
  algorithmLabel: string;
  target: string;
  targetLabel: string;
  modelDatasetName: string;
  modelTrainedAt: string;
  evaluationDatasetId: string;
  evaluationDatasetName: string;
  evaluationDatasetIsSample: boolean;
  modelDatasetIsSample: boolean;
  evaluatedAt: string;
  rowsEvaluated: number;
  rowsDroppedMissingTarget: number;
  labels: string[];
  displayLabels: string[];
  confusionMatrix: number[][];
  accuracy: number | null;
  macroPrecision: number | null;
  macroRecall: number | null;
  macroF1: number | null;
  weightedPrecision: number | null;
  weightedRecall: number | null;
  weightedF1: number | null;
  macroFalsePositiveRate: number | null;
  macroFalseNegativeRate: number | null;
  perClass: ClassMetric[];
  binary: Partial<BinaryMetrics>;
  support: number;
  correct: number;
  warnings: string[];
  isMulticlass: boolean;
  fprFnrExplanation: string;
}

export interface EvaluationComparisonRow {
  modelId: string;
  algorithmLabel: string;
  targetLabel: string;
  evaluationDatasetName: string;
  evaluatedAt: string;
  accuracy: number | null;
  macroPrecision: number | null;
  macroRecall: number | null;
  macroF1: number | null;
  macroFalsePositiveRate: number | null;
  macroFalseNegativeRate: number | null;
  rowsEvaluated: number;
}

export interface DetectionSummary {
  id: string;
  mode: 'model' | 'heuristic';
  modeLabel: string;
  modelId: string | null;
  algorithmLabel: string | null;
  target?: string | null;
  targetLabel: string | null;
  modelDatasetName: string | null;
  modelTrainedAt?: string | null;
  sourceFilename: string;
  createdAt: string;
  rowsScanned: number;
  predictedAttackCount: number;
  predictedNormalCount: number;
  attackRate: number;
  severityCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  confidenceSupported: boolean;
  alertsCreated: number;
  alertDuplicates?: number;
  alertMessage?: string;
  durationSeconds: number;
  warnings: string[];
  severityRules?: Record<string, number>;
  severityDocumentation?: string;
  recommendationSummary?: { threat: string; count: number; actions: string[] }[];
  classes?: string[];
  displayClasses?: string[];
}

export interface DetectionRow {
  recordIndex: number;
  recordReference: string;
  predictedClass: unknown;
  predictedLabel: string;
  attackCategory: string | null;
  isThreat: boolean;
  confidence: number | null;
  confidenceSupported: boolean;
  severity: Severity;
  severityScore: number;
  detectionReason: string;
  recommendedActions: string[];
  recommendedAction: string;
  inputFeatures: Record<string, unknown>;
}

export interface AlertRecord {
  id: string;
  fingerprint: string;
  detectionId: string | null;
  detectionSource: string | null;
  modelAlgorithm: string | null;
  sourceRecord: string | null;
  predictedClass: string | null;
  attackCategory: string | null;
  severity: Severity;
  confidence: number | null;
  reason: string | null;
  recommendedAction: string | null;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AlertStats {
  total: number;
  byStatus: Record<AlertStatus, number>;
  bySeverity: Record<Severity, number>;
}

export interface JobState {
  id: string;
  kind: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  message: string;
  error: string | null;
  result: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  server: { version: string; time: string };
  datasets: DatasetSummary[];
  datasetCount: number;
  sampleDatasetCount: number;
  model: ModelInfo | null;
  evaluation: EvaluationRecord | null;
  detection: DetectionSummary | null;
  alerts: AlertStats;
  storage: {
    datasets: number;
    models: number;
    evaluations: number;
    detections: number;
    storageBytes: number;
    serverTime: string;
    uptimeSeconds: number;
  };
}

export interface ProjectFile {
  name: string;
  relativePath: string;
  sizeBytes: number;
}
