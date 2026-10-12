import { 
  NetworkPacket, 
  SecurityAlert, 
  SecurityIncident, 
  ThreatIntelligenceItem, 
  DatasetMeta, 
  ModelMetric, 
  AuditLogItem, 
  User 
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Sarah Connor',
    email: 's.connor@netshield.corp',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    shift: 'Tier-3 Lead / Alpha Shift',
    badgeId: 'NS-ADMIN-01'
  },
  {
    id: 'usr-2',
    name: 'Alex Vance',
    email: 'a.vance@netshield.corp',
    role: 'analyst',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    shift: 'Tier-1 SOC Analyst / Bravo Shift',
    badgeId: 'NS-SOC-104'
  }
];

export const INITIAL_PACKETS: NetworkPacket[] = [
  {
    id: 'pkt-8491',
    timestamp: '15:24:02.108',
    sourceIp: '192.168.1.104',
    destIp: '10.0.0.15',
    sourcePort: 54128,
    destPort: 443,
    protocol: 'TLS',
    packetCount: 38,
    byteSize: 42100,
    flowDurationMs: 412,
    flags: ['ACK', 'PSH'],
    status: 'BENIGN',
    attackType: 'BENIGN',
    confidence: 0.984,
    riskScore: 8,
    payloadPreview: 'TLSv1.3 Client Hello, CipherSuite: TLS_AES_256_GCM_SHA384'
  },
  {
    id: 'pkt-8492',
    timestamp: '15:24:01.890',
    sourceIp: '185.220.101.5',
    destIp: '10.0.0.4',
    sourcePort: 41920,
    destPort: 80,
    protocol: 'HTTP',
    packetCount: 1420,
    byteSize: 1840000,
    flowDurationMs: 89,
    flags: ['SYN', 'ACK', 'FIN'],
    status: 'ATTACK',
    attackType: 'DDoS',
    confidence: 0.962,
    riskScore: 88,
    payloadPreview: 'GET /api/v1/search?query=AAAAAAAAAAAAAAAAAAAA HTTP/1.1 (Rapid flood)'
  },
  {
    id: 'pkt-8493',
    timestamp: '15:23:59.410',
    sourceIp: '172.16.0.45',
    destIp: '10.0.0.8',
    sourcePort: 60231,
    destPort: 22,
    protocol: 'TCP',
    packetCount: 420,
    byteSize: 18200,
    flowDurationMs: 1240,
    flags: ['SYN'],
    status: 'ATTACK',
    attackType: 'Brute Force',
    confidence: 0.941,
    riskScore: 78,
    payloadPreview: 'SSH-2.0-OpenSSH_8.2p1 auth_failure count=45 user=root'
  },
  {
    id: 'pkt-8494',
    timestamp: '15:23:58.201',
    sourceIp: '192.168.1.112',
    destIp: '8.8.8.8',
    sourcePort: 51142,
    destPort: 53,
    protocol: 'DNS',
    packetCount: 2,
    byteSize: 184,
    flowDurationMs: 14,
    flags: ['RD'],
    status: 'BENIGN',
    attackType: 'BENIGN',
    confidence: 0.991,
    riskScore: 4,
    payloadPreview: 'Standard query 0x1a4b A api.github.com'
  },
  {
    id: 'pkt-8495',
    timestamp: '15:23:56.902',
    sourceIp: '45.33.32.156',
    destIp: '10.0.0.4',
    sourcePort: 38812,
    destPort: 8080,
    protocol: 'HTTP',
    packetCount: 92,
    byteSize: 4890,
    flowDurationMs: 510,
    flags: ['ACK', 'PSH'],
    status: 'ATTACK',
    attackType: 'Web Attack',
    confidence: 0.915,
    riskScore: 82,
    payloadPreview: 'GET /login?user=admin\'%20OR%20\'1\'=\'1 HTTP/1.1'
  },
  {
    id: 'pkt-8496',
    timestamp: '15:23:55.312',
    sourceIp: '103.251.167.20',
    destIp: '10.0.0.2',
    sourcePort: 49152,
    destPort: 445,
    protocol: 'TCP',
    packetCount: 1840,
    byteSize: 64200,
    flowDurationMs: 310,
    flags: ['SYN'],
    status: 'ATTACK',
    attackType: 'Port Scan',
    confidence: 0.978,
    riskScore: 72,
    payloadPreview: 'TCP Stealth SYN probe across ports 1-1024 delta=0.01ms'
  },
  {
    id: 'pkt-8497',
    timestamp: '15:23:52.180',
    sourceIp: '192.168.1.80',
    destIp: '192.168.1.254',
    sourcePort: 0,
    destPort: 0,
    protocol: 'ICMP',
    packetCount: 4,
    byteSize: 256,
    flowDurationMs: 8,
    flags: ['ECHO_REQ'],
    status: 'BENIGN',
    attackType: 'BENIGN',
    confidence: 0.988,
    riskScore: 2,
    payloadPreview: 'Echo (ping) request id=0x0001, seq=1'
  },
  {
    id: 'pkt-8498',
    timestamp: '15:23:49.004',
    sourceIp: '91.240.118.172',
    destIp: '10.0.0.12',
    sourcePort: 55432,
    destPort: 6667,
    protocol: 'TCP',
    packetCount: 310,
    byteSize: 94000,
    flowDurationMs: 2400,
    flags: ['ACK', 'PSH'],
    status: 'ATTACK',
    attackType: 'Botnet',
    confidence: 0.932,
    riskScore: 86,
    payloadPreview: 'C2 beacon: {cmd: "heartbeat", bot_id: "ares_node_9918", checkin: 60}'
  }
];

