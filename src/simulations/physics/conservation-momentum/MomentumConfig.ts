import { ParameterDescriptor } from '../../../core/types/simulation';

export interface MomentumParams extends Record<string, number> {
  mass1: number;            // Mass of body 1 in kg (0.5 to 10.0 kg)
  mass2: number;            // Mass of body 2 in kg (0.5 to 10.0 kg)
  velocity1: number;        // Initial x-velocity of body 1 in m/s (-10.0 to 10.0 m/s)
  velocity2: number;        // Initial x-velocity of body 2 in m/s (-10.0 to 10.0 m/s)
  impactParameter: number;  // Vertical offset b in meters for glancing 2D collisions (-1.2 to 1.2 m)
  restitution: number;      // Coefficient of restitution e (0.0 to 1.0)
}

export const MOMENTUM_DEFAULT_PARAMS: MomentumParams = {
  mass1: 2.0,               // 2.0 kg
  mass2: 2.0,               // 2.0 kg
  velocity1: 5.0,           // +5.0 m/s (heading right)
  velocity2: -3.0,          // -3.0 m/s (heading left)
  impactParameter: 0.0,     // 0.0 m (Head-on collision)
  restitution: 1.0,         // 1.0 (Perfectly elastic)
};

export const MOMENTUM_METADATA = {
  id: 'conservation-momentum',
  title: 'Linear Momentum & Center-of-Mass Invariance',
  discipline: 'Physics',
  curriculum: 'MIT 8.01 Classical Mechanics',
  governingODE: '\\frac{d\\mathbf{P}_{\\text{total}}}{dt} = \\mathbf{F}_{\\text{ext}} = \\mathbf{0}, \\quad \\mathbf{V}_{\\text{cm}} = \\frac{m_1\\mathbf{v}_1 + m_2\\mathbf{v}_2}{m_1 + m_2}',
  formattedODE: 'dP_total / dt = 0,  V_cm = (m₁v₁ + m₂v₂) / (m₁ + m₂) = const',
  description:
    'Sir Isaac Newton’s third law consequence: explore closed-system linear momentum conservation, Center-of-Mass frame velocity invariance (V_cm = const), elastic vs inelastic collisions (restitution e = 0 to 1), and oblique 2D scattering angles.',
};

export const MOMENTUM_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'mass1',
    label: 'Body 1 Mass (m₁)',
    min: 0.5,
    max: 10.0,
    step: 0.5,
    defaultValue: 2.0,
    unit: 'kg',
    description: 'Inertial mass of the primary projectile puck.',
  },
  {
    id: 'mass2',
    label: 'Body 2 Mass (m₂)',
    min: 0.5,
    max: 10.0,
    step: 0.5,
    defaultValue: 2.0,
    unit: 'kg',
    description: 'Inertial mass of the target puck.',
  },
  {
    id: 'velocity1',
    label: 'Body 1 Velocity (v₁)',
    min: -10.0,
    max: 10.0,
    step: 0.5,
    defaultValue: 5.0,
    unit: 'm/s',
    description: 'Initial horizontal velocity of body 1.',
  },
  {
    id: 'velocity2',
    label: 'Body 2 Velocity (v₂)',
    min: -10.0,
    max: 10.0,
    step: 0.5,
    defaultValue: -3.0,
    unit: 'm/s',
    description: 'Initial horizontal velocity of body 2.',
  },
  {
    id: 'impactParameter',
    label: 'Impact Offset (b)',
    min: -1.2,
    max: 1.2,
    step: 0.1,
    defaultValue: 0.0,
    unit: 'm',
    description: 'Vertical distance between collision trajectories. b = 0 produces a 1D head-on collision; b ≠ 0 produces 2D glancing scattering.',
  },
  {
    id: 'restitution',
    label: 'Restitution (e)',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    defaultValue: 1.0,
    unit: 'coeff',
    description: 'Elasticity coefficient: e = 1.0 preserves 100% of kinetic energy; e = 0.0 causes bodies to stick together along collision axis (maximum thermal dissipation).',
  },
];
