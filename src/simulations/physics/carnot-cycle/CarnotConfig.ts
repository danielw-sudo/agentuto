import { ParameterDescriptor } from '../../../core/types/simulation';

export interface CarnotParams extends Record<string, number> {
  th: number;               // Hot reservoir temperature in Kelvin (350 - 800 K)
  tc: number;               // Cold reservoir temperature in Kelvin (150 - 450 K)
  compressionRatio: number; // Isothermal expansion ratio V2 / V1 (1.2 - 3.5)
  gasMoles: number;         // Amount of substance n in moles (0.5 - 3.0 mol)
  gamma: number;            // Adiabatic index Cp / Cv (1.40 diatomic, 1.667 monatomic)
  cycleSpeed: number;       // Speed of cycle traversal (0.2 - 3.0)
}

export const CARNOT_DEFAULT_PARAMS: CarnotParams = {
  th: 600.0,                // 600 K (Hot reservoir)
  tc: 300.0,                // 300 K (Cold reservoir)
  compressionRatio: 2.0,    // V2 / V1 = 2.0
  gasMoles: 1.0,            // 1.0 mol
  gamma: 1.667,             // 5/3 (Monatomic ideal gas)
  cycleSpeed: 1.0,
};

export const CARNOT_METADATA = {
  id: 'carnot-cycle',
  title: 'Carnot Cycle & The Second Law of Thermodynamics',
  discipline: 'Physics',
  curriculum: 'MIT 8.044 Statistical Physics & Thermodynamics',
  governingODE: '\\eta = 1 - \\frac{T_C}{T_H}, \\quad \\oint \\frac{dQ_{\\text{rev}}}{T} = 0, \\quad W_{\\text{net}} = \\oint P dV',
  formattedODE: 'η = 1 - T_C / T_H,  ∮ (dQ / T) = 0,  W_net = ∮ P dV',
  description:
    'Sadi Carnot’s 1824 foundational cycle: explore the maximum theoretical thermal efficiency of heat engines, reversible isothermal and adiabatic expansions/compressions, dual P-V and T-S indicator diagrams, Clausius entropy invariance (∮ dQ/T = 0), and Second Law thermodynamic irreversibility.',
};

export const CARNOT_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'th',
    label: 'Hot Reservoir Temp (T_H)',
    min: 350.0,
    max: 800.0,
    step: 25.0,
    defaultValue: 600.0,
    unit: 'K',
    description: 'Temperature of the hot thermal reservoir supplying input heat Q_H during isothermal expansion.',
  },
  {
    id: 'tc',
    label: 'Cold Reservoir Temp (T_C)',
    min: 150.0,
    max: 450.0,
    step: 25.0,
    defaultValue: 300.0,
    unit: 'K',
    description: 'Temperature of the cold thermal sink absorbing exhaust heat Q_C during isothermal compression. Must satisfy T_C < T_H.',
  },
  {
    id: 'compressionRatio',
    label: 'Expansion Ratio (V₂ / V₁)',
    min: 1.2,
    max: 3.5,
    step: 0.1,
    defaultValue: 2.0,
    unit: '',
    description: 'Volume expansion ratio during the hot isothermal stroke, determining heat absorption Q_H = n R T_H ln(V2/V1).',
  },
  {
    id: 'gasMoles',
    label: 'Gas Quantity (n)',
    min: 0.5,
    max: 3.0,
    step: 0.25,
    defaultValue: 1.0,
    unit: 'mol',
    description: 'Number of moles of working substance (ideal gas).',
  },
  {
    id: 'gamma',
    label: 'Heat Capacity Ratio (γ = Cp/Cv)',
    min: 1.3,
    max: 1.7,
    step: 0.05,
    defaultValue: 1.667,
    unit: '',
    description: 'Ratio of specific heats (γ = 5/3 ≈ 1.667 for helium/argon monatomic gas; γ = 7/5 = 1.40 for air/nitrogen diatomic gas).',
  },
  {
    id: 'cycleSpeed',
    label: 'Cycle Playback Speed',
    min: 0.2,
    max: 3.0,
    step: 0.2,
    defaultValue: 1.0,
    unit: '×',
    description: 'Traversal frequency across the 4 thermodynamic stages.',
  },
];
