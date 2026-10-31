import { ParameterDescriptor } from '../../../core/types/simulation';
import { QuantumParams } from './QuantumEngine';

export const QUANTUM_METADATA = {
  id: 'quantum-tunneling',
  title: 'Quantum Wave Mechanics & Tunneling',
  discipline: 'Physics',
  curriculum: 'AP Physics 2 / Modern Physics / MIT 8.04',
  governingODE: 'i\\hbar \\frac{\\partial \\psi}{\\partial t} = -\\frac{\\hbar^2}{2m} \\frac{\\partial^2 \\psi}{\\partial x^2} + V(x)\\psi',
  formattedODE: 'iℏ ∂ψ/∂t = -(ℏ²/2m) ∇²ψ + V(x)ψ',
  description:
    'Simulate unitary wavepacket dynamics via the Time-Dependent Schrödinger Equation. Observe quantum tunneling through finite potential barriers (E < V0) and verify exponential decay.',
};

export const QUANTUM_DEFAULT_PARAMS: QuantumParams = {
  particleEnergy: 5.0,
  barrierHeight: 8.0,
  barrierWidth: 1.0,
  barrierPosition: 0.0,
  packetSigma: 0.9,
  initialX: -5.0,
};

export const QUANTUM_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'particleEnergy',
    label: 'Incident Energy (E)',
    unit: 'eV',
    min: 1.0,
    max: 12.0,
    step: 0.5,
    defaultValue: 5.0,
    description: 'Kinetic energy of the incident wavepacket. If E < V0, classical transmission is 0% but quantum tunneling occurs.',
  },
  {
    id: 'barrierHeight',
    label: 'Barrier Height (V0)',
    unit: 'eV',
    min: 0.0,
    max: 20.0,
    step: 0.5,
    defaultValue: 8.0,
    description: 'Potential energy height of the rectangular barrier centered at x = 0.',
  },
  {
    id: 'barrierWidth',
    label: 'Barrier Width (d)',
    unit: 'nm',
    min: 0.2,
    max: 2.5,
    step: 0.1,
    defaultValue: 1.0,
    description: 'Thickness of the potential barrier. Transmission decays exponentially with thickness: T ∝ exp(-2κd).',
  },
  {
    id: 'packetSigma',
    label: 'Wavepacket Width (σ)',
    unit: 'nm',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    defaultValue: 0.9,
    description: 'Spatial dispersion of the initial Gaussian wavepacket envelope.',
  },
];
