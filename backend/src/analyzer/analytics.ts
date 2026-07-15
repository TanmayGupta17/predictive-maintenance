import { analyzerConfiguration } from './configuration.js';
import type { MetricFeatures, TelemetryWindowPoint } from './types.js';

export function calculateFeatures(window: TelemetryWindowPoint[]): MetricFeatures | null {
  const latest = window.at(-1);

  if (latest === undefined || window.length < analyzerConfiguration.minimumSamples) {
    return null;
  }

  const period = analyzerConfiguration.movingAveragePeriod;
  const currentSlice = window.slice(-period);
  const previousSlice = window.slice(-period * 2, -period);
  const movingAverage = average(currentSlice.map((point) => point.smoothedValue));
  const previousMovingAverage =
    previousSlice.length > 0 ? average(previousSlice.map((point) => point.smoothedValue)) : movingAverage;
  const first = window[0] as TelemetryWindowPoint;
  const elapsedSeconds = Math.max(
    1,
    (latest.timestamp.getTime() - first.timestamp.getTime()) / 1_000,
  );

  return {
    metric: latest.metric,
    latest: latest.value,
    latestSmoothed: latest.smoothedValue,
    movingAverage,
    previousMovingAverage,
    rateOfChange: movingAverage - previousMovingAverage,
    trendSlope: (latest.smoothedValue - first.smoothedValue) / elapsedSeconds,
    continuousIncreaseCount: countContinuous(window, 'up'),
    continuousDecreaseCount: countContinuous(window, 'down'),
    spikeCount: countSpikes(window),
    sampleCount: window.length,
  };
}

export function isSustained(features: MetricFeatures, requiredSamples: number) {
  return features.sampleCount >= requiredSamples && features.spikeCount <= analyzerConfiguration.ignoredSpikeLimit;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function countContinuous(window: TelemetryWindowPoint[], direction: 'up' | 'down') {
  let count = 0;

  for (let index = window.length - 1; index > 0; index -= 1) {
    const current = window[index] as TelemetryWindowPoint;
    const previous = window[index - 1] as TelemetryWindowPoint;
    const moved = direction === 'up'
      ? current.smoothedValue > previous.smoothedValue
      : current.smoothedValue < previous.smoothedValue;

    if (!moved) {
      break;
    }

    count += 1;
  }

  return count;
}

function countSpikes(window: TelemetryWindowPoint[]) {
  const lookbackWindow = window.slice(-analyzerConfiguration.spikeLookback);
  let spikes = 0;

  for (let index = 1; index < lookbackWindow.length; index += 1) {
    const current = lookbackWindow[index] as TelemetryWindowPoint;
    const previous = lookbackWindow[index - 1] as TelemetryWindowPoint;
    const delta = Math.abs(current.value - previous.value);
    const localAverage = average(lookbackWindow.slice(0, index).map((point) => point.value));

    if (localAverage > 0 && delta / localAverage > 0.35) {
      spikes += 1;
    }
  }

  return spikes;
}
