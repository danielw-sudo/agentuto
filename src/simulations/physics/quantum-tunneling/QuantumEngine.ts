import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';

export interface QuantumParams extends Record<string, number> {
  particleEnergy: number; // E in energy units (1.0 to 12.0)
  barrierHeight: number;  // V0 in energy units (0.0 to 20.0)
  barrierWidth: number;   // d in spatial units (0.2 to 2.5)
  barrierPosition: number;// x_barrier center (default 0.0)
  packetSigma: number;    // Gaussian spatial width sigma (0.5 to 2.0)
  initialX: number;       // Wavepacket start position (default -5.0)
}

export interface QuantumState extends SimulationState {
  time: number;
  gridX: number[];
  psiReal: number[];
  psiImag: number[];
  probabilityDensity: number[];
  potential: number[];
  norm: number;           // Integral |psi|^2 dx (strictly ~ 1.0)
  transmission: number;   // Prob to the right of the barrier
  reflection: number;     // Prob to the left of the barrier
  insideBarrier: number;  // Prob inside the barrier
  particleEnergy: number;
  barrierHeight: number;
  barrierWidth: number;
  waveNumber: number;     // k0 = sqrt(2*m*E)
}

// In normalized atomic units: hbar = 1, m = 1
export class QuantumEngine implements SimulationEngine<QuantumParams, QuantumState> {
  private params: QuantumParams = {
    particleEnergy: 5.0,
    barrierHeight: 8.0,
    barrierWidth: 1.0,
    barrierPosition: 0.0,
    packetSigma: 0.9,
    initialX: -5.0,
  };

  private time: number = 0;
  private readonly numGridPoints: number = 240;
  private readonly xMin: number = -10.0;
  private readonly xMax: number = 10.0;
  private dx: number = 0;

  private gridX: number[] = [];
  private psiReal: number[] = [];
  private psiImag: number[] = [];
  private potential: number[] = [];

  // Pre-allocated scratch buffers for Crank-Nicolson Thomas tridiagonal solver to avoid GC pressure
  private bReal: Float64Array;
  private bImag: Float64Array;
  private cPrimeR: Float64Array;
  private cPrimeI: Float64Array;
  private dPrimeR: Float64Array;
  private dPrimeI: Float64Array;

  constructor() {
    this.dx = (this.xMax - this.xMin) / (this.numGridPoints - 1);
    this.gridX = new Array(this.numGridPoints);
    for (let i = 0; i < this.numGridPoints; i++) {
      this.gridX[i] = this.xMin + i * this.dx;
    }
    this.bReal = new Float64Array(this.numGridPoints);
    this.bImag = new Float64Array(this.numGridPoints);
    this.cPrimeR = new Float64Array(this.numGridPoints);
    this.cPrimeI = new Float64Array(this.numGridPoints);
    this.dPrimeR = new Float64Array(this.numGridPoints);
    this.dPrimeI = new Float64Array(this.numGridPoints);
  }

  init(params: QuantumParams): void {
    this.params = { ...params };
    this.reset();
  }

  reset(params?: QuantumParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.buildPotential();
    this.buildInitialWavepacket();
  }

  dispose(): void {
    this.psiReal = [];
    this.psiImag = [];
    this.potential = [];
  }

  setParameters(params: Partial<QuantumParams>): void {
    const prevE = this.params.particleEnergy;
    const prevInitialX = this.params.initialX;
    const prevSigma = this.params.packetSigma;
    this.params = { ...this.params, ...params } as QuantumParams;

    this.buildPotential();

    // If initial wavepacket parameters change significantly, re-initialize packet
    if (
      params.particleEnergy !== undefined && Math.abs(this.params.particleEnergy - prevE) > 1e-4 ||
      params.initialX !== undefined && Math.abs(this.params.initialX - prevInitialX) > 1e-4 ||
      params.packetSigma !== undefined && Math.abs(this.params.packetSigma - prevSigma) > 1e-4
    ) {
      this.reset();
    }
  }

  getParameters(): QuantumParams {
    return { ...this.params };
  }

