import { ParameterDescriptor } from '../../../core/types/simulation';

export interface LcrParams extends Record<string, number> {
  inductance: number;        // L in milliHenrys (mH)
  capacitance: number;       // C in microFarads (μF)
  resistance: number;        // R in Ohms (Ω)
  drivingVoltage: number;    // V0 peak amplitude in Volts (V)
  drivingFrequency: number;  // AC frequency f in Hertz (Hz)
  initialCharge: number;     // Starting charge q0 in microCoulombs (μC)
}

export const LCR_DEFAULT_PARAMS: LcrParams = {
  inductance: 50.0,          // 50 mH = 0.050 H
  capacitance: 20.0,         // 20 μF = 20e-6 F -> f0 = 1 / (2*pi*sqrt(0.050 * 20e-6)) = 159.15 Hz
  resistance: 10.0,          // 10 Ω
  drivingVoltage: 12.0,      // 12 V
  drivingFrequency: 159.15,  // Exact resonance: f = f0
  initialCharge: 0.0,
};

export const LCR_METADATA = {
  id: 'lcr-circuit',
  title: 'LCR Electrical Oscillators & AC Resonance',
  discipline: 'Physics',
  curriculum: 'MIT 8.02 Electromagnetism & TEAL',
  governingODE: 'L\\frac{d^2q}{dt^2} + R\\frac{dq}{dt} + \\frac{q}{C} = V_0\\cos(2\\pi f t)',
  formattedODE: 'L q̈ + R q̇ + q/C = V₀ cos(ωt)',
  description:
    'Driven second-order electrical oscillator circuit with inductor, capacitor, and resistor. Explore AC resonance, phase angle shift φ = arctan((XL - XC)/R), complex phasor diagrams, impedance Z, and quality factor Q.',
};

export const LCR_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'inductance',
    label: 'Inductance (L)',
    min: 5.0,
    max: 250.0,
    step: 5.0,
    defaultValue: 50.0,
    unit: 'mH',
    description: 'Circuit inductance acting as electrical inertia against current changes (L di/dt).',
  },
  {
    id: 'capacitance',
    label: 'Capacitance (C)',
    min: 2.0,
    max: 100.0,
    step: 1.0,
    defaultValue: 20.0,
    unit: 'μF',
    description: 'Electric energy storage capacity providing restoring potential stiffness (q/C).',
  },
  {
    id: 'resistance',
    label: 'Resistance (R)',
    min: 1.0,
    max: 100.0,
    step: 1.0,
    defaultValue: 10.0,
    unit: 'Ω',
    description: 'Ohmic dissipation damping circuit current into thermal Joule heat (i²R).',
  },
  {
    id: 'drivingVoltage',
    label: 'Source Peak Voltage (V₀)',
    min: 0.0,
    max: 30.0,
    step: 0.5,
    defaultValue: 12.0,
    unit: 'V',
    description: 'Peak AC voltage amplitude of the sinusoidal function generator.',
  },
  {
    id: 'drivingFrequency',
    label: 'AC Driving Frequency (f)',
    min: 20.0,
    max: 600.0,
    step: 5.0,
    defaultValue: 159.15,
    unit: 'Hz',
    description: 'Oscillation frequency of the AC voltage source. Matches resonant peak when f = 1/(2π√LC).',
  },
  {
    id: 'initialCharge',
    label: 'Initial Capacitor Charge (q₀)',
    min: 0.0,
    max: 100.0,
    step: 5.0,
    defaultValue: 0.0,
    unit: 'μC',
    description: 'Initial charge deposited on the capacitor before AC source engagement.',
  },
];
