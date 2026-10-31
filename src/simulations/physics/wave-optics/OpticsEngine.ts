import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';

export interface OpticsParams extends Record<string, number> {
  wavelength: number;     // lambda in nm (380 to 750)
  slitSeparation: number; // d in micrometers (0 to 100, 0 = single slit)
  slitWidth: number;      // a in micrometers (2 to 40)
  slitCount: number;      // N (1, 2, 3, 5)
  screenDistance: number; // L in meters (0.5 to 3.0)
}

export interface OpticsState extends SimulationState {
  time: number;
  screenY: number[];      // y coordinates on screen in meters
  intensity: number[];    // Normalized intensity I(y) in [0, 1]
  envelope: number[];     // Single-slit diffraction envelope
  fringeSpacingMm: number;// Delta y in mm: lambda * L / d
  envelopeWidthMm: number;// Central diffraction peak width 2 * lambda * L / a
  rgbColor: [number, number, number]; // Laser RGB color
  wavelength: number;
  slitSeparation: number;
  slitWidth: number;
  slitCount: number;
  screenDistance: number;
}

/**
 * Converts optical wavelength (380 - 750 nm) into physically accurate sRGB [0 - 255].
 */
export function wavelengthToRGB(wavelengthNm: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;

  if (wavelengthNm >= 380 && wavelengthNm < 440) {
    r = -(wavelengthNm - 440) / (440 - 380);
    g = 0.0;
    b = 1.0;
  } else if (wavelengthNm >= 440 && wavelengthNm < 490) {
    r = 0.0;
    g = (wavelengthNm - 440) / (490 - 440);
    b = 1.0;
  } else if (wavelengthNm >= 490 && wavelengthNm < 510) {
    r = 0.0;
    g = 1.0;
    b = -(wavelengthNm - 510) / (510 - 490);
  } else if (wavelengthNm >= 510 && wavelengthNm < 580) {
    r = (wavelengthNm - 510) / (580 - 510);
    g = 1.0;
    b = 0.0;
  } else if (wavelengthNm >= 580 && wavelengthNm < 645) {
    r = 1.0;
    g = -(wavelengthNm - 645) / (645 - 580);
    b = 0.0;
  } else if (wavelengthNm >= 645 && wavelengthNm <= 750) {
    r = 1.0;
    g = 0.0;
    b = 0.0;
  }

  // Vision sensitivity intensity attenuation at spectral edges
  let factor = 0.0;
  if (wavelengthNm >= 380 && wavelengthNm < 420) {
    factor = 0.3 + 0.7 * (wavelengthNm - 380) / (420 - 380);
  } else if (wavelengthNm >= 420 && wavelengthNm <= 700) {
    factor = 1.0;
  } else if (wavelengthNm > 700 && wavelengthNm <= 750) {
    factor = 0.3 + 0.7 * (750 - wavelengthNm) / (750 - 700);
  }

  return [
    Math.round(255 * Math.pow(r * factor, 0.8)),
    Math.round(255 * Math.pow(g * factor, 0.8)),
    Math.round(255 * Math.pow(b * factor, 0.8)),
  ];
}

export class OpticsEngine implements SimulationEngine<OpticsParams, OpticsState> {
  private params: OpticsParams = {
    wavelength: 632.8,   // Standard He-Ne red laser (nm)
    slitSeparation: 25.0,// 25 micrometers
    slitWidth: 6.0,      // 6 micrometers
    slitCount: 2,        // Double slit
    screenDistance: 1.2, // 1.2 meters
  };

  private time: number = 0;
  private readonly numScreenPoints: number = 250;
  private readonly halfSpanMeters: number = 0.04; // +/- 4 cm on screen
  private screenY: number[] = [];
  private intensity: number[] = [];
  private envelope: number[] = [];

  constructor() {
    this.screenY = new Array(this.numScreenPoints);
    for (let i = 0; i < this.numScreenPoints; i++) {
      const frac = (i / (this.numScreenPoints - 1)) * 2 - 1; // [-1, 1]
      this.screenY[i] = frac * this.halfSpanMeters;
    }
    this.recomputePattern();
  }