  private buildPotential(): void {
    const { barrierHeight, barrierWidth, barrierPosition } = this.params;
    const halfW = barrierWidth * 0.5;
    const x0 = barrierPosition;

    this.potential = new Array(this.numGridPoints);
    for (let i = 0; i < this.numGridPoints; i++) {
      const x = this.gridX[i];
      if (x >= x0 - halfW && x <= x0 + halfW) {
        this.potential[i] = barrierHeight;
      } else {
        this.potential[i] = 0;
      }
    }
  }

  private buildInitialWavepacket(): void {
    const { particleEnergy, packetSigma, initialX } = this.params;
    // In hbar = 1, m = 1 units, E = k^2 / 2 => k = sqrt(2*E)
    const k0 = Math.sqrt(2 * Math.max(0.1, particleEnergy));
    const s2 = packetSigma * packetSigma;

    this.psiReal = new Array(this.numGridPoints);
    this.psiImag = new Array(this.numGridPoints);

    let normSum = 0;
    for (let i = 0; i < this.numGridPoints; i++) {
      const x = this.gridX[i];
      const envelope = Math.exp(-((x - initialX) * (x - initialX)) / (4 * s2));
      const phase = k0 * x;

      this.psiReal[i] = envelope * Math.cos(phase);
      this.psiImag[i] = envelope * Math.sin(phase);

      normSum += (this.psiReal[i] * this.psiReal[i] + this.psiImag[i] * this.psiImag[i]) * this.dx;
    }

    // Normalize so Integral |psi|^2 dx = 1.0
    const factor = 1 / Math.sqrt(Math.max(1e-12, normSum));
    for (let i = 0; i < this.numGridPoints; i++) {
      this.psiReal[i] *= factor;
      this.psiImag[i] *= factor;
    }
  }

  /**
   * Unitary Crank-Nicolson Time Evolution for Time-Dependent Schrödinger Equation:
   * (I + i*dt*H/(2*hbar)) * psi^(n+1) = (I - i*dt*H/(2*hbar)) * psi^n
   * Solved via complex tridiagonal Thomas algorithm in O(N).
   */
  step(dt: number): void {
    const n = this.numGridPoints;
    const dx = this.dx;
    const alpha = dt / (4 * dx * dx); // Kinetic coupling

    // Complex tridiagonal system: A * psi = b
    // A_diag = (1, 2*alpha + dt*V_j/2)
    // A_sub = A_sup = (0, -alpha)
    // b_j = (1 - 2*i*alpha - i*dt*V_j/2)*psi_j + i*alpha*(psi_{j-1} + psi_{j+1})

    const bReal = this.bReal;
    const bImag = this.bImag;

    // Compute RHS vector b
    for (let j = 1; j < n - 1; j++) {
      const vj = this.potential[j];
      const diagR = 1.0;
      const diagI = -(2 * alpha + 0.5 * dt * vj);

      const pr = this.psiReal[j];
      const pi = this.psiImag[j];

      // diag * psi_j
      let br = diagR * pr - diagI * pi;
      let bi = diagR * pi + diagI * pr;

      // + i * alpha * (psi_{j-1} + psi_{j+1})
      const sumNeighborsR = this.psiReal[j - 1] + this.psiReal[j + 1];
      const sumNeighborsI = this.psiImag[j - 1] + this.psiImag[j + 1];

      // i * (R + i*I) = -I + i*R
      br -= alpha * sumNeighborsI;
      bi += alpha * sumNeighborsR;

      bReal[j] = br;
      bImag[j] = bi;
    }

    // Boundary conditions: psi(0) = 0, psi(n-1) = 0 (infinite potential walls at extremes)
    bReal[0] = 0;
    bImag[0] = 0;
    bReal[n - 1] = 0;
    bImag[n - 1] = 0;

    // Thomas algorithm forward sweep for complex tridiagonal matrix
    // Sub-diagonal and super-diagonal elements: a_j = c_j = -i * alpha = (0, -alpha)
    const cPrimeR = this.cPrimeR;
    const cPrimeI = this.cPrimeI;
    const dPrimeR = this.dPrimeR;
    const dPrimeI = this.dPrimeI;

    for (let j = 1; j < n - 1; j++) {
      const vj = this.potential[j];
      // Main diagonal: (1, 2*alpha + 0.5*dt*vj)
      const aDiagR = 1.0;
      const aDiagI = 2 * alpha + 0.5 * dt * vj;

      // denom = aDiag - subDiag * cPrime[j-1]
      // subDiag = (0, -alpha)
      // subDiag * cPrime = (-alpha * -cPrimeI, -alpha * cPrimeR) = (alpha * cPrimeI, -alpha * cPrimeR)
      const subMultCR = alpha * cPrimeI[j - 1];
      const subMultCI = -alpha * cPrimeR[j - 1];

      const denomR = aDiagR - subMultCR;
      const denomI = aDiagI - subMultCI;
      const denomMagSq = denomR * denomR + denomI * denomI;

      // cPrime[j] = superDiag / denom
      // superDiag = -i * alpha = (0, -alpha)
      // (0, -alpha) / (denomR, denomI) = (-i*alpha * (denomR - i*denomI)) / magSq
      // = (-i*alpha*denomR - alpha*denomI) / magSq = (-alpha * denomI - i * alpha * denomR) / magSq
      cPrimeR[j] = (-alpha * denomI) / denomMagSq;
      cPrimeI[j] = (-alpha * denomR) / denomMagSq;

      // numD = b[j] - subDiag * dPrime[j-1]
      const subMultDR = alpha * dPrimeI[j - 1];
      const subMultDI = -alpha * dPrimeR[j - 1];

      const numDR = bReal[j] - subMultDR;
      const numDI = bImag[j] - subMultDI;

      // dPrime[j] = numD / denom
      dPrimeR[j] = (numDR * denomR + numDI * denomI) / denomMagSq;
      dPrimeI[j] = (numDI * denomR - numDR * denomI) / denomMagSq;
    }

    // Thomas back substitution
    this.psiReal[n - 1] = 0;
    this.psiImag[n - 1] = 0;

    for (let j = n - 2; j >= 1; j--) {
      // psi[j] = dPrime[j] - cPrime[j] * psi[j+1]
      const prNext = this.psiReal[j + 1];
      const piNext = this.psiImag[j + 1];

      const cMultR = cPrimeR[j] * prNext - cPrimeI[j] * piNext;
      const cMultI = cPrimeR[j] * piNext + cPrimeI[j] * prNext;

      this.psiReal[j] = dPrimeR[j] - cMultR;
      this.psiImag[j] = dPrimeI[j] - cMultI;
    }

    this.time += dt;
  }

