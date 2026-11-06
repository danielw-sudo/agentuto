import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { Vec3 } from '../../../core/math/vector3';

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
    const B = this.params.magneticFieldZ;
    const E = this.params.electricFieldY;
    const omega = qOverM * B;

    // Lorentz force acceleration: a = (q/m) * (E + v x B). The fields are constant and perpendicular, so the exact
    // motion is known: the velocity rotates at omega in the frame drifting at E/B. An integrator would shrink the speed
    // instead (RK4 lost 20 % a minute at the top of the slider ranges), though a magnetic field does no work.
    const { x: vx, y: vy, z: vz } = this.vel;
    if (Math.abs(omega) < 1e-9) {
      // No magnetic turning: constant acceleration along E
      const ay = qOverM * E;
      this.pos = new Vec3(this.pos.x + vx * dt, this.pos.y + vy * dt + 0.5 * ay * dt * dt, this.pos.z + vz * dt);
      this.vel = new Vec3(vx, vy + ay * dt, vz);
    } else {
      const drift = E / B;
      const ux = vx - drift;
      const sinW = Math.sin(omega * dt);
      const cosW = Math.cos(omega * dt);
      this.pos = new Vec3(
        this.pos.x + drift * dt + (ux * sinW + vy * (1 - cosW)) / omega,
        this.pos.y + (ux * (cosW - 1) + vy * sinW) / omega,
        this.pos.z + vz * dt
      );
      this.vel = new Vec3(drift + ux * cosW + vy * sinW, vy * cosW - ux * sinW, vz);
    }
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
