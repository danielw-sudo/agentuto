import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';

export interface QuantumParams extends Record<string, number> {
  particleEnergy: number; // E in energy units (1.0 to 12.0)
  barrierHeight: number;  // V0 in energy units (0.0 to 20.0)
  barrierWidth: number;   // d in spatial units (0.2 to 2.5)
  barrierPosition: number;// x_barrier center (default 0.0)
  packetSigma: number;    // Gaussian spatial width sigma (0.5 to 2.0)
  initialX: number;       // Wavepacket start: no closer than this (default -5.0); a wide barrier or packet starts it further left, 7 sigma clear of the barrier
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
  /**
   * True once T can be read: the packet has reached the barrier and left it, almost nothing is inside the barrier,
   * T has stopped changing (it moved by no more than 0.3 % of itself over the last 1.5 time units, and what is inside
   * the barrier is under 5 % of T), and neither the reflected nor the transmitted part has reached the edge of the box
   * (where it would bounce back and corrupt T and R).
   */
  settled: boolean;
  /** True from the moment any part of the packet reaches the edge of the box until the run is reset. */
  wallReached: boolean;
}

const WALL_STRIP = 1.0;  // Width of the outer strips of the box
const WALL_PROB = 3e-3;  // Probability in those strips that counts as having reached the wall
const SAMPLE_DT = 0.05;              // Simulation time between samples of T
const SETTLE_WINDOW = 1.5;           // T must have held steady over this much time
const SETTLE_TOLERANCE = 0.003;      // ... to within this fraction of itself
const SETTLE_INSIDE_FRACTION = 0.05; // ... with what is inside the barrier no more than this fraction of T
const SETTLE_SAMPLES = Math.round(SETTLE_WINDOW / SAMPLE_DT) + 1; // 31: the newest and oldest are SETTLE_WINDOW apart

// In normalized atomic units: hbar = 1, m = 1
export class QuantumEngine implements SimulationEngine<QuantumParams, QuantumState> {
  private params: QuantumParams = {
    particleEnergy: 5.0,
    barrierHeight: 8.0,
    barrierWidth: 1.0,
    barrierPosition: 0.0,
    packetSigma: 0.9,
    initialX: -5.0, // No closer than this: see startX
  };

  private time: number = 0;
  private wallReached: boolean = false; // One-way within a run: after a bounce, T no longer means transmission
  private readonly numGridPoints: number = 3831; // Cell 80/3830 = 0.0209, with a grid point at x = 0
  private readonly xMin: number = -40.0;
  private readonly xMax: number = 40.0;
  private dx: number = 0;
  private wallLowEnd: number = 0;    // Points 0 .. wallLowEnd - 1 are in the left strip
  private wallHighStart: number = 0; // Points wallHighStart .. n - 1 are in the right strip

  // T and the probability inside the barrier, sampled every SAMPLE_DT of simulation time into a fixed ring
  private readonly ringT = new Float64Array(SETTLE_SAMPLES);
  private readonly ringInside = new Float64Array(SETTLE_SAMPLES);
  private ringHead: number = 0;  // Next slot to write (and, once full, the oldest sample)
  private ringCount: number = 0;
  private nextSample: number = 1; // Index k of the next sample, taken when time reaches k * SAMPLE_DT

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
    // The outer strips, found with the same test the wall check uses, so the check can skip the middle of the box
    const wallEdge = this.xMax - WALL_STRIP;
    let low = 0;
    while (low < this.numGridPoints && Math.abs(this.gridX[low]) > wallEdge) low++;
    let high = this.numGridPoints;
    while (high > low && Math.abs(this.gridX[high - 1]) > wallEdge) high--;
    this.wallLowEnd = low;
    this.wallHighStart = high;
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
    this.wallReached = false;
    this.ringHead = 0;
    this.ringCount = 0;
    this.nextSample = 1;
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
    const prevHeight = this.params.barrierHeight;
    const prevWidth = this.params.barrierWidth;
    const prevPosition = this.params.barrierPosition;
    this.params = { ...this.params, ...params } as QuantumParams;

    this.buildPotential();

