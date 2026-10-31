import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { PhotoelectricParams, PHOTOELECTRIC_DEFAULT_PARAMS } from './PhotoelectricConfig';

export const HC_EV_NM = 1239.841984; // Planck constant * speed of light in eV * nm
export const PLANCK_EV_S = 4.135667696e-15; // h in eV * s
export const ELECTRON_MASS_KG = 9.1093837e-31; // m_e in kg
export const EV_TO_JOULE = 1.602176634e-19; // 1 eV in Joules

export interface PhotonParticle {
  x: number; // 0 to 1 along tube axis
  y: number; // vertical offset
  vx: number;
  vy: number;
  id: number;
}

export interface Photoelectron {
  x: number;       // 0 (cathode) to 1.0 (anode)
  y: number;
  vx: number;      // velocity along axis (m/s normalized)
  vy: number;
  initialEnergyEv: number;
  id: number;
  reachedCollector: boolean;
  returnedToCathode: boolean;
}

export interface PhotoelectricState extends SimulationState {
  time: number;
  photonEnergyEv: number;       // E = hc / λ
  thresholdFrequencyHz: number; // fc = Φ / h
  thresholdWavelengthNm: number;// λc = hc / Φ
  maxKineticEnergyEv: number;   // Kmax = max(0, E - Φ)
  stoppingPotentialV: number;   // Vstop = Kmax / e
  maxElectronSpeedMps: number;  // vmax in m/s
  photocurrentMicroAmps: number;// Live measured current
  saturationCurrentMicroAmps: number; // Isat (at V >= 0)
  isEmissionActive: boolean;    // E >= Φ
  isCurrentCutoff: boolean;     // V <= -Vstop or E < Φ
  photons: PhotonParticle[];
  electrons: Photoelectron[];
  totalElectronsCollected: number;
}

export class PhotoelectricEngine implements SimulationEngine<PhotoelectricParams, PhotoelectricState> {
  private params: PhotoelectricParams = { ...PHOTOELECTRIC_DEFAULT_PARAMS };
  private time: number = 0;
  private photons: PhotonParticle[] = [];
  private electrons: Photoelectron[] = [];
  private nextPhotonId: number = 0;
  private nextElectronId: number = 0;
  private totalCollected: number = 0;
  private emissionAccumulator: number = 0;
  private photonAccumulator: number = 0;

  // Visual/simulation plate geometry:
  // Cathode at x = 0.2, Anode at x = 0.8 (distance = 0.6)
  private readonly cathodeX: number = 0.2;
  private readonly anodeX: number = 0.8;
  private readonly plateDistance: number = 0.6;

  init(params: PhotoelectricParams): void {
    this.reset(params);
  }

  reset(params?: PhotoelectricParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.photons = [];
    this.electrons = [];
    this.nextPhotonId = 0;
    this.nextElectronId = 0;
    this.totalCollected = 0;
    this.emissionAccumulator = 0;
    this.photonAccumulator = 0;
  }

  dispose(): void {
    this.photons = [];
    this.electrons = [];
  }

  step(dt: number): void {
    const lam = Math.max(100.0, this.params.wavelength);
    const phi = Math.max(0.1, this.params.workFunction);
    const intensity = Math.max(1.0, this.params.intensity);
    const V = this.params.appliedVoltage;

    const photonEnergy = HC_EV_NM / lam;
    const canEmit = photonEnergy >= phi;
    const kMax = Math.max(0.0, photonEnergy - phi);

    this.time += dt;

    // 1. Photon Stream Spawning (Lamp at x = -0.1, pointing towards cathode at x = 0.2)
    const photonRate = (intensity / 100.0) * 80.0; // photons per second
    this.photonAccumulator += photonRate * dt;
    while (this.photonAccumulator >= 1.0) {
      this.photons.push({
        x: -0.1,
        y: (Math.random() - 0.5) * 0.4,
        vx: 1.2,
        vy: (Math.random() - 0.5) * 0.1,
        id: this.nextPhotonId++,
      });
      this.photonAccumulator -= 1.0;
    }

    // 2. Advance Photons & Check Cathode Collisions
    const remainingPhotons: PhotonParticle[] = [];
    for (let i = 0; i < this.photons.length; i++) {
      const p = this.photons[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x >= this.cathodeX) {
        // Photon hit cathode! If E >= Φ, quantum efficiency creates photoelectron
        if (canEmit) {
          this.emissionAccumulator += 0.85; // 85% quantum yield
          if (this.emissionAccumulator >= 1.0) {
            // Ejected electron with initial energy in [0.05*kMax, kMax]
            const energyFraction = 0.2 + 0.8 * Math.random();
            const eKin = kMax * energyFraction;
            // Map kinetic energy in eV to speed in simulation units (approx 1.0 at 2 eV)
            const speed = Math.sqrt(Math.max(0.01, eKin / 2.0));
            const angle = (Math.random() - 0.5) * 0.8; // ejection cone forward

            this.electrons.push({
              x: this.cathodeX + 0.01,
              y: p.y,
              vx: speed * Math.cos(angle),
              vy: speed * Math.sin(angle),
              initialEnergyEv: eKin,
              id: this.nextElectronId++,
              reachedCollector: false,
              returnedToCathode: false,
            });
            this.emissionAccumulator -= 1.0;
          }
        }
      } else {
        remainingPhotons.push(p);
      }
    }
    this.photons = remainingPhotons.slice(-70);

    // 3. Advance Photoelectrons under Electric Field Acceleration
    // Electric field E = -V / d. Acceleration a_x = e*V / (m*d)
    // Normalized acceleration: 1 Volt applied creates approx 2.5 sim accel units
    const accelX = (V / this.plateDistance) * 1.8;

    const activeElectrons: Photoelectron[] = [];
    for (let i = 0; i < this.electrons.length; i++) {
      const e = this.electrons[i];
      e.vx += accelX * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Collector plate reached (Anode at x = 0.8)
      if (e.x >= this.anodeX) {
        e.reachedCollector = true;
        this.totalCollected++;
      } else if (e.x <= this.cathodeX && e.vx < 0) {
        // Turned around by retarding voltage and reabsorbed by cathode
        e.returnedToCathode = true;
      } else if (Math.abs(e.y) < 0.6) {
        activeElectrons.push(e);
      }
    }
    this.electrons = activeElectrons.slice(-90);
  }