export const INITIAL_ALERTS: SecurityAlert[] = [
  {
    id: 'ALT-1094',
    threatType: 'DDoS',
    sourceIp: '185.220.101.5',
    destIp: '10.0.0.4',
    sourcePort: 41920,
    destPort: 80,
    severity: 'Critical',
    riskScore: 92,
    detectionTime: '2026-09-21 15:24:01 UTC',
    status: 'active',
    confidence: 0.962,
    protocol: 'HTTP',
    description: 'Volumetric HTTP GET Flood detected originating from known Tor exit relay node.',
    mitreTactic: 'Impact (TA0040)',
    mitreTechnique: 'Network Denial of Service (T1498.001)',
    recommendedAction: 'Engage Edge WAF rate-limiting, activate Cloudflare / CDN under-attack mode, block source CIDR.'
  },
  {
    id: 'ALT-1093',
    threatType: 'Web Attack',
    sourceIp: '45.33.32.156',
    destIp: '10.0.0.4',
    sourcePort: 38812,
    destPort: 8080,
    severity: 'High',
    riskScore: 82,
    detectionTime: '2026-09-21 15:23:56 UTC',
    status: 'active',
    confidence: 0.915,
    protocol: 'HTTP',
    description: 'SQL Injection signature detected inside URI query string parameters targeting auth database.',
    mitreTactic: 'Initial Access (TA0001)',
    mitreTechnique: 'Exploit Public-Facing Application (T1190)',
    recommendedAction: 'Verify input sanitation filter on API gateway, ban origin IP on firewall for 24 hours.'
  },
  {
    id: 'ALT-1092',
    threatType: 'Brute Force',
    sourceIp: '172.16.0.45',
    destIp: '10.0.0.8',
    sourcePort: 60231,
    destPort: 22,
    severity: 'High',
    riskScore: 78,
    detectionTime: '2026-09-21 15:23:59 UTC',
    status: 'acknowledged',
    confidence: 0.941,
    protocol: 'TCP',
    description: 'High velocity SSH credential stuffing attack exceeding 40 auth failures per minute.',
    mitreTactic: 'Credential Access (TA0006)',
    mitreTechnique: 'Brute Force: Password Guessing (T1110.001)',
    recommendedAction: 'Enforce fail2ban jail rule, restrict SSH port 22 access strictly to internal VPN subnet.'
  },
  {
    id: 'ALT-1091',
    threatType: 'Botnet',
    sourceIp: '91.240.118.172',
    destIp: '10.0.0.12',
    sourcePort: 55432,
    destPort: 6667,
    severity: 'Critical',
    riskScore: 88,
    detectionTime: '2026-09-21 15:23:49 UTC',
    status: 'active',
    confidence: 0.932,
    protocol: 'TCP',
    description: 'Internal workstation host communicating with known Mirai/Ares Command & Control (C2) endpoint.',
    mitreTactic: 'Command and Control (TA0011)',
    mitreTechnique: 'Application Layer Protocol (T1071)',
    recommendedAction: 'Quarantine host 10.0.0.12 from internal network immediately and run memory forensic triage.'
  },
  {
    id: 'ALT-1090',
    threatType: 'Port Scan',
    sourceIp: '103.251.167.20',
    destIp: '10.0.0.2',
    sourcePort: 49152,
    destPort: 445,
    severity: 'Medium',
    riskScore: 54,
    detectionTime: '2026-09-21 15:23:55 UTC',
    status: 'resolved',
    confidence: 0.978,
    protocol: 'TCP',
    description: 'SYN scan sweep probe checking SMB, RDP, and LDAP listening ports.',
    mitreTactic: 'Reconnaissance (TA0043)',
    mitreTechnique: 'Network Service Discovery (T1046)',
    recommendedAction: 'Validate firewall perimeter stealth flags, ensure non-routable interfaces drop unsolicited SYN packets.'
  },
  {
    id: 'ALT-1089',
    threatType: 'DoS',
    sourceIp: '198.51.100.44',
    destIp: '10.0.0.6',
    sourcePort: 44102,
    destPort: 80,
    severity: 'Medium',
    riskScore: 48,
    detectionTime: '2026-09-21 15:10:12 UTC',
    status: 'archived',
    confidence: 0.887,
    protocol: 'HTTP',
    description: 'Slowloris partial headers denial-of-service attempt tying up worker thread pools.',
    mitreTactic: 'Impact (TA0040)',
    mitreTechnique: 'Endpoint Denial of Service (T1499)',
    recommendedAction: 'Tune server request timeout limits (client_body_timeout 10s).'
  }
];

