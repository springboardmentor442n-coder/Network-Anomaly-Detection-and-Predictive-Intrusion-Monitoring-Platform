import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback
} from 'react';

import {
  User,
  NetworkPacket,
  SecurityAlert,
  SecurityIncident,
  AuditLogItem,
  DatasetMeta,
  AttackCategory,
  SeverityLevel,
  UserRole
} from '../types';

import {
  INITIAL_USERS,
  INITIAL_PACKETS,
  INITIAL_ALERTS,
  INITIAL_INCIDENTS,
  INITIAL_AUDIT_LOGS,
  DATASETS_INFO
} from '../data/mockData';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface UploadedDatasetInfo {
  fileName: string;
  totalRecords: number;
  features: number;
  benignCount: number;
  attackCount: number;
  attackClasses: string[];
}

interface SecurityContextType {
  currentUser: User | null;
  isAuthenticated: boolean;

  login: (role: UserRole, email?: string) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;

  // Real-time Simulation Controls
  isLiveStreamActive: boolean;
  toggleLiveStream: () => void;
  streamSpeed: number;
  setStreamSpeed: (speed: number) => void;
  injectAttackSimulation: (type: AttackCategory) => void;

  // Network Data
  packets: NetworkPacket[];
  clearPackets: () => void;

  // Alerts
  alerts: SecurityAlert[];
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string, resolutionNote?: string) => void;
  archiveAlert: (alertId: string) => void;
  escalateAlertToIncident: (alertId: string) => void;

  // Incidents
  incidents: SecurityIncident[];
  createIncident: (incidentData: Partial<SecurityIncident>) => void;
  updateIncidentStatus: (
    incidentId: string,
    status: SecurityIncident['status'],
    note?: string
  ) => void;
  assignAnalyst: (incidentId: string, analystName: string) => void;
  applyPlaybook: (incidentId: string, playbookName: string) => void;
  addIncidentNote: (incidentId: string, text: string) => void;

  // Firewall / Mitigation
  blockedIps: string[];
  blockIp: (ip: string, reason: string) => void;
  unblockIp: (ip: string) => void;

  // Datasets
  datasets: DatasetMeta[];
  runDatasetPreprocessing: (
    datasetId: 'CICIDS2017' | 'UNSW-NB15'
  ) => Promise<void>;

  uploadDataset: (file: File) => Promise<void>;

  preprocessingProgress: {
    [key: string]: number;
  };

  uploadedDatasetInfo: UploadedDatasetInfo | null;

  // Audit Logs
  auditLogs: AuditLogItem[];
  addAuditLog: (
    action: string,
    category: AuditLogItem['category'],
    status?: 'Success' | 'Warning' | 'Denied'
  ) => void;

  // Metrics & Stats
  stats: {
    totalTrafficMb: number;
    totalPackets: number;
    normalTrafficCount: number;
    anomalousTrafficCount: number;
    detectedAttacksCount: number;
    activeAlertsCount: number;
    criticalAlertsCount: number;
    averageRiskScore: number;
  };

  // Notification Toasts
  toasts: Toast[];
  removeToast: (id: string) => void;
  addToast: (
    title: string,
    message: string,
    type?: Toast['type']
  ) => void;

  audioAlertsEnabled: boolean;
  setAudioAlertsEnabled: (enabled: boolean) => void;
}

