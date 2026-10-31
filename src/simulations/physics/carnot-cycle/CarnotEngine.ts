import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { CarnotParams, CARNOT_DEFAULT_PARAMS } from './CarnotConfig';

export const GAS_CONSTANT_R = 8.314462618; // J / (mol * K)

export interface ThermodynamicStatePoint {
  p: number; // Pressure in Pa
  v: number; // Volume in m^3
  t: number; // Temperature in K
  s: number; // Entropy in J/K
}

export interface CarnotState extends SimulationState {
  time: number;
  stageIndex: number;         // 1, 2, 3, or 4
  stageName: string;          // 'Isothermal Expansion', etc.
  cycleProgress: number;      // 0.0 to 1.0 within entire 4-stage cycle
  pressurePa: number;         // Current P
  pressureAtm: number;        // Current P in atmospheres
  volumeM3: number;           // Current V
  volumeLiters: number;       // Current V in Liters
  temperatureK: number;       // Current T
  entropyJK: number;          // Current S (relative to S1)
  heatAbsorbedQhJ: number;    // Q_H in Joules
  heatRejectedQcJ: number;    // |Q_C| in Joules
  workNetJ: number;           // W_net in Joules
  carnotEfficiency: number;   // η = 1 - Tc / Th
  deltaEntropyCycle: number;  // ∮ dQ/T (identically 0)
  states: {
    state1: ThermodynamicStatePoint;
    state2: ThermodynamicStatePoint;
    state3: ThermodynamicStatePoint;
    state4: ThermodynamicStatePoint;
  };
}

export class CarnotEngine implements SimulationEngine<CarnotParams, CarnotState> {
  private params: CarnotParams = { ...CARNOT_DEFAULT_PARAMS };
  private time: number = 0;
  private phase: number = 0; // 0.0 to 4.0 across the 4 stages
  private readonly v1: number = 0.010; // Reference Volume 10 Liters = 0.010 m^3

  init(params: CarnotParams): void {
    this.reset(params);
  }

  reset(params?: CarnotParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.phase = 0;
  }

  dispose(): void {
    // Pure computation
  }

  step(dt: number): void {
    const speed = Math.max(0.1, this.params.cycleSpeed);
    // Cycle period: ~8 seconds at 1.0x speed
    const dPhase = (dt * speed) / 2.0;
    this.phase = (this.phase + dPhase) % 4.0;
    this.time += dt;
  }

  getState(): CarnotState {
    const Th = Math.max(100.0, this.params.th);
    const Tc = Math.min(Th - 5.0, Math.max(50.0, this.params.tc));
    const r = Math.max(1.1, this.params.compressionRatio);
    const n = Math.max(0.1, this.params.gasMoles);
    const gamma = Math.max(1.1, Math.min(1.8, this.params.gamma));

    const R = GAS_CONSTANT_R;
    const v1 = this.v1;
    const v2 = v1 * r;
    const tempRatio = Th / Tc;
    const adiabaticVolFactor = Math.pow(tempRatio, 1.0 / (gamma - 1.0));
    const v3 = v2 * adiabaticVolFactor;
    const v4 = v1 * adiabaticVolFactor;

    // Calculate the 4 State Points
    const p1 = (n * R * Th) / v1;
    const p2 = (n * R * Th) / v2;
    const p3 = (n * R * Tc) / v3;
    const p4 = (n * R * Tc) / v4;

    const deltaS = n * R * Math.log(r); // Entropy span ΔS = n R ln(r)
    const s1 = 100.0; // Arbitrary reference entropy offset
    const s2 = s1 + deltaS;

    // Net Work and Heat Transfers
    const Qh = n * R * Th * Math.log(r);
    const Qc = n * R * Tc * Math.log(r); // Heat rejected |Q_C|
    const Wnet = Qh - Qc; // n R (Th - Tc) ln(r)
    const carnotEfficiency = (Th - Tc) / Th; // 1 - Tc / Th

    // Instantaneous (P, V, T, S) along the cycle trajectory
    let currentV: number;
    let currentT: number;
    let currentP: number;
    let currentS: number;
    let stageIndex: number;
    let stageName: string;

    const pFrac = this.phase % 4.0;

    if (pFrac < 1.0) {
      // Stage 1: Reversible Isothermal Expansion at Th (1 -> 2)
      stageIndex = 1;
      stageName = 'Isothermal Expansion (Heat In Q_H at T_H)';
      const u = pFrac;
      currentV = v1 * Math.pow(v2 / v1, u);
      currentT = Th;
      currentP = (n * R * Th) / currentV;
      currentS = s1 + u * deltaS;
    } else if (pFrac < 2.0) {
      // Stage 2: Reversible Adiabatic Expansion (2 -> 3)
      stageIndex = 2;
      stageName = 'Adiabatic Expansion (Work Output, T Drops to T_C)';
      const u = pFrac - 1.0;
      currentV = v2 * Math.pow(v3 / v2, u);
      currentT = Th * Math.pow(v2 / currentV, gamma - 1.0);
      currentP = p2 * Math.pow(v2 / currentV, gamma);
      currentS = s2;
    } else if (pFrac < 3.0) {
      // Stage 3: Reversible Isothermal Compression at Tc (3 -> 4)
      stageIndex = 3;
      stageName = 'Isothermal Compression (Exhaust Heat Q_C to T_C)';
      const u = pFrac - 2.0;
      currentV = v3 * Math.pow(v4 / v3, u);
      currentT = Tc;
      currentP = (n * R * Tc) / currentV;
      currentS = s2 - u * deltaS;
    } else {
      // Stage 4: Reversible Adiabatic Compression (4 -> 1)
      stageIndex = 4;
      stageName = 'Adiabatic Compression (Work Done On Gas, T Rises to T_H)';
      const u = pFrac - 3.0;
      currentV = v4 * Math.pow(v1 / v4, u);
      currentT = Tc * Math.pow(v4 / currentV, gamma - 1.0);
      currentP = p4 * Math.pow(v4 / currentV, gamma);
      currentS = s1;
    }

    return {
      time: this.time,
      stageIndex,
      stageName,
      cycleProgress: this.phase / 4.0,
      pressurePa: currentP,
      pressureAtm: currentP / 101325.0,
      volumeM3: currentV,
      volumeLiters: currentV * 1000.0,
      temperatureK: currentT,
      entropyJK: currentS - s1, // Offset relative to S1
      heatAbsorbedQhJ: Qh,
      heatRejectedQcJ: Qc,
      workNetJ: Wnet,
      carnotEfficiency,
      deltaEntropyCycle: 0.0, // Identically zero for reversible cycle
      states: {
        state1: { p: p1, v: v1, t: Th, s: 0 },
        state2: { p: p2, v: v2, t: Th, s: deltaS },
        state3: { p: p3, v: v3, t: Tc, s: deltaS },
        state4: { p: p4, v: v4, t: Tc, s: 0 },
      },
    };
  }

  setParameters(params: Partial<CarnotParams>): void {
    this.params = { ...this.params, ...params } as CarnotParams;
  }

  getParameters(): CarnotParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const s = this.getState();
    return {
      t: s.time,
      stage_index: s.stageIndex,
      pressure_kPa: s.pressurePa / 1000.0,
      pressure_atm: s.pressureAtm,
      volume_liters: s.volumeLiters,
      temperature_K: s.temperatureK,
      entropy_J_K: s.entropyJK,
      work_net_J: s.workNetJ,
      heat_in_Qh_J: s.heatAbsorbedQhJ,
      heat_out_Qc_J: s.heatRejectedQcJ,
      efficiency_pct: s.carnotEfficiency * 100.0,
    };
  }
}
