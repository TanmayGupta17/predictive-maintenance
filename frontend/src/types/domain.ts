export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE' | 'DECOMMISSIONED';

export type DeviceType = 'PUMP' | 'MOTOR' | 'COMPRESSOR' | 'GENERATOR' | 'CONVEYOR' | 'TURBINE' | 'SENSOR' | 'OTHER';

export type TelemetryMetric = 'TEMPERATURE' | 'VIBRATION' | 'PRESSURE' | 'HUMIDITY' | 'VOLTAGE' | 'CURRENT' | 'RPM' | 'POWER' | 'NOISE' | 'OTHER';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export type Device = {
  id: string;
  name: string;
  type: DeviceType;
  location: string;
  healthScore: number;
  status: DeviceStatus;
  createdAt: string;
  updatedAt: string;
};

export type TelemetryReading = {
  id?: string;
  telemetryId?: string;
  deviceId: string;
  metric: TelemetryMetric | string;
  value: number;
  timestamp: string;
  receivedAt?: string;
};

export type Alert = {
  id: string;
  deviceId: string;
  metric?: TelemetryMetric | null;
  ruleKey?: string | null;
  severity: AlertSeverity;
  confidenceScore?: number | null;
  title: string;
  description: string;
  reason?: string | null;
  recommendation?: string | null;
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string | null;
  device?: Pick<Device, 'id' | 'name' | 'type' | 'location'>;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type FleetSummaryResponse = PaginatedResponse<Device> & {
  summary: {
    total: number;
    averageHealthScore: number;
    statusCounts: Record<string, number>;
  };
};

export type DeviceDetailResponse = {
  device: Device;
  latestMetrics: Record<string, TelemetryReading>;
};

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type RiskDistribution = {
  LOW: number;
  MODERATE: number;
  HIGH: number;
  CRITICAL: number;
  total: number;
};

export type MostCriticalDevice = {
  device: Device;
  healthScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  activeAlertCount: number;
};

export type DashboardResponse = {
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  averageHealthScore: number;
  activeAlertCount: number;
  mostCriticalDevice: MostCriticalDevice | null;
  riskDistribution: RiskDistribution;
  recentFailures: Alert[];
  topRiskyDevices: Array<{
    device: Device;
    riskScore: number;
    activeAlertCount: number;
  }>;
};
