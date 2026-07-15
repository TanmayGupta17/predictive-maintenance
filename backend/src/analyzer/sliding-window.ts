import type { TelemetryMetricName, TelemetryReading } from '../types/telemetry.js';
import { analyzerConfiguration } from './configuration.js';
import type { TelemetryWindowPoint } from './types.js';

class SlidingWindowStore {
  private readonly windows = new Map<string, TelemetryWindowPoint[]>();

  add(reading: TelemetryReading) {
    const key = this.keyFor(reading.deviceId, reading.metric);
    const window = this.windows.get(key) ?? [];
    const previous = window.at(-1);
    const smoothedValue =
      previous === undefined
        ? reading.value
        : previous.smoothedValue +
          analyzerConfiguration.smoothingFactor * (reading.value - previous.smoothedValue);

    const point: TelemetryWindowPoint = {
      ...reading,
      smoothedValue,
    };

    const nextWindow = [...window, point]
      .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())
      .slice(-analyzerConfiguration.windowSize);

    this.windows.set(key, nextWindow);
    return nextWindow;
  }

  /** Returns the current window for a device metric (empty if none seen yet). */
  getWindow(deviceId: string, metric: TelemetryMetricName): TelemetryWindowPoint[] {
    return this.windows.get(this.keyFor(deviceId, metric)) ?? [];
  }

  private keyFor(deviceId: string, metric: TelemetryMetricName) {
    return `${deviceId}:${metric}`;
  }
}

export const slidingWindowStore = new SlidingWindowStore();
