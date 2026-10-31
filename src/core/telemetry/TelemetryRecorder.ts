import { TelemetryPoint } from '../types/simulation';

export interface TelemetryConfig {
  sampleRateHz: number;
  maxSamples?: number;
}

export interface TelemetrySummary {
  duration_s: number;
  sample_count: number;
  min_values: Record<string, number>;
  max_values: Record<string, number>;
  latest_values: Record<string, number>;
}

export class TelemetryRecorder {
  private ring: TelemetryPoint[] = [];
  private head: number = 0;
  private count: number = 0;
  private cachedOrdered: TelemetryPoint[] | null = [];
  private isRecording: boolean = false;
  private sampleInterval: number;
  private maxSamples: number;
  private lastRecordedSimTime: number = -Infinity;

  constructor(config: TelemetryConfig = { sampleRateHz: 50, maxSamples: 10000 }) {
    this.sampleInterval = 1 / config.sampleRateHz;
    this.maxSamples = Math.max(1, config.maxSamples ?? 10000);
  }

  setSampleRate(hz: number): void {
    if (hz > 0) {
      this.sampleInterval = 1 / hz;
    }
  }

  start(): void {
    this.isRecording = true;
  }

  pause(): void {
    this.isRecording = false;
  }

  reset(): void {
    this.ring = [];
    this.head = 0;
    this.count = 0;
    this.cachedOrdered = this.ring;
    this.lastRecordedSimTime = -Infinity;
  }

  isActive(): boolean {
    return this.isRecording;
  }

  getSampleCount(): number {
    return this.count;
  }

  sample(point: TelemetryPoint): boolean {
    if (!this.isRecording) return false;

    // Check if enough simulation time has elapsed since last sample
    if (point.t - this.lastRecordedSimTime >= this.sampleInterval) {
      const snapshot = { ...point };
      this.lastRecordedSimTime = point.t;

      if (this.count < this.maxSamples) {
        this.ring.push(snapshot);
        this.count++;
        this.cachedOrdered = this.ring;
      } else {
        // O(1) circular ring buffer overwrite at capacity
        this.ring[this.head] = snapshot;
        this.head = (this.head + 1) % this.maxSamples;
        this.cachedOrdered = null;
      }
      return true;
    }

    return false;
  }

  getBuffer(): readonly TelemetryPoint[] {
    if (this.cachedOrdered !== null) {
      return this.cachedOrdered;
    }
    if (this.head === 0) {
      this.cachedOrdered = this.ring;
      return this.cachedOrdered;
    }
    this.cachedOrdered = [
      ...this.ring.slice(this.head),
      ...this.ring.slice(0, this.head),
    ];
    return this.cachedOrdered;
  }

  getSummary(): TelemetrySummary {
    const ordered = this.getBuffer();
    if (ordered.length === 0) {
      return {
        duration_s: 0,
        sample_count: 0,
        min_values: {},
        max_values: {},
        latest_values: {},
      };
    }

    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const duration = last.t - first.t;

    const minVals: Record<string, number> = {};
    const maxVals: Record<string, number> = {};

    const keys = Object.keys(last);
    for (const key of keys) {
      minVals[key] = Infinity;
      maxVals[key] = -Infinity;
    }

    for (const pt of ordered) {
      for (const key of keys) {
        const val = pt[key];
        if (typeof val === 'number') {
          if (val < minVals[key]) minVals[key] = val;
          if (val > maxVals[key]) maxVals[key] = val;
        }
      }
    }

    return {
      duration_s: duration,
      sample_count: ordered.length,
      min_values: minVals,
      max_values: maxVals,
      latest_values: { ...last },
    };
  }
}
