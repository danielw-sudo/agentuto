import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { DopplerParams, DOPPLER_DEFAULT_PARAMS } from './DopplerConfig';

export interface WavefrontCircle {
  emitX: number;
  emitY: number;
  emitTime: number;
  radius: number;
  id: number;
}

export interface DopplerState extends SimulationState {
  time: number;
  sourceX: number;
  sourceY: number;
  receiverX: number;
  receiverY: number;
  machNumber: number;             // M = |vs| / c
  isSupersonic: boolean;          // M >= 1
  machAngleDeg: number;           // μ = arcsin(1 / M) in degrees (if M >= 1)
  observedFrequencyAhead: number; // f' = f0 * (c + vr) / (c - vs)
  observedFrequencyBehind: number;// f' = f0 * (c - vr) / (c + vs)
  observedFrequencyAtReceiver: number; // General oblique Doppler frequency
  compressedWavelengthAhead: number;  // λ' = (c - vs) / f0
  stretchedWavelengthBehind: number;   // λ' = (c + vs) / f0
  wavefronts: WavefrontCircle[];
  totalWavefrontsEmitted: number;
}

export class DopplerEngine implements SimulationEngine<DopplerParams, DopplerState> {
  private params: DopplerParams = { ...DOPPLER_DEFAULT_PARAMS };
  private time: number = 0;
  private sourceX: number = -60.0;
  private sourceY: number = 0.0;
  private receiverX: number = 80.0;
  private receiverY: number = 0.0;

  private wavefronts: WavefrontCircle[] = [];
  private nextWavefrontId: number = 0;
  private timeSinceLastEmission: number = 0;
  private readonly maxWavefronts: number = 90;

  init(params: DopplerParams): void {
    this.reset(params);
  }

  reset(params?: DopplerParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.sourceX = -60.0;
    this.sourceY = 0.0;
    this.receiverX = this.params.receiverX;
    this.receiverY = this.params.receiverY;
    this.wavefronts = [];
    this.nextWavefrontId = 0;
    this.timeSinceLastEmission = 0;
  }

  dispose(): void {
    this.wavefronts = [];
  }

  step(dt: number): void {
    const c = Math.max(10.0, this.params.waveSpeed);
    const vs = this.params.sourceSpeed;
    const vr = this.params.receiverSpeed;
    const f0 = Math.max(0.5, this.params.sourceFrequency);
    const emissionPeriod = 1.0 / f0;

    // Advance source and receiver kinematics
    this.sourceX += vs * dt;
    this.receiverX += vr * dt;
    this.time += dt;

    // Wrap-around source if it leaves the horizontal bounds [-140, 140]
    if (vs > 0 && this.sourceX > 140.0) {
      this.sourceX = -130.0;
    } else if (vs < 0 && this.sourceX < -140.0) {
      this.sourceX = 130.0;
    }

    // Expand existing circular wavefronts: r(t) = c * (t - t_emit)
    for (let i = 0; i < this.wavefronts.length; i++) {
      this.wavefronts[i].radius += c * dt;
    }

    // Remove wavefronts that have expanded beyond viewport radius (e.g., > 260m)
    this.wavefronts = this.wavefronts.filter((wf) => wf.radius < 260.0);

    // Emit new circular wave crest at frequency f0
    this.timeSinceLastEmission += dt;
    if (this.timeSinceLastEmission >= emissionPeriod) {
      this.wavefronts.push({
        emitX: this.sourceX,
        emitY: this.sourceY,
        emitTime: this.time,
        radius: 0.1,
        id: this.nextWavefrontId++,
      });
      this.timeSinceLastEmission -= emissionPeriod;

      if (this.wavefronts.length > this.maxWavefronts) {
        this.wavefronts.shift();
      }
    }
  }

  getState(): DopplerState {
    const c = Math.max(10.0, this.params.waveSpeed);
    const vs = this.params.sourceSpeed;
    const vr = this.params.receiverSpeed;
    const f0 = Math.max(0.5, this.params.sourceFrequency);

    const machNumber = Math.abs(vs) / c;
    const isSupersonic = machNumber >= 1.0;
    const machAngleDeg = isSupersonic ? (Math.asin(1.0 / machNumber) * 180.0) / Math.PI : 90.0;

    // Head-on frequency shifts:
    // Observer ahead of the source (on the +x side), velocities positive along +x as in the oblique formula below:
    // f' = f0 * (c - vr) / (c - vs) (for vs < c)
    let observedAhead = 0;
    if (Math.abs(c - vs) > 1e-3) {
      observedAhead = f0 * ((c - vr) / Math.max(1e-3, c - vs));
    }

    // Observer behind the source (on the -x side): f' = f0 * (c + vr) / (c + vs)
    let observedBehind = 0;
    if (c + vs > 1e-3) {
      observedBehind = f0 * ((c + vr) / (c + vs));
    }

    // Oblique observer frequency: f' = f0 * (c - v_r · n) / (c - v_s · n)
    // where n is the unit vector from source to receiver
    const dx = this.receiverX - this.sourceX;
    const dy = this.receiverY - this.sourceY;
    const dist = Math.hypot(dx, dy);

    let observedAtReceiver = f0;
    if (dist > 1e-3) {
      const cosTheta = dx / dist; // cos of angle between motion axis and line-of-sight
      const denom = c - vs * cosTheta;
      const num = c - vr * cosTheta;
      if (Math.abs(denom) > 1e-3) {
        observedAtReceiver = f0 * (num / denom);
      }
    }

    const compressedWavelengthAhead = Math.max(0.01, (c - vs) / f0);
    const stretchedWavelengthBehind = (c + vs) / f0;

    return {
      time: this.time,
      sourceX: this.sourceX,
      sourceY: this.sourceY,
      receiverX: this.receiverX,
      receiverY: this.receiverY,
      machNumber,
      isSupersonic,
      machAngleDeg,
      observedFrequencyAhead: Math.abs(observedAhead),
      observedFrequencyBehind: Math.abs(observedBehind),
      observedFrequencyAtReceiver: Math.abs(observedAtReceiver),
      compressedWavelengthAhead,
      stretchedWavelengthBehind,
      wavefronts: [...this.wavefronts],
      totalWavefrontsEmitted: this.nextWavefrontId,
    };
  }

  setParameters(params: Partial<DopplerParams>): void {
    this.params = { ...this.params, ...params } as DopplerParams;
  }

  getParameters(): DopplerParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const s = this.getState();
    return {
      t: s.time,
      source_x: s.sourceX,
      source_speed: this.params.sourceSpeed,
      mach_number: s.machNumber,
      mach_angle_deg: s.machAngleDeg,
      freq_emitted_Hz: this.params.sourceFrequency,
      freq_ahead_Hz: s.observedFrequencyAhead,
      freq_behind_Hz: s.observedFrequencyBehind,
      freq_receiver_Hz: s.observedFrequencyAtReceiver,
      wavelength_ahead_m: s.compressedWavelengthAhead,
      wavelength_behind_m: s.stretchedWavelengthBehind,
    };
  }
}
