import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';

export interface InductionParams extends Record<string, number> {
  magnetMoment: number;   // M in A·m^2
  turns: number;          // N (solenoid coil turns)
  coilResistance: number; // R in Ohms
  springConstant: number; // k in N/m
  mass: number;           // m in kg
  mechDamping: number;    // b in N·s/m
  coilRadius: number;     // R_coil in m
  initialZ: number;       // initial displacement in m
}

export interface InductionState extends SimulationState {
  time: number;
  z: number;              // Position along coil axis (m), z=0 is coil center
  vz: number;             // Velocity along axis (m/s)
  az: number;             // Acceleration (m/s^2)
  flux: number;           // Magnetic flux Phi_B (Wb)
  emf: number;            // Induced EMF E = -dPhi/dt (V)
  current: number;        // Induced current I = E / R (A)
  lenzForce: number;      // Opposing electromagnetic braking force (N)
  mechanicalEnergy: number; // E_mech = 0.5*m*v^2 + 0.5*k*z^2 (J)
  dissipatedPower: number; // P = I^2 * R (W)
}

// Effective magnetic permeability mu_eff = 1e-3 T·m/A (scaled with ferromagnetic core / strong dipole for visible macroscopic demonstration)
const MU_0 = 1e-3;

export class InductionEngine implements SimulationEngine<InductionParams, InductionState> {
  private params: InductionParams = {
    magnetMoment: 8.0,
    turns: 200,
    coilResistance: 2.0,
    springConstant: 15.0,
    mass: 0.8,
    mechDamping: 0.05,
    coilRadius: 0.6,
    initialZ: 2.2,
  };

  private time: number = 0;
  private z: number = 2.2;
  private vz: number = 0;
  private az: number = 0;
  private emf: number = 0;
  private current: number = 0;
  private flux: number = 0;
  private lenzForce: number = 0;

  init(params: InductionParams): void {
    this.params = { ...params };
    this.reset();
  }

  reset(params?: InductionParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.z = this.params.initialZ ?? 2.2;
    this.vz = 0;
    this.az = 0;
    this.emf = 0;
    this.current = 0;
    this.updateElectrodynamics(this.z, this.vz);
  }

  dispose(): void {
    // Pure headless engine, no native allocations
  }

  setParameters(params: Partial<InductionParams>): void {
    this.params = { ...this.params, ...params } as InductionParams;
  }

  getParameters(): InductionParams {
    return { ...this.params };
  }

  /**
   * Computes flux Phi(z) = (mu0 * N * M * R^2) / [2 * (z^2 + R^2)^(3/2)]
   */
  public computeFlux(z: number): number {
    const { turns, magnetMoment, coilRadius } = this.params;
    const r2 = coilRadius * coilRadius;
    const denom = 2 * Math.pow(z * z + r2, 1.5);
    return (MU_0 * turns * magnetMoment * r2) / denom;
  }

  /**
   * Computes spatial derivative dPhi/dz = - (3 * mu0 * N * M * R^2 * z) / [2 * (z^2 + R^2)^(5/2)]
   */
  public computeFluxGradient(z: number): number {
    const { turns, magnetMoment, coilRadius } = this.params;
    const r2 = coilRadius * coilRadius;
    const denom = 2 * Math.pow(z * z + r2, 2.5);
    return -(3 * MU_0 * turns * magnetMoment * r2 * z) / denom;
  }

  /**
   * Computes the net acceleration a(z, v) = [F_spring + F_mech + F_lenz] / m
   */
  private computeAcceleration(z: number, vz: number): { a: number; lenzF: number; emf: number; current: number } {
    const { springConstant, mass, mechDamping, coilResistance } = this.params;

    // Mechanical spring and viscous damping
    const fSpring = -springConstant * z;
    const fMechDamp = -mechDamping * vz;

    // Electrodynamics: EMF = - dPhi/dt = - (dPhi/dz) * vz
    const dPhiDz = this.computeFluxGradient(z);
    const emf = -dPhiDz * vz;

    // Induced current I = EMF / R
    const rClamped = Math.max(1e-4, coilResistance);
    const current = emf / rClamped;

    // Lenz's Law braking force: opposes motion, P = F * v = - I^2 * R => F_lenz = - I * (dPhi/dz)
    // or equivalently F_lenz = - (dPhi/dz)^2 * v / R
    const lenzF = current * dPhiDz; // Since current = -(dPhi/dz)*v / R, current * dPhiDz = - (dPhi/dz)^2 * v / R <= 0 when v > 0

    const mClamped = Math.max(1e-4, mass);
    const a = (fSpring + fMechDamp + lenzF) / mClamped;

    return { a, lenzF, emf, current };
  }

  private updateElectrodynamics(z: number, vz: number): void {
    const result = this.computeAcceleration(z, vz);
    this.az = result.a;
    this.lenzForce = result.lenzF;
    this.emf = result.emf;
    this.current = result.current;
    this.flux = this.computeFlux(z);
  }

  step(dt: number): void {
    // 4th-Order Runge-Kutta numerical integration for (z, vz)
    const z0 = this.z;
    const v0 = this.vz;

    // k1
    const a1 = this.computeAcceleration(z0, v0).a;
    const vz1 = v0;

    // k2
    const z_k2 = z0 + 0.5 * dt * vz1;
    const v_k2 = v0 + 0.5 * dt * a1;
    const a2 = this.computeAcceleration(z_k2, v_k2).a;
    const vz2 = v_k2;

    // k3
    const z_k3 = z0 + 0.5 * dt * vz2;
    const v_k3 = v0 + 0.5 * dt * a2;
    const a3 = this.computeAcceleration(z_k3, v_k3).a;
    const vz3 = v_k3;

    // k4
    const z_k4 = z0 + dt * vz3;
    const v_k4 = v0 + dt * a3;
    const a4 = this.computeAcceleration(z_k4, v_k4).a;
    const vz4 = v_k4;

    this.z += (dt / 6) * (vz1 + 2 * vz2 + 2 * vz3 + vz4);
    this.vz += (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
    this.time += dt;

    this.updateElectrodynamics(this.z, this.vz);
  }

  getState(): InductionState {
    const ke = 0.5 * this.params.mass * this.vz * this.vz;
    const pe = 0.5 * this.params.springConstant * this.z * this.z;
    const dissipatedPower = this.current * this.current * this.params.coilResistance;

    return {
      time: this.time,
      z: this.z,
      vz: this.vz,
      az: this.az,
      flux: this.flux,
      emf: this.emf,
      current: this.current,
      lenzForce: this.lenzForce,
      mechanicalEnergy: ke + pe,
      dissipatedPower,
    };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const state = this.getState();
    return {
      t: this.time,
      z: state.z,
      vz: state.vz,
      emf: state.emf,
      current: state.current,
      flux: state.flux,
      lenz_force: state.lenzForce,
      mechanical_energy: state.mechanicalEnergy,
      dissipated_power: state.dissipatedPower,
    };
  }
}