export const INITIAL_INCIDENTS: SecurityIncident[] = [
  {
    id: 'INC-2026-041',
    alertId: 'ALT-1094',
    title: 'Volumetric Distributed DoS against Web Services Gateway',
    threatType: 'DDoS',
    severity: 'Critical',
    detectionTime: '2026-09-21 15:24:01 UTC',
    assignedAnalyst: 'Sarah Connor',
    riskScore: 92,
    status: 'Investigating',
    affectedIps: ['10.0.0.4', '185.220.101.5', '185.220.101.6'],
    appliedPlaybooks: ['SOC-PB-04: DDoS Mitigation', 'BGP Blackhole Routing'],
    timeline: [
      {
        id: 'tl-1',
        timestamp: '15:24:01',
        author: 'NetShield AI Engine',
        action: 'Anomaly Detected',
        details: 'Traffic surge exceeded threshold by 1,420%. Anomaly confidence 96.2%.'
      },
      {
        id: 'tl-2',
        timestamp: '15:25:10',
        author: 'Sarah Connor',
        action: 'Incident Assigned',
        details: 'Elevated to Priority-1 Incident. Initiating upstream transit scrubbing.'
      },
      {
        id: 'tl-3',
        timestamp: '15:27:45',
        author: 'Sarah Connor',
        action: 'Mitigation Started',
        details: 'Rate limiting applied at Edge Gateway: 50 requests/sec per IP.'
      }
    ]
  },
  {
    id: 'INC-2026-040',
    alertId: 'ALT-1091',
    title: 'Workstation Host Compromise & C2 Beaconing Activity',
    threatType: 'Botnet',
    severity: 'Critical',
    detectionTime: '2026-09-21 15:23:49 UTC',
    assignedAnalyst: 'Alex Vance',
    riskScore: 88,
    status: 'Contained',
    affectedIps: ['10.0.0.12', '91.240.118.172'],
    appliedPlaybooks: ['SOC-PB-09: Host Isolation', 'EDR Forensic Dump'],
    timeline: [
      {
        id: 'tl-4',
        timestamp: '15:23:49',
        author: 'NetShield AI Engine',
        action: 'Anomaly Triggered',
        details: 'C2 beacon signature matched known botnet controller hash.'
      },
      {
        id: 'tl-5',
        timestamp: '15:24:30',
        author: 'Alex Vance',
        action: 'Endpoint Isolated',
        details: 'Host 10.0.0.12 quarantined via Network Access Control (NAC) vLAN 999.'
      }
    ]
  },
  {
    id: 'INC-2026-039',
    alertId: 'ALT-1092',
    title: 'Repeated SSH Auth Failures on Internal Bastion',
    threatType: 'Brute Force',
    severity: 'High',
    detectionTime: '2026-09-21 15:23:59 UTC',
    assignedAnalyst: 'Alex Vance',
    riskScore: 78,
    status: 'Resolved',
    resolutionTime: '2026-09-21 15:30:00 UTC',
    resolutionNotes: 'Offending subnet blocked on upstream core switch. Bastion SSH port shifted to mTLS gateway.',
    affectedIps: ['172.16.0.45', '10.0.0.8'],
    appliedPlaybooks: ['SOC-PB-02: Credential Hardening'],
    timeline: [
      {
        id: 'tl-6',
        timestamp: '15:23:59',
        author: 'NetShield AI Engine',
        action: 'Alert Generated',
        details: 'Over 40 failed attempts detected from internal workstation subnet.'
      },
      {
        id: 'tl-7',
        timestamp: '15:30:00',
        author: 'Alex Vance',
        action: 'Incident Resolved',
        details: 'Verified rogue test script running on workstation 172.16.0.45 terminated.'
      }
    ]
  }
];

