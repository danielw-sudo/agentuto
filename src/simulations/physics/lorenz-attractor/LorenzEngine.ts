import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { Vec3 } from '../../../core/math/vector3';
import { rk4VectorStep } from '../../../core/math/integrators';

export interface LorenzParams extends Record<string, number> {
  sigma: number;        // Prandtl number (default: 10.0)
  rho: number;          // Rayleigh number (default: 28.0)
  beta: number;         // Geometric factor (default: 8/3 approx 2.667)
  perturbation: number; // Initial separation for twin particle (default: 0.001)
}

export interface LorenzState extends SimulationState {
  time: number;
  pos1: Vec3;
  pos2: Vec3;
  divergence: number;
  trailPoints1: Vec3[];
  trailPoints2: Vec3[];
}

export class LorenzEngine implements SimulationEngine<LorenzParams, LorenzState> {
  private params: LorenzParams = {
    sigma: 10.0,
    rho: 28.0,
    beta: 2.6667,
    perturbation: 0.001,
  };

  private time: number = 0;
  private p1: Vec3 = new Vec3(1, 1, 1);
  private p2: Vec3 = new Vec3(1.001, 1, 1);
  private trail1: Vec3[] = [];
  private trail2: Vec3[] = [];
  private maxTrail: number = 700;
  private decimationCounter: number = 0;

  init(params: LorenzParams): void {
    this.reset(params);
  }

  reset(params?: LorenzParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.p1 = new Vec3(1.0, 1.0, 1.0);
    this.p2 = new Vec3(1.0 + this.params.perturbation, 1.0, 1.0);
    this.trail1 = [this.p1.clone()];
    this.trail2 = [this.p2.clone()];
    this.decimationCounter = 0;
  }

  dispose(): void {
    this.trail1 = [];
    this.trail2 = [];
  }

  step(dt: number): void {
    const { sigma, rho, beta } = this.params;

    // Lorenz system rate of change:
    // dx/dt = sigma * (y - x)
    // dy/dt = x * (rho - z) - y
    // dz/dt = x * y - beta * z
    const lorenzDeriv = (_t: number, p: Vec3): Vec3 => {
      const dx = sigma * (p.y - p.x);
      const dy = p.x * (rho - p.z) - p.y;
      const dz = p.x * p.y - beta * p.z;
      return new Vec3(dx, dy, dz);
    };

    // Integrate both particles via RK4
    this.p1 = rk4VectorStep(this.p1, this.time, dt, lorenzDeriv);
    this.p2 = rk4VectorStep(this.p2, this.time, dt, lorenzDeriv);
    this.time += dt;

    this.decimationCounter++;
    if (this.decimationCounter % 2 === 0) {
      this.trail1.push(this.p1.clone());
      this.trail2.push(this.p2.clone());

      if (this.trail1.length > this.maxTrail) this.trail1.shift();
      if (this.trail2.length > this.maxTrail) this.trail2.shift();
    }
  }

  getState(): LorenzState {
    const divergence = this.p1.sub(this.p2).mag();

    return {
      time: this.time,
      pos1: this.p1.clone(),
      pos2: this.p2.clone(),
      divergence,
      trailPoints1: [...this.trail1],
      trailPoints2: [...this.trail2],
    };
  }

  setParameters(params: Partial<LorenzParams>): void {
    this.params = { ...this.params, ...params } as LorenzParams;
  }

  getParameters(): LorenzParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const divergence = this.p1.sub(this.p2).mag();

    return {
      t: this.time,
      x1: this.p1.x,
      y1: this.p1.y,
      z1: this.p1.z,
      x2: this.p2.x,
      y2: this.p2.y,
      z2: this.p2.z,
      divergence,
      sigma: this.params.sigma,
      rho: this.params.rho,
      beta: this.params.beta,
    };
  }
}