  init(params: OpticsParams): void {
    this.params = { ...params };
    this.reset();
  }

  reset(params?: OpticsParams): void {
    if (params) {
      this.params = { ...params };
    }
    this.time = 0;
    this.recomputePattern();
  }

  dispose(): void {
    this.screenY = [];
    this.intensity = [];
    this.envelope = [];
  }

  setParameters(params: Partial<OpticsParams>): void {
    this.params = { ...this.params, ...params } as OpticsParams;
    this.recomputePattern();
  }

  getParameters(): OpticsParams {
    return { ...this.params };
  }

  step(dt: number): void {
    this.time += dt;
  }

  private recomputePattern(): void {
    const lambdaM = this.params.wavelength * 1e-9;
    const dM = this.params.slitSeparation * 1e-6;
    const aM = this.params.slitWidth * 1e-6;
    const L = Math.max(0.1, this.params.screenDistance);
    const N = Math.max(1, Math.round(this.params.slitCount));

    this.intensity = new Array(this.numScreenPoints);
    this.envelope = new Array(this.numScreenPoints);

    for (let i = 0; i < this.numScreenPoints; i++) {
      const y = this.screenY[i];
      // sin(theta) = y / sqrt(y^2 + L^2)
      const sinTheta = y / Math.sqrt(y * y + L * L);

      // Single-slit diffraction parameter: beta = (pi * a / lambda) * sin(theta)
      const beta = (Math.PI * aM * sinTheta) / lambdaM;
      const diffEnvelope = Math.abs(beta) < 1e-7 ? 1.0 : Math.pow(Math.sin(beta) / beta, 2);
      this.envelope[i] = diffEnvelope;

      // N-slit interference parameter: alpha = (pi * d / lambda) * sin(theta)
      let interf = 1.0;
      if (N === 1 || dM < 1e-9) {
        interf = 1.0;
      } else if (N === 2) {
        const alpha = (Math.PI * dM * sinTheta) / lambdaM;
        interf = Math.pow(Math.cos(alpha), 2);
      } else {
        const alpha = (Math.PI * dM * sinTheta) / lambdaM;
        const sinAlpha = Math.sin(alpha);
        if (Math.abs(sinAlpha) < 1e-6) {
          interf = 1.0;
        } else {
          interf = Math.pow(Math.sin(N * alpha) / (N * sinAlpha), 2);
        }
      }

      this.intensity[i] = diffEnvelope * interf;
    }
  }

  getState(): OpticsState {
    const lambdaM = this.params.wavelength * 1e-9;
    const dM = this.params.slitSeparation * 1e-6;
    const aM = this.params.slitWidth * 1e-6;
    const L = this.params.screenDistance;

    const fringeSpacingMm = dM > 1e-9 ? (lambdaM * L / dM) * 1000 : 0;
    const envelopeWidthMm = aM > 1e-9 ? (2 * lambdaM * L / aM) * 1000 : 0;
    const rgb = wavelengthToRGB(this.params.wavelength);

    return {
      time: this.time,
      screenY: [...this.screenY],
      intensity: [...this.intensity],
      envelope: [...this.envelope],
      fringeSpacingMm,
      envelopeWidthMm,
      rgbColor: rgb,
      wavelength: this.params.wavelength,
      slitSeparation: this.params.slitSeparation,
      slitWidth: this.params.slitWidth,
      slitCount: this.params.slitCount,
      screenDistance: this.params.screenDistance,
    };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    const state = this.getState();
    return {
      t: this.time,
      wavelength_nm: state.wavelength,
      slit_separation_um: state.slitSeparation,
      slit_width_um: state.slitWidth,
      slit_count: state.slitCount,
      screen_distance_m: state.screenDistance,
      fringe_spacing_mm: state.fringeSpacingMm,
      envelope_width_mm: state.envelopeWidthMm,
    };
  }
}
