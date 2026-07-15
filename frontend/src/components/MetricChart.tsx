import type { TelemetryReading } from '../types/domain';
import { formatMetricName } from '../utils/format';
import { TimeSeriesChart, type ChartPoint } from './charts/TimeSeriesChart';

type Props = {
  metric: string;
  data: TelemetryReading[];
};

const metricColors: Record<string, string> = {
  TEMPERATURE: '#22d3ee',
  PRESSURE: '#34d399',
  POWER: '#fbbf24',
  HUMIDITY: '#60a5fa',
  VIBRATION: '#f87171',
};

const metricUnits: Record<string, string> = {
  TEMPERATURE: '°C',
  PRESSURE: 'bar',
  POWER: 'kW',
  HUMIDITY: '%',
  VIBRATION: 'mm/s',
};

/**
 * Single-metric time-series card. Thin wrapper over the reusable
 * {@link TimeSeriesChart} that maps a metric to its colour, unit and label.
 */
export function MetricChart({ metric, data }: Props) {
  const chartData: ChartPoint[] = data.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    value: Number(reading.value),
  }));

  const label = formatMetricName(metric);

  return (
    <TimeSeriesChart
      title={`${label} over time`}
      data={chartData}
      unit={metricUnits[metric]}
      series={[{ key: 'value', name: label, color: metricColors[metric] ?? '#22d3ee' }]}
    />
  );
}
