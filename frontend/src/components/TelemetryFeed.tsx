import type { TelemetryReading } from '../types/domain';
import { formatDateTime, formatMetricName, formatNumber } from '../utils/format';

type Props = {
  readings: TelemetryReading[];
};

export function TelemetryFeed({ readings }: Props) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Recent Telemetry</h2>
      </div>
      <div className="divide-y divide-slate-800">
        {readings.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">Waiting for telemetry.</p>
        ) : (
          readings.map((reading, index) => (
            <div key={`${reading.deviceId}-${reading.metric}-${reading.timestamp}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-200">{formatMetricName(String(reading.metric))}</p>
                <p className="mt-1 text-xs text-slate-500">{reading.deviceId}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-slate-100">{formatNumber(Number(reading.value), 2)}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(reading.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
