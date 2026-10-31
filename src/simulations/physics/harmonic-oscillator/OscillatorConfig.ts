import { ParameterDescriptor } from '../../../core/types/simulation';
import { OscillatorParams } from './OscillatorEngine';

export const OSCILLATOR_METADATA = {
  id: 'harmonic-oscillator',
  title: 'Damped & Driven Harmonic Oscillator',
  discipline: 'Physics & Applied Mathematics',
  curriculum: 'AP Physics C / IB Physics HL / MIT 18.03',
  governingODE: 'm\\frac{d^2x}{dt^2} + b\\frac{dx}{dt} + kx = F_0\\cos(\\omega t)',
  formattedODE: 'm·ẍ + b·ẋ + k·x = F₀ cos(ωt)',
  description:
    'Explore resonance, damping regimes (underdamped, critically damped, overdamped), and 2D phase space portraits (x vs. v).',
};

export const OSCILLATOR_DEFAULT_PARAMS: OscillatorParams = {
  mass: 1.0,
  damping: 0.3,
  springConstant: 5.0,
  drivingAmplitude: 0.0,
  drivingFrequency: 2.236,
  initialDisplacement: 2.5,
};

export const OSCILLATOR_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'springConstant',
    label: 'Spring Constant (k)',
    unit: 'N/m',
    min: 1.0,
    max: 15.0,
    step: 0.5,
    defaultValue: 5.0,
    description: "Hooke's stiffness constant. Sets natural frequency omega_0 = sqrt(k/m).",
  },
  {
    id: 'damping',
    label: 'Damping Coefficient (b)',
    unit: 'N·s/m',
    min: 0.0,
    max: 6.0,
    step: 0.1,
    defaultValue: 0.3,
    description: 'Viscous friction. Critical damping occurs at b_crit = 2*sqrt(k*m).',
  },
  {
    id: 'mass',
    label: 'Mass (m)',
    unit: 'kg',
    min: 0.2,
    max: 5.0,
    step: 0.1,
    defaultValue: 1.0,
    description: 'Inertial mass of the oscillating block.',
  },
  {
    id: 'drivingAmplitude',
    label: 'Driving Amplitude (F0)',
    unit: 'N',
    min: 0.0,
    max: 10.0,
    step: 0.5,
    defaultValue: 0.0,
    description: 'External periodic driving force amplitude.',
  },
  {
    id: 'drivingFrequency',
    label: 'Driving Frequency (ω)',
    unit: 'rad/s',
    min: 0.5,
    max: 6.0,
    step: 0.1,
    defaultValue: 2.236,
    description: 'Angular frequency of external driving force. Resonance occurs near omega_0.',
  },
  {
    id: 'initialDisplacement',
    label: 'Initial Displacement (x0)',
    unit: 'm',
    min: -4.0,
    max: 4.0,
    step: 0.2,
    defaultValue: 2.5,
    description: 'Initial starting displacement from equilibrium.',
  },
];
