import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';

export interface GasParams extends Record<string, number> {
  temperature: number; // T in Kelvin (100K - 800K)
  particleCount: number; // N (50 - 300)
  pistonX: number; // Lx chamber width in meters (3.0 - 9.0)
  particleMass: number; // m in mass units (0.5 - 4.0)
}

export interface GasParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface GasState extends SimulationState {
  time: number;
  particles: GasParticle[];
  chamberWidth: number;
  chamberHeight: number;
  temperature: number;
  particleMass: number;
  empiricalPressure: number;
  idealPressure: number;
  vRms: number;
  vAvg: number;
  totalKineticEnergy: number;
  speedHistogram: number[]; // 20 speed bins
  histogramMaxSpeed: number;
}

export const BOLTZMANN_K = 1.0; // Scaled Boltzmann constant for normalized educational units

export class GasEngine implements SimulationEngine<GasParams, GasState> {
  private params: GasParams = {
    temperature: 300,
    particleCount: 120,
    pistonX: 6.0,
    particleMass: 1.0,
  };

  private time: number = 0;
  private particles: GasParticle[] = [];
  private chamberHeight: number = 6.0;
  private impulseAccumulator: number = 0;
  private impulseTimeAccumulator: number = 0;
  private empiricalPressure: number = 0;
  private readonly defaultRadius: number = 0.08;

  init(params: GasParams): void {
    this.params = { ...params };
    this.reset();
  }

  reset(params?: GasParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.impulseAccumulator = 0;
    this.impulseTimeAccumulator = 0;
    this.empiricalPressure = 0;

    this.spawnParticles();
  }

  dispose(): void {
    this.particles = [];
  }

  setParameters(params: Partial<GasParams>): void {
    const prevN = this.params.particleCount;
    this.params = { ...this.params, ...params } as GasParams;

    // If particle count changed, re-spawn
    if (this.params.particleCount !== prevN) {
      this.spawnParticles();
      return;
    }

    // Thermally rescale velocities toward exact target temperature & mass
    if (params.temperature !== undefined || params.particleMass !== undefined) {
      const m = Math.max(0.1, this.params.particleMass);
      const targetT = Math.max(10, this.params.temperature);

      let currentTotalKe = 0;
      for (const p of this.particles) {
        currentTotalKe += 0.5 * m * (p.vx * p.vx + p.vy * p.vy);
      }

      const n = this.particles.length;
      if (n > 0 && currentTotalKe > 1e-12) {
        const currentT = currentTotalKe / (n * BOLTZMANN_K);
        const ratio = Math.sqrt(targetT / currentT);
        for (const p of this.particles) {
          p.vx *= ratio;
          p.vy *= ratio;
        }
      }
    }
  }

  getParameters(): GasParams {
    return { ...this.params };
  }

  private spawnParticles(): void {
    const n = Math.floor(this.params.particleCount);
    const width = Math.max(2.0, this.params.pistonX);
    const height = this.chamberHeight;
    const m = Math.max(0.1, this.params.particleMass);
    const T = Math.max(10, this.params.temperature);

    // Thermal velocity dispersion sigma = sqrt(k_B * T / m)
    const sigma = Math.sqrt((BOLTZMANN_K * T) / m);

    this.particles = [];
    const pad = this.defaultRadius * 1.5;

    for (let i = 0; i < n; i++) {
      // Box-Muller transform for 2D Gaussian Maxwell-Boltzmann distribution
      const u1 = Math.max(1e-7, Math.random());
      const u2 = Math.random();
      const mag = sigma * Math.sqrt(-2 * Math.log(u1));
      const angle = 2 * Math.PI * u2;

      this.particles.push({
        x: pad + Math.random() * (width - 2 * pad),
        y: pad + Math.random() * (height - 2 * pad),
        vx: mag * Math.cos(angle),
        vy: mag * Math.sin(angle),
        radius: this.defaultRadius,
      });
    }

    // Exact ensemble energy normalization to eliminate finite-N sample variance: <K> = k_B * T
    if (n > 0) {
      let sampleKe = 0;
      for (const p of this.particles) {
        sampleKe += 0.5 * m * (p.vx * p.vx + p.vy * p.vy);
      }
      const targetTotalKe = n * BOLTZMANN_K * T;
      if (sampleKe > 1e-12) {
        const normFactor = Math.sqrt(targetTotalKe / sampleKe);
        for (const p of this.particles) {
          p.vx *= normFactor;
          p.vy *= normFactor;
        }
      }
    }
  }

