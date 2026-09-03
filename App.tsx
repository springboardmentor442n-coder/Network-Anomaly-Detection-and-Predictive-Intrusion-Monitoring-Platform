/**
 * NetShield AI - Main Application Component
 * Phase 7: Real-Time Network Security Monitoring, Batch Queue & Incident Operations
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { DashboardMetrics } from "./components/DashboardMetrics";
import { LiveStreamControls } from "./components/LiveStreamControls";
import { TelemetryCharts, ChartDataPoint } from "./components/TelemetryCharts";
import { RecentFlowsTable } from "./components/RecentFlowsTable";
import { IncidentHistoryPanel } from "./components/IncidentHistoryPanel";
import { IncidentDetailModal } from "./components/IncidentDetailModal";
import { AlertBanner } from "./components/AlertBanner";
import { AuditLogPanel } from "./components/AuditLogPanel";
import { FlowAnalyzer } from "./components/FlowAnalyzer";
import { ArchitectureModal } from "./components/ArchitectureModal";
import { Phase7TestModal } from "./components/Phase7TestModal";
import { PredictionResultCard } from "./components/PredictionResultCard";

import {
  Incident,
  AuditEvent,
  ThreatAlert,
  StreamConfig,
  StreamStats,
  QueueStatus,
  PredictionResponse,
  BatchPredictionResponse
} from "./types";
import { globalFlowQueue, QueuedFlow } from "./utils/queue";
import { generateStreamFlow } from "./utils/streamSimulator";
import { calculateIncidentSeverity } from "./utils/severity";
import { REAL_BENIGN_FLOW, REAL_DDOS_FLOW, SAMPLE_WITH_NAN } from "./data/samples";

export function App() {
  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<"monitor" | "incidents" | "audit" | "inspector">("monitor");
  const [isArchOpen, setIsArchOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [inspectedFlow, setInspectedFlow] = useState<PredictionResponse | null>(null);

  // Live Stream Configuration
  const [streamConfig, setStreamConfig] = useState<StreamConfig>({
    isRunning: false,
    isPaused: false,
    ratePerSec: 5,
    batchSize: 5,
    flowMix: "BALANCED",
    maxQueueCapacity: 200
  });

  // System Stats & Queue State
  const [queueStatus, setQueueStatus] = useState<QueueStatus>(globalFlowQueue.getStatus());
  const [executionMode, setExecutionMode] = useState<"LIVE_PYTHON_ML" | "DEMO_MODE">("DEMO_MODE");
  const [streamStats, setStreamStats] = useState<StreamStats>({
    totalProcessed: 0,
    benignCount: 0,
    ddosCount: 0,
    validationErrorCount: 0,
    threatCount: 0,
    currentRate: 0,
    avgLatencyMs: 2.8,
    lastAnomalyScore: -0.1421,
    lastConfidence: 0.9998,
    lastClassification: "BENIGN"
  });

  // Real-Time Data Buffers
  const [recentFlows, setRecentFlows] = useState<PredictionResponse[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [activeAlert, setActiveAlert] = useState<ThreatAlert | null>(null);

  // Manual Inspector state
  const [manualPrediction, setManualPrediction] = useState<PredictionResponse | null>(null);
  const [isManualAnalyzing, setIsManualAnalyzing] = useState(false);

  // Refs for loop management
  const lastAlertTimeRef = useRef<number>(0);
  const flowCountIntervalRef = useRef<number>(0);
  const latencyBufferRef = useRef<number[]>([]);

  // Sync Queue capacity
  useEffect(() => {
    globalFlowQueue.setCapacity(streamConfig.maxQueueCapacity);
    const unsubStatus = globalFlowQueue.subscribe((status) => {
      setQueueStatus({ ...status });
    });

    // Handle Queue Overflow events
    const unsubOverflow = globalFlowQueue.onOverflow((droppedCount, currentSize) => {
      const timestamp = new Date().toISOString();
      const overflowEvent: AuditEvent = {
        id: `AUD-OVF-${Date.now()}`,
        timestamp,
        event_type: "QUEUE_OVERFLOW",
        description: `Queue capacity reached (${currentSize}/${streamConfig.maxQueueCapacity}). Dropped ${droppedCount} flow(s) to protect system latency.`,
        validation_status: "N/A",
        processing_status: "WARNING"
      };
      setAuditLogs((prev) => [overflowEvent, ...prev.slice(0, 199)]);
    });

    return () => {
      unsubStatus();
      unsubOverflow();
    };
  }, [streamConfig.maxQueueCapacity]);

  // Record Audit Event Helper
  const addAuditEvent = useCallback((event: Omit<AuditEvent, "id">) => {
    const fullEvent: AuditEvent = {
      id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      ...event
    };
    setAuditLogs((prev) => [fullEvent, ...prev.slice(0, 199)]);
  }, []);

  // Process a batch of flows through the backend API
  const processBatch = useCallback(async (batch: QueuedFlow[]) => {
    if (batch.length === 0) return;

    try {
      const response = await fetch("/api/predict-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch)
      });

      const data: BatchPredictionResponse = await response.json();
      if (data.results && Array.isArray(data.results)) {
        if (data.execution_mode) {
          setExecutionMode(data.execution_mode);
        }

        globalFlowQueue.recordBatchLatency(data.batch_latency_ms);

        let newBenign = 0;
        let newDDoS = 0;
        let newErrors = 0;
        let lastAnomaly = streamStats.lastAnomalyScore;
        let lastConf = streamStats.lastConfidence;
        let lastClass = streamStats.lastClassification;

        const newIncidents: Incident[] = [];
        const newAuditEvents: AuditEvent[] = [];

        for (const item of data.results) {
          const isSuccess = item.status === "success" && item.prediction;
          const pred = item.prediction;

          if (isSuccess && pred) {
            lastAnomaly = pred.anomaly_score;
            lastConf = pred.confidence;
            lastClass = pred.classification;

            if (pred.classification === "DDoS") {
              newDDoS++;
              const incidentId = `INC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
              const matchedQueued = batch.find((b) => b.id === item.flow_id) || batch[0];
              const flowSnapshot = (matchedQueued.flowData || {}) as Record<string, number>;

              const severityEval = calculateIncidentSeverity(pred, flowSnapshot);

              const newInc: Incident = {
                id: incidentId,
                timestamp: item.timestamp || new Date().toISOString(),
                classification: "DDoS",
                confidence: pred.confidence,
                anomaly_score: pred.anomaly_score,
                raw_decision_score: pred.raw_decision_score,
                threat: true,
                severity: severityEval.level,
                status: "OPEN",
                source_info: {
                  ip: item.source_ip || matchedQueued.sourceIp || "172.16.0.1",
                  port: item.dest_port || matchedQueued.destPort || 80,
                  protocol: "TCP",
                  flow_duration: Number(flowSnapshot["Flow Duration"] || 1293792),
                  packet_count: Number(flowSnapshot["Total Fwd Packets"] || 3) + Number(flowSnapshot["Total Backward Packets"] || 7),
                  bytes_per_sec: Number(flowSnapshot["Flow Bytes/s"] || 8991.4)
                },
                flow_snapshot: flowSnapshot
              };

              newIncidents.push(newInc);

              // Add Threat Detected Audit event
              newAuditEvents.push({
                id: `AUD-TRT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                timestamp: item.timestamp,
                event_type: "THREAT_DETECTED",
                description: `DDoS attack flow signature identified by XGBoost (${(pred.confidence * 100).toFixed(1)}% certainty, anomaly +${pred.anomaly_score.toFixed(4)}).`,
                prediction: "DDoS",
                confidence: pred.confidence,
                anomaly_score: pred.anomaly_score,
                incident_id: incidentId,
                validation_status: "PASSED",
                processing_status: "WARNING",
                latency_ms: item.latency_ms
              });

              // Trigger Alert Toast (throttled/grouped)
              const now = Date.now();
              if (now - lastAlertTimeRef.current < 2000 && activeAlert) {
                setActiveAlert((prev) =>
                  prev
                    ? { ...prev, grouped_count: prev.grouped_count + 1 }
                    : {
                        id: `ALT-${now}`,
                        incident_id: incidentId,
                        timestamp: item.timestamp,
                        classification: "DDoS",
                        confidence: pred.confidence,
                        anomaly_score: pred.anomaly_score,
                        severity: severityEval.level,
                        source_ip: item.source_ip || "172.16.0.1",
                        dest_port: item.dest_port || 80,
                        grouped_count: 1
                      }
                );
              } else {
                lastAlertTimeRef.current = now;
                setActiveAlert({
                  id: `ALT-${now}`,
                  incident_id: incidentId,
                  timestamp: item.timestamp,
                  classification: "DDoS",
                  confidence: pred.confidence,
                  anomaly_score: pred.anomaly_score,
                  severity: severityEval.level,
                  source_ip: item.source_ip || "172.16.0.1",
                  dest_port: item.dest_port || 80,
                  grouped_count: 1
                });
              }
            } else {
              newBenign++;
            }
          } else {
            newErrors++;
            newAuditEvents.push({
              id: `AUD-VAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              timestamp: item.timestamp,
              event_type: "VALIDATION_FAILURE",
              description: item.message || "Input rejected by schema guardrail (NaN, infinite, or missing features).",
              prediction: "REJECTED",
              validation_status: "FAILED",
              processing_status: "ERROR",
              latency_ms: item.latency_ms
            });
          }
        }

        // Update Incidents
        if (newIncidents.length > 0) {
          setIncidents((prev) => [...newIncidents, ...prev].slice(0, 100));
        }

        // Update Audit Logs
        if (newAuditEvents.length > 0) {
          setAuditLogs((prev) => [...newAuditEvents, ...prev].slice(0, 200));
        }

        // Update Recent Flows Buffer
        setRecentFlows((prev) => [...data.results, ...prev].slice(0, 80));

        // Update Stats
        flowCountIntervalRef.current += data.results.length;
        setStreamStats((prev) => {
          const total = prev.totalProcessed + data.results.length;
          const threatCount = prev.threatCount + newDDoS;
          const benignCount = prev.benignCount + newBenign;
          const validationErrorCount = prev.validationErrorCount + newErrors;

          return {
            ...prev,
            totalProcessed: total,
            benignCount,
            ddosCount: threatCount,
            threatCount,
            validationErrorCount,
            lastAnomalyScore: lastAnomaly,
            lastConfidence: lastConf,
            lastClassification: lastClass,
            avgLatencyMs: Number(((prev.avgLatencyMs * 0.8) + (data.batch_latency_ms / Math.max(1, data.results.length) * 0.2)).toFixed(2))
          };
        });

        // Update Time-Series Chart Data
        const timeLabel = new Date().toLocaleTimeString("en-US", { hour12: false });
        setChartData((prev) => [
          ...prev.slice(-19),
          {
            time: timeLabel,
            benign: newBenign,
            ddos: newDDoS,
            anomalyScore: lastAnomaly,
            latencyMs: data.batch_latency_ms,
            confidence: lastConf
          }
        ]);
      }
    } catch (err: any) {
      console.error("Batch prediction failure:", err);
    }
  }, [activeAlert, streamStats.lastAnomalyScore, streamStats.lastClassification, streamStats.lastConfidence]);

  // Main Stream Loop: Generates flows & Enqueues
  useEffect(() => {
    if (!streamConfig.isRunning || streamConfig.isPaused) return;

    // Interval to generate flows based on ratePerSec
    const generationIntervalMs = Math.max(50, 1000 / streamConfig.ratePerSec);
    const genTimer = setInterval(() => {
      const newFlow = generateStreamFlow(streamConfig.flowMix);
      globalFlowQueue.enqueue(newFlow);
    }, generationIntervalMs);

    // Interval to dequeue batches and send to prediction pipeline
    const dequeueIntervalMs = Math.max(100, Math.min(1000, (streamConfig.batchSize / streamConfig.ratePerSec) * 1000));
    const processTimer = setInterval(() => {
      if (!globalFlowQueue.isEmpty()) {
        const batch = globalFlowQueue.dequeueBatch(streamConfig.batchSize);
        if (batch.length > 0) {
          processBatch(batch);
        }
      }
    }, dequeueIntervalMs);

    return () => {
      clearInterval(genTimer);
      clearInterval(processTimer);
    };
  }, [streamConfig.isRunning, streamConfig.isPaused, streamConfig.ratePerSec, streamConfig.batchSize, streamConfig.flowMix, processBatch]);

  // Rate calculation ticker (every 1 second)
  useEffect(() => {
    const rateTimer = setInterval(() => {
      setStreamStats((prev) => ({
        ...prev,
        currentRate: flowCountIntervalRef.current
      }));
      flowCountIntervalRef.current = 0;
    }, 1000);

    return () => clearInterval(rateTimer);
  }, []);

  // Stream Control Handlers
  const handleStartStream = () => {
    setStreamConfig((prev) => ({ ...prev, isRunning: true, isPaused: false }));
    addAuditEvent({
      timestamp: new Date().toISOString(),
      event_type: "MONITORING_STARTED",
      description: `Live flow ingestion simulator started at ${streamConfig.ratePerSec} flows/sec (Batch size: ${streamConfig.batchSize}, Mix: ${streamConfig.flowMix}).`,
      validation_status: "N/A",
      processing_status: "SUCCESS"
    });
  };

  const handlePauseStream = () => {
    setStreamConfig((prev) => ({ ...prev, isPaused: true }));
    addAuditEvent({
      timestamp: new Date().toISOString(),
      event_type: "MONITORING_PAUSED",
      description: "Live flow ingestion paused by operator.",
      validation_status: "N/A",
      processing_status: "WARNING"
    });
  };

  const handleStopStream = () => {
    setStreamConfig((prev) => ({ ...prev, isRunning: false, isPaused: false }));
    addAuditEvent({
      timestamp: new Date().toISOString(),
      event_type: "MONITORING_STOPPED",
      description: "Live flow ingestion stopped. Backlog queue retained for processing.",
      validation_status: "N/A",
      processing_status: "SUCCESS"
    });
  };

  const handleUpdateConfig = (partial: Partial<StreamConfig>) => {
    setStreamConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleInjectSingle = (type: "BENIGN" | "DDOS" | "INVALID") => {
    let flowData: Record<string, any>;
    let ip = "192.168.10.50";
    let port = 80;

    if (type === "DDOS") {
      flowData = { ...REAL_DDOS_FLOW };
      ip = "172.16.0.1";
    } else if (type === "INVALID") {
      flowData = { ...SAMPLE_WITH_NAN };
      ip = "198.51.100.44";
    } else {
      flowData = { ...REAL_BENIGN_FLOW };
      ip = "192.168.10.50";
    }

    const queued: QueuedFlow = {
      id: `FLW-MANUAL-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      sourceIp: ip,
      destPort: port,
      flowData,
      origin: "MANUAL"
    };

    globalFlowQueue.enqueue(queued);
  };

  // Incident Workflow Handlers
  const handleAcknowledgeIncident = (incidentId: string) => {
    const timestamp = new Date().toISOString();
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? { ...inc, status: "ACKNOWLEDGED", acknowledged_at: timestamp }
          : inc
      )
    );
    addAuditEvent({
      timestamp,
      event_type: "INCIDENT_ACKNOWLEDGED",
      description: `Incident ${incidentId} acknowledged by SOC operator. Triage in progress.`,
      incident_id: incidentId,
      validation_status: "N/A",
      processing_status: "SUCCESS"
    });
  };

  const handleResolveIncident = (incidentId: string, notes?: string) => {
    const timestamp = new Date().toISOString();
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: "RESOLVED",
              resolved_at: timestamp,
              notes: notes || "Resolved by operator"
            }
          : inc
      )
    );
    addAuditEvent({
      timestamp,
      event_type: "INCIDENT_RESOLVED",
      description: `Incident ${incidentId} marked as RESOLVED. Notes: ${notes || "Threat addressed."}`,
      incident_id: incidentId,
      validation_status: "N/A",
      processing_status: "SUCCESS"
    });
  };

  // Manual Flow Inspector Handler
  const handleManualAnalyze = async (flow: Record<string, any>): Promise<PredictionResponse | null> => {
    setIsManualAnalyzing(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flow)
      });
      const data: PredictionResponse = await response.json();
      setManualPrediction(data);

      if (data.status === "success" && data.prediction?.classification === "DDoS") {
        const incidentId = `INC-MAN-${Date.now().toString(36).toUpperCase()}`;
        const sevEval = calculateIncidentSeverity(data.prediction, flow);
        const newInc: Incident = {
          id: incidentId,
          timestamp: data.timestamp,
          classification: "DDoS",
          confidence: data.prediction.confidence,
          anomaly_score: data.prediction.anomaly_score,
          raw_decision_score: data.prediction.raw_decision_score,
          threat: true,
          severity: sevEval.level,
          status: "OPEN",
          source_info: {
            ip: "192.168.10.14 (Manual Test)",
            port: Number(flow["Destination Port"] || 80),
            protocol: "TCP",
            flow_duration: Number(flow["Flow Duration"] || 0),
            packet_count: Number(flow["Total Fwd Packets"] || 0) + Number(flow["Total Backward Packets"] || 0),
            bytes_per_sec: Number(flow["Flow Bytes/s"] || 0)
          },
          flow_snapshot: flow
        };
        setIncidents((prev) => [newInc, ...prev]);
      }

      return data;
    } catch (err: any) {
      console.error("Manual inspection error:", err);
      return null;
    } finally {
      setIsManualAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 flex flex-col">
      {/* 1. Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        incidents={incidents}
        isStreaming={streamConfig.isRunning}
        isPaused={streamConfig.isPaused}
        onOpenArchitecture={() => setIsArchOpen(true)}
        onOpenTests={() => setIsTestOpen(true)}
      />

      {/* 2. Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* KPI Metrics row (Always visible for real-time awareness) */}
        <DashboardMetrics
          stats={streamStats}
          queueStatus={queueStatus}
          executionMode={executionMode}
        />

        {/* Tab 1: Live Monitor */}
        {activeTab === "monitor" && (
          <div className="space-y-6">
            <LiveStreamControls
              config={streamConfig}
              queueStatus={queueStatus}
              onStart={handleStartStream}
              onPause={handlePauseStream}
              onStop={handleStopStream}
              onUpdateConfig={handleUpdateConfig}
              onInjectSingle={handleInjectSingle}
              onClearQueue={() => globalFlowQueue.clear()}
            />

            <TelemetryCharts data={chartData} />

            <RecentFlowsTable
              flows={recentFlows}
              onInspectFlow={(flow) => {
                setInspectedFlow(flow);
              }}
            />
          </div>
        )}

        {/* Tab 2: Incident Management Console */}
        {activeTab === "incidents" && (
          <IncidentHistoryPanel
            incidents={incidents}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            onAcknowledge={handleAcknowledgeIncident}
            onResolve={handleResolveIncident}
          />
        )}

        {/* Tab 3: Audit & Telemetry Logs */}
        {activeTab === "audit" && (
          <AuditLogPanel
            logs={auditLogs}
            onClearLogs={() => setAuditLogs([])}
          />
        )}

        {/* Tab 4: Manual Flow Inspector */}
        {activeTab === "inspector" && (
          <FlowAnalyzer
            onAnalyze={handleManualAnalyze}
            isAnalyzing={isManualAnalyzing}
            predictionResponse={manualPrediction}
          />
        )}
      </main>

      {/* 3. Floating Alert Toast */}
      <AlertBanner
        alert={activeAlert}
        onDismiss={() => setActiveAlert(null)}
        onAcknowledgeIncident={(incId) => handleAcknowledgeIncident(incId)}
      />

      {/* 4. Modals */}
      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onAcknowledge={handleAcknowledgeIncident}
        onResolve={handleResolveIncident}
      />

      {/* Quick inspect flow modal if user clicks Inspect in live table */}
      {inspectedFlow && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold font-mono text-white">
                Telemetry Inspection: {inspectedFlow.flow_id || "Flow Snapshot"}
              </h3>
              <button
                onClick={() => setInspectedFlow(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <PredictionResultCard
              prediction={inspectedFlow.prediction || null}
              validation={inspectedFlow.validation || null}
              latencyMs={inspectedFlow.latency_ms || null}
              executionMode={inspectedFlow.execution_mode || null}
              isLoading={false}
            />
          </div>
        </div>
      )}

      <ArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />

      <Phase7TestModal
        isOpen={isTestOpen}
        onClose={() => setIsTestOpen(false)}
      />
    </div>
  );
}
export default App;
