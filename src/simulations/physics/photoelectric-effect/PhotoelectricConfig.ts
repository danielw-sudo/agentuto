import { ParameterDescriptor } from '../../../core/types/simulation';

export interface PhotoelectricParams extends Record<string, number> {
  wavelength: number;       // Light wavelength in nm (200 - 750 nm)
  intensity: number;        // Beam intensity in % (10 - 100%)
  workFunction: number;     // Metal work function in eV (1.8 - 6.0 eV)
  appliedVoltage: number;   // Retarding/accelerating plate voltage in V (-4.0V to +4.0V)
}

export const PHOTOELECTRIC_DEFAULT_PARAMS: PhotoelectricParams = {
  wavelength: 400.0,        // 400 nm (Near-UV / Violet)
  intensity: 60.0,          // 60% beam power
  workFunction: 2.30,       // 2.30 eV (Potassium target)
  appliedVoltage: 0.0,      // 0.0 V
};

export const PHOTOELECTRIC_METADATA = {
  id: 'photoelectric-effect',
  title: 'Photoelectric Effect & Photon Quantization',
  discipline: 'Physics',
  curriculum: 'MIT 8.04 Quantum Physics',
  governingODE: 'K_{\\text{max}} = hf - \\Phi = eV_{\\text{stop}}, \\quad f_c = \\frac{\\Phi}{h}',
  formattedODE: 'K_max = h·f - Φ = e·V_stop,  f_c = Φ / h',
  description:
    'Albert Einstein’s 1905 Nobel Prize discovery: examine quantum photon-electron interactions, frequency cutoff thresholds (fc = Φ/h), retarding stopping potentials (Vstop), saturation photocurrents, and the failure of classical electromagnetic wave theory.',
};

export const PHOTOELECTRIC_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'wavelength',
    label: 'Incident Wavelength (λ)',
    min: 200.0,
    max: 750.0,
    step: 5.0,
    defaultValue: 400.0,
    unit: 'nm',
    description: 'Wavelength of monochromatic light beam. E_photon = hc / λ. Violet/UV has high energy; Red/IR has low energy.',
  },
  {
    id: 'intensity',
    label: 'Light Intensity (Flux)',
    min: 10.0,
    max: 100.0,
    step: 5.0,
    defaultValue: 60.0,
    unit: '%',
    description: 'Number of incident photons emitted per second. Increases saturation current but has zero effect on electron max kinetic energy.',
  },
  {
    id: 'workFunction',
    label: 'Target Work Function (Φ)',
    min: 1.8,
    max: 6.0,
    step: 0.05,
    defaultValue: 2.30,
    unit: 'eV',
    description: 'Minimum binding energy required to liberate an electron from metal surface (e.g. Cs = 2.14 eV, K = 2.30 eV, Na = 2.36 eV, Zn = 4.30 eV, Pt = 5.65 eV).',
  },
  {
    id: 'appliedVoltage',
    label: 'Applied Voltage (V)',
    min: -4.0,
    max: 4.0,
    step: 0.1,
    defaultValue: 0.0,
    unit: 'V',
    description: 'Potential difference between cathode emitter and anode collector. Negative voltages retard photoelectrons; at V = -Vstop, current drops strictly to zero.',
  },
];