  getState(): QuantumState {
    const n = this.numGridPoints;
    const prob = new Array(n);
    let norm = 0;
    let trans = 0;
    let refl = 0;
    let inside = 0;

    const { barrierPosition, barrierWidth } = this.params;
    const xLeft = barrierPosition - barrierWidth * 0.5;
    const xRight = barrierPosition + barrierWidth * 0.5;

    for (let i = 0; i < n; i++) {
      const p = this.psiReal[i] * this.psiReal[i] + this.psiImag[i] * this.psiImag[i];
      prob[i] = p;
      norm += p * this.dx;

      const x = this.gridX[i];
      if (x > xRight) {
        trans += p * this.dx;
      } else if (x < xLeft) {
        refl += p * this.dx;
      } else {
        inside += p * this.dx;
      }
    }

    const k0 = Math.sqrt(2 * Math.max(0.1, this.params.particleEnergy));

    return {
      time: this.time,
      gridX: [...this.gridX],
      psiReal: [...this.psiReal],
      psiImag: [...this.psiImag],
      probabilityDensity: prob,
      potential: [...this.potential],
      norm,
      transmission: trans,
      reflection: refl,
      insideBarrier: inside,
      particleEnergy: this.params.particleEnergy,
      barrierHeight: this.params.barrierHeight,
      barrierWidth: this.params.barrierWidth,
      waveNumber: k0,
    };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const state = this.getState();
    return {
      t: this.time,
      transmission_T: state.transmission,
      reflection_R: state.reflection,
      barrier_prob: state.insideBarrier,
      norm: state.norm,
      energy_E: state.particleEnergy,
      barrier_V0: state.barrierHeight,
      barrier_width: state.barrierWidth,
      wave_number: state.waveNumber,
    };
  }
}