export const DATASETS_INFO: DatasetMeta[] = [
  {
    id: 'CICIDS2017',
    name: 'CICIDS2017',
    fullName: 'Canadian Institute for Cybersecurity Intrusion Detection System 2017',
    recordCount: 2830743,
    featureCount: 78,
    normalCount: 2273097,
    attackCount: 557646,
    attackClasses: ['DoS Hulk', 'PortScan', 'DDoS', 'FTP-Patator', 'SSH-Patator', 'Botnet', 'Web Attack - Brute Force', 'Web Attack - XSS', 'Infiltration'],
    status: 'Model Ready',
    features: [
      'Destination_Port', 'Flow_Duration', 'Total_Fwd_Packets', 'Total_Backward_Packets',
      'Total_Length_of_Fwd_Packets', 'Fwd_Packet_Length_Max', 'Fwd_Packet_Length_Min',
      'Fwd_Packet_Length_Mean', 'Bwd_Packet_Length_Mean', 'Flow_Bytes_s', 'Flow_Packets_s',
      'Flow_IAT_Mean', 'Flow_IAT_Std', 'Fwd_IAT_Total', 'Bwd_IAT_Total', 'Fwd_PSH_Flags',
      'SYN_Flag_Count', 'ACK_Flag_Count', 'Down_Up_Ratio', 'Average_Packet_Size', 'Active_Mean'
    ],
    sampleRecords: [
      { Flow_ID: '192.168.10.5-192.168.10.3-80-49418-6', Destination_Port: 80, Flow_Duration: 34102, Total_Fwd_Packets: 6, Total_Bwd_Packets: 7, Flow_Bytes_s: 21854.2, Label: 'BENIGN' },
      { Flow_ID: '172.16.0.1-192.168.10.50-80-38412-6', Destination_Port: 80, Flow_Duration: 924510, Total_Fwd_Packets: 182, Total_Bwd_Packets: 2, Flow_Bytes_s: 189201.5, Label: 'DoS Hulk' },
      { Flow_ID: '172.16.0.1-192.168.10.50-22-51020-6', Destination_Port: 22, Flow_Duration: 12054, Total_Fwd_Packets: 24, Total_Bwd_Packets: 19, Flow_Bytes_s: 4120.8, Label: 'SSH-Patator' },
      { Flow_ID: '172.16.0.1-192.168.10.50-445-59124-6', Destination_Port: 445, Flow_Duration: 410, Total_Fwd_Packets: 2, Total_Bwd_Packets: 0, Flow_Bytes_s: 0.0, Label: 'PortScan' },
      { Flow_ID: '205.174.165.73-192.168.10.15-8080-4412-6', Destination_Port: 8080, Flow_Duration: 62410, Total_Fwd_Packets: 12, Total_Bwd_Packets: 9, Flow_Bytes_s: 14810.0, Label: 'Web Attack - XSS' }
    ]
  },
  {
    id: 'UNSW-NB15',
    name: 'UNSW-NB15',
    fullName: 'University of New South Wales Network-Based Intrusion 2015',
    recordCount: 2540044,
    featureCount: 49,
    normalCount: 2218761,
    attackCount: 321283,
    attackClasses: ['Fuzzers', 'Analysis', 'Backdoors', 'DoS', 'Exploits', 'Generic', 'Reconnaissance', 'Shellcode', 'Worms'],
    status: 'Model Ready',
    features: [
      'dur', 'proto', 'service', 'state', 'spkts', 'dpkts', 'sbytes', 'dbytes',
      'rate', 'sttl', 'dttl', 'sload', 'dload', 'sloss', 'dloss', 'sinpkt',
      'dinpkt', 'sjit', 'djit', 'swin', 'dwin', 'stcpb', 'dtcpb', 'tcprtt'
    ],
    sampleRecords: [
      { id: 1, proto: 'tcp', service: 'http', dur: 0.121478, spkts: 6, dpkts: 4, sbytes: 258, dbytes: 172, attack_cat: 'Normal', label: 0 },
      { id: 2, proto: 'udp', service: 'dns', dur: 0.000008, spkts: 2, dpkts: 0, sbytes: 146, dbytes: 0, attack_cat: 'Normal', label: 0 },
      { id: 3, proto: 'tcp', service: '-', dur: 0.548212, spkts: 14, dpkts: 8, sbytes: 1820, dbytes: 420, attack_cat: 'Exploits', label: 1 },
      { id: 4, proto: 'tcp', service: 'ftp', dur: 1.284102, spkts: 32, dpkts: 28, sbytes: 4120, dbytes: 3890, attack_cat: 'Generic', label: 1 },
      { id: 5, proto: 'tcp', service: '-', dur: 0.001020, spkts: 2, dpkts: 0, sbytes: 64, dbytes: 0, attack_cat: 'Reconnaissance', label: 1 }
    ]
  }
];