const SecurityContext =
  createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {

  const [currentUser, setCurrentUser] =
    useState<User | null>(INITIAL_USERS[0]);

  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean>(true);

  const [isLiveStreamActive, setIsLiveStreamActive] =
    useState<boolean>(true);

  const [streamSpeed, setStreamSpeed] =
    useState<number>(1);

  const [packets, setPackets] =
    useState<NetworkPacket[]>(INITIAL_PACKETS);

  const [alerts, setAlerts] =
    useState<SecurityAlert[]>(INITIAL_ALERTS);

  const [incidents, setIncidents] =
    useState<SecurityIncident[]>(INITIAL_INCIDENTS);

  const [auditLogs, setAuditLogs] =
    useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);

  const [datasets, setDatasets] =
    useState<DatasetMeta[]>(DATASETS_INFO);

  const [preprocessingProgress, setPreprocessingProgress] =
    useState<{ [key: string]: number }>({});

  const [uploadedDatasetInfo, setUploadedDatasetInfo] =
    useState<UploadedDatasetInfo | null>(null);

  const [blockedIps, setBlockedIps] =
    useState<string[]>(['198.51.100.12']);

  const [toasts, setToasts] =
    useState<Toast[]>([]);

  const [audioAlertsEnabled, setAudioAlertsEnabled] =
    useState<boolean>(false);

  // --------------------------------------------------
  // TOAST
  // --------------------------------------------------

  const addToast = useCallback(
    (
      title: string,
      message: string,
      type: Toast['type'] = 'info'
    ) => {
      const id =
        `toast-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 5)}`;

      setToasts(prev => [
        ...prev.slice(-4),
        {
          id,
          title,
          message,
          type
        }
      ]);

      setTimeout(() => {
        setToasts(prev =>
          prev.filter(t => t.id !== id)
        );
      }, 4500);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts(prev =>
      prev.filter(t => t.id !== id)
    );
  };

  // --------------------------------------------------
  // AUDIT LOG
  // --------------------------------------------------

  const addAuditLog = useCallback(
    (
      action: string,
      category: AuditLogItem['category'],
      status:
        | 'Success'
        | 'Warning'
        | 'Denied' = 'Success'
    ) => {

      const newLog: AuditLogItem = {
        id: `aud-${Date.now().toString().slice(-4)}`,
        timestamp:
          new Date()
            .toISOString()
            .replace('T', ' ')
            .slice(0, 19) + ' UTC',

        user:
          currentUser?.name ||
          'System Operator',

        role:
          currentUser?.role ||
          'analyst',

        action,
        category,

        ipAddress:
          '192.168.1.10',

        status
      };

      setAuditLogs(prev => [
        newLog,
        ...prev
      ]);
    },
    [currentUser]
  );

  // --------------------------------------------------
  // AUTH
  // --------------------------------------------------

  const login = (
    role: UserRole,
    email?: string
  ) => {

    const foundUser =
      INITIAL_USERS.find(
        u => u.role === role
      ) || INITIAL_USERS[0];

    const userToSet =
      email
        ? { ...foundUser, email }
        : foundUser;

    setCurrentUser(userToSet);
    setIsAuthenticated(true);

    addAuditLog(
      `User login authenticated with role: ${role.toUpperCase()}`,
      'Auth'
    );

    addToast(
      'Authentication Verified',
      `Welcome back, ${userToSet.name}`,
      'success'
    );
  };

  const logout = () => {

    addAuditLog(
      'User logged out of Security Operations Center',
      'Auth'
    );

    setCurrentUser(null);
    setIsAuthenticated(false);

    addToast(
      'Logged Out',
      'Your session has been securely invalidated.',
      'info'
    );
  };

  const switchRole = (role: UserRole) => {

    const targetUser =
      INITIAL_USERS.find(
        u => u.role === role
      ) || INITIAL_USERS[0];

    setCurrentUser(targetUser);

    addAuditLog(
      `Active role changed to ${role.toUpperCase()}`,
      'Auth'
    );

    addToast(
      'Role Switched',
      `Active identity set to ${targetUser.name}`,
      'info'
    );
  };

  // --------------------------------------------------
  // LIVE STREAM
  // --------------------------------------------------

  const toggleLiveStream = () => {

    setIsLiveStreamActive(prev => {

      const next = !prev;

      addToast(
        next
          ? 'Live Packet Stream Resumed'
          : 'Live Packet Stream Paused',

        next
          ? 'Synthetic SOC network sensor stream is active.'
          : 'Sensor ingress feed temporarily frozen.',

        'info'
      );

      return next;
    });
  };

  // --------------------------------------------------
  // ATTACK SIMULATION
  // --------------------------------------------------

  const injectAttackSimulation =
    (type: AttackCategory) => {

      const timestamp =
        new Date()
          .toTimeString()
          .split(' ')[0] +
        '.' +
        Math.floor(
          Math.random() * 900 + 100
        );

      const attackIp =
        type === 'DDoS'
          ? '185.220.101.99'
          : type === 'Port Scan'
          ? '103.251.167.88'
          : type === 'Brute Force'
          ? '172.16.0.89'
          : '45.33.32.204';

      const targetIp = '10.0.0.4';

      const isCritical =
        [
          'DDoS',
          'Botnet',
          'Infiltration'
        ].includes(type);

      const severity: SeverityLevel =
        isCritical
          ? 'Critical'
          : 'High';

      const riskScore =
        Math.floor(
          Math.random() *
            15 +
            (isCritical ? 85 : 72)
        );

      const confidence =
        parseFloat(
          (
            0.92 +
            Math.random() * 0.07
          ).toFixed(3)
        );

      const newPkt: NetworkPacket = {
        id:
          `pkt-${Math.floor(
            Math.random() * 90000 + 10000
          )}`,

        timestamp,

        sourceIp: attackIp,

        destIp: targetIp,

        sourcePort:
          Math.floor(
            Math.random() * 40000 + 10000
          ),

        destPort:
          type === 'Brute Force'
            ? 22
            : type === 'Web Attack'
            ? 8080
            : 80,

        protocol:
          type === 'Web Attack'
            ? 'HTTP'
            : 'TCP',

        packetCount:
          type === 'DDoS'
            ? 2500
            : 340,

        byteSize:
          type === 'DDoS'
            ? 3200000
            : 45000,

        flowDurationMs: 82,

        flags: ['SYN', 'PSH'],

        status: 'ATTACK',

        attackType: type,

        confidence,

        riskScore,

        payloadPreview:
          `[SIMULATED ATTACK] Injected ${type} signature traffic payload stream`
      };

      const newAlert: SecurityAlert = {
        id:
          `ALT-${Math.floor(
            Math.random() * 9000 + 1100
          )}`,

        threatType: type,

        sourceIp: attackIp,

        destIp: targetIp,

        sourcePort:
          newPkt.sourcePort,

        destPort:
          newPkt.destPort,

        severity,

        riskScore,

        detectionTime:
          new Date()
            .toISOString()
            .replace('T', ' ')
            .slice(0, 19) +
          ' UTC',

        status: 'active',

        confidence,

        protocol:
          newPkt.protocol,

        description:
          `Live simulated threat injection: ${type} detected with ${Math.round(
            confidence * 100
          )}% confidence.`,

        mitreTactic:
          isCritical
            ? 'Impact / Defense Evasion'
            : 'Initial Access / Reconnaissance',

        mitreTechnique:
          type === 'DDoS'
            ? 'Network Denial of Service (T1498)'
            : type === 'Port Scan'
            ? 'Network Service Discovery (T1046)'
            : 'Exploit Public-Facing Application (T1190)',

        recommendedAction:
          `Quarantine origin ${attackIp} and enforce active drop ACL.`
      };

      setPackets(prev => [
        newPkt,
        ...prev.slice(0, 75)
      ]);

      setAlerts(prev => [
        newAlert,
        ...prev
      ]);

      addAuditLog(
        `Simulated Attack Injected: ${type}`,
        'Model',
        'Warning'
      );

      addToast(
        `Security Alert: ${type} Detected!`,
        `Origin: ${attackIp} | Risk: ${riskScore}/100`,
        'error'
      );
    };

  // --------------------------------------------------
  // PERIODIC SYNTHETIC TRAFFIC
  // --------------------------------------------------

  useEffect(() => {

    if (!isLiveStreamActive) {
      return;
    }

    const intervalTime =
      Math.max(
        800,
        Math.floor(
          2500 / streamSpeed
        )
      );

    const interval =
      setInterval(() => {

        const isAttack =
          Math.random() < 0.22;

        const attackTypes: AttackCategory[] =
          [
            'DoS',
            'DDoS',
            'Port Scan',
            'Brute Force',
            'Botnet',
            'Web Attack'
          ];

        const chosenAttack =
          isAttack
            ? attackTypes[
                Math.floor(
                  Math.random() *
                    attackTypes.length
                )
              ]
            : 'BENIGN';

        const localSubnets =
          [
            '192.168.1.',
            '10.0.0.',
            '172.16.0.'
          ];

        const externalIps =
          [
            '185.220.101.5',
            '45.33.32.156',
            '103.251.167.20',
            '91.240.118.172',
            '8.8.8.8',
            '1.1.1.1'
          ];

        const sourceIp =
          isAttack
            ? externalIps[
                Math.floor(
                  Math.random() *
                  (externalIps.length - 2)
                )
              ]
            : localSubnets[
                Math.floor(
                  Math.random() *
                    localSubnets.length
                )
              ] +
              Math.floor(
                Math.random() * 200 + 10
              );

        const destIp =
          isAttack
            ? '10.0.0.' +
              Math.floor(
                Math.random() * 15 + 2
              )
            : externalIps[
                Math.floor(
                  Math.random() *
                    externalIps.length
                )
              ];

        const protocols:
          (
            | 'TCP'
            | 'UDP'
            | 'TLS'
            | 'HTTP'
            | 'DNS'
          )[] =
          [
            'TCP',
            'UDP',
            'TLS',
            'HTTP',
            'DNS'
          ];

        const protocol =
          protocols[
            Math.floor(
              Math.random() *
                protocols.length
            )
          ];

        const timestamp =
          new Date()
            .toTimeString()
            .split(' ')[0] +
          '.' +
          Math.floor(
            Math.random() * 900 + 100
          );

        const confidence =
          isAttack
            ? parseFloat(
                (
                  0.85 +
                  Math.random() * 0.14
                ).toFixed(3)
              )
            : parseFloat(
                (
                  0.95 +
                  Math.random() * 0.04
                ).toFixed(3)
              );

        const riskScore =
          isAttack
            ? Math.floor(
                Math.random() * 40 + 58
              )
            : Math.floor(
                Math.random() * 15 + 2
              );

        const newPacket: NetworkPacket = {
          id:
            `pkt-${Math.floor(
              Math.random() * 90000 + 10000
            )}`,

          timestamp,

          sourceIp,

          destIp,

          sourcePort:
            Math.floor(
              Math.random() *
                55000 +
                1024
            ),

          destPort:
            protocol === 'HTTP'
              ? 80
              : protocol === 'TLS'
              ? 443
              : protocol === 'DNS'
              ? 53
              : Math.floor(
                  Math.random() *
                    1000 +
                    20
                ),

          protocol,

          packetCount:
            isAttack
              ? Math.floor(
                  Math.random() *
                    800 +
                    200
                )
              : Math.floor(
                  Math.random() *
                    40 +
                    4
                ),

          byteSize:
            isAttack
              ? Math.floor(
                  Math.random() *
                    500000 +
                    50000
                )
              : Math.floor(
                  Math.random() *
                    25000 +
                    500
                ),

          flowDurationMs:
            Math.floor(
              Math.random() *
                400 +
                12
            ),

          flags:
            isAttack
              ? ['SYN', 'ACK']
              : ['ACK', 'PSH'],

          status:
            isAttack
              ? 'ATTACK'
              : 'BENIGN',

          attackType:
            chosenAttack,

          confidence,

          riskScore,

          payloadPreview:
            isAttack
              ? `Suspicious payload signature [${chosenAttack}]`
              : `Standard protocol packet flow frame verified: ${protocol}`
        };

        setPackets(prev => [
          newPacket,
          ...prev.slice(0, 80)
        ]);

        if (
          isAttack &&
          riskScore > 75 &&
          Math.random() < 0.4
        ) {

          const severity: SeverityLevel =
            riskScore > 82
              ? 'Critical'
              : 'High';

          const newAlert: SecurityAlert = {
            id:
              `ALT-${Math.floor(
                Math.random() *
                  9000 +
                  1200
              )}`,

            threatType:
              chosenAttack,

            sourceIp,

            destIp,

            sourcePort:
              newPacket.sourcePort,

            destPort:
              newPacket.destPort,

            severity,

            riskScore,

            detectionTime:
              new Date()
                .toISOString()
                .replace('T', ' ')
                .slice(0, 19) +
              ' UTC',

            status: 'active',

            confidence,

            protocol,

            description:
              `Anomaly engine classified ${chosenAttack} flow with ${Math.round(
                confidence * 100
              )}% confidence.`,

            mitreTactic:
              'Execution & Lateral Movement',

            mitreTechnique:
              'Network Traffic Analysis T1040',

            recommendedAction:
              `Analyze packet payload and verify firewall rate-limit policy for ${sourceIp}.`
          };

          setAlerts(prevAlerts => [
            newAlert,
            ...prevAlerts.slice(0, 30)
          ]);

          if (severity === 'Critical') {

            addToast(
              `Critical Alert: ${chosenAttack}`,
              `High-risk anomaly from ${sourceIp} (Score: ${riskScore})`,
              'error'
            );
          }
        }

      }, intervalTime);

    return () =>
      clearInterval(interval);

  }, [
    isLiveStreamActive,
    streamSpeed,
    addToast
  ]);

  // --------------------------------------------------
  // ALERT MANAGEMENT
  // --------------------------------------------------

  const acknowledgeAlert = (
    alertId: string
  ) => {

    setAlerts(prev =>
      prev.map(a =>
        a.id === alertId
          ? {
              ...a,
              status: 'acknowledged'
            }
          : a
      )
    );

    addAuditLog(
      `Acknowledged security alert ${alertId}`,
      'Alert'
    );

    addToast(
      'Alert Acknowledged',
      `Alert ${alertId} assigned for investigation.`,
      'info'
    );
  };

  const resolveAlert = (
    alertId: string,
    resolutionNote?: string
  ) => {

    setAlerts(prev =>
      prev.map(a =>
        a.id === alertId
          ? {
              ...a,
              status: 'resolved'
            }
          : a
      )
    );

    addAuditLog(
      `Resolved security alert ${alertId}${
        resolutionNote
          ? `: ${resolutionNote}`
          : ''
      }`,
      'Alert'
    );

    addToast(
      'Alert Resolved',
      `Threat ${alertId} marked as resolved.`,
      'success'
    );
  };

  const archiveAlert = (
    alertId: string
  ) => {

    setAlerts(prev =>
      prev.map(a =>
        a.id === alertId
          ? {
              ...a,
              status: 'archived'
            }
          : a
      )
    );

    addAuditLog(
      `Archived security alert ${alertId}`,
      'Alert'
    );
  };

  const escalateAlertToIncident = (
    alertId: string
  ) => {

    const alert =
      alerts.find(
        a => a.id === alertId
      );

    if (!alert) {
      return;
    }

    const newInc: SecurityIncident = {
      id:
        `INC-2026-${Math.floor(
          Math.random() * 800 + 100
        )}`,

      alertId,

      title:
        `Escalated Incident: ${alert.threatType} Threat on ${alert.destIp}`,

      threatType:
        alert.threatType,

      severity:
        alert.severity,

      detectionTime:
        alert.detectionTime,

      assignedAnalyst:
        currentUser?.name ||
        'Alex Vance',

      riskScore:
        alert.riskScore,

      status: 'New',

      affectedIps: [
        alert.sourceIp,
        alert.destIp
      ],

      appliedPlaybooks: [
        'SOC-PB-01: Incident Triage'
      ],

      timeline: [
        {
          id:
            `tl-${Date.now()}`,

          timestamp:
            new Date().toTimeString().split(' ')[0],

          author:
            currentUser?.name ||
            'Analyst',

          action:
            'Incident Created',

          details:
            `Escalated directly from Alert ${alertId} with risk score ${alert.riskScore}.`
        }
      ]
    };

    setIncidents(prev => [
      newInc,
      ...prev
    ]);

    setAlerts(prev =>
      prev.map(a =>
        a.id === alertId
          ? {
              ...a,
              status: 'acknowledged'
            }
          : a
      )
    );

    addAuditLog(
      `Escalated Alert ${alertId} to Incident ${newInc.id}`,
      'Incident'
    );

    addToast(
      'Incident Created',
      `Escalated alert to Incident ${newInc.id}`,
      'warning'
    );
  };

  // --------------------------------------------------
  // INCIDENT MANAGEMENT
  // --------------------------------------------------

  const createIncident = (
    data: Partial<SecurityIncident>
  ) => {

    const newInc: SecurityIncident = {

      id:
        `INC-2026-${String(
          Math.floor(
            Math.random() *
              900
          ) + 100
        )}`,

      alertId:
        data.alertId ||
        `ALT-${Math.floor(
          Math.random() * 9000
        ) + 1000}`,

      title:
        data.title ||
        'Security Incident',

      threatType:
        data.threatType ||
        'DoS',

      severity:
        data.severity ||
        'Medium',

      detectionTime:
        new Date()
          .toISOString()
          .replace('T', ' ')
          .slice(0, 19) +
        ' UTC',

      assignedAnalyst:
        data.assignedAnalyst ||
        data.assignedTo ||
        currentUser?.name ||
        'Alex Vance',

      assignedTo:
        data.assignedTo ||
        data.assignedAnalyst ||
        currentUser?.name ||
        'Alex Vance',

      sourceIp:
        data.sourceIp ||
        '185.220.101.5',

      destIp:
        data.destIp ||
        '10.0.0.4',

      riskScore:
        data.riskScore ||
        (
          data.severity === 'Critical'
            ? 92
            : data.severity === 'High'
            ? 78
            : 50
        ),

      status:
        (data.status as any) ||
        'New',

      description:
        data.description ||
        'Operational incident raised via SOC analyst console.',

      affectedIps:
        data.affectedIps ||
        [
          data.sourceIp ||
            '185.220.101.5',

          data.destIp ||
            '10.0.0.4'
        ],

      appliedPlaybooks:
        data.appliedPlaybooks ||
        [
          'SOC-PB-01: Incident Triage'
        ],

      timeline: [
        {
          id:
            `tl-${Date.now()}`,

          timestamp:
            new Date().toTimeString().split(' ')[0],

          author:
            currentUser?.name ||
            'Analyst',

          action:
            'Incident Created',

          details:
            data.description ||
            'Incident raised manually by SOC analyst.'
        }
      ]
    };

    setIncidents(prev => [
      newInc,
      ...prev
    ]);

    addAuditLog(
      `Created Incident ${newInc.id}: ${newInc.title}`,
      'Incident'
    );

    addToast(
      'Incident Created',
      `Successfully raised incident ${newInc.id}`,
      'warning'
    );
  };

  const updateIncidentStatus = (
    incidentId: string,
    status: SecurityIncident['status'],
    note?: string
  ) => {

    setIncidents(prev =>
      prev.map(inc => {

        if (inc.id !== incidentId) {
          return inc;
        }

        const updatedTimeline = [
          ...inc.timeline,
          {
            id:
              `tl-${Date.now()}`,

            timestamp:
              new Date().toTimeString().split(' ')[0],

            author:
              currentUser?.name ||
              'Analyst',

            action:
              `Status Changed to ${status}`,

            details:
              note ||
              `Incident status moved to ${status}.`
          }
        ];

        return {
          ...inc,
          status,

          resolutionTime:
            status === 'Resolved'
              ? new Date()
                  .toISOString()
                  .replace('T', ' ')
                  .slice(0, 19) +
                ' UTC'
              : inc.resolutionTime,

          resolutionNotes:
            note ||
            inc.resolutionNotes,

          timeline:
            updatedTimeline
        };
      })
    );

    addAuditLog(
      `Updated Incident ${incidentId} to state ${status}`,
      'Incident'
    );

    addToast(
      'Incident Updated',
      `Incident ${incidentId} set to ${status}`,
      'info'
    );
  };

  const assignAnalyst = (
    incidentId: string,
    analystName: string
  ) => {

    setIncidents(prev =>
      prev.map(inc => {

        if (inc.id !== incidentId) {
          return inc;
        }

        return {
          ...inc,

          assignedAnalyst:
            analystName,

          timeline: [
            ...inc.timeline,
            {
              id:
                `tl-${Date.now()}`,

              timestamp:
                new Date().toTimeString().split(' ')[0],

              author:
                currentUser?.name ||
                'Administrator',

              action:
                'Analyst Reassigned',

              details:
                `Investigation lead assigned to ${analystName}.`
            }
          ]
        };
      })
    );

    addAuditLog(
      `Assigned ${analystName} to Incident ${incidentId}`,
      'Incident'
    );
  };

  const applyPlaybook = (
    incidentId: string,
    playbookName: string
  ) => {

    setIncidents(prev =>
      prev.map(inc => {

        if (inc.id !== incidentId) {
          return inc;
        }

        return {
          ...inc,

          appliedPlaybooks: [
            ...(inc.appliedPlaybooks || []),
            playbookName
          ],

          timeline: [
            ...inc.timeline,
            {
              id:
                `tl-${Date.now()}`,

              timestamp:
                new Date().toTimeString().split(' ')[0],

              author:
                currentUser?.name ||
                'SOC Automation',

              action:
                'Playbook Executed',

              details:
                `Enforced security automation playbook: ${playbookName}`
            }
          ]
        };
      })
    );

    addAuditLog(
      `Executed playbook ${playbookName} on Incident ${incidentId}`,
      'Incident'
    );

    addToast(
      'Playbook Enforced',
      `Applied ${playbookName} to incident`,
      'success'
    );
  };

  const addIncidentNote = (
    incidentId: string,
    text: string
  ) => {

    setIncidents(prev =>
      prev.map(inc => {

        if (inc.id !== incidentId) {
          return inc;
        }

        return {
          ...inc,

          timeline: [
            ...inc.timeline,
            {
              id:
                `tl-${Date.now()}`,

              timestamp:
                new Date().toTimeString().split(' ')[0],

              author:
                currentUser?.name ||
                'Analyst',

              action:
                'Investigation Note',

              details:
                text
            }
          ]
        };
      })
    );

    addToast(
      'Note Appended',
      `Investigation note added to ${incidentId}`,
      'info'
    );
  };

  // --------------------------------------------------
  // FIREWALL
  // --------------------------------------------------

  const blockIp = (
    ip: string,
    reason: string
  ) => {

    if (!blockedIps.includes(ip)) {

      setBlockedIps(prev => [
        ...prev,
        ip
      ]);

      addAuditLog(
        `Firewall blocked malicious IP ${ip} (Reason: ${reason})`,
        'System'
      );

      addToast(
        'Firewall Rule Applied',
        `IP ${ip} has been blocked.`,
        'warning'
      );
    }
  };

  const unblockIp = (
    ip: string
  ) => {

    setBlockedIps(prev =>
      prev.filter(
        item => item !== ip
      )
    );

    addAuditLog(
      `Unblocked IP ${ip}`,
      'System'
    );

    addToast(
      'Firewall Rule Removed',
      `IP ${ip} block has been removed.`,
      'info'
    );
  };

  // --------------------------------------------------
  // CSV DATASET UPLOAD
  // --------------------------------------------------

  const uploadDataset = async (
    file: File
  ) => {

    try {

      addToast(
        'Dataset Upload Started',
        `Reading ${file.name}...`,
        'info'
      );

      const text =
        await file.text();

      const lines =
        text
          .split(/\r?\n/)
          .filter(
            line =>
              line.trim().length > 0
          );

      if (lines.length < 2) {

        throw new Error(
          'CSV file is empty or contains no data rows.'
        );
      }

      /*
       * Simple CSV parser.
       * Handles quoted values reasonably well.
       */
      const parseCSVLine = (
        line: string
      ): string[] => {

        const result: string[] = [];

        let current = '';
        let insideQuotes = false;

        for (
          let i = 0;
          i < line.length;
          i++
        ) {

          const char =
            line[i];

          if (
            char === '"' &&
            line[i + 1] === '"'
          ) {

            current += '"';
            i++;
            continue;
          }

          if (char === '"') {

            insideQuotes =
              !insideQuotes;

            continue;
          }

          if (
            char === ',' &&
            !insideQuotes
          ) {

            result.push(
              current.trim()
            );

            current = '';

          } else {

            current += char;
          }
        }

        result.push(
          current.trim()
        );

        return result;
      };

      const headers =
        parseCSVLine(
          lines[0]
        );

      const rows =
        lines.slice(1);

      /*
       * Find Label column.
       */
      const labelIndex =
        headers.findIndex(
          h =>
            h
              .trim()
              .toLowerCase() ===
            'label'
        );

      let benignCount = 0;
      let attackCount = 0;

      const attackClasses =
        new Set<string>();

      /*
       * Analyze labels.
       */
      rows.forEach(row => {

        const values =
          parseCSVLine(row);

        if (
          labelIndex >= 0 &&
          values[labelIndex]
        ) {

          const label =
            values[labelIndex]
              .trim();

          if (
            label.toUpperCase() ===
            'BENIGN'
          ) {

            benignCount++;

          } else {

            attackCount++;

            attackClasses.add(
              label
            );
          }
        }
      });

      /*
       * Feature count.
       */
      const featureCount =
        labelIndex >= 0
          ? headers.length - 1
          : headers.length;

      /*
       * Dataset ID.
       */
      const datasetId =
        file.name
          .toLowerCase()
          .includes('unsw')
          ? 'UNSW-NB15'
          : 'CICIDS2017';

      /*
       * Save upload information.
       */
      setUploadedDatasetInfo({
        fileName: file.name,
        totalRecords: rows.length,
        features: featureCount,
        benignCount,
        attackCount,
        attackClasses:
          Array.from(
            attackClasses
          )
      });

      /*
       * Update dataset card.
       */
      const newDataset =
        {
          id: datasetId,
          name: file.name,
          records: rows.length,
          features: featureCount,
          status: 'Loaded'
        } as DatasetMeta;

      setDatasets(prev => {

        const exists =
          prev.some(
            ds =>
              ds.id ===
              datasetId
          );

        if (exists) {

          return prev.map(ds =>
            ds.id === datasetId
              ? newDataset
              : ds
          );
        }

        return [
          ...prev,
          newDataset
        ];
      });

      /*
       * Audit log.
       */
      addAuditLog(
        `Uploaded dataset ${file.name}: ${rows.length.toLocaleString()} records, ${featureCount} features`,
        'Dataset'
      );

      /*
       * Success toast.
       */
      addToast(
        'Dataset Uploaded',
        `${file.name} loaded successfully. ${rows.length.toLocaleString()} records detected.`,
        'success'
      );

      /*
       * Console output for debugging.
       */
      console.log(
        '=============================='
      );

      console.log(
        'NETSHIELD DATASET UPLOAD'
      );

      console.log(
        'File:',
        file.name
      );

      console.log(
        'Total Records:',
        rows.length
      );

      console.log(
        'Features:',
        featureCount
      );

      console.log(
        'BENIGN:',
        benignCount
      );

      console.log(
        'ATTACK:',
        attackCount
      );

      console.log(
        'Attack Classes:',
        Array.from(
          attackClasses
        )
      );

      console.log(
        '=============================='
      );

    } catch (error) {

      console.error(
        'Dataset upload error:',
        error
      );

      addToast(
        'Dataset Upload Failed',
        error instanceof Error
          ? error.message
          : 'Unable to read CSV file.',
        'error'
      );
    }
  };

  // --------------------------------------------------
  // DATASET PREPROCESSING
  // --------------------------------------------------

  const runDatasetPreprocessing =
    async (
      datasetId:
        | 'CICIDS2017'
        | 'UNSW-NB15'
    ) => {

      addToast(
        'Preprocessing Initiated',
        `Beginning data loading & feature engineering for ${datasetId}...`,
        'info'
      );

      setPreprocessingProgress(
        prev => ({
          ...prev,
          [datasetId]: 15
        })
      );

      await new Promise(
        r =>
          setTimeout(r, 600)
      );

      setPreprocessingProgress(
        prev => ({
          ...prev,
          [datasetId]: 40
        })
      );

      await new Promise(
        r =>
          setTimeout(r, 600)
      );

      setPreprocessingProgress(
        prev => ({
          ...prev,
          [datasetId]: 75
        })
      );

      await new Promise(
        r =>
          setTimeout(r, 700)
      );

      setPreprocessingProgress(
        prev => ({
          ...prev,
          [datasetId]: 100
        })
      );

      setDatasets(prev =>
        prev.map(ds =>
          ds.id === datasetId
            ? {
                ...ds,
                status:
                  'Model Ready'
              }
            : ds
        )
      );

      addAuditLog(
        `Executed preprocessing pipeline on ${datasetId}`,
        'Dataset'
      );

      addToast(
        'Preprocessing Complete',
        `${datasetId} feature vectors are model-ready.`,
        'success'
      );
    };

  // --------------------------------------------------
  // PACKETS
  // --------------------------------------------------

  const clearPackets = () => {

    setPackets([]);

    addToast(
      'Buffer Cleared',
      'Live packet buffer has been reset.',
      'info'
    );
  };

  // --------------------------------------------------
  // DERIVED STATISTICS
  // --------------------------------------------------

  const totalTrafficMb =
    parseFloat(
      (
        packets.reduce(
          (acc, p) =>
            acc + p.byteSize,
          0
        ) /
          (1024 * 1024) +
        128.4
      ).toFixed(2)
    );

  const totalPackets =
    packets.reduce(
      (acc, p) =>
        acc + p.packetCount,
      0
    ) + 18450;

  const normalTrafficCount =
    packets.filter(
      p =>
        p.status ===
        'BENIGN'
    ).length + 840;

  const anomalousTrafficCount =
    packets.filter(
      p =>
        p.status ===
        'ATTACK'
    ).length + 62;

  const detectedAttacksCount =
    alerts.length + 14;

  const activeAlertsCount =
    alerts.filter(
      a =>
        a.status ===
        'active'
    ).length;

  const criticalAlertsCount =
    alerts.filter(
      a =>
        a.status ===
          'active' &&
        a.severity ===
          'Critical'
    ).length;

  const averageRiskScore =
    Math.round(
      packets.length > 0
        ? packets.reduce(
            (acc, p) =>
              acc +
              p.riskScore,
            0
          ) /
            packets.length
        : 34
    );

  // --------------------------------------------------
  // PROVIDER
  // --------------------------------------------------

  return (
    <SecurityContext.Provider
      value={{

        currentUser,
        isAuthenticated,

        login,
        logout,
        switchRole,

        isLiveStreamActive,
        toggleLiveStream,

        streamSpeed,
        setStreamSpeed,

        injectAttackSimulation,

        packets,
        clearPackets,

        alerts,

        acknowledgeAlert,
        resolveAlert,
        archiveAlert,
        escalateAlertToIncident,

        incidents,

        createIncident,
        updateIncidentStatus,
        assignAnalyst,
        applyPlaybook,
        addIncidentNote,

        blockedIps,
        blockIp,
        unblockIp,

        datasets,

        runDatasetPreprocessing,

        uploadDataset,

        preprocessingProgress,

        uploadedDatasetInfo,

        auditLogs,
        addAuditLog,

        stats: {
          totalTrafficMb,
          totalPackets,
          normalTrafficCount,
          anomalousTrafficCount,
          detectedAttacksCount,
          activeAlertsCount,
          criticalAlertsCount,
          averageRiskScore
        },

        toasts,
        removeToast,
        addToast,

        audioAlertsEnabled,
        setAudioAlertsEnabled

      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {

  const context =
    useContext(
      SecurityContext
    );

  if (!context) {

    throw new Error(
      'useSecurity must be used within a SecurityProvider'
    );
  }

  return context;
};