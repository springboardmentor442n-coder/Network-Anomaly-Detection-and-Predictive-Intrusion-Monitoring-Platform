export type UserRole = 'analyst' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  shift: string;
  badgeId: string;
}

export type Protocol = 'TCP' | 'UDP' | 'ICMP' | 'HTTP' | 'DNS' | 'TLS';

export type AttackCategory = 
  | 'BENIGN'
  | 'DoS'
  | 'DDoS'
  | 'Port Scan'
  | 'Brute Force'
  | 'Botnet'
  | 'Web Attack'
  | 'Infiltration'
  | 'SQL Injection'
  | 'Heartbleed';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type IncidentStatus = 'New' | 'Investigating' | 'Contained' | 'Resolved' | 'Open' | 'Under Investigation' | 'Closed';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'archived';

export interface NetworkPacket {
  id: string;
  timestamp: string;
  sourceIp: string;
  destIp: string;
  sourcePort: number;
  destPort: number;
  protocol: Protocol;
  packetCount: number;
  byteSize: number;
  flowDurationMs: number;
  flags: string[];
  status: 'BENIGN' | 'ATTACK';
  attackType: AttackCategory;
  confidence: number; // 0 - 1
  riskScore: number; // 0 - 100
  payloadPreview?: string;
}

export interface SecurityAlert {
  id: string;
  threatType: AttackCategory;
  sourceIp: string;
  destIp: string;
  sourcePort: number;
  destPort: number;
  severity: SeverityLevel;
  riskScore: number;
  detectionTime: string;
  status: AlertStatus;
  confidence: number;
  protocol: Protocol;
  description: string;
  mitreTactic: string;
  mitreTechnique: string;
  recommendedAction: string;
}

export interface SecurityIncident {
  id: string;
  alertId: string;
  title: string;
  threatType: AttackCategory;
  severity: SeverityLevel;
  detectionTime: string;
  assignedAnalyst: string;
  assignedTo?: string;
  sourceIp?: string;
  destIp?: string;
  createdAt?: string;
  description?: string;
  evidence?: string[];
  riskScore: number;
  status: IncidentStatus;
  resolutionTime?: string;
  resolutionNotes?: string;
  affectedIps: string[];
  appliedPlaybooks: string[];
  timeline: {
    id: string;
    timestamp: string;
    author: string;
    action: string;
    details: string;
    actor?: string;
  }[];
}

export interface ThreatIntelligenceItem {
  id: string;
  ipAddress: string;
  country: string;
  countryCode: string;
  asn: string;
  reputationScore: number; // 0-100
  threatActor?: string;
  associatedAttacks: AttackCategory[];
  lastSeen: string;
  confidence: number;
  reportedIncidents: number;
  status: 'Active Malicious' | 'Suspicious' | 'Under Observation';
}

export interface DatasetMeta {
  id: 'CICIDS2017' | 'UNSW-NB15';
  name: string;
  fullName: string;
  recordCount: number;
  featureCount: number;
  normalCount: number;
  attackCount: number;
  attackClasses: string[];
  status: 'Loaded' | 'Preprocessing' | 'Model Ready';
  features: string[];
  sampleRecords: Record<string, string | number>[];
}

export interface ModelMetric {
  modelName: string;
  architecture: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  detectionRate: number;
  falsePositiveRate: number;
  inferenceSpeedMs: number;
  trainingTimeSec: number;
  classificationAccuracy: Record<string, number>;
}

export type ModelPerformanceMetric = ModelMetric;

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  category: 'Auth' | 'Alert' | 'Incident' | 'Model' | 'System' | 'Dataset' | 'Analyst';
  ipAddress: string;
  status: 'Success' | 'Warning' | 'Denied';
}

export interface SOCSummaryStats {
  totalTrafficBytes: number;
  totalPackets: number;
  normalTrafficCount: number;
  anomalousTrafficCount: number;
  detectedAttacksCount: number;
  activeThreatsCount: number;
  criticalAlertsCount: number;
  averageRiskScore: number;
  systemMonitoringStatus: 'Optimal' | 'Elevated' | 'Critical';
}
