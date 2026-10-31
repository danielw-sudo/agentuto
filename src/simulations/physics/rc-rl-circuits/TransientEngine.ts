import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { TransientParams, TRANSIENT_DEFAULT_PARAMS } from './TransientConfig';

export interface TransientState extends SimulationState {
  time: number;
  circuitType: number;        // 0: RC, 1: RL
  timeConstantSeconds: number;// τ = RC or L/R
  timeConstantMs: number;     // τ in milliseconds
  inputVoltage: number;       // Vin(t) in Volts
  componentVoltage: number;   // VC(t) in RC mode, VL(t) in RL mode
  resistorVoltage: number;    // VR(t) = I * R
  currentAmps: number;        // I(t)
  currentMilliAmps: number;   // I(t) in mA
  chargeMicroCoulombs: number;// q(t) in μC (RC mode)
  storedEnergyMilliJoules: number; // 0.5*C*V^2 or 0.5*L*I^2 in mJ
  heatDissipatedMilliJoules: number; // Cumulative ∫ I^2 R dt in mJ
  percentRelaxed: number;     // Progress towards steady state (0 to 100%)
  history: {
    time: number;
    vin: number;
    vout: number;
    current: number;
  }[];
}

export class TransientEngine implements SimulationEngine<TransientParams, TransientState> {
  private params: TransientParams = { ...TRANSIENT_DEFAULT_PARAMS };
  private time: number = 0;

  // State variables
  private qCoulombs: number = 0; // Capacitor charge (RC mode)
  private currentAmps: number = 0; // Inductor current (RL mode)
  private totalHeatJoules: number = 0;

  // Oscilloscope ring buffer
  private history: { time: number; vin: number; vout: number; current: number }[] = [];
  private readonly maxHistory: number = 200;

  init(params: TransientParams): void {
    this.reset(params);
  }

  reset(params?: TransientParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.qCoulombs = 0;
    this.currentAmps = 0;
    this.totalHeatJoules = 0;
    this.history = [];
  }

  dispose(): void {
    this.history = [];
  }

