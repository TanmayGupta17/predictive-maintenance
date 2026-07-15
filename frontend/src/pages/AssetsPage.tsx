import { useCallback, useEffect, useMemo, useState } from 'react';

import { getDevice, getDevices } from '../api/devices';
import { DevicesTable } from '../components/DevicesTable';
import { StatePanel } from '../components/StatePanel';
import type { Device, DeviceStatus, FleetSummaryResponse, TelemetryReading } from '../types/domain';

const statusFilters: Array<{ label: string; value: 'ALL' | DeviceStatus }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Online', value: 'ONLINE' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'Offline', value: 'OFFLINE' },
];

export function AssetsPage() {
  const [fleet, setFleet] = useState<FleetSummaryResponse | null>(null);
  const [latestMetricsByDevice, setLatestMetricsByDevice] = useState<
    Record<string, Record<string, TelemetryReading>>
  >({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DeviceStatus>('ALL');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const fleetResponse = await getDevices();
      setFleet(fleetResponse);

      const metricPairs = await Promise.all(
        fleetResponse.data.map(async (device) => {
          const detail = await getDevice(device.id);
          return [device.id, detail.latestMetrics] as const;
        }),
      );
      setLatestMetricsByDevice(Object.fromEntries(metricPairs));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const devices = useMemo(() => {
    const all = fleet?.data ?? [];
    const term = search.trim().toLowerCase();
    return all.filter((device: Device) => {
      const matchesStatus = statusFilter === 'ALL' || device.status === statusFilter;
      const matchesSearch =
        term.length === 0 ||
        device.name.toLowerCase().includes(term) ||
        device.location.toLowerCase().includes(term) ||
        device.type.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [fleet, search, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Devices</h2>
          <p className="text-sm text-slate-500">Fleet asset inventory with health and latest telemetry.</p>
        </div>
        <p className="text-xs text-slate-500">
          {devices.length} of {fleet?.summary.total ?? 0} devices
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, location or type"
          className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-md border px-3 py-2 text-xs font-medium ${
                statusFilter === filter.value
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                  : 'border-slate-800 text-slate-300 hover:bg-slate-900'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {status === 'loading' ? (
        <StatePanel variant="loading" message="Loading device inventory." />
      ) : status === 'error' ? (
        <StatePanel
          variant="error"
          message="Could not load devices. The monitoring service may be unavailable."
          onRetry={() => void load()}
        />
      ) : (
        <DevicesTable devices={devices} latestMetricsByDevice={latestMetricsByDevice} />
      )}
    </div>
  );
}
