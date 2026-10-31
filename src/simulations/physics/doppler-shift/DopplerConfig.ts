import { ParameterDescriptor } from '../../../core/types/simulation';

export interface DopplerParams extends Record<string, number> {
  waveSpeed: number;         // c in m/s (e.g. 343 m/s for sound in air, normalized default 100 m/s)
  sourceSpeed: number;       // vs in m/s (source velocity along x-axis)
  sourceFrequency: number;   // f0 in Hz (emitted wave frequency)
  receiverX: number;         // xr position on x-axis (m)
  receiverY: number;         // yr position perpendicular to motion axis (m)
  receiverSpeed: number;     // vr in m/s (receiver velocity)
}

export const DOPPLER_DEFAULT_PARAMS: DopplerParams = {
  waveSpeed: 100.0,          // 100 m/s
  sourceSpeed: 60.0,         // Mach 0.6 (Subsonic)
  sourceFrequency: 10.0,     // 10 Hz emitted pulses
  receiverX: 80.0,           // 80 m ahead on track
  receiverY: 0.0,            // Direct head-on collision axis
  receiverSpeed: 0.0,
};

export const DOPPLER_METADATA = {
  id: 'doppler-shift',
  title: 'Doppler Shift & Wavefront Compression',
  discipline: 'Physics',
  curriculum: 'MIT 8.03 Vibrations and Waves',
  governingODE: "f' = f_0 \\left(\\frac{c \\pm v_r}{c \\mp v_s}\\right), \\quad \\sin\\mu = \\frac{c}{v_s}",
  formattedODE: "f' = f₀ (c ± v_r) / (c ∓ v_s),  sin(μ) = c / v_s",
  description:
    'Wave propagation from moving sources: explore spatial wavefront compression, acoustic frequency shifts, stationary vs moving receivers, supersonic shockwave cone formation (Mach angle sin μ = c/vs), and sonic booms.',
};

export const DOPPLER_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'waveSpeed',
    label: 'Wave Propagation Speed (c)',
    min: 40.0,
    max: 200.0,
    step: 5.0,
    defaultValue: 100.0,
    unit: 'm/s',
    description: 'Speed of wave propagation in the stationary reference medium (sound in air = 343 m/s, light = c).',
  },
  {
    id: 'sourceSpeed',
    label: 'Source Speed (v_s)',
    min: -150.0,
    max: 180.0,
    step: 5.0,
    defaultValue: 60.0,
    unit: 'm/s',
    description: 'Velocity of the wave emitter along x-axis. Positive = moving toward receiver. |vs| > c produces supersonic Mach cones.',
  },
  {
    id: 'sourceFrequency',
    label: 'Source Frequency (f₀)',
    min: 2.0,
    max: 25.0,
    step: 1.0,
    defaultValue: 10.0,
    unit: 'Hz',
    description: 'Natural rest frequency of wave crest emission.',
  },
  {
    id: 'receiverX',
    label: 'Receiver Position X (x_r)',
    min: -120.0,
    max: 120.0,
    step: 5.0,
    defaultValue: 80.0,
    unit: 'm',
    description: 'Stationary or moving detector location along the primary motion axis.',
  },
  {
    id: 'receiverY',
    label: 'Observer Offset Y (y_r)',
    min: 0.0,
    max: 60.0,
    step: 2.0,
    defaultValue: 0.0,
    unit: 'm',
    description: 'Lateral perpendicular distance from motion path to observe oblique Doppler pitch shifts.',
  },
  {
    id: 'receiverSpeed',
    label: 'Receiver Speed (v_r)',
    min: -50.0,
    max: 50.0,
    step: 5.0,
    defaultValue: 0.0,
    unit: 'm/s',
    description: 'Observer motion along x-axis. Positive = moving rightwards.',
  },
];