  step(dt: number): void {
    const isRL = Math.round(this.params.circuitType) === 1;
    const R = Math.max(1.0, this.params.resistance);
    const C = Math.max(1e-6, this.params.capacitance * 1e-6); // Farads
    const L = Math.max(1e-4, this.params.inductance * 1e-3);  // Henries
    const V0 = this.params.sourceVoltage;

    // Periodic square wave switching or manual switch
    let Vin: number;
    if (this.params.squareWaveFreq > 0.1) {
      const period = 1.0 / this.params.squareWaveFreq;
      const tInPeriod = this.time % period;
      Vin = tInPeriod < period * 0.5 ? V0 : 0.0;
    } else {
      Vin = this.params.switchState === 1 ? V0 : 0.0;
    }

    if (!isRL) {
      // --- RC Circuit: dq/dt = (Vin - q/C) / R = I ---
      // RK4 integration for charge q
      const f = (qVal: number, vIn: number) => (vIn - qVal / C) / R;

      const k1 = f(this.qCoulombs, Vin);
      const k2 = f(this.qCoulombs + 0.5 * dt * k1, Vin);
      const k3 = f(this.qCoulombs + 0.5 * dt * k2, Vin);
      const k4 = f(this.qCoulombs + dt * k3, Vin);

      const iAvg = (k1 + 2 * k2 + 2 * k3 + k4) / 6.0;
      this.qCoulombs = Math.max(0.0, this.qCoulombs + iAvg * dt);
      this.currentAmps = (Vin - this.qCoulombs / C) / R;

      // Ohmic Joule heat dissipation: dE = I^2 * R * dt
      this.totalHeatJoules += this.currentAmps * this.currentAmps * R * dt;
    } else {
      // --- RL Circuit: di/dt = (Vin - R*i) / L ---
      // RK4 integration for current i
      const f = (iVal: number, vIn: number) => (vIn - R * iVal) / L;

      const k1 = f(this.currentAmps, Vin);
      const k2 = f(this.currentAmps + 0.5 * dt * k1, Vin);
      const k3 = f(this.currentAmps + 0.5 * dt * k2, Vin);
      const k4 = f(this.currentAmps + dt * k3, Vin);

      this.currentAmps += ((k1 + 2 * k2 + 2 * k3 + k4) / 6.0) * dt;
      this.totalHeatJoules += this.currentAmps * this.currentAmps * R * dt;
    }

    this.time += dt;

    // Oscilloscope sample point
    const state = this.getState();
    this.history.push({
      time: this.time,
      vin: Vin,
      vout: state.componentVoltage,
      current: this.currentAmps,
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getState(): TransientState {
    const isRL = Math.round(this.params.circuitType) === 1;
    const R = Math.max(1.0, this.params.resistance);
    const C = Math.max(1e-6, this.params.capacitance * 1e-6);
    const L = Math.max(1e-4, this.params.inductance * 1e-3);
    const V0 = this.params.sourceVoltage;

    // Current input voltage
    let Vin: number;
    if (this.params.squareWaveFreq > 0.1) {
      const period = 1.0 / this.params.squareWaveFreq;
      const tInPeriod = this.time % period;
      Vin = tInPeriod < period * 0.5 ? V0 : 0.0;
    } else {
      Vin = this.params.switchState === 1 ? V0 : 0.0;
    }

    let tauSeconds: number;
    let componentVoltage: number;
    let resistorVoltage: number;
    let storedEnergyJ: number;
    let percentRelaxed: number;

    if (!isRL) {
      // RC Mode
      tauSeconds = R * C;
      componentVoltage = this.qCoulombs / C; // VC
      resistorVoltage = Vin - componentVoltage; // VR = Vin - VC
      storedEnergyJ = 0.5 * C * componentVoltage * componentVoltage;

      // Steady-state target
      const targetV = Vin;
      percentRelaxed = targetV > 0
        ? Math.min(100, Math.max(0, (componentVoltage / targetV) * 100))
        : Math.min(100, Math.max(0, (1.0 - componentVoltage / V0) * 100));
    } else {
      // RL Mode
      tauSeconds = L / R;
      resistorVoltage = this.currentAmps * R;
      componentVoltage = Vin - resistorVoltage; // VL = Vin - VR (Back EMF)
      storedEnergyJ = 0.5 * L * this.currentAmps * this.currentAmps;

      const targetI = Vin > 0 ? Vin / R : 0.0;
      const maxI = V0 / R;
      percentRelaxed = targetI > 0
        ? Math.min(100, Math.max(0, (this.currentAmps / targetI) * 100))
        : Math.min(100, Math.max(0, (1.0 - this.currentAmps / maxI) * 100));
    }

    return {
      time: this.time,
      circuitType: isRL ? 1 : 0,
      timeConstantSeconds: tauSeconds,
      timeConstantMs: tauSeconds * 1000.0,
      inputVoltage: Vin,
      componentVoltage,
      resistorVoltage,
      currentAmps: this.currentAmps,
      currentMilliAmps: this.currentAmps * 1000.0,
      chargeMicroCoulombs: this.qCoulombs * 1e6,
      storedEnergyMilliJoules: storedEnergyJ * 1000.0,
      heatDissipatedMilliJoules: this.totalHeatJoules * 1000.0,
      percentRelaxed,
      history: [...this.history],
    };
  }

  setParameters(params: Partial<TransientParams>): void {
    const oldType = this.params.circuitType;
    this.params = { ...this.params, ...params } as TransientParams;
    if (params.circuitType !== undefined && params.circuitType !== oldType) {
      this.reset();
    }
  }

  getParameters(): TransientParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const s = this.getState();
    return {
      t: s.time,
      circuit_mode: s.circuitType,
      tau_ms: s.timeConstantMs,
      v_in: s.inputVoltage,
      v_component: s.componentVoltage,
      v_resistor: s.resistorVoltage,
      current_mA: s.currentMilliAmps,
      charge_uC: s.chargeMicroCoulombs,
      stored_energy_mJ: s.storedEnergyMilliJoules,
      heat_dissipated_mJ: s.heatDissipatedMilliJoules,
      relaxation_pct: s.percentRelaxed,
    };
  }
}
