import type { SimulationEngine, TelemetryPoint } from '../../src/core/types/simulation';

/**
 * The physics of a private module. Headless: no DOM, no React, no Three.js, so it can be stepped and checked
 * in Node. This one is a ball thrown straight up or down, d²y/dt² = −g, integrated with RK4.
 */
export interface FreeFallParams extends Record<string, number> {
  initialHeight: number; // m, above the ground
  initialSpeed: number; // m/s, upward is positive
  gravity: number; // m/s²
}

export interface FreeFallState {
  time: number; // s
  height: number; // m
  velocity: number; // m/s
  [key: string]: number;
}

export class FreeFallEngine implements SimulationEngine<FreeFallParams, FreeFallState> {
  private params: FreeFallParams = { initialHeight: 20, initialSpeed: 5, gravity: 9.81 };
  private time = 0;
  private height = 0;
  private velocity = 0;

  init(params: FreeFallParams): void {
    this.reset(params);
  }

  reset(params?: FreeFallParams): void {
    if (params) this.params = { ...params };
    this.time = 0;
    this.height = this.params.initialHeight;
    this.velocity = this.params.initialSpeed;
  }

  dispose(): void {}

  /** One fixed step of dy/dt = v, dv/dt = −g (classical RK4). */
  step(dt: number): void {
    const g = this.params.gravity;
    const accel = () => -g;
    const k1y = this.velocity;
    const k1v = accel();
    const k2y = this.velocity + 0.5 * dt * k1v;
    const k2v = accel();
    const k3y = this.velocity + 0.5 * dt * k2v;
    const k3v = accel();
    const k4y = this.velocity + dt * k3v;
    const k4v = accel();
    this.height += (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    this.velocity += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    this.time += dt;
  }

  getState(): FreeFallState {
    return { time: this.time, height: this.height, velocity: this.velocity };
  }

  setParameters(params: Partial<FreeFallParams>): void {
    this.params = { ...this.params, ...params } as FreeFallParams;
  }

  getParameters(): FreeFallParams {
    return { ...this.params };
  }

  /** Every number returned here must be declared, with its unit, in `telemetryUnits` in module.ts. */
  getTelemetrySnapshot(): TelemetryPoint {
    return { t: this.time, height: this.height, velocity: this.velocity };
  }
}