  getState(): PhotoelectricState {
    const lam = Math.max(100.0, this.params.wavelength);
    const phi = Math.max(0.1, this.params.workFunction);
    const intensity = Math.max(1.0, this.params.intensity);
    const V = this.params.appliedVoltage;

    const photonEnergyEv = HC_EV_NM / lam;
    const thresholdFrequencyHz = (phi * EV_TO_JOULE) / (PLANCK_EV_S * EV_TO_JOULE);
    const thresholdWavelengthNm = HC_EV_NM / phi;

    const isEmissionActive = photonEnergyEv >= phi;
    const maxKineticEnergyEv = isEmissionActive ? photonEnergyEv - phi : 0.0;
    const stoppingPotentialV = maxKineticEnergyEv; // In volts, Vstop = Kmax / e

    // Max electron speed: v = sqrt(2 * Kmax * 1.602e-19 / 9.109e-31)
    const maxElectronSpeedMps = isEmissionActive
      ? Math.sqrt((2.0 * maxKineticEnergyEv * EV_TO_JOULE) / ELECTRON_MASS_KG)
      : 0.0;

    // Saturation photocurrent (proportional to intensity): e.g. 50 uA at 100%
    const saturationCurrentMicroAmps = isEmissionActive ? (intensity / 100.0) * 50.0 : 0.0;

    // I-V curve characteristics:
    // When V <= -Vstop: zero current (cutoff)
    // When V >= 0: saturation current
    // Between -Vstop and 0: parabolic/smooth rise
    let photocurrentMicroAmps = 0.0;
    let isCurrentCutoff = true;

    if (isEmissionActive) {
      if (V <= -stoppingPotentialV) {
        photocurrentMicroAmps = 0.0;
        isCurrentCutoff = true;
      } else if (V >= 0) {
        photocurrentMicroAmps = saturationCurrentMicroAmps;
        isCurrentCutoff = false;
      } else {
        // -Vstop < V < 0
        const factor = (V + stoppingPotentialV) / Math.max(0.001, stoppingPotentialV);
        photocurrentMicroAmps = saturationCurrentMicroAmps * Math.pow(Math.min(1.0, Math.max(0.0, factor)), 1.8);
        isCurrentCutoff = false;
      }
    }

    return {
      time: this.time,
      photonEnergyEv,
      thresholdFrequencyHz,
      thresholdWavelengthNm,
      maxKineticEnergyEv,
      stoppingPotentialV,
      maxElectronSpeedMps,
      photocurrentMicroAmps,
      saturationCurrentMicroAmps,
      isEmissionActive,
      isCurrentCutoff,
      photons: [...this.photons],
      electrons: [...this.electrons],
      totalElectronsCollected: this.totalCollected,
    };
  }

  setParameters(params: Partial<PhotoelectricParams>): void {
    this.params = { ...this.params, ...params } as PhotoelectricParams;
  }

  getParameters(): PhotoelectricParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const s = this.getState();
    return {
      t: s.time,
      wavelength_nm: this.params.wavelength,
      intensity_pct: this.params.intensity,
      work_function_eV: this.params.workFunction,
      applied_voltage_V: this.params.appliedVoltage,
      photon_energy_eV: s.photonEnergyEv,
      k_max_eV: s.maxKineticEnergyEv,
      stopping_potential_V: s.stoppingPotentialV,
      v_max_km_s: s.maxElectronSpeedMps / 1000.0,
      photocurrent_uA: s.photocurrentMicroAmps,
      saturation_uA: s.saturationCurrentMicroAmps,
      is_emission: s.isEmissionActive ? 1 : 0,
      is_cutoff: s.isCurrentCutoff ? 1 : 0,
    };
  }
}
