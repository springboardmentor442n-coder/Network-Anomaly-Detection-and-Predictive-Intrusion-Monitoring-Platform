/**
 * NetShield AI - Type Definitions
 * Phase 7: Real-Time Monitoring, Batch Queue & Incident Management
 */

export interface NetworkFlowData {
  [key: string]: number | string | null | undefined;
}

export interface PredictionResult {
  is_anomaly: boolean;
  anomaly_score: number;
  classification: "BENIGN" | "DDoS";
  confidence: number;
  threat: boolean;
  raw_decision_score: number;
  model_version: string;
}

export interface ValidationDetails {
  is_valid: boolean;
  missing_features?: string[];
  extra_features?: string[];
  nan_features?: string[];
  inf_features?: string[];
  invalid_rows_count?: number;
  total_expected_features?: number;
  total_provided_features?: number;
  error_message?: string;
}

export interface PredictionResponse {
  status: "success" | "validation_error" | "error";
  execution_mode: "LIVE_PYTHON_ML" | "DEMO_MODE";
  prediction?: PredictionResult;
  validation: ValidationDetails;
  latency_ms: number;
  timestamp: string;
  error_type?: string;
  message?: string;
  flow_id?: string;
  source_ip?: string;
  dest_port?: number;
}

export interface BatchPredictionResponse {
  status: "success" | "partial_error" | "error";
  execution_mode: "LIVE_PYTHON_ML" | "DEMO_MODE";
  total_items: number;
  successful_predictions: number;
  validation_failures: number;
  results: PredictionResponse[];
  batch_latency_ms: number;
  timestamp: string;
}

export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface Incident {
  id: string;
  timestamp: string;
  classification: "DDoS";
  confidence: number;
  anomaly_score: number;
  raw_decision_score: number;
  threat: boolean;
  severity: SeverityLevel;
  status: IncidentStatus;
  source_info: {
    ip: string;
    port: number;
    protocol: string;
    flow_duration: number;
    packet_count: number;
    bytes_per_sec: number;
  };
  flow_snapshot: Record<string, number>;
  acknowledged_at?: string;
  resolved_at?: string;
  notes?: string;
}

export interface ThreatAlert {
  id: string;
  incident_id: string;
  timestamp: string;
  classification: "DDoS";
  confidence: number;
  anomaly_score: number;
  severity: SeverityLevel;
  source_ip: string;
  dest_port: number;
  grouped_count: number;
}

export type AuditEventType =
  | "FLOW_ANALYZED"
  | "THREAT_DETECTED"
  | "INCIDENT_CREATED"
  | "INCIDENT_ACKNOWLEDGED"
  | "INCIDENT_RESOLVED"
  | "VALIDATION_FAILURE"
  | "QUEUE_OVERFLOW"
  | "MONITORING_STARTED"
  | "MONITORING_PAUSED"
  | "MONITORING_STOPPED";

export interface AuditEvent {
  id: string;
  timestamp: string;
  event_type: AuditEventType;
  description: string;
  prediction?: "BENIGN" | "DDoS" | "REJECTED";
  confidence?: number;
  anomaly_score?: number;
  incident_id?: string;
  validation_status: "PASSED" | "FAILED" | "N/A";
  processing_status: "SUCCESS" | "WARNING" | "ERROR";
  latency_ms?: number;
  metadata?: Record<string, any>;
}

export interface QueueStatus {
  size: number;
  capacity: number;
  is_full: boolean;
  total_enqueued: number;
  total_dequeued: number;
  total_overflows: number;
  avg_batch_processing_ms: number;
}

export interface StreamConfig {
  isRunning: boolean;
  isPaused: boolean;
  ratePerSec: number;
  batchSize: number;
  flowMix: "BALANCED" | "BENIGN_ONLY" | "DDOS_FLOOD" | "ANOMALY_STRESS";
  maxQueueCapacity: number;
}

export interface StreamStats {
  totalProcessed: number;
  benignCount: number;
  ddosCount: number;
  validationErrorCount: number;
  threatCount: number;
  currentRate: number;
  avgLatencyMs: number;
  lastAnomalyScore: number;
  lastConfidence: number;
  lastClassification: "BENIGN" | "DDoS" | "N/A";
}

export interface PresetSample {
  id: string;
  name: string;
  category: "BENIGN" | "DDoS" | "NEGATIVE_TEST";
  description: string;
  expectedResult: "BENIGN (Safe)" | "DDoS (Threat)" | "Validation Failure (NaN)" | "Validation Failure (Inf)" | "Validation Failure (Missing)";
  flow: Record<string, number | string | null>;
}

export interface ModelMetadata {
  dataset_name: string;
  total_samples: number;
  target_column: string;
  total_feature_count: number;
  numeric_features: string[];
  all_feature_names: string[];
  unique_classes: string[];
}
