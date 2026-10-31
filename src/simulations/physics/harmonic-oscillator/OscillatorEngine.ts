import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { rk4KinematicStep } from '../../../core/math/integrators';
import { Vec3 } from '../../../core/math/vector3';

export interface OscillatorParams extends Record<string, number> {
  mass: number;             // kg
  damping: number;          // N*s/m (damping coefficient b)
  springConstant: number;   // N/m (Hooke's constant k)
  drivingAmplitude: number; // N (external periodic force F0)
  drivingFrequency: number; // rad/s (omega)
  initialDisplacement: number; // m (x0)
}

export interface OscillatorState extends SimulationState {
  time: number;
  x: number;
  v: number;
  accel: number;
  drivingForce: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  phaseTrajectory: { x: number; v: number }[];
}

export class OscillatorEngine implements SimulationEngine<OscillatorParams, OscillatorState> {
  private params: OscillatorParams = {
    mass: 1.0,
    damping: 0.3,
    springConstant: 5.0,
    drivingAmplitude: 0.0,
    drivingFrequency: 2.236, // approx sqrt(k/m) natural frequency
    initialDisplacement: 2.5,
  };

  private time: number = 0;
  private x: number = 2.5;
  private v: number = 0.0;
  private accel: number = 0.0;
  private drivingForce: number = 0.0;
  private phaseHistory: { x: number; v: number }[] = [];
  private maxPhasePoints: number = 800;
  private decimationCounter: number = 0;

  init(params: OscillatorParams): void {
    this.reset(params);
  }

  reset(params?: OscillatorParams): void {
    if (params) {
      this.params = { ...params };
    }
    const safeMass = Math.max(this.params.mass, 1e-6);
    this.time = 0;
    this.x = this.params.initialDisplacement;
    this.v = 0;
    // At t = 0, cos(omega*0) = 1, so F_drive = drivingAmplitude
    this.drivingForce = this.params.drivingAmplitude;
    // Initial acceleration from Hooke's law: a(0) = (F_drive - k*x0) / m
    this.accel = (this.drivingForce - this.params.springConstant * this.x) / safeMass;
    this.phaseHistory = [{ x: this.x, v: this.v }];
    this.decimationCounter = 0;
  }

  dispose(): void {
    this.phaseHistory = [];
  }

  step(dt: number): void {
    const safeMass = Math.max(this.params.mass, 1e-6);
    const { damping, springConstant, drivingAmplitude, drivingFrequency } = this.params;

    // m*x'' + b*x' + k*x = F0*cos(omega*t)
    // x'' = (F0*cos(omega*t) - b*v - k*x) / m
    const accelFn = (t: number, posVec: Vec3, velVec: Vec3): Vec3 => {
      const currentX = posVec.x;
      const currentV = velVec.x;
      const fDrive = drivingAmplitude * Math.cos(drivingFrequency * t);
      const a = (fDrive - damping * currentV - springConstant * currentX) / safeMass;
      return new Vec3(a, 0, 0);
    };

    const currentPosVec = new Vec3(this.x, 0, 0);
    const currentVelVec = new Vec3(this.v, 0, 0);

    const next = rk4KinematicStep(currentPosVec, currentVelVec, this.time, dt, accelFn);
    this.x = next.pos.x;
    this.v = next.vel.x;
    this.time += dt;

    this.drivingForce = drivingAmplitude * Math.cos(drivingFrequency * this.time);
    this.accel = (this.drivingForce - damping * this.v - springConstant * this.x) / safeMass;

    // Record phase portrait point every 2 steps
    this.decimationCounter++;
    if (this.decimationCounter % 2 === 0) {
      this.phaseHistory.push({ x: this.x, v: this.v });
      if (this.phaseHistory.length > this.maxPhasePoints) {
        this.phaseHistory.shift();
      }
    }
  }

  getState(): OscillatorState {
    const safeMass = Math.max(this.params.mass, 1e-6);
    const ke = 0.5 * safeMass * this.v * this.v;
    const pe = 0.5 * this.params.springConstant * this.x * this.x;

    return {
      time: this.time,
      x: this.x,
      v: this.v,
      accel: this.accel,
      drivingForce: this.drivingForce,
      kineticEnergy: ke,
      potentialEnergy: pe,
      totalEnergy: ke + pe,
      phaseTrajectory: [...this.phaseHistory],
    };
  }

  setParameters(params: Partial<OscillatorParams>): void {
    this.params = { ...this.params, ...params } as OscillatorParams;
  }

  getParameters(): OscillatorParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const safeMass = Math.max(this.params.mass, 1e-6);
    const ke = 0.5 * safeMass * this.v * this.v;
    const pe = 0.5 * this.params.springConstant * this.x * this.x;

    return {
      t: this.time,
      x: this.x,
      v: this.v,
      accel: this.accel,
      driving_force: this.drivingForce,
      kinetic_energy: ke,
      potential_energy: pe,
      total_energy: ke + pe,
      damping_b: this.params.damping,
      spring_k: this.params.springConstant,
    };
  }
}
