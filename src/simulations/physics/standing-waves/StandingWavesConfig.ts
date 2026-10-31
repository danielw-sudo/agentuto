import { ParameterDescriptor } from '../../../core/types/simulation';

export interface StandingWavesParams extends Record<string, number> {
  stringLength: number;      // L in meters (m)
  tension: number;           // T in Newtons (N)
  linearDensity: number;     // μ in grams/meter (g/m) -> converted to kg/m
  harmonicMode: number;      // n (integer mode 1 to 6)
  amplitude: number;         // A in centimeters (cm) -> converted to m
  harmonic2Amp: number;      // Secondary harmonic A2 amplitude (cm) for superposition
  harmonic3Amp: number;      // Tertiary harmonic A3 amplitude (cm) for superposition
}

export const STANDING_WAVES_DEFAULT_PARAMS: StandingWavesParams = {
  stringLength: 2.0,         // 2.0 m
  tension: 100.0,            // 100 N
  linearDensity: 2.5,        // 2.5 g/m = 0.0025 kg/m -> v = sqrt(100 / 0.0025) = 200 m/s
  harmonicMode: 2,           // 2nd harmonic (1 central node, 2 antinodes)
  amplitude: 8.0,            // 8 cm
  harmonic2Amp: 0.0,
  harmonic3Amp: 0.0,
};

export const STANDING_WAVES_METADATA = {
  id: 'standing-waves',
  title: 'Standing Waves, Harmonics & Normal Modes',
  discipline: 'Physics',
  curriculum: 'MIT 8.03 Vibrations and Waves',
  governingODE: '\\frac{\\partial^2 y}{\\partial t^2} = v^2 \\frac{\\partial^2 y}{\\partial x^2}',
  formattedODE: '∂²y/∂t² = v² ∂²y/∂x²',
  description:
    'Wave equation on a clamped string: explore standing wave superposition of counter-propagating traveling waves, harmonic frequencies fn = n·v/(2L), wave speed v = √(T/μ), stationary nodes, and Fourier normal mode synthesis.',
};

export const STANDING_WAVES_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'stringLength',
    label: 'String Length (L)',
    min: 0.5,
    max: 5.0,
    step: 0.1,
    defaultValue: 2.0,
    unit: 'm',
    description: 'Distance between clamped fixed boundary supports.',
  },
  {
    id: 'tension',
    label: 'String Tension (T)',
    min: 10.0,
    max: 400.0,
    step: 5.0,
    defaultValue: 100.0,
    unit: 'N',
    description: 'Restoring tension force stretching the string. Wave speed scales as v ∝ √T.',
  },
  {
    id: 'linearDensity',
    label: 'Linear Density (μ)',
    min: 0.5,
    max: 10.0,
    step: 0.2,
    defaultValue: 2.5,
    unit: 'g/m',
    description: 'Mass per unit length. Heavier strings propagate waves slower (v ∝ 1/√μ).',
  },
  {
    id: 'harmonicMode',
    label: 'Principal Harmonic (n)',
    min: 1,
    max: 6,
    step: 1,
    defaultValue: 2,
    unit: '',
    description: 'Integer harmonic mode number defining the number of antinodes.',
  },
  {
    id: 'amplitude',
    label: 'Principal Amplitude (A₁)',
    min: 1.0,
    max: 20.0,
    step: 0.5,
    defaultValue: 8.0,
    unit: 'cm',
    description: 'Peak transverse displacement amplitude of the principal harmonic.',
  },
  {
    id: 'harmonic2Amp',
    label: '2nd Mode Superposition (A₂)',
    min: 0.0,
    max: 15.0,
    step: 0.5,
    defaultValue: 0.0,
    unit: 'cm',
    description: 'Add a secondary harmonic mode to observe wave superposition and non-sinusoidal shapes.',
  },
  {
    id: 'harmonic3Amp',
    label: '3rd Mode Superposition (A₃)',
    min: 0.0,
    max: 15.0,
    step: 0.5,
    defaultValue: 0.0,
    unit: 'cm',
    description: 'Add a tertiary harmonic mode for rich acoustic timbre and complex vibrational motion.',
  },
];