export const MODEL_METRICS: ModelMetric[] = [
  {
    modelName: 'Ensemble Random Forest Classifier',
    architecture: 'Scikit-learn 100 Trees + Feature Bagging',
    accuracy: 99.42,
    precision: 99.18,
    recall: 99.35,
    f1Score: 99.26,
    detectionRate: 99.41,
    falsePositiveRate: 0.58,
    inferenceSpeedMs: 1.2,
    trainingTimeSec: 42.5,
    classificationAccuracy: {
      'BENIGN': 99.7,
      'DoS': 99.4,
      'DDoS': 99.8,
      'Port Scan': 99.1,
      'Brute Force': 98.9,
      'Botnet': 97.8,
      'Web Attack': 96.4,
      'Infiltration': 95.2
    }
  },
  {
    modelName: 'XGBoost Gradient Boosted Trees',
    architecture: 'XGBoost Depth-6, LR=0.08, Subsample=0.8',
    accuracy: 99.64,
    precision: 99.45,
    recall: 99.52,
    f1Score: 99.48,
    detectionRate: 99.58,
    falsePositiveRate: 0.38,
    inferenceSpeedMs: 0.8,
    trainingTimeSec: 68.2,
    classificationAccuracy: {
      'BENIGN': 99.8,
      'DoS': 99.7,
      'DDoS': 99.9,
      'Port Scan': 99.5,
      'Brute Force': 99.3,
      'Botnet': 98.4,
      'Web Attack': 97.9,
      'Infiltration': 96.8
    }
  },
  {
    modelName: 'Deep Multi-Layer Perceptron (DNN)',
    architecture: 'TensorFlow / Keras 4-Layer Dense [128, 64, 32, 10]',
    accuracy: 98.85,
    precision: 98.42,
    recall: 98.60,
    f1Score: 98.51,
    detectionRate: 98.72,
    falsePositiveRate: 1.14,
    inferenceSpeedMs: 2.1,
    trainingTimeSec: 145.0,
    classificationAccuracy: {
      'BENIGN': 99.1,
      'DoS': 98.8,
      'DDoS': 99.2,
      'Port Scan': 98.5,
      'Brute Force': 97.8,
      'Botnet': 96.9,
      'Web Attack': 95.8,
      'Infiltration': 93.4
    }
  },
  {
    modelName: 'One-Class SVM (Unsupervised Anomaly)',
    architecture: 'Scikit-learn RBF Kernel, nu=0.05',
    accuracy: 95.20,
    precision: 94.10,
    recall: 95.80,
    f1Score: 94.94,
    detectionRate: 95.82,
    falsePositiveRate: 4.80,
    inferenceSpeedMs: 4.8,
    trainingTimeSec: 210.0,
    classificationAccuracy: {
      'BENIGN': 95.2,
      'DoS': 96.1,
      'DDoS': 97.0,
      'Port Scan': 94.2,
      'Brute Force': 93.0,
      'Botnet': 91.5,
      'Web Attack': 89.2,
      'Infiltration': 87.0
    }
  }
];