  step(dt: number): void {
    const width = Math.max(2.0, this.params.pistonX);
    const height = this.chamberHeight;
    const m = Math.max(0.1, this.params.particleMass);
    let stepImpulse = 0;

    // 1. Advance positions and check boundary walls
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Left Wall (x = 0)
      if (p.x - p.radius < 0) {
        p.x = p.radius;
        p.vx = -p.vx;
        stepImpulse += 2 * m * Math.abs(p.vx);
      }
      // Right Piston Wall (x = width)
      else if (p.x + p.radius > width) {
        p.x = width - p.radius;
        p.vx = -p.vx;
        stepImpulse += 2 * m * Math.abs(p.vx);
      }

      // Bottom Wall (y = 0)
      if (p.y - p.radius < 0) {
        p.y = p.radius;
        p.vy = -p.vy;
        stepImpulse += 2 * m * Math.abs(p.vy);
      }
      // Top Wall (y = height)
      else if (p.y + p.radius > height) {
        p.y = height - p.radius;
        p.vy = -p.vy;
        stepImpulse += 2 * m * Math.abs(p.vy);
      }
    }

    // 2. Pairwise Elastic Particle-Particle Collisions
    const len = this.particles.length;
    for (let i = 0; i < len; i++) {
      const p1 = this.particles[i];
      for (let j = i + 1; j < len; j++) {
        const p2 = this.particles[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        const minDist = p1.radius + p2.radius;

        if (distSq < minDist * minDist && distSq > 1e-9) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;

          // Relative velocity along line of centers
          const kx = p1.vx - p2.vx;
          const ky = p1.vy - p2.vy;
          const p = 2 * (nx * kx + ny * ky) / (1 + 1); // equal masses

          if (p > 0) {
            p1.vx -= p * nx;
            p1.vy -= p * ny;
            p2.vx += p * nx;
            p2.vy += p * ny;

            // Separate overlapping particles
            const overlap = (minDist - dist) * 0.5;
            p1.x -= nx * overlap;
            p1.y -= ny * overlap;
            p2.x += nx * overlap;
            p2.y += ny * overlap;
          }
        }
      }
    }

    // Accumulate pressure impulses over 0.2s sliding window
    this.impulseAccumulator += stepImpulse;
    this.impulseTimeAccumulator += dt;

    if (this.impulseTimeAccumulator >= 0.2) {
      const perimeter = 2 * (width + height);
      this.empiricalPressure = this.impulseAccumulator / (perimeter * this.impulseTimeAccumulator);
      this.impulseAccumulator = 0;
      this.impulseTimeAccumulator = 0;
    }

    this.time += dt;
  }

  getState(): GasState {
    const width = Math.max(2.0, this.params.pistonX);
    const height = this.chamberHeight;
    const area = width * height;
    const n = this.particles.length;
    const m = Math.max(0.1, this.params.particleMass);

    let sumSpeed = 0;
    let sumSpeedSq = 0;
    let totalKe = 0;

    for (const p of this.particles) {
      const sSq = p.vx * p.vx + p.vy * p.vy;
      const s = Math.sqrt(sSq);
      sumSpeed += s;
      sumSpeedSq += sSq;
      totalKe += 0.5 * m * sSq;
    }

    const vAvg = n > 0 ? sumSpeed / n : 0;
    const vRms = n > 0 ? Math.sqrt(sumSpeedSq / n) : 0;

    // Ideal gas law in 2D: P * Area = N * k_B * T
    const idealPressure = (n * BOLTZMANN_K * this.params.temperature) / area;

    // Speed distribution histogram (20 bins)
    const binCount = 20;
    const maxSpeed = Math.max(30, vRms * 2.8);
    const binWidth = maxSpeed / binCount;
    const speedHistogram = new Array(binCount).fill(0);

    for (const p of this.particles) {
      const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const binIdx = Math.min(binCount - 1, Math.floor(s / binWidth));
      speedHistogram[binIdx]++;
    }

    return {
      time: this.time,
      particles: this.particles.map((p) => ({ ...p })),
      chamberWidth: width,
      chamberHeight: height,
      temperature: this.params.temperature,
      particleMass: this.params.particleMass,
      empiricalPressure: this.empiricalPressure > 0 ? this.empiricalPressure : idealPressure,
      idealPressure,
      vRms,
      vAvg,
      totalKineticEnergy: totalKe,
      speedHistogram,
      histogramMaxSpeed: maxSpeed,
    };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const state = this.getState();
    return {
      t: this.time,
      temperature: state.temperature,
      volume: state.chamberWidth * state.chamberHeight,
      piston_x: state.chamberWidth,
      empirical_pressure: state.empiricalPressure,
      ideal_pressure: state.idealPressure,
      v_rms: state.vRms,
      v_avg: state.vAvg,
      kinetic_energy: state.totalKineticEnergy,
    };
  }
}
