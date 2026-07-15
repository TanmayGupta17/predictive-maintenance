import { useCallback, useEffect, useMemo, useState } from 'react';

import { getActiveAlerts } from '../api/alerts';
import { getDashboard } from '../api/dashboard';
import { getDevice, getDevices } from '../api/devices';
import { AlertsPanel } from '../components/AlertsPanel';
import { DevicesTable } from '../components/DevicesTable';
import { HealthCard } from '../components/HealthCard';
import { MostCriticalDeviceCard } from '../components/MostCriticalDeviceCard';
import { RiskDistribution } from '../components/RiskDistribution';
import { StatePanel } from '../components/StatePanel';
import { TelemetryFeed } from '../components/TelemetryFeed';
import { useRealtimeEvent } from '../hooks/useRealtimeEvent';
import type {
  Alert,
  DashboardResponse,
  Device,
  FleetSummaryResponse,
  TelemetryReading,
} from '../types/domain';
import { realtimeEvents, type RealtimeAlertPayload, type RealtimeDeviceHealthPayload } from '../types/realtime';
import { formatNumber } from '../utils/format';

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [fleet, setFleet] = useState<FleetSummaryResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [latestMetricsByDevice, setLatestMetricsByDevice] = useState<Record<string, Record<string, TelemetryReading>>>({});
  const [recentTelemetry, setRecentTelemetry] = useState<TelemetryReading[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const refresh = useCallback(async () => {
    setStatus((current) => (current === 'ready' ? current : 'loading'));
    try {
      const [dashboardResponse, fleetResponse, alertsResponse] = await Promise.all([
        getDashboard(),
        getDevices(),
        getActiveAlerts(),
      ]);

      setDashboard(dashboardResponse);
      setFleet(fleetResponse);
      setAlerts(alertsResponse.data);

      const latestMetricPairs = await Promise.all(
        fleetResponse.data.slice(0, 12).map(async (device) => {
          const detail = await getDevice(device.id);
          return [device.id, detail.latestMetrics] as const;
        }),
      );

      setLatestMetricsByDevice(Object.fromEntries(latestMetricPairs));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleTelemetry = useCallback((payload: TelemetryReading) => {
    const metricKey = String(payload.metric).toUpperCase();
    setRecentTelemetry((current) => [payload, ...current].slice(0, 12));
    setLatestMetricsByDevice((current) => ({
      ...current,
      [payload.deviceId]: {
        ...(current[payload.deviceId] ?? {}),
        [metricKey]: {
          ...payload,
          metric: metricKey,
        },
      },
    }));
  }, []);

  const handleAlertChange = useCallback((payload: RealtimeAlertPayload) => {
    setAlerts((current) => {
      if (payload.action === 'resolved') {
        return current.filter((alert) => alert.id !== (payload.alert as Alert).id);
      }

      const nextAlert = payload.alert as Alert;
      const withoutExisting = current.filter((alert) => alert.id !== nextAlert.id);
      return [nextAlert, ...withoutExisting].slice(0, 20);
    });
  }, []);

  const handleHealthChange = useCallback((payload: RealtimeDeviceHealthPayload) => {
    setFleet((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        data: current.data.map((device) =>
          device.id === payload.deviceId
            ? {
                ...device,
                healthScore: payload.healthScore,
                status: payload.status as Device['status'],
                updatedAt: payload.updatedAt,
              }
            : device,
        ),
      };
    });
    void getDashboard().then(setDashboard);
  }, []);

  useRealtimeEvent<TelemetryReading>(realtimeEvents.telemetryUpdated, handleTelemetry);
  useRealtimeEvent<RealtimeAlertPayload>(realtimeEvents.alertsChanged, handleAlertChange);
  useRealtimeEvent<RealtimeDeviceHealthPayload>(realtimeEvents.deviceHealthChanged, handleHealthChange);

  const devices = useMemo(() => fleet?.data ?? [], [fleet]);

  if (status === 'loading') {
    return <StatePanel variant="loading" message="Loading fleet telemetry." />;
  }

  if (status === 'error') {
    return (
      <StatePanel
        variant="error"
        message="Could not load the fleet overview. The monitoring service may be unavailable."
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Fleet Overview</h2>
          <p className="text-sm text-slate-500">Live operational state across monitored industrial devices.</p>
        </div>
        <p className="text-xs text-slate-500">{fleet?.summary.total ?? 0} devices monitored</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <HealthCard label="Healthy Devices" value={dashboard?.healthyCount ?? 0} tone="healthy" />
        <HealthCard label="Warning Devices" value={dashboard?.warningCount ?? 0} tone="warning" />
        <HealthCard label="Critical Devices" value={dashboard?.criticalCount ?? 0} tone="critical" />
        <HealthCard
          label="Average Health"
          value={`${formatNumber(dashboard?.averageHealthScore ?? 0, 1)}%`}
          tone="neutral"
        />
        <HealthCard label="Active Alerts" value={dashboard?.activeAlertCount ?? 0} tone="warning" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
        <MostCriticalDeviceCard device={dashboard?.mostCriticalDevice ?? null} />
        {dashboard ? <RiskDistribution distribution={dashboard.riskDistribution} /> : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
        <DevicesTable devices={devices} latestMetricsByDevice={latestMetricsByDevice} />
        <div className="space-y-5">
          <AlertsPanel alerts={alerts} title="Active Alerts" />
          <TelemetryFeed readings={recentTelemetry} />
        </div>
      </section>
    </div>
  );
}
