import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { ProjectileParams, PROJECTILE_DEFAULT_PARAMS } from './ProjectileConfig';

export interface TrajectoryPoint2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
}

export interface ProjectileState extends SimulationState {
  time: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  accelX: number;
  accelY: number;
  dragForce: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  isLanded: boolean;
  impactDistance: number;
  maxAltitude: number;
  flightDuration: number;
  terminalVelocity: number;
  vacuumRange: number;
  vacuumMaxAltitude: number;
  trailPoints: TrajectoryPoint2D[];
  vacuumTrajectory: { x: number; y: number }[];
}

export class ProjectileEngine implements SimulationEngine<ProjectileParams, ProjectileState> {
  private params: ProjectileParams = { ...PROJECTILE_DEFAULT_PARAMS };
  private time: number = 0;
  private x: number = 0;
  private y: number = 0;
  private vx: number = 0;
  private vy: number = 0;
  private isLanded: boolean = false;
  private maxAltitudeAchieved: number = 0;
  private impactDistance: number = 0;
  private flightDuration: number = 0;
  private trail: TrajectoryPoint2D[] = [];
  private readonly maxTrailLength: number = 800;

  init(params: ProjectileParams): void {
    this.reset(params);
  }

  reset(params?: ProjectileParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.isLanded = false;
    this.x = 0;
    this.y = Math.max(0, this.params.launchHeight);

    const rad = (this.params.launchAngle * Math.PI) / 180;
    const v0 = Math.max(0, this.params.launchSpeed);
    this.vx = v0 * Math.cos(rad);
    this.vy = v0 * Math.sin(rad);

    this.maxAltitudeAchieved = this.y;
    this.impactDistance = 0;
    this.flightDuration = 0;
    this.trail = [{ x: this.x, y: this.y, vx: this.vx, vy: this.vy, t: 0 }];
  }

  dispose(): void {
    this.trail = [];
  }

  step(dt: number): void {
    if (this.isLanded) return;

    const m = Math.max(1e-4, this.params.mass);
    const g = this.params.gravity;
    const k = 0.5 * this.params.dragCoefficient * this.params.airDensity * this.params.crossSectionArea;

    // Subdivide dt into 4 RK4 steps
    const subSteps = 4;
    const subDt = dt / subSteps;

    const accel = (vx: number, vy: number): { ax: number; ay: number } => {
      const v = Math.sqrt(vx * vx + vy * vy);
      const dragFactor = (k / m) * v;
      return {
        ax: -dragFactor * vx,
        ay: -g - dragFactor * vy,
      };
    };

    for (let s = 0; s < subSteps; s++) {
      if (this.isLanded) break;

      // RK4 for 2D velocity and position
      // State: [x, y, vx, vy]
      const k1a = accel(this.vx, this.vy);
      const k1_vx = k1a.ax;
      const k1_vy = k1a.ay;
      const k1_x = this.vx;
      const k1_y = this.vy;

      const midVx1 = this.vx + 0.5 * subDt * k1_vx;
      const midVy1 = this.vy + 0.5 * subDt * k1_vy;
      const k2a = accel(midVx1, midVy1);
      const k2_vx = k2a.ax;
      const k2_vy = k2a.ay;
      const k2_x = midVx1;
      const k2_y = midVy1;

      const midVx2 = this.vx + 0.5 * subDt * k2_vx;
      const midVy2 = this.vy + 0.5 * subDt * k2_vy;
      const k3a = accel(midVx2, midVy2);
      const k3_vx = k3a.ax;
      const k3_vy = k3a.ay;
      const k3_x = midVx2;
      const k3_y = midVy2;

      const endVx = this.vx + subDt * k3_vx;
      const endVy = this.vy + subDt * k3_vy;
      const k4a = accel(endVx, endVy);
      const k4_vx = k4a.ax;
      const k4_vy = k4a.ay;
      const k4_x = endVx;
      const k4_y = endVy;

      const nextX = this.x + (subDt / 6) * (k1_x + 2 * k2_x + 2 * k3_x + k4_x);
      const nextY = this.y + (subDt / 6) * (k1_y + 2 * k2_y + 2 * k3_y + k4_y);
      const nextVx = this.vx + (subDt / 6) * (k1_vx + 2 * k2_vx + 2 * k3_vx + k4_vx);
      const nextVy = this.vy + (subDt / 6) * (k1_vy + 2 * k2_vy + 2 * k3_vy + k4_vy);

      // Check ground collision (y <= 0)
      if (nextY <= 0 && this.time > 0) {
        // Linear interpolation to exact ground impact point
        const fraction = this.y / (this.y - nextY);
        this.x = this.x + fraction * (nextX - this.x);
        this.y = 0;
        this.time += fraction * subDt;
        this.vx = 0;
        this.vy = 0;
        this.isLanded = true;
        this.impactDistance = this.x;
        this.flightDuration = this.time;
        this.trail.push({ x: this.x, y: 0, vx: 0, vy: 0, t: this.time });
        break;
      }

      this.x = nextX;
      this.y = nextY;
      this.vx = nextVx;
      this.vy = nextVy;
      this.time += subDt;

      if (this.y > this.maxAltitudeAchieved) {
        this.maxAltitudeAchieved = this.y;
      }
    }

    if (!this.isLanded) {
      this.trail.push({
        x: this.x,
        y: this.y,
        vx: this.vx,
        vy: this.vy,
        t: this.time,
      });
      if (this.trail.length > this.maxTrailLength) {
        this.trail.shift();
      }
    }
  }