export const THREAT_INTEL_FEED: ThreatIntelligenceItem[] = [
  {
    id: 'ioc-1',
    ipAddress: '185.220.101.5',
    country: 'Germany',
    countryCode: 'DE',
    asn: 'AS208323 (Tor Exit Node)',
    reputationScore: 95,
    threatActor: 'Volt Typhoon / Tor Proxy Cluster',
    associatedAttacks: ['DDoS', 'Port Scan'],
    lastSeen: '10 mins ago',
    confidence: 0.98,
    reportedIncidents: 412,
    status: 'Active Malicious'
  },
  {
    id: 'ioc-2',
    ipAddress: '45.33.32.156',
    country: 'United States',
    countryCode: 'US',
    asn: 'AS63949 (Linode Cloud Hosting)',
    reputationScore: 88,
    threatActor: 'FIN7 / Scripted Scanners',
    associatedAttacks: ['Web Attack', 'SQL Injection'],
    lastSeen: '25 mins ago',
    confidence: 0.94,
    reportedIncidents: 156,
    status: 'Active Malicious'
  },
  {
    id: 'ioc-3',
    ipAddress: '91.240.118.172',
    country: 'Russia',
    countryCode: 'RU',
    asn: 'AS49981 (HostTelecom Ltd)',
    reputationScore: 92,
    threatActor: 'APT29 / Cozy Bear Affiliate',
    associatedAttacks: ['Botnet', 'Infiltration'],
    lastSeen: '40 mins ago',
    confidence: 0.96,
    reportedIncidents: 284,
    status: 'Active Malicious'
  },
  {
    id: 'ioc-4',
    ipAddress: '103.251.167.20',
    country: 'Hong Kong',
    countryCode: 'HK',
    asn: 'AS133117 (Shinjiru Hosting)',
    reputationScore: 76,
    threatActor: 'Unattributed Scanner Bot',
    associatedAttacks: ['Port Scan', 'Brute Force'],
    lastSeen: '1 hour ago',
    confidence: 0.89,
    reportedIncidents: 89,
    status: 'Suspicious'
  },
  {
    id: 'ioc-5',
    ipAddress: '198.51.100.44',
    country: 'Netherlands',
    countryCode: 'NL',
    asn: 'AS1103 (SURFnet BV)',
    reputationScore: 68,
    associatedAttacks: ['DoS'],
    lastSeen: '3 hours ago',
    confidence: 0.82,
    reportedIncidents: 47,
    status: 'Under Observation'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud-991',
    timestamp: '2026-09-21 15:27:45 UTC',
    user: 'Sarah Connor',
    role: 'admin',
    action: 'Applied Edge WAF mitigation rule on CIDR 185.220.101.0/24',
    category: 'Incident',
    ipAddress: '192.168.1.10',
    status: 'Success'
  },
  {
    id: 'aud-990',
    timestamp: '2026-09-21 15:24:30 UTC',
    user: 'Alex Vance',
    role: 'analyst',
    action: 'Quarantined endpoint host 10.0.0.12 to isolation VLAN 999',
    category: 'Alert',
    ipAddress: '192.168.1.14',
    status: 'Success'
  },
  {
    id: 'aud-989',
    timestamp: '2026-09-21 15:20:11 UTC',
    user: 'Sarah Connor',
    role: 'admin',
    action: 'Trained and validated XGBoost Gradient Boosted Trees on CICIDS2017',
    category: 'Model',
    ipAddress: '192.168.1.10',
    status: 'Success'
  },
  {
    id: 'aud-988',
    timestamp: '2026-09-21 15:15:02 UTC',
    user: 'Alex Vance',
    role: 'analyst',
    action: 'Acknowledged High Severity Alert ALT-1092 (SSH Brute Force)',
    category: 'Alert',
    ipAddress: '192.168.1.14',
    status: 'Success'
  },
  {
    id: 'aud-987',
    timestamp: '2026-09-21 15:00:19 UTC',
    user: 'Sarah Connor',
    role: 'admin',
    action: 'Successful multi-factor authentication login to NetShield AI SOC',
    category: 'Auth',
    ipAddress: '192.168.1.10',
    status: 'Success'
  }
];

