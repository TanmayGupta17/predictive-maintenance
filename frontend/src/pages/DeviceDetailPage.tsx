import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getActiveAlerts } from '../api/alerts';
import { getDevice, getDeviceHistory } from '../api/devices';
import { AlertsPanel } from '../components/AlertsPanel';
import { MetricChart } from '../components/MetricChart';
import { MetricTile } from '../components/MetricTile';
import { StatePanel } from '../components/StatePanel';
import { StatusBadge } from '../components/StatusBadge';
import { useDeviceRealtime } from '../hooks/useDeviceRealtime';
import { useRealtimeEvent } from '../hooks/useRealtimeEvent';
import type { Alert, Device, TelemetryReading } from '../types/domain';
import { realtimeEvents, type RealtimeAlertPayload, type RealtimeDeviceHealthPayload } from '../types/realtime';

const metrics = ['TEMPERATURE', 'PRESSURE', 'POWER', 'HUMIDITY', 'VIBRATION'];

export function DeviceDetailPage() {
  const { id } = useParams();
  const [device, setDevice] = useState<Device | null>(null);
  const [latestMetrics, setLatestMetrics] = useState<Record<string, TelemetryReading>>({});
  const [historyByMetric, setHistoryByMetric] = useState<Record<string, TelemetryReading[]>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useDeviceRealtime(id);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    setStatus((current) => (current === 'ready' ? current : 'loading'));
    try {
      const [detail, activeAlerts, ...histories] = await Promise.all([
        getDevice(id),
        getActiveAlerts(),
        ...metrics.map((metric) => getDeviceHistory(id, metric)),
      ]);

      setDevice(detail.device);
      setLatestMetrics(normalizeLatestMetrics(detail.latestMetrics));
      setAlerts(activeAlerts.data.filter((alert) => alert.deviceId === id));
      setHistoryByMetric(
        Object.fromEntries(metrics.map((metric, index) => [metric, histories[index]?.data ?? []])),
      );
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTelemetry = useCallback((payload: TelemetryReading) => {
    if (!id || payload.deviceId !== id) {
      return;
    }

    const metric = String(payload.metric).toUpperCase();
    const reading = {
      ...payload,
      metric,
    };

    setLatestMetrics((current) => ({
      ...current,
      [metric]: reading,
    }));
    setHistoryByMetric((current) => ({
      ...current,
      [metric]: [...(current[metric] ?? []), reading].slice(-120),
    }));
  }, [id]);

  const handleAlertChange = useCallback((payload: RealtimeAlertPayload) => {
    if (!id || payload.deviceId !== id) {
      return;
    }

    setAlerts((current) => {
      const alert = payload.alert as Alert;
      if (payload.action === 'resolved') {
        return current.filter((item) => item.id !== alert.id);
      }

      return [alert, ...current.filter((item) => item.id !== alert.id)];
    });
  }, [id]);

  const handleHealthChange = useCallback((payload: RealtimeDeviceHealthPayload) => {
    if (!id || payload.deviceId !== id) {
      return;
    }

    setDevice((current) =>
      current
        ? {
            ...current,
            healthScore: payload.healthScore,
            status: payload.status as Device['status'],
            updatedAt: payload.updatedAt,
          }
        : current,
    );
  }, [id]);

  useRealtimeEvent<TelemetryReading>(realtimeEvents.telemetryUpdated, handleTelemetry);
  useRealtimeEvent<RealtimeAlertPayload>(realtimeEvents.alertsChanged, handleAlertChange);
  useRealtimeEvent<RealtimeDeviceHealthPayload>(realtimeEvents.deviceHealthChanged, handleHealthChange);

  const metricTiles = useMemo(
    () => metrics.map((metric) => <MetricTile key={metric} metric={metric} reading={latestMetrics[metric]} />),
    [latestMetrics],
  );

  if (status === 'error') {
    return (
      <StatePanel
        variant="error"
        message="Could not load this device. The monitoring service may be unavailable."
        onRetry={() => void load()}
      />
    );
  }

  if (!id || !device) {
    return <StatePanel variant="loading" message="Loading device." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/dashboard" className="text-sm text-cyan-300 hover:text-cyan-200">
            Back to fleet
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-50">{device.name}</h2>
            <StatusBadge value={device.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {device.type} / {device.location}
          </p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-normal text-slate-500">Health</p>
          <p className="text-2xl font-semibold text-slate-50">{device.healthScore}%</p>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metricTiles}</section>

      <section className="grid gap-4 xl:grid-cols-2">
        {metrics.map((metric) => (
          <MetricChart key={metric} metric={metric} data={historyByMetric[metric] ?? []} />
        ))}
      </section>

      <AlertsPanel alerts={alerts} title="Alert Timeline" />
    </div>
  );
}

function normalizeLatestMetrics(metricsByName: Record<string, TelemetryReading>) {
  return Object.fromEntries(
    Object.entries(metricsByName).map(([metric, reading]) => [
      metric.toUpperCase(),
      {
        ...reading,
        metric: metric.toUpperCase(),
      },
    ]),
  );
}
