import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { MomentumParams, MOMENTUM_DEFAULT_PARAMS } from './MomentumConfig';

export interface BodyDisk {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
}

export interface MomentumState extends SimulationState {
  time: number;
  body1: BodyDisk;
  body2: BodyDisk;
  comX: number;
  comY: number;
  comVx: number;
  comVy: number;
  totalMomentumX: number;       // Px = m1*v1x + m2*v2x
  totalMomentumY: number;       // Py = m1*v1y + m2*v2y
  totalMomentumMag: number;
  initialTotalMomentumX: number;
  initialTotalMomentumY: number;
  momentumConservationError: number;
  kineticEnergy1: number;       // K1 = 0.5*m1*v1^2
  kineticEnergy2: number;       // K2 = 0.5*m2*v2^2
  totalKineticEnergy: number;   // K_total = K1 + K2
  initialKineticEnergy: number;
  comKineticEnergy: number;     // K_cm = 0.5 * M_tot * V_cm^2
  internalKineticEnergy: number;// K_int = K_total - K_cm
  energyLostJoules: number;
  collisionCount: number;
  wallContactCount: number;
  isSystemIsolated: boolean;
  restitution: number;
  justCollided: boolean;
}

export class MomentumEngine implements SimulationEngine<MomentumParams, MomentumState> {
  private params: MomentumParams = { ...MOMENTUM_DEFAULT_PARAMS };
  private time: number = 0;

  private b1: BodyDisk = { x: -3.5, y: 0, vx: 5.0, vy: 0, mass: 2.0, radius: 0.35 };
  private b2: BodyDisk = { x: 3.5, y: 0, vx: -3.0, vy: 0, mass: 2.0, radius: 0.35 };

  private initialP: { x: number; y: number } = { x: 0, y: 0 };
  private initialK: number = 0;
  private collisionCount: number = 0;
  private wallContactCount: number = 0;
  private justCollided: boolean = false;

  // Table bounds
  private readonly boundX: number = 5.2;
  private readonly boundY: number = 2.8;

  init(params: MomentumParams): void {
    this.reset(params);
  }

  reset(params?: MomentumParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.collisionCount = 0;
    this.wallContactCount = 0;
    this.justCollided = false;

    const m1 = Math.max(0.2, this.params.mass1);
    const m2 = Math.max(0.2, this.params.mass2);
    const v1 = this.params.velocity1;
    const v2 = this.params.velocity2;
    const b = this.params.impactParameter;

    this.b1 = {
      x: -3.5,
      y: b * 0.5,
      vx: v1,
      vy: 0.0,
      mass: m1,
      radius: 0.35,
    };

    this.b2 = {
      x: 3.5,
      y: -b * 0.5,
      vx: v2,
      vy: 0.0,
      mass: m2,
      radius: 0.35,
    };

    this.initialP = {
      x: m1 * v1 + m2 * v2,
      y: 0.0,
    };

    this.initialK = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
  }

  dispose(): void {
    // Pure computation
  }

  step(dt: number): void {
    this.justCollided = false;
    const e = Math.max(0.0, Math.min(1.0, this.params.restitution));

    // 1. Advance Kinematics
    this.b1.x += this.b1.vx * dt;
    this.b1.y += this.b1.vy * dt;

    this.b2.x += this.b2.vx * dt;
    this.b2.y += this.b2.vy * dt;

    this.time += dt;

    // 2. Body-Body Collision Detection & Resolution
    const dx = this.b2.x - this.b1.x;
    const dy = this.b2.y - this.b1.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.b1.radius + this.b2.radius;

    if (dist < minDist && dist > 1e-4) {
      const nx = dx / dist;
      const ny = dy / dist;

      // Relative velocity along collision normal
      const vrelN = (this.b1.vx - this.b2.vx) * nx + (this.b1.vy - this.b2.vy) * ny;

      // Only resolve if bodies are approaching
      if (vrelN > 0) {
        const m1 = this.b1.mass;
        const m2 = this.b2.mass;

        // Impulse scalar J = -(1 + e) * v_rel_n / (1/m1 + 1/m2)
        const J = (-(1.0 + e) * vrelN) / (1.0 / m1 + 1.0 / m2);

        // Apply impulse: Δv1 = J / m1 * n, Δv2 = -J / m2 * n
        this.b1.vx += (J / m1) * nx;
        this.b1.vy += (J / m1) * ny;

        this.b2.vx -= (J / m2) * nx;
        this.b2.vy -= (J / m2) * ny;

        // Separate bodies to prevent sticking / tunneling
        const overlap = (minDist - dist) * 0.5;
        this.b1.x -= nx * overlap;
        this.b1.y -= ny * overlap;
        this.b2.x += nx * overlap;
        this.b2.y += ny * overlap;

        this.collisionCount++;
        this.justCollided = true;
      }
    }

    // 3. Elastic Table Boundary Reflections (external boundary impulse)
    const checkWall = (b: BodyDisk) => {
      let touchedWall = false;
      if (b.x < -this.boundX + b.radius) {
        b.x = -this.boundX + b.radius;
        b.vx = Math.abs(b.vx);
        touchedWall = true;
      } else if (b.x > this.boundX - b.radius) {
        b.x = this.boundX - b.radius;
        b.vx = -Math.abs(b.vx);
        touchedWall = true;
      }
      if (b.y < -this.boundY + b.radius) {
        b.y = -this.boundY + b.radius;
        b.vy = Math.abs(b.vy);
        touchedWall = true;
      } else if (b.y > this.boundY - b.radius) {
        b.y = this.boundY - b.radius;
        b.vy = -Math.abs(b.vy);
        touchedWall = true;
      }
      if (touchedWall) {
        this.wallContactCount++;
      }
    };

    checkWall(this.b1);
    checkWall(this.b2);
  }