export const mockModelMetrics = MODEL_METRICS;

export const mockConfusionMatrix = [
  { actual: 'BENIGN', predictedBenign: 9970, predictedAttack: 30 },
  { actual: 'DoS/DDoS', predictedBenign: 12, predictedAttack: 4988 },
  { actual: 'PortScan', predictedBenign: 8, predictedAttack: 2992 },
  { actual: 'BruteForce', predictedBenign: 14, predictedAttack: 1986 },
  { actual: 'Botnet', predictedBenign: 22, predictedAttack: 978 }
];

export const mockFeatureImportance = [
  { feature: 'Destination_Port', importance: 0.182, category: 'Network Core' },
  { feature: 'Flow_Duration', importance: 0.154, category: 'Timing' },
  { feature: 'Flow_Bytes_s', importance: 0.138, category: 'Volumetric' },
  { feature: 'Fwd_Packet_Length_Max', importance: 0.119, category: 'Payload' },
  { feature: 'Total_Fwd_Packets', importance: 0.098, category: 'Volumetric' },
  { feature: 'SYN_Flag_Count', importance: 0.086, category: 'TCP Flags' },
  { feature: 'Flow_IAT_Mean', importance: 0.075, category: 'Timing' },
  { feature: 'Average_Packet_Size', importance: 0.062, category: 'Payload' },
  { feature: 'Down_Up_Ratio', importance: 0.048, category: 'Behavioral' },
  { feature: 'Bwd_Packet_Length_Mean', importance: 0.038, category: 'Payload' }
];

export const mockTrafficTrend = [
  { timestamp: '14:30', packets: 4200, bytes: 4800000, attacks: 2 },
  { timestamp: '14:40', packets: 5100, bytes: 5900000, attacks: 5 },
  { timestamp: '14:50', packets: 4800, bytes: 5200000, attacks: 3 },
  { timestamp: '15:00', packets: 7900, bytes: 9400000, attacks: 18 },
  { timestamp: '15:10', packets: 14200, bytes: 18200000, attacks: 64 },
  { timestamp: '15:20', packets: 12100, bytes: 15400000, attacks: 42 },
  { timestamp: '15:30', packets: 8900, bytes: 11000000, attacks: 24 }
];

export const mockThreatDistribution = [
  { name: 'DoS / DDoS', value: 38, count: 482, color: '#f43f5e' },
  { name: 'Port Scan', value: 24, count: 305, color: '#fb923c' },
  { name: 'Brute Force', value: 16, count: 203, color: '#f59e0b' },
  { name: 'Botnet C2', value: 12, count: 152, color: '#a855f7' },
  { name: 'Web Attack / SQLi', value: 10, count: 127, color: '#06b6d4' }
];

export const mockTopAttackedPorts = [
  { port: 80, service: 'HTTP (Web)', count: 642, attackType: 'DDoS / Web Attack' },
  { port: 443, service: 'HTTPS (TLS)', count: 428, attackType: 'Infiltration / Flood' },
  { port: 22, service: 'SSH (Remote CLI)', count: 384, attackType: 'Brute Force / Patator' },
  { port: 445, service: 'SMB (File Share)', count: 219, attackType: 'Port Scan / EternalBlue' },
  { port: 3389, service: 'RDP (Windows Remote)', count: 172, attackType: 'Brute Force' },
  { port: 53, service: 'DNS (Name Resolution)', count: 96, attackType: 'DNS Amplification' }
];

export const mockTopMaliciousIps = [
  { ip: '185.220.101.5', origin: 'Germany (Tor Exit)', attacks: 412, threat: 'DDoS / Tor', risk: 96 },
  { ip: '91.240.118.172', origin: 'Russia (HostTelecom)', attacks: 284, threat: 'Botnet C2', risk: 92 },
  { ip: '45.33.32.156', origin: 'United States (Linode)', attacks: 156, threat: 'Web / SQLi', risk: 88 },
  { ip: '103.251.167.20', origin: 'Hong Kong (Shinjiru)', attacks: 89, threat: 'Port Scan', risk: 78 },
  { ip: '198.51.100.44', origin: 'Netherlands (SURFnet)', attacks: 47, threat: 'Slowloris DoS', risk: 68 }
];

