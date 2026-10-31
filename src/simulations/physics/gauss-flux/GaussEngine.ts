import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { GaussParams, GAUSS_DEFAULT_PARAMS } from './GaussConfig';
import { Vec3 } from '../../../core/math/vector3';

export const EPSILON_0 = 8.8541878128e-12; // Permittivity of free space C^2 / (N * m^2)
export const COULOMB_K = 1.0 / (4.0 * Math.PI * EPSILON_0); // ~8.98755e9 N * m^2 / C^2

export interface SurfacePatch {
  position: Vec3;
  normal: Vec3;
  area: number;
  fluxDensity: number; // E · n
}

export interface GaussState extends SimulationState {
  time: number;
  charge1Nc: number;
  charge2Nc: number;
  charge1Pos: Vec3;
  charge2Pos: Vec3;
  charge1Enclosed: boolean;
  charge2Enclosed: boolean;
  enclosedChargeNc: number;       // Q_enc in nC
  theoreticalFlux: number;        // Φ_theory = Q_enc / ε0 in N * m^2 / C
  numericalFlux: number;          // ∮ E · dA in N * m^2 / C
  fluxErrorPercent: number;       // |Φ_num - Φ_theory| / |Φ_theory| * 100%
  surfaceRadius: number;
  surfaceCenter: Vec3;
  surfaceType: number;            // 0: Sphere, 1: Cylinder, 2: Cube
  patches: SurfacePatch[];
}

export class GaussEngine implements SimulationEngine<GaussParams, GaussState> {
  private params: GaussParams = { ...GAUSS_DEFAULT_PARAMS };
  private time: number = 0;
  private readonly numPatches: number = 256;

  init(params: GaussParams): void {
    this.reset(params);
  }

  reset(params?: GaussParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
  }

  dispose(): void {
    // Pure computation
  }

  step(dt: number): void {
    this.time += dt;
  }

  getState(): GaussState {
    const q1 = this.params.charge1;
    const q2 = this.params.charge2;
    const d = Math.max(0.0, this.params.chargeSeparation);
    const rG = Math.max(0.2, this.params.surfaceRadius);
    const cX = this.params.surfaceCenterX;
    const cY = this.params.surfaceCenterY;
    const sType = Math.round(this.params.surfaceType);

    // Charge locations on x-axis
    const pos1 = new Vec3(-d * 0.5, 0.0, 0.0);
    const pos2 = new Vec3(d * 0.5, 0.0, 0.0);
    const centerG = new Vec3(cX, cY, 0.0);

    // Check enclosure for each charge
    const isInside = (pos: Vec3): boolean => {
      const rel = pos.sub(centerG);
      if (sType === 0) {
        // Sphere
        return rel.mag() < rG;
      } else if (sType === 1) {
        // Cylinder (along z, radius rG, half-height = rG)
        const rad2D = Math.hypot(rel.x, rel.y);
        return rad2D < rG && Math.abs(rel.z) < rG;
      } else {
        // Cube (half-side = rG)
        return Math.abs(rel.x) < rG && Math.abs(rel.y) < rG && Math.abs(rel.z) < rG;
      }
    };

    const q1In = isInside(pos1);
    const q2In = isInside(pos2);
    const qEncNc = (q1In ? q1 : 0.0) + (q2In ? q2 : 0.0);
    const qEncCoulombs = qEncNc * 1e-9;

    // Theoretical flux Φ = Q_enc / ε_0 (N · m^2 / C)
    const theoreticalFlux = qEncCoulombs / EPSILON_0;

    // Generate Discrete Patches & Numerically Integrate ∮ E · dA
    const patches: SurfacePatch[] = [];
    let numericalFlux = 0.0;
    const N = this.numPatches;

    // Generate Fibonacci Sphere sample points
    const totalArea = 4.0 * Math.PI * rG * rG;
    const patchArea = totalArea / N;

    const phiGolden = Math.PI * (3.0 - Math.sqrt(5.0)); // Golden angle

    for (let i = 0; i < N; i++) {
      const yNorm = 1.0 - (i / (N - 1.0)) * 2.0; // -1 to +1
      const radiusAtY = Math.sqrt(Math.max(0.0, 1.0 - yNorm * yNorm));
      const theta = phiGolden * i;

      const normX = Math.cos(theta) * radiusAtY;
      const normY = yNorm;
      const normZ = Math.sin(theta) * radiusAtY;
      const normal = new Vec3(normX, normY, normZ);

      // Surface point
      const surfacePos = centerG.add(normal.scale(rG));

      // Calculate Total Electric Field at this surface patch
      let E = new Vec3(0, 0, 0);

      // Contribution from q1
      const r1Vec = surfacePos.sub(pos1);
      const r1Dist = Math.max(0.02, r1Vec.mag());
      const E1Mag = (COULOMB_K * (q1 * 1e-9)) / (r1Dist * r1Dist);
      E = E.add(r1Vec.normalize().scale(E1Mag));

      // Contribution from q2
      const r2Vec = surfacePos.sub(pos2);
      const r2Dist = Math.max(0.02, r2Vec.mag());
      const E2Mag = (COULOMB_K * (q2 * 1e-9)) / (r2Dist * r2Dist);
      E = E.add(r2Vec.normalize().scale(E2Mag));

      // Local flux density = E · n
      const fluxDensity = E.dot(normal);
      numericalFlux += fluxDensity * patchArea;

      if (i % 4 === 0) {
        patches.push({
          position: surfacePos,
          normal,
          area: patchArea,
          fluxDensity,
        });
      }
    }

    // Relative error
    let fluxErrorPercent = 0.0;
    if (Math.abs(theoreticalFlux) > 1e-3) {
      fluxErrorPercent = (Math.abs(numericalFlux - theoreticalFlux) / Math.abs(theoreticalFlux)) * 100.0;
    } else {
      // Net zero enclosed charge (e.g. dipole or outside)
      fluxErrorPercent = Math.abs(numericalFlux);
    }

    return {
      time: this.time,
      charge1Nc: q1,
      charge2Nc: q2,
      charge1Pos: pos1,
      charge2Pos: pos2,
      charge1Enclosed: q1In,
      charge2Enclosed: q2In,
      enclosedChargeNc: qEncNc,
      theoreticalFlux,
      numericalFlux,
      fluxErrorPercent,
      surfaceRadius: rG,
      surfaceCenter: centerG,
      surfaceType: sType,
      patches,
    };
  }

  setParameters(params: Partial<GaussParams>): void {
    this.params = { ...this.params, ...params } as GaussParams;
  }

  getParameters(): GaussParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const s = this.getState();
    return {
      t: s.time,
      charge1_nC: s.charge1Nc,
      charge2_nC: s.charge2Nc,
      q_enclosed_nC: s.enclosedChargeNc,
      flux_theoretical_N_m2_C: s.theoreticalFlux,
      flux_numerical_N_m2_C: s.numericalFlux,
      flux_error_pct: s.fluxErrorPercent,
      q1_enclosed: s.charge1Enclosed ? 1 : 0,
      q2_enclosed: s.charge2Enclosed ? 1 : 0,
      surface_radius_m: s.surfaceRadius,
      surface_center_x: s.surfaceCenter.x,
      surface_center_y: s.surfaceCenter.y,
    };
  }
}
