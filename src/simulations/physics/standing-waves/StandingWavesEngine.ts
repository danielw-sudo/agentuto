import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { StandingWavesParams, STANDING_WAVES_DEFAULT_PARAMS } from './StandingWavesConfig';

export interface StringNodePoint {
  x: number;
  isBoundary: boolean;
}

export interface StringAntinodePoint {
  x: number;
}

export interface StandingWavesState extends SimulationState {
  time: number;
  waveSpeed: number;              // v = sqrt(T/μ) in m/s
  fundamentalFrequency: number;   // f1 = v / (2L) in Hz
  harmonicFrequency: number;      // fn = n * f1 in Hz
  wavelength: number;             // λn = 2L / n in m
  waveNumber: number;             // kn = n*pi / L in rad/m
  angularFrequency: number;       // ωn = 2*pi*fn in rad/s
  kineticEnergy: number;          // Joules (J)
  potentialEnergy: number;        // Joules (J)
  totalEnergy: number;            // Joules (J)
  nodeCount: number;              // Total nodes (including ends)
  antinodeCount: number;          // Total antinodes
  nodes: StringNodePoint[];       // Node spatial coordinates
  antinodes: StringAntinodePoint[];
  stringX: number[];              // Spatial grid points x
  stringY: number[];              // Transverse displacement y(x, t) in meters
  envelopeY: number[];            // Stationary envelope envelope(x) in meters
  rightWaveY: number[];           // Component traveling wave y_right(x - vt)
  leftWaveY: number[];            // Component traveling wave y_left(x + vt)
}

export class StandingWavesEngine implements SimulationEngine<StandingWavesParams, StandingWavesState> {
  private params: StandingWavesParams = { ...STANDING_WAVES_DEFAULT_PARAMS };
  private time: number = 0;
  private readonly numPoints: number = 161; // Odd count ensures exact midpoints (x = L/2, L/4, 3L/4)

  init(params: StandingWavesParams): void {
    this.reset(params);
  }

  reset(params?: StandingWavesParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
  }

  dispose(): void {}

  step(dt: number): void {
    this.time += dt;
  }

  getState(): StandingWavesState {
    const L = Math.max(0.2, this.params.stringLength);
    const T = Math.max(1.0, this.params.tension);
    const mu = Math.max(1e-4, this.params.linearDensity * 1e-3); // g/m -> kg/m
    const n = Math.max(1, Math.min(6, Math.round(this.params.harmonicMode)));
    const A1 = (this.params.amplitude || 0) * 0.01;       // cm -> m
    const A2 = (this.params.harmonic2Amp || 0) * 0.01;   // cm -> m
    const A3 = (this.params.harmonic3Amp || 0) * 0.01;   // cm -> m

    // Wave mechanics formulas
    const waveSpeed = Math.sqrt(T / mu);
    const fundamentalFreq = waveSpeed / (2 * L);
    const harmonicFreq = n * fundamentalFreq;
    const wavelength = (2 * L) / n;
    const kn = (n * Math.PI) / L;
    const omegaN = kn * waveSpeed;

    // Harmonic 2 and 3 couplings
    const n2 = n + 1;
    const kn2 = (n2 * Math.PI) / L;
    const omegaN2 = kn2 * waveSpeed;

    const n3 = n + 2;
    const kn3 = (n3 * Math.PI) / L;
    const omegaN3 = kn3 * waveSpeed;

    // Spatial Discretization
    const stringX = new Array(this.numPoints);
    const stringY = new Array(this.numPoints);
    const envelopeY = new Array(this.numPoints);
    const rightWaveY = new Array(this.numPoints);
    const leftWaveY = new Array(this.numPoints);

    const t = this.time;
    const cosOmega1 = Math.cos(omegaN * t);
    const cosOmega2 = Math.cos(omegaN2 * t);
    const cosOmega3 = Math.cos(omegaN3 * t);

    for (let i = 0; i < this.numPoints; i++) {
      const x = (i / (this.numPoints - 1)) * L;
      stringX[i] = x;

      // Pure mode or multi-harmonic superposition
      const y1 = A1 * Math.sin(kn * x) * cosOmega1;
      const y2 = A2 * Math.sin(kn2 * x) * cosOmega2;
      const y3 = A3 * Math.sin(kn3 * x) * cosOmega3;

      stringY[i] = y1 + y2 + y3;

      // Envelope outline for principal harmonic
      envelopeY[i] = A1 * Math.abs(Math.sin(kn * x));

      // Decomposition into counter-propagating traveling waves:
      // A*sin(kx)*cos(wt) = 0.5*A*sin(kx - wt) + 0.5*A*sin(kx + wt)
      rightWaveY[i] = 0.5 * A1 * Math.sin(kn * x - omegaN * t);
      leftWaveY[i] = 0.5 * A1 * Math.sin(kn * x + omegaN * t);
    }

    // Node locations: x_m = m * L / n (for m = 0, 1, ..., n)
    const nodes: StringNodePoint[] = [];
    for (let m = 0; m <= n; m++) {
      const nx = (m * L) / n;
      nodes.push({ x: nx, isBoundary: m === 0 || m === n });
    }

    // Antinode locations: x_a = (m + 0.5) * L / n (for m = 0, 1, ..., n-1)
    const antinodes: StringAntinodePoint[] = [];
    for (let m = 0; m < n; m++) {
      const ax = ((m + 0.5) * L) / n;
      antinodes.push({ x: ax });
    }

    // Total Energy for principal standing wave mode:
    // E_K = 0.25 * mu * L * A^2 * omega^2 * sin^2(omega*t)
    // E_P = 0.25 * mu * L * A^2 * omega^2 * cos^2(omega*t)
    const sinSq = Math.sin(omegaN * t) ** 2;
    const cosSq = Math.cos(omegaN * t) ** 2;
    const eScale = 0.25 * mu * L * (A1 * A1) * (omegaN * omegaN);
    const kineticEnergy = eScale * sinSq;
    const potentialEnergy = eScale * cosSq;
    const totalEnergy = eScale;

    return {
      time: this.time,
      waveSpeed,
      fundamentalFrequency: fundamentalFreq,
      harmonicFrequency: harmonicFreq,
      wavelength,
      waveNumber: kn,
      angularFrequency: omegaN,
      kineticEnergy,
      potentialEnergy,
      totalEnergy,
      nodeCount: nodes.length,
      antinodeCount: antinodes.length,
      nodes,
      antinodes,
      stringX,
      stringY,
      envelopeY,
      rightWaveY,
      leftWaveY,
    };
  }

  setParameters(params: Partial<StandingWavesParams>): void {
    this.params = { ...this.params, ...params } as StandingWavesParams;
  }

  getParameters(): StandingWavesParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const s = this.getState();
    return {
      t: s.time,
      wave_speed: s.waveSpeed,
      fundamental_freq_Hz: s.fundamentalFrequency,
      harmonic_freq_Hz: s.harmonicFrequency,
      wavelength_m: s.wavelength,
      wave_number_rad_m: s.waveNumber,
      harmonic_mode: Math.round(this.params.harmonicMode),
      amplitude_cm: this.params.amplitude,
      kinetic_energy_mJ: s.kineticEnergy * 1e3,
      potential_energy_mJ: s.potentialEnergy * 1e3,
      total_energy_mJ: s.totalEnergy * 1e3,
      node_count: s.nodeCount,
      antinode_count: s.antinodeCount,
    };
  }
}
