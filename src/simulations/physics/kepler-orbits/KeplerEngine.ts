import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { Vec3 } from '../../../core/math/vector3';
import { rk4KinematicStep } from '../../../core/math/integrators';
import { KeplerParams, KEPLER_DEFAULT_PARAMS } from './KeplerConfig';

export interface KeplerState extends SimulationState {
  time: number;
  pos: Vec3;
  vel: Vec3;
  r: number;
  speed: number;
  angularMomentum: Vec3;
  angularMomentumMag: number;
  specificEnergy: number;
  semiMajorAxis: number;
  eccentricity: number;
  orbitalPeriod: number;
  measuredPeriod: number;
  completedOrbits: number;
  perihelion: number;
  aphelion: number;
  trailPoints: Vec3[];
}

export class KeplerEngine implements SimulationEngine<KeplerParams, KeplerState> {
  private params: KeplerParams = { ...KEPLER_DEFAULT_PARAMS };
  private time: number = 0;
  private pos: Vec3 = new Vec3(5, 0, 0);
  private vel: Vec3 = new Vec3(0, 4.4721, 0);
  private trail: Vec3[] = [];
  private readonly maxTrailPoints: number = 600;
  private trailSubsampleCounter: number = 0;
  private sweptAngle: number = 0;
  private lastOrbitCrossTime: number = 0;
  private measuredPeriod: number = 0;
  private completedOrbits: number = 0;

  init(params: KeplerParams): void {
    this.reset(params);
  }

  reset(params?: KeplerParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    const r0 = Math.max(0.5, this.params.initialRadius);
    this.pos = new Vec3(r0, 0, 0);

    const rad = (this.params.orbitalInclination * Math.PI) / 180;
    const vt = this.params.initialTangentialVelocity;
    const vr = this.params.initialRadialVelocity;

    // Velocity: vr along radius (x), vt partitioned between y and z via inclination
    this.vel = new Vec3(vr, vt * Math.cos(rad), vt * Math.sin(rad));
    this.trail = [this.pos.clone()];
    this.trailSubsampleCounter = 0;
    this.sweptAngle = 0;
    this.lastOrbitCrossTime = 0;
    this.measuredPeriod = 0;
    this.completedOrbits = 0;
  }

  dispose(): void {
    this.trail = [];
  }

  step(dt: number): void {
    const GM = Math.max(1e-4, this.params.gravitationalConstant * this.params.centralMass);

    // RK4 gravitational step: a = -(GM / r^3) * r
    const accelFn = (_t: number, rVec: Vec3, _vVec: Vec3): Vec3 => {
      const rMag = rVec.mag();
      // Softening core to avoid singularity division at r -> 0
      const safeR = Math.max(0.2, rMag);
      const factor = -GM / (safeR * safeR * safeR);
      return rVec.scale(factor);
    };

    // Subdivide dt into 4 RK4 sub-steps for orbital conservation
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let i = 0; i < subSteps; i++) {
      const prevPos = this.pos;
      const prevTime = this.time;
      const next = rk4KinematicStep(this.pos, this.vel, this.time, subDt, accelFn);
      this.pos = next.pos;
      this.vel = next.vel;
      this.time += subDt;

      // Empirically measure orbital period via cumulative swept angle 2π crossings
      const dTheta = Math.atan2(prevPos.cross(this.pos).mag(), prevPos.dot(this.pos));
      if (dTheta > 0) {
        const prevAngle = this.sweptAngle;
        const nextAngle = prevAngle + dTheta;
        if (prevAngle < 2 * Math.PI && nextAngle >= 2 * Math.PI) {
          const frac = (2 * Math.PI - prevAngle) / dTheta;
          const crossTime = prevTime + frac * subDt;
          this.measuredPeriod = crossTime - this.lastOrbitCrossTime;
          this.lastOrbitCrossTime = crossTime;
          this.sweptAngle = nextAngle - 2 * Math.PI;
          this.completedOrbits++;
        } else {
          this.sweptAngle = nextAngle;
        }
      }
    }

    this.trailSubsampleCounter++;
    if (this.trailSubsampleCounter % 2 === 0) {
      this.trail.push(this.pos.clone());
      if (this.trail.length > this.maxTrailPoints) {
        this.trail.shift();
      }
    }
  }

  getState(): KeplerState {
    const GM = Math.max(1e-4, this.params.gravitationalConstant * this.params.centralMass);
    const r = Math.max(1e-5, this.pos.mag());
    const speed = this.vel.mag();

    // Specific angular momentum h = r x v
    const angMomVec = this.pos.cross(this.vel);
    const h = angMomVec.mag();

    // Specific orbital energy: epsilon = 0.5 * v^2 - GM / r
    const specificEnergy = 0.5 * speed * speed - GM / r;

    // Semi-major axis: a = -GM / (2 * epsilon) for bound orbit
    let semiMajorAxis = 0;
    if (Math.abs(specificEnergy) > 1e-7) {
      semiMajorAxis = -GM / (2 * specificEnergy);
    }

    // Eccentricity: e = sqrt(max(0, 1 + 2 * epsilon * h^2 / (GM)^2))
    const eTerm = 1 + (2 * specificEnergy * h * h) / (GM * GM);
    const eccentricity = Math.sqrt(Math.max(0, eTerm));

    // Orbital Period (Kepler's 3rd Law for bound elliptic orbit e < 1, a > 0):
    // T = 2 * pi * sqrt(a^3 / GM)
    let orbitalPeriod = 0;
    if (eccentricity < 1 && semiMajorAxis > 0) {
      orbitalPeriod = 2 * Math.PI * Math.sqrt((semiMajorAxis * semiMajorAxis * semiMajorAxis) / GM);
    }

    const perihelion = semiMajorAxis > 0 ? semiMajorAxis * (1 - eccentricity) : r;
    const aphelion = semiMajorAxis > 0 && eccentricity < 1 ? semiMajorAxis * (1 + eccentricity) : Infinity;

    return {
      time: this.time,
      pos: this.pos.clone(),
      vel: this.vel.clone(),
      r,
      speed,
      angularMomentum: angMomVec.clone(),
      angularMomentumMag: h,
      specificEnergy,
      semiMajorAxis,
      eccentricity,
      orbitalPeriod,
      measuredPeriod: this.measuredPeriod,
      completedOrbits: this.completedOrbits,
      perihelion,
      aphelion,
      trailPoints: [...this.trail],
    };
  }

  setParameters(params: Partial<KeplerParams>): void {
    this.params = { ...this.params, ...params } as KeplerParams;
    this.sweptAngle = 0;
    this.lastOrbitCrossTime = this.time;
    this.measuredPeriod = 0;
    this.completedOrbits = 0;
  }

  getParameters(): KeplerParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const state = this.getState();
    return {
      t: state.time,
      x: state.pos.x,
      y: state.pos.y,
      z: state.pos.z,
      vx: state.vel.x,
      vy: state.vel.y,
      vz: state.vel.z,
      r: state.r,
      speed: state.speed,
      angular_momentum: state.angularMomentumMag,
      specific_energy: state.specificEnergy,
      semi_major_axis: state.semiMajorAxis,
      eccentricity: state.eccentricity,
      orbital_period: state.orbitalPeriod,
      measured_period: state.measuredPeriod,
    };
  }
}
