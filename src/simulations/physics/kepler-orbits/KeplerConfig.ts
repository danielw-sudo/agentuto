import { ParameterDescriptor } from '../../../core/types/simulation';

export interface KeplerParams extends Record<string, number> {
  centralMass: number;               // Central mass M (solar masses M☉ or normalized units, e.g., 100)
  gravitationalConstant: number;     // Gravitational constant G (e.g., 1.0)
  initialRadius: number;             // Initial radial distance r0 (AU)
  initialTangentialVelocity: number; // Tangential speed v_t (AU/yr)
  initialRadialVelocity: number;     // Radial speed v_r (AU/yr, positive outward)
  orbitalInclination: number;        // Inclination angle i (degrees out of xy-plane)
}

export const KEPLER_DEFAULT_PARAMS: KeplerParams = {
  centralMass: 100.0,
  gravitationalConstant: 1.0,
  initialRadius: 5.0,
  initialTangentialVelocity: 4.4721, // Near circular: sqrt(GM/r0) = sqrt(100/5) = 4.4721
  initialRadialVelocity: 0.0,
  orbitalInclination: 0.0,
};

export const KEPLER_METADATA = {
  id: 'kepler-orbits',
  title: 'Keplerian Orbits & Celestial Mechanics',
  discipline: 'Physics',
  curriculum: 'MIT 8.01 Classical Mechanics',
  governingODE: '\\frac{d^2\\mathbf{r}}{dt^2} = -\\frac{GM}{r^3}\\mathbf{r}',
  formattedODE: 'r̈ = -(GM / r³) r',
  description:
    'Newtonian gravitational two-body problem in 3D: circular, elliptical, parabolic, and hyperbolic trajectories. Explore Kepler\'s three laws, conservation of angular momentum L = r × p, and vis-viva orbital energy conservation.',
};

export const KEPLER_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'centralMass',
    label: 'Central Stellar Mass (M)',
    min: 20.0,
    max: 300.0,
    step: 5.0,
    defaultValue: 100.0,
    unit: 'M☉',
    description: 'Mass of the central gravitating body controlling gravitational potential well depth GM.',
  },
  {
    id: 'initialRadius',
    label: 'Initial Radial Distance (r₀)',
    min: 1.5,
    max: 12.0,
    step: 0.1,
    defaultValue: 5.0,
    unit: 'AU',
    description: 'Starting orbital distance from the central mass on the x-axis.',
  },
  {
    id: 'initialTangentialVelocity',
    label: 'Tangential Velocity (v_t)',
    min: 0.0,
    max: 12.0,
    step: 0.05,
    defaultValue: 4.4721,
    unit: 'AU/yr',
    description: 'Perpendicular velocity component. For circular orbit, v_c = √(GM/r₀). At v > √(2GM/r₀), the orbit becomes an unbound hyperbola.',
  },
  {
    id: 'initialRadialVelocity',
    label: 'Initial Radial Velocity (v_r)',
    min: -5.0,
    max: 5.0,
    step: 0.1,
    defaultValue: 0.0,
    unit: 'AU/yr',
    description: 'Radial velocity component along the radius vector (negative = inward falling, positive = outward).',
  },
  {
    id: 'orbitalInclination',
    label: 'Orbital Inclination (i)',
    min: -45.0,
    max: 45.0,
    step: 1.0,
    defaultValue: 0.0,
    unit: '°',
    description: 'Tilt angle of the initial orbital velocity vector out of the reference xy-plane.',
  },
  {
    id: 'gravitationalConstant',
    label: 'Gravitational Constant (G)',
    min: 0.2,
    max: 3.0,
    step: 0.1,
    defaultValue: 1.0,
    unit: 'G_0',
    description: 'Effective gravitational coupling constant tuning the overall gravitational force scale.',
  },
];