    // If the packet or the barrier changes significantly, start again: a T measured against the old barrier says
    // nothing about the new one
    if (
      params.particleEnergy !== undefined && Math.abs(this.params.particleEnergy - prevE) > 1e-4 ||
      params.initialX !== undefined && Math.abs(this.params.initialX - prevInitialX) > 1e-4 ||
      params.packetSigma !== undefined && Math.abs(this.params.packetSigma - prevSigma) > 1e-4 ||
      params.barrierHeight !== undefined && Math.abs(this.params.barrierHeight - prevHeight) > 1e-4 ||
      params.barrierWidth !== undefined && Math.abs(this.params.barrierWidth - prevWidth) > 1e-4 ||
      params.barrierPosition !== undefined && Math.abs(this.params.barrierPosition - prevPosition) > 1e-4
    ) {
      this.reset();
    }
  }

  getParameters(): QuantumParams {
    return { ...this.params };
  }

  /**
   * Where the packet's centre starts: initialX, or further left if that is closer than 7 sigma to the barrier's left
   * edge, so that at most 1.3e-12 of the packet is at or past the barrier at t = 0 whatever the sliders say.
   */
  private get startX(): number {
    const { initialX, barrierPosition, barrierWidth, packetSigma } = this.params;
    return Math.min(initialX, barrierPosition - (barrierWidth / 2 + 7 * packetSigma));
  }

  private buildPotential(): void {
    const { barrierHeight, barrierWidth, barrierPosition } = this.params;
    const halfW = barrierWidth * 0.5;
    const x0 = barrierPosition;

    // Each grid value is the potential averaged over its cell, so a cell the barrier edge cuts through carries that
    // fraction of V0. The barrier then has the width the learner set, not that width rounded to whole cells (a
    // top-hat sampled at points moves in steps of two cells, 0.167, and would draw two neighbouring widths alike).
    const left = x0 - halfW;
    const right = x0 + halfW;
    const half = this.dx / 2;
    this.potential = new Array(this.numGridPoints);
    for (let i = 0; i < this.numGridPoints; i++) {
      const x = this.gridX[i];
      const overlap = Math.max(0, Math.min(x + half, right) - Math.max(x - half, left));
      this.potential[i] = barrierHeight * Math.min(1, overlap / this.dx);
    }
  }

  private buildInitialWavepacket(): void {
    const { particleEnergy, packetSigma } = this.params;
    const initialX = this.startX;
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

    // Checked on every step, not when the state is read, so a bounce between two reads cannot be missed. Only the
    // points with |x| > xMax - WALL_STRIP count, and those are the two outer strips, so the middle is skipped.
    if (!this.wallReached) {
      let nearWall = 0;
      for (let j = 0; j < this.wallLowEnd; j++) {
        nearWall += (this.psiReal[j] * this.psiReal[j] + this.psiImag[j] * this.psiImag[j]) * dx;
      }
      for (let j = this.wallHighStart; j < n; j++) {
        nearWall += (this.psiReal[j] * this.psiReal[j] + this.psiImag[j] * this.psiImag[j]) * dx;
      }
      if (nearWall >= WALL_PROB) this.wallReached = true;
    }

    // Sample T every SAMPLE_DT of simulation time, not every so many steps, so the window does not depend on dt (below SAMPLE_DT)
    if (this.time >= this.nextSample * SAMPLE_DT) {
      this.recordSample();
      this.nextSample = Math.floor(this.time / SAMPLE_DT + 1e-9) + 1;
    }
  }

  /** Puts T (probability right of the barrier, as in getState) and the probability inside it into the ring. */
  private recordSample(): void {
    const { barrierPosition, barrierWidth } = this.params;
    const xLeft = barrierPosition - barrierWidth * 0.5;
    const xRight = barrierPosition + barrierWidth * 0.5;
    let trans = 0;
    let inside = 0;
    for (let i = 0; i < this.numGridPoints; i++) {
      const x = this.gridX[i];
      const p = (this.psiReal[i] * this.psiReal[i] + this.psiImag[i] * this.psiImag[i]) * this.dx;
      if (x > xRight) trans += p;
      else if (x >= xLeft) inside += p;
    }
    this.ringT[this.ringHead] = trans;
    this.ringInside[this.ringHead] = inside;
    this.ringHead = (this.ringHead + 1) % SETTLE_SAMPLES;
    if (this.ringCount < SETTLE_SAMPLES) this.ringCount++;
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

    // Settled: the packet's centre has had time to reach the barrier and its leading and trailing edges to clear it,
    // almost no probability is inside the barrier, nothing has reached the outer strips of the box this run, and T
    // has stopped changing. That last part is needed because the absolute limit on 'inside' passes whenever T is
    // smaller than that limit, and T keeps rising after the packet's centre has passed. So T must hold within 0.3 %
    // of itself over the last 1.5 time units (31 samples, 0.05 apart), with the inside probability no more than 5 %
    // of T. It is a pure read of the ring: it is not latched, and the measured rule does not flicker.
    const arrival = (barrierPosition - this.startX) / k0;
    const cleared = this.time > arrival + (barrierWidth + 4 * this.params.packetSigma) / k0;
    let steady = false;
    if (this.ringCount === SETTLE_SAMPLES) {
      const newest = (this.ringHead - 1 + SETTLE_SAMPLES) % SETTLE_SAMPLES;
      const tNewest = this.ringT[newest];
      const tOldest = this.ringT[this.ringHead];
      steady =
        Math.abs(tNewest - tOldest) <= SETTLE_TOLERANCE * tNewest &&
        this.ringInside[newest] <= SETTLE_INSIDE_FRACTION * tNewest;
    }
    const settled = cleared && inside < 3e-3 && !this.wallReached && steady;

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
      settled,
      wallReached: this.wallReached,
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
      settled: state.settled ? 1 : 0,
    };
  }
}
