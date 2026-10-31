import { ParameterDescriptor } from '../../../core/types/simulation';
import { LorenzParams } from './LorenzEngine';

export const LORENZ_METADATA = {
  id: 'lorenz-attractor',
  title: 'Lorenz Chaotic Attractor & Butterfly Effect',
  discipline: 'Applied Mathematics & Physics',
  curriculum: 'MIT 18.03 / Non-Linear Dynamics',
  governingODE: '\\dot{x}=\\sigma(y-x),\\; \\dot{y}=x(\\rho-z)-y,\\; \\dot{z}=xy-\\beta z',
  formattedODE: 'ẋ = σ(y - x),  ẏ = x(ρ - z) - y,  ż = xy - βz',
  description:
    'Experience deterministic chaos, strange attractors, and sensitive dependence on initial conditions (Lyapunov exponent divergence).',
};

export const LORENZ_DEFAULT_PARAMS: LorenzParams = {
  sigma: 10.0,
  rho: 28.0,
  beta: 2.6667,
  perturbation: 0.001,
};

export const LORENZ_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'rho',
    label: 'Rayleigh Number (ρ)',
    unit: '',
    min: 0.5,
    max: 50.0,
    step: 0.5,
    defaultValue: 28.0,
    description: 'Controls bifurcation: ρ < 1 (stable origin), 1 < ρ < 24.74 (spiral sink), ρ > 24.74 (chaotic strange attractor).',
  },
  {
    id: 'sigma',
    label: 'Prandtl Number (σ)',
    unit: '',
    min: 2.0,
    max: 20.0,
    step: 0.5,
    defaultValue: 10.0,
    description: 'Ratio of momentum diffusivity to thermal diffusivity.',
  },
  {
    id: 'beta',
    label: 'Geometric Factor (β)',
    unit: '',
    min: 0.5,
    max: 6.0,
    step: 0.1,
    defaultValue: 2.6667,
    description: 'Aspect ratio factor of convective fluid roll cells (standard: 8/3 ≈ 2.667).',
  },
  {
    id: 'perturbation',
    label: 'Initial Perturbation (Δx0)',
    unit: '',
    min: 0.0001,
    max: 0.05,
    step: 0.0001,
    defaultValue: 0.001,
    description: 'Initial spatial separation between the twin test trajectories to demonstrate the Butterfly Effect.',
  },
];
