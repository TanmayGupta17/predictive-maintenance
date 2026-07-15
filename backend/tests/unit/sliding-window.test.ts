import { describe, expect, it } from 'vitest';

import { analyzerConfiguration } from '../../src/analyzer/configuration.js';
import { slidingWindowStore } from '../../src/analyzer/sliding-window.js';

function reading(deviceId: string, value: number, timestampMs: number) {
  return { deviceId, metric: 'temperature' as const, value, timestamp: new Date(timestampMs) };
}

describe('slidingWindowStore', () => {
  it('returns an empty window for an unseen device/metric', () => {
    expect(slidingWindowStore.getWindow('unseen-device', 'temperature')).toEqual([]);
  });

  it('smooths values with an exponential moving average, damping spikes', () => {
    const deviceId = 'ema-device';
    slidingWindowStore.add(reading(deviceId, 100, 0));
    const window = slidingWindowStore.add(reading(deviceId, 200, 1_000));

    // First point takes the raw value; the second is EMA-smoothed.
    expect(window[0]?.smoothedValue).toBe(100);
    // 100 + 0.35 * (200 - 100) = 135 -> the 200 spike is damped well below 200.
    expect(window[1]?.smoothedValue).toBeCloseTo(
      100 + analyzerConfiguration.smoothingFactor * 100,
      5,
    );
    expect(window[1]?.smoothedValue).toBeLessThan(200);
    expect(window[1]?.value).toBe(200); // raw value is preserved alongside the smoothed one
  });

  it('caps the window at the configured size', () => {
    const deviceId = 'cap-device';
    for (let index = 0; index < analyzerConfiguration.windowSize + 5; index += 1) {
      slidingWindowStore.add(reading(deviceId, 50 + index, index * 1_000));
    }

    const window = slidingWindowStore.getWindow(deviceId, 'temperature');
    expect(window).toHaveLength(analyzerConfiguration.windowSize);
    // The oldest entries are evicted; the newest reading is retained.
    expect(window.at(-1)?.value).toBe(50 + analyzerConfiguration.windowSize + 4);
  });

  it('keeps the window ordered by timestamp even when readings arrive late', () => {
    const deviceId = 'ordering-device';
    slidingWindowStore.add(reading(deviceId, 10, 3_000));
    slidingWindowStore.add(reading(deviceId, 20, 1_000)); // arrives late
    const window = slidingWindowStore.add(reading(deviceId, 30, 2_000)); // also out of order

    const timestamps = window.map((point) => point.timestamp.getTime());
    expect(timestamps).toEqual([1_000, 2_000, 3_000]);
  });
});
