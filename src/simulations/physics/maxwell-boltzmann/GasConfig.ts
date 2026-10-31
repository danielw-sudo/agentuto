import { ParameterDescriptor } from '../../../core/types/simulation';
import { GasParams } from './GasEngine';

export const GAS_METADATA = {
  id: 'maxwell-boltzmann',
  title: 'Maxwell-Boltzmann Distribution & Ideal Gas',
  discipline: 'Physics',
  curriculum: 'AP Physics 2 / IB Physics HL / MIT 8.044',
  governingODE: 'P \\cdot V = N k_B T, \\quad f(v) = \\frac{m v}{k_B T} e^{-\\frac{m v^2}{2 k_B T}}',
  formattedODE: 'P·V = N·k_B·T,  f(v) = (m·v / k_B·T)·exp(-m·v² / 2k_B·T)',
  description:
    'Simulate microscopic elastic collisions of N gas particles. Observe emergent Maxwell-Boltzmann speed distributions, wall impulse pressure, and the Ideal Gas Law.',
};

export const GAS_DEFAULT_PARAMS: GasParams = {
  temperature: 300,
  particleCount: 120,
  pistonX: 6.0,
  particleMass: 1.0,
};

export const GAS_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'temperature',
    label: 'Temperature (T)',
    unit: 'K',
    min: 100,
    max: 800,
    step: 25,
    defaultValue: 300,
    description: 'Kinetic temperature of the gas. Directly determines the spread of thermal molecular speeds (v_rms ∝ √T).',
  },
  {
    id: 'pistonX',
    label: 'Volume / Piston (Lx)',
    unit: 'm',
    min: 3.0,
    max: 9.0,
    step: 0.2,
    defaultValue: 6.0,
    description: 'Position of the movable right piston wall. Compresses or expands the gas chamber volume.',
  },
  {
    id: 'particleCount',
    label: 'Particle Count (N)',
    unit: 'atoms',
    min: 40,
    max: 250,
    step: 10,
    defaultValue: 120,
    description: 'Total number of hard-sphere particles bouncing in the chamber.',
  },
  {
    id: 'particleMass',
    label: 'Molecular Mass (m)',
    unit: 'u',
    min: 0.5,
    max: 4.0,
    step: 0.5,
    defaultValue: 1.0,
    description: 'Atomic mass of the gas species. Heavier particles produce narrower, slower speed distributions.',
  },
];
