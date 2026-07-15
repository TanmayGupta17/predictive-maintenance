import type { TelemetryReading } from '../types/domain';
import { formatDateTime, formatMetricName, formatNumber } from '../utils/format';

type Props = {
  metric: string;
  reading?: TelemetryReading;
};

export function MetricTile({ metric, reading }: Props) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-normal text-slate-400">
        {formatMetricName(metric)}
      </p>
      <p className="mt-2 text-xl font-semibold text-slate-50">
        {reading ? formatNumber(Number(reading.value), 2) : 'N/A'}
      </p>
      <p className="mt-1 text-xs text-slate-500">{formatDateTime(reading?.timestamp)}</p>
    </div>
  );
}
