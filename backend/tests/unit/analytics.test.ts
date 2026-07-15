import { describe, expect, it } from 'vitest';

import { calculateFeatures, isSustained } from '../../src/analyzer/analytics.js';
import { analyzerConfiguration } from '../../src/analyzer/configuration.js';
import { buildWindow } from '../helpers/fixtures.js';

describe('calculateFeatures', () => {
  it('returns null when the window has fewer than the minimum samples', () => {
    const shortWindow = buildWindow(Array.from({ length: analyzerConfiguration.minimumSamples - 1 }, () => 50));
    expect(calculateFeatures(shortWindow)).toBeNull();
  });

  describe('threshold detection (moving average)', () => {
    it('averages the most recent period and the preceding period', () => {
      // Values 10..21 across 12 samples, one second apart.
      const window = buildWindow(Array.from({ length: 12 }, (_, index) => 10 + index));
      const features = calculateFeatures(window);

      expect(features).not.toBeNull();
      // Last 6 values: 16..21 -> mean 18.5; preceding 6: 10..15 -> mean 12.5.
      expect(features?.movingAverage).toBeCloseTo(18.5, 5);
      expect(features?.previousMovingAverage).toBeCloseTo(12.5, 5);
      expect(features?.rateOfChange).toBeCloseTo(6, 5);
      expect(features?.latest).toBe(21);
      expect(features?.sampleCount).toBe(12);
    });
  });

  describe('trend detection', () => {
    it('detects a sustained upward trend', () => {
      const window = buildWindow(Array.from({ length: 12 }, (_, index) => 10 + index));
      const features = calculateFeatures(window);

      // Rises 10 -> 21 over 11 seconds => slope ~1.0/s.
      expect(features?.trendSlope).toBeCloseTo(1, 5);
      expect(features?.continuousIncreaseCount).toBe(11);
      expect(features?.continuousDecreaseCount).toBe(0);
    });

    it('detects a sustained downward trend', () => {
      const window = buildWindow(Array.from({ length: 12 }, (_, index) => 30 - index));
      const features = calculateFeatures(window);

      expect(features?.trendSlope).toBeCloseTo(-1, 5);
      expect(features?.continuousDecreaseCount).toBe(11);
      expect(features?.continuousIncreaseCount).toBe(0);
    });

    it('reports a flat trend with no directional movement', () => {
      const window = buildWindow(Array.from({ length: 12 }, () => 50));
      const features = calculateFeatures(window);

      expect(features?.trendSlope).toBe(0);
      expect(features?.rateOfChange).toBe(0);
      expect(features?.continuousIncreaseCount).toBe(0);
      expect(features?.continuousDecreaseCount).toBe(0);
    });
  });

  describe('spike filtering', () => {
    it('counts no spikes for a stable signal', () => {
      const window = buildWindow(Array.from({ length: 12 }, () => 50));
      const features = calculateFeatures(window);

      expect(features?.spikeCount).toBe(0);
      // A stable window is considered sustained.
      expect(isSustained(features!, analyzerConfiguration.sustainedSamples)).toBe(true);
    });

    it('counts transient spikes and rejects spiky windows as unsustained', () => {
      const values = [50, 50, 50, 50, 50, 50, 120, 50, 50, 50, 50, 50];
      const window = buildWindow(values);
      const features = calculateFeatures(window);

      expect(features!.spikeCount).toBeGreaterThan(analyzerConfiguration.ignoredSpikeLimit);
      // Spike filtering: a window with too many spikes must not be treated as a
      // sustained condition, preventing transient noise from raising alerts.
      expect(isSustained(features!, analyzerConfiguration.sustainedSamples)).toBe(false);
    });
  });

  describe('isSustained', () => {
    it('requires enough samples before a condition is considered sustained', () => {
      const window = buildWindow(Array.from({ length: 8 }, () => 50));
      const features = calculateFeatures(window);

      expect(isSustained(features!, 20)).toBe(false);
      expect(isSustained(features!, 8)).toBe(true);
    });
  });
});
