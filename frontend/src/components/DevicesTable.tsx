import { Link } from 'react-router-dom';

import type { Device, TelemetryReading } from '../types/domain';
import { formatDateTime, formatMetricName, formatNumber } from '../utils/format';
import { StatusBadge } from './StatusBadge';

type Props = {
  devices: Device[];
  latestMetricsByDevice: Record<string, Record<string, TelemetryReading>>;
};

const preferredMetrics = ['TEMPERATURE', 'VIBRATION', 'POWER'];

export function DevicesTable({ devices, latestMetricsByDevice }: Props) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Devices Table</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-normal text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Device</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Health</th>
              <th className="px-4 py-3 text-left font-medium">Latest Metrics</th>
              <th className="px-4 py-3 text-left font-medium">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {devices.map((device) => {
              const metrics = latestMetricsByDevice[device.id] ?? {};
              const lastUpdated =
                Object.values(metrics).sort(
                  (left, right) =>
                    new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
                )[0]?.timestamp ?? device.updatedAt;

              return (
                <tr key={device.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-cyan-300 hover:text-cyan-200" to={`/devices/${device.id}`}>
                      {device.name}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {device.type} / {device.location}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={device.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-32 items-center gap-2">
                      <div className="h-2 w-24 rounded bg-slate-800">
                        <div
                          className="h-2 rounded bg-cyan-400"
                          style={{ width: `${Math.max(0, Math.min(100, device.healthScore))}%` }}
                        />
                      </div>
                      <span className="text-slate-200">{device.healthScore}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {preferredMetrics.map((metric) => (
                        <span key={metric} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">
                          {formatMetricName(metric)} {formatNumber(Number(metrics[metric]?.value), 1)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatDateTime(lastUpdated)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
