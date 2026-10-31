import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { Vec3 } from '../../../core/math/vector3';
import { rk4KinematicStep } from '../../../core/math/integrators';

export interface LorentzParams extends Record<string, number> {
  charge: number;        // microCoulombs (uC = 10^-6 C)
  mass: number;          // milliGrams (mg = 10^-6 kg) -> q/m is exact SI C/kg
  magneticFieldZ: number;// Tesla (T)
  electricFieldY: number;// V/m
  initialSpeedX: number; // m/s
  initialSpeedY: number; // m/s
}

export interface LorentzState extends SimulationState {
  time: number;
  pos: Vec3;
  vel: Vec3;
  speed: number;
  kineticEnergy: number;
  magneticFieldZ: number;
  electricFieldY: number;
  trailPoints: Vec3[];
}

export class LorentzEngine implements SimulationEngine<LorentzParams, LorentzState> {
  private params: LorentzParams = {
    charge: 1.0,
    mass: 1.0,
    magneticFieldZ: 2.0,
    electricFieldY: 0.0,
    initialSpeedX: 8.0,
    initialSpeedY: 0.0,
  };

  private time: number = 0;
  private pos: Vec3 = new Vec3(0, 0, 0);
  private vel: Vec3 = new Vec3(8, 0, 0);
  private trail: Vec3[] = [];
  private maxTrailPoints: number = 500;
  private trailDecimationCounter: number = 0;

  init(params: LorentzParams): void {
    this.reset(params);
  }

  reset(params?: LorentzParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.pos = new Vec3(0, 0, 0);
    this.vel = new Vec3(this.params.initialSpeedX, this.params.initialSpeedY, 0);
    this.trail = [this.pos.clone()];
    this.trailDecimationCounter = 0;
  }

  dispose(): void {
    this.trail = [];
  }

  step(dt: number): void {
    const safeMass = Math.max(this.params.mass, 1e-6);
    const qOverM = this.params.charge / safeMass; // Exact SI unit ratio: (10^-6 C) / (10^-6 kg) = 1 C/kg
    const B = new Vec3(0, 0, this.params.magneticFieldZ);
    const E = new Vec3(0, this.params.electricFieldY, 0);

    // Lorentz force acceleration: a = (q/m) * (E + v x B)
    const accelFn = (_t: number, _r: Vec3, v: Vec3): Vec3 => {
      const vCrossB = v.cross(B);
      const totalForcePerMass = E.add(vCrossB).scale(qOverM);
      return totalForcePerMass;
    };

    const next = rk4KinematicStep(this.pos, this.vel, this.time, dt, accelFn);
    this.pos = next.pos;
    this.vel = next.vel;
    this.time += dt;

    // Record trail point every 3 steps to maintain performance
    this.trailDecimationCounter++;
    if (this.trailDecimationCounter % 3 === 0) {
      this.trail.push(this.pos.clone());
      if (this.trail.length > this.maxTrailPoints) {
        this.trail.shift();
      }
    }
  }

  getState(): LorentzState {
    const safeMass = Math.max(this.params.mass, 1e-6);
    const speed = this.vel.mag();
    // K = 0.5 * m * v^2: with m in mg (10^-6 kg) and v in m/s, result is microJoules (uJ)
    const kineticEnergy = 0.5 * safeMass * speed * speed;

    return {
      time: this.time,
      pos: this.pos.clone(),
      vel: this.vel.clone(),
      speed,
      kineticEnergy,
      magneticFieldZ: this.params.magneticFieldZ,
      electricFieldY: this.params.electricFieldY,
      trailPoints: [...this.trail],
    };
  }

  setParameters(params: Partial<LorentzParams>): void {
    this.params = { ...this.params, ...params } as LorentzParams;
  }

  getParameters(): LorentzParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const safeMass = Math.max(this.params.mass, 1e-6);
    const speed = this.vel.mag();
    const kineticEnergy = 0.5 * safeMass * speed * speed;

    return {
      t: this.time,
      x: this.pos.x,
      y: this.pos.y,
      z: this.pos.z,
      vx: this.vel.x,
      vy: this.vel.y,
      vz: this.vel.z,
      speed,
      kinetic_energy: kineticEnergy,
      B_z: this.params.magneticFieldZ,
      E_y: this.params.electricFieldY,
    };
  }
}