  private computeVacuumTrajectory(): { x: number; y: number }[] {
    const v0 = this.params.launchSpeed;
    const rad = (this.params.launchAngle * Math.PI) / 180;
    const y0 = Math.max(0, this.params.launchHeight);
    const g = Math.max(0.1, this.params.gravity);

    const v0x = v0 * Math.cos(rad);
    const v0y = v0 * Math.sin(rad);

    // Quadratic formula for flight time in vacuum: y(t) = y0 + v0y*t - 0.5*g*t^2 = 0
    const disc = v0y * v0y + 2 * g * y0;
    const tFlight = (v0y + Math.sqrt(Math.max(0, disc))) / g;

    const points: { x: number; y: number }[] = [];
    const segments = 100;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * tFlight;
      const x = v0x * t;
      const y = Math.max(0, y0 + v0y * t - 0.5 * g * t * t);
      points.push({ x, y });
    }
    return points;
  }

  getState(): ProjectileState {
    const m = Math.max(1e-4, this.params.mass);
    const g = this.params.gravity;
    const k = 0.5 * this.params.dragCoefficient * this.params.airDensity * this.params.crossSectionArea;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const dragForce = k * speed * speed;

    const accelX = this.isLanded ? 0 : -(k / m) * speed * this.vx;
    const accelY = this.isLanded ? 0 : -g - (k / m) * speed * this.vy;

    const ke = 0.5 * m * speed * speed;
    const pe = m * g * this.y;
    const te = ke + pe;

    // Terminal velocity: v_term = sqrt(mg / k)
    const terminalVelocity = k > 1e-6 ? Math.sqrt((m * g) / k) : Infinity;

    // Vacuum metrics
    const v0 = this.params.launchSpeed;
    const rad = (this.params.launchAngle * Math.PI) / 180;
    const y0 = Math.max(0, this.params.launchHeight);
    const v0x = v0 * Math.cos(rad);
    const v0y = v0 * Math.sin(rad);
    const disc = v0y * v0y + 2 * g * y0;
    const tFlightVac = (v0y + Math.sqrt(Math.max(0, disc))) / g;
    const vacuumRange = v0x * tFlightVac;
    const vacuumMaxAltitude = y0 + (v0y * v0y) / (2 * g);

    return {
      time: this.time,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      speed,
      accelX,
      accelY,
      dragForce,
      kineticEnergy: ke,
      potentialEnergy: pe,
      totalEnergy: te,
      isLanded: this.isLanded,
      impactDistance: this.isLanded ? this.impactDistance : this.x,
      maxAltitude: this.maxAltitudeAchieved,
      flightDuration: this.isLanded ? this.flightDuration : this.time,
      terminalVelocity,
      vacuumRange,
      vacuumMaxAltitude,
      trailPoints: [...this.trail],
      vacuumTrajectory: this.computeVacuumTrajectory(),
    };
  }

  setParameters(params: Partial<ProjectileParams>): void {
    this.params = { ...this.params, ...params } as ProjectileParams;
  }

  getParameters(): ProjectileParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const s = this.getState();
    return {
      t: s.time,
      x: s.x,
      y: s.y,
      vx: s.vx,
      vy: s.vy,
      speed: s.speed,
      accel_x: s.accelX,
      accel_y: s.accelY,
      drag_force: s.dragForce,
      kinetic_energy: s.kineticEnergy,
      potential_energy: s.potentialEnergy,
      total_energy: s.totalEnergy,
      range: s.impactDistance,
      max_altitude: s.maxAltitude,
    };
  }
}
