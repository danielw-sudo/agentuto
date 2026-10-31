import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { LcrParams, LCR_DEFAULT_PARAMS } from './LcrConfig';

export interface LcrState extends SimulationState {
  time: number;
  charge: number;               // Coulombs (C)
  current: number;              // Amperes (A)
  vSource: number;              // Volts (V)
  vR: number;                   // Volts (V)
  vC: number;                   // Volts (V)
  vL: number;                   // Volts (V)
  power: number;                // Watts (W)
  energyE: number;              // Joules (J)
  energyB: number;              // Joules (J)
  totalEnergy: number;          // Joules (J)
  resonantFrequency: number;    // Hz
  impedance: number;            // Ohms (Ω)
  inductiveReactance: number;   // Ohms (Ω)
  capacitiveReactance: number;  // Ohms (Ω)
  phaseAngleDeg: number;        // Degrees (°)
  theoreticalPeakCurrent: number; // Amperes (A)
  qualityFactor: number;        // Dimensionless Q
  voltageHistory: number[];     // Rolling buffer for oscilloscope
  currentHistory: number[];     // Rolling buffer for oscilloscope
}

export class LcrEngine implements SimulationEngine<LcrParams, LcrState> {
  private params: LcrParams = { ...LCR_DEFAULT_PARAMS };
  private time: number = 0;
  private q: number = 0;   // Coulombs
  private i: number = 0;   // Amperes

  private voltageHistory: number[] = [];
  private currentHistory: number[] = [];
  private readonly maxOscilloscopePoints: number = 180;

  init(params: LcrParams): void {
    this.reset(params);
  }

  reset(params?: LcrParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.q = (this.params.initialCharge || 0) * 1e-6; // convert μC to C
    this.i = 0;
    this.voltageHistory = [];
    this.currentHistory = [];
  }

  dispose(): void {
    this.voltageHistory = [];
    this.currentHistory = [];
  }

  step(dt: number): void {
    const L = Math.max(1e-6, this.params.inductance * 1e-3);   // mH -> H
    const C = Math.max(1e-9, this.params.capacitance * 1e-6);  // μF -> F
    const R = Math.max(0.1, this.params.resistance);           // Ω
    const V0 = Math.max(0, this.params.drivingVoltage);
    const omega = 2 * Math.PI * Math.max(0.1, this.params.drivingFrequency);

    // Number of sub-steps based on frequency to ensure fine temporal resolution
    const cyclesPerStep = (omega / (2 * Math.PI)) * dt;
    const subSteps = Math.min(60, Math.max(20, Math.ceil(cyclesPerStep * 30)));
    const subDt = dt / subSteps;

    // Coupled ODE:
    // dq/dt = i
    // di/dt = (V0*cos(omega*t) - R*i - q/C) / L
    const deriv = (t: number, curQ: number, curI: number): { dq: number; di: number } => {
      const vDrive = V0 * Math.cos(omega * t);
      const di_dt = (vDrive - R * curI - curQ / C) / L;
      return { dq: curI, di: di_dt };
    };

    for (let s = 0; s < subSteps; s++) {
      const t = this.time;

      const k1 = deriv(t, this.q, this.i);
      const k2 = deriv(t + 0.5 * subDt, this.q + 0.5 * subDt * k1.dq, this.i + 0.5 * subDt * k1.di);
      const k3 = deriv(t + 0.5 * subDt, this.q + 0.5 * subDt * k2.dq, this.i + 0.5 * subDt * k2.di);
      const k4 = deriv(t + subDt, this.q + subDt * k3.dq, this.i + subDt * k3.di);

      this.q += (subDt / 6) * (k1.dq + 2 * k2.dq + 2 * k3.dq + k4.dq);
      this.i += (subDt / 6) * (k1.di + 2 * k2.di + 2 * k3.di + k4.di);
      this.time += subDt;
    }

    // Capture rolling oscilloscope trace points
    const vSource = V0 * Math.cos(omega * this.time);
    this.voltageHistory.push(vSource);
    this.currentHistory.push(this.i);
    if (this.voltageHistory.length > this.maxOscilloscopePoints) {
      this.voltageHistory.shift();
      this.currentHistory.shift();
    }
  }

  getState(): LcrState {
    const L = Math.max(1e-6, this.params.inductance * 1e-3);
    const C = Math.max(1e-9, this.params.capacitance * 1e-6);
    const R = Math.max(0.1, this.params.resistance);
    const V0 = Math.max(0, this.params.drivingVoltage);
    const f = Math.max(0.1, this.params.drivingFrequency);
    const omega = 2 * Math.PI * f;

    const vSource = V0 * Math.cos(omega * this.time);
    const vR = this.i * R;
    const vC = this.q / C;
    const vL = vSource - vR - vC;
    const power = vSource * this.i;

    const energyE = 0.5 * (this.q * this.q) / C;
    const energyB = 0.5 * L * (this.i * this.i);
    const totalEnergy = energyE + energyB;

    // AC Circuit Theory values
    const resonantFrequency = 1 / (2 * Math.PI * Math.sqrt(L * C));
    const XL = omega * L;
    const XC = 1 / (omega * C);
    const X = XL - XC;
    const impedance = Math.sqrt(R * R + X * X);
    const phaseAngleRad = Math.atan2(X, R);
    const phaseAngleDeg = (phaseAngleRad * 180) / Math.PI;
    const theoreticalPeakCurrent = impedance > 1e-6 ? V0 / impedance : 0;
    const qualityFactor = (1 / R) * Math.sqrt(L / C);

    return {
      time: this.time,
      charge: this.q,
      current: this.i,
      vSource,
      vR,
      vC,
      vL,
      power,
      energyE,
      energyB,
      totalEnergy,
      resonantFrequency,
      impedance,
      inductiveReactance: XL,
      capacitiveReactance: XC,
      phaseAngleDeg,
      theoreticalPeakCurrent,
      qualityFactor,
      voltageHistory: [...this.voltageHistory],
      currentHistory: [...this.currentHistory],
    };
  }

  setParameters(params: Partial<LcrParams>): void {
    this.params = { ...this.params, ...params } as LcrParams;
  }

  getParameters(): LcrParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const s = this.getState();
    return {
      t: s.time,
      q_uC: s.charge * 1e6,
      current_A: s.current,
      v_source: s.vSource,
      v_resistor: s.vR,
      v_capacitor: s.vC,
      v_inductor: s.vL,
      power_W: s.power,
      energy_E_mJ: s.energyE * 1e3,
      energy_B_mJ: s.energyB * 1e3,
      total_energy_mJ: s.totalEnergy * 1e3,
      impedance_ohm: s.impedance,
      phase_deg: s.phaseAngleDeg,
      f_resonance_Hz: s.resonantFrequency,
      quality_factor: s.qualityFactor,
    };
  }
}
