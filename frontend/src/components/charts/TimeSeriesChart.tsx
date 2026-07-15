import { useMemo, useState } from 'react';
import {
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatNumber } from '../../utils/format';

export type ChartSeries = {
  /** Key on each data point holding the numeric value. */
  key: string;
  /** Human readable label shown in the legend and tooltip. */
  name: string;
  /** Stroke colour for the line. */
  color: string;
};

export type ChartPoint = Record<string, number | string | null>;

type Props = {
  title: string;
  data: ChartPoint[];
  series: ChartSeries[];
  /** Key used for the X axis (defaults to `time`). */
  xKey?: string;
  /** Unit suffix appended to values in the tooltip / axis. */
  unit?: string;
  /** Decimal places for value formatting. */
  valueDigits?: number;
  /** Chart body height in pixels (excludes header). */
  height?: number;
  /** Show the bottom brush that enables range zoom + pan. */
  enableZoom?: boolean;
};

/**
 * Reusable, responsive time-series chart built on Recharts.
 *
 * Supports one or many series, tooltips, a legend, and two forms of zoom:
 * drag across the plot to zoom into an X range, and the bottom brush to
 * pan / select a window. Animations are disabled so live socket updates
 * render without visual churn.
 */
export function TimeSeriesChart({
  title,
  data,
  series,
  xKey = 'time',
  unit,
  valueDigits = 2,
  height = 240,
  enableZoom = true,
}: Props) {
  // Drag-to-zoom state, expressed as indices into the current data array.
  const [selectStart, setSelectStart] = useState<number | null>(null);
  const [selectEnd, setSelectEnd] = useState<number | null>(null);
  const [zoom, setZoom] = useState<{ start: number; end: number } | null>(null);

  const isZoomed = zoom !== null;

  const visibleData = useMemo(() => {
    if (!zoom) {
      return data;
    }
    return data.slice(zoom.start, zoom.end + 1);
  }, [data, zoom]);

  const valueFormatter = (value: number | string) =>
    `${formatNumber(Number(value), valueDigits)}${unit ? ` ${unit}` : ''}`;

  const applyZoom = () => {
    if (selectStart === null || selectEnd === null || selectStart === selectEnd) {
      setSelectStart(null);
      setSelectEnd(null);
      return;
    }
    // Mouse indices are relative to the currently visible slice; translate
    // them back to absolute indices in the full data array before zooming.
    const offset = zoom ? zoom.start : 0;
    setZoom({
      start: offset + Math.min(selectStart, selectEnd),
      end: offset + Math.max(selectStart, selectEnd),
    });
    setSelectStart(null);
    setSelectEnd(null);
  };

  return (
    <section className="rounded-md border border-slate-800 bg-slate-900 p-4" style={{ height: height + 88 }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{data.length} points</span>
          {isZoomed ? (
            <button
              type="button"
              onClick={() => setZoom(null)}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Reset zoom
            </button>
          ) : null}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={visibleData}
          margin={{ left: -12, right: 8, top: 4, bottom: 0 }}
          onMouseDown={(state) => {
            if (!enableZoom || state?.activeTooltipIndex == null) return;
            setSelectStart(state.activeTooltipIndex);
            setSelectEnd(state.activeTooltipIndex);
          }}
          onMouseMove={(state) => {
            if (selectStart === null || state?.activeTooltipIndex == null) return;
            setSelectEnd(state.activeTooltipIndex);
          }}
          onMouseUp={applyZoom}
          onMouseLeave={() => {
            setSelectStart(null);
            setSelectEnd(null);
          }}
        >
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            width={56}
            tickFormatter={(value) => formatNumber(Number(value), 0)}
          />
          <Tooltip
            contentStyle={{
              background: '#020617',
              border: '1px solid #1e293b',
              borderRadius: 6,
              color: '#e2e8f0',
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number | string, name: string) => [valueFormatter(value), name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }}
            iconType="plainline"
          />
          {series.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.name}
              stroke={item.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
          {selectStart !== null && selectEnd !== null ? (
            <ReferenceArea
              x1={visibleData[selectStart]?.[xKey] as string | number}
              x2={visibleData[selectEnd]?.[xKey] as string | number}
              strokeOpacity={0}
              fill="#22d3ee"
              fillOpacity={0.12}
            />
          ) : null}
          {enableZoom && visibleData.length > 2 ? (
            <Brush
              dataKey={xKey}
              height={22}
              travellerWidth={8}
              stroke="#334155"
              fill="#0f172a"
              tickFormatter={() => ''}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