  getState(): MomentumState {
    const m1 = this.b1.mass;
    const m2 = this.b2.mass;
    const mTot = m1 + m2;

    // Center of Mass Kinematics
    const comX = (m1 * this.b1.x + m2 * this.b2.x) / mTot;
    const comY = (m1 * this.b1.y + m2 * this.b2.y) / mTot;
    const comVx = (m1 * this.b1.vx + m2 * this.b2.vx) / mTot;
    const comVy = (m1 * this.b1.vy + m2 * this.b2.vy) / mTot;

    // Momentum Vectors
    const p1x = m1 * this.b1.vx;
    const p1y = m1 * this.b1.vy;
    const p2x = m2 * this.b2.vx;
    const p2y = m2 * this.b2.vy;
    const totalPx = p1x + p2x;
    const totalPy = p1y + p2y;
    const totalPmag = Math.hypot(totalPx, totalPy);

    const momentumConservationError = Math.hypot(
      totalPx - this.initialP.x,
      totalPy - this.initialP.y
    );

    // Kinetic Energy
    const v1Sq = this.b1.vx * this.b1.vx + this.b1.vy * this.b1.vy;
    const v2Sq = this.b2.vx * this.b2.vx + this.b2.vy * this.b2.vy;
    const ke1 = 0.5 * m1 * v1Sq;
    const ke2 = 0.5 * m2 * v2Sq;
    const totalKe = ke1 + ke2;

    const vcmSq = comVx * comVx + comVy * comVy;
    const comKe = 0.5 * mTot * vcmSq;
    const internalKe = Math.max(0.0, totalKe - comKe);
    const energyLost = Math.max(0.0, this.initialK - totalKe);

    return {
      time: this.time,
      body1: { ...this.b1 },
      body2: { ...this.b2 },
      comX,
      comY,
      comVx,
      comVy,
      totalMomentumX: totalPx,
      totalMomentumY: totalPy,
      totalMomentumMag: totalPmag,
      initialTotalMomentumX: this.initialP.x,
      initialTotalMomentumY: this.initialP.y,
      momentumConservationError,
      kineticEnergy1: ke1,
      kineticEnergy2: ke2,
      totalKineticEnergy: totalKe,
      initialKineticEnergy: this.initialK,
      comKineticEnergy: comKe,
      internalKineticEnergy: internalKe,
      energyLostJoules: energyLost,
      collisionCount: this.collisionCount,
      wallContactCount: this.wallContactCount,
      isSystemIsolated: this.wallContactCount === 0,
      restitution: Math.max(0.0, Math.min(1.0, this.params.restitution)),
      justCollided: this.justCollided,
    };
  }

  setParameters(params: Partial<MomentumParams>): void {
    this.params = { ...this.params, ...params } as MomentumParams;
    if (params.mass1 !== undefined) this.b1.mass = Math.max(0.2, params.mass1);
    if (params.mass2 !== undefined) this.b2.mass = Math.max(0.2, params.mass2);
  }

  getParameters(): MomentumParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const s = this.getState();
    return {
      t: s.time,
      body1_x: s.body1.x,
      body1_y: s.body1.y,
      body1_vx: s.body1.vx,
      body1_vy: s.body1.vy,
      body2_x: s.body2.x,
      body2_y: s.body2.y,
      body2_vx: s.body2.vx,
      body2_vy: s.body2.vy,
      com_x: s.comX,
      com_y: s.comY,
      com_vx: s.comVx,
      com_vy: s.comVy,
      total_p_x: s.totalMomentumX,
      total_p_y: s.totalMomentumY,
      total_p_mag: s.totalMomentumMag,
      kinetic_energy_total_J: s.totalKineticEnergy,
      kinetic_energy_com_J: s.comKineticEnergy,
      kinetic_energy_internal_J: s.internalKineticEnergy,
      collision_count: s.collisionCount,
      wall_contacts: s.wallContactCount,
      is_isolated: s.isSystemIsolated ? 1 : 0,
    };
  }
}
