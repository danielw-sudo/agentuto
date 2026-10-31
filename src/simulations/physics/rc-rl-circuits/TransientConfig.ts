import { ParameterDescriptor } from '../../../core/types/simulation';

export interface TransientParams extends Record<string, number> {
  circuitType: number;      // 0: RC Circuit, 1: RL Circuit
  resistance: number;       // Resistance R in Ohms (10 to 1000 Ω)
  capacitance: number;      // Capacitance C in microfarads (10 to 500 μF, used in RC mode)
  inductance: number;       // Inductance L in millihenries (10 to 500 mH, used in RL mode)
  sourceVoltage: number;    // Step voltage V0 in Volts (1.0 to 24.0 V)
  switchState: number;      // 0: Discharging (Ground), 1: Charging (V0)
  squareWaveFreq: number;   // Square-wave switching frequency in Hz (0.5 to 10.0 Hz)
}

export const TRANSIENT_DEFAULT_PARAMS: TransientParams = {
  circuitType: 0,           // RC Circuit
  resistance: 100.0,        // 100 Ω
  capacitance: 100.0,       // 100 μF (τ_RC = 100 Ω * 100 μF = 10 ms = 0.010 s)
  inductance: 100.0,        // 100 mH (τ_RL = 0.1 H / 100 Ω = 1.0 ms)
  sourceVoltage: 12.0,      // 12.0 V
  switchState: 1,           // Charging
  squareWaveFreq: 2.0,      // 2.0 Hz square wave
};

export const TRANSIENT_METADATA = {
  id: 'rc-rl-circuits',
  title: 'RC & RL Transient Relaxation Circuits',
  discipline: 'Physics',
  curriculum: 'MIT 8.02 Electricity and Magnetism / MIT 18.03 Differential Equations',
  governingODE: 'R\\frac{dq}{dt} + \\frac{q}{C} = V(t), \\quad L\\frac{di}{dt} + Ri = V(t), \\quad \\tau_{\\text{RC}} = RC, \\quad \\tau_{\\text{RL}} = \\frac{L}{R}',
  formattedODE: 'R·(dq/dt) + q/C = V(t),  τ = R·C;   L·(di/dt) + R·i = V(t),  τ = L/R',
  description:
    'First-order linear ordinary differential equations: explore exponential charging and discharging transients, capacitive and inductive time constants (τ = RC and τ = L/R), 63.2% rise and 36.8% decay thresholds, dual-trace oscilloscope graticule, and the 50% capacitive energy storage theorem (½CV² stored vs ½CV² dissipated into heat).',
};

export const TRANSIENT_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'circuitType',
    label: 'Circuit Mode',
    min: 0,
    max: 1,
    step: 1,
    defaultValue: 0,
    unit: 'mode',
    description: '0 = RC Capacitive Circuit (q/C voltage); 1 = RL Inductive Circuit (L di/dt back EMF).',
  },
  {
    id: 'resistance',
    label: 'Resistance (R)',
    min: 10.0,
    max: 1000.0,
    step: 10.0,
    defaultValue: 100.0,
    unit: 'Ω',
    description: 'Dissipative circuit resistance. Controls time constant τ = RC (proportional) or τ = L/R (inversely proportional).',
  },
  {
    id: 'capacitance',
    label: 'Capacitance (C)',
    min: 10.0,
    max: 500.0,
    step: 10.0,
    defaultValue: 100.0,
    unit: 'μF',
    description: 'Capacitive charge storage C in microfarads (active in RC mode).',
  },
  {
    id: 'inductance',
    label: 'Inductance (L)',
    min: 10.0,
    max: 500.0,
    step: 10.0,
    defaultValue: 100.0,
    unit: 'mH',
    description: 'Magnetic flux storage inductance L in millihenries (active in RL mode).',
  },
  {
    id: 'sourceVoltage',
    label: 'Supply Voltage (V₀)',
    min: 1.0,
    max: 24.0,
    step: 0.5,
    defaultValue: 12.0,
    unit: 'V',
    description: 'DC step voltage applied to the circuit.',
  },
  {
    id: 'switchState',
    label: 'Switch State',
    min: 0,
    max: 1,
    step: 1,
    defaultValue: 1,
    unit: 'state',
    description: '1 = Charging (connected to supply V0); 0 = Discharging (connected to ground).',
  },
  {
    id: 'squareWaveFreq',
    label: 'Pulse Frequency',
    min: 0.5,
    max: 10.0,
    step: 0.5,
    defaultValue: 2.0,
    unit: 'Hz',
    description: 'Periodic square-wave switching frequency for continuous transient oscilloscope display.',
  },
];
