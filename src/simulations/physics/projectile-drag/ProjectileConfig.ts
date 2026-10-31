import { ParameterDescriptor } from '../../../core/types/simulation';

export interface ProjectileParams extends Record<string, number> {
  launchSpeed: number;       // Muzzle speed v0 (m/s)
  launchAngle: number;       // Launch elevation angle theta (degrees, 0-90)
  launchHeight: number;      // Initial height y0 (m)
  mass: number;              // Projectile mass m (kg)
  dragCoefficient: number;   // Drag coefficient Cd (dimensionless, 0 = vacuum, 0.47 = sphere)
  crossSectionArea: number;  // Frontal cross-sectional area A (m^2)
  airDensity: number;        // Fluid/air density rho (kg/m^3, sea level = 1.225)
  gravity: number;           // Gravitational acceleration g (m/s^2, Earth = 9.807)
}

export const PROJECTILE_DEFAULT_PARAMS: ProjectileParams = {
  launchSpeed: 35.0,
  launchAngle: 45.0,
  launchHeight: 0.0,
  mass: 1.0,
  dragCoefficient: 0.47,     // Smooth sphere
  crossSectionArea: 0.03,    // ~10 cm radius sphere
  airDensity: 1.225,         // Earth sea-level air density
  gravity: 9.807,
};

export const PROJECTILE_METADATA = {
  id: 'projectile-drag',
  title: 'Projectile Kinematics & Quadratic Air Drag',
  discipline: 'Physics',
  curriculum: 'MIT 8.01 Classical Mechanics',
  governingODE: 'm\\frac{d\\mathbf{v}}{dt} = m\\mathbf{g} - \\frac{1}{2} C_d \\rho A |\\mathbf{v}| \\mathbf{v}',
  formattedODE: 'm r̈ = m g - ½ C_d ρ A |v| v',
  description:
    'Kinematic trajectory of a projectile launched under uniform gravity with non-linear quadratic aerodynamic drag. Compare real atmospheric flight paths against the classical vacuum parabola, explore terminal velocity, and find optimal launch angles.',
};

export const PROJECTILE_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'launchSpeed',
    label: 'Launch Speed (v₀)',
    min: 5.0,
    max: 80.0,
    step: 1.0,
    defaultValue: 35.0,
    unit: 'm/s',
    description: 'Initial muzzle speed of the projectile leaving the launcher.',
  },
  {
    id: 'launchAngle',
    label: 'Launch Angle (θ)',
    min: 5.0,
    max: 85.0,
    step: 1.0,
    defaultValue: 45.0,
    unit: '°',
    description: 'Launch angle above horizontal. In vacuum, 45° maximizes range; with drag, the optimum shifts lower depending on speed and mass (~41° at defaults, ~35° at 80 m/s).',
  },
  {
    id: 'launchHeight',
    label: 'Initial Height (y₀)',
    min: 0.0,
    max: 40.0,
    step: 1.0,
    defaultValue: 0.0,
    unit: 'm',
    description: 'Elevation of the launch platform above the ground.',
  },
  {
    id: 'mass',
    label: 'Projectile Mass (m)',
    min: 0.05,
    max: 10.0,
    step: 0.05,
    defaultValue: 1.0,
    unit: 'kg',
    description: 'Inertial mass. Heavier projectiles experience smaller deceleration from drag (a_drag ∝ 1/m).',
  },
  {
    id: 'dragCoefficient',
    label: 'Drag Coefficient (C_d)',
    min: 0.0,
    max: 1.2,
    step: 0.02,
    defaultValue: 0.47,
    unit: '',
    description: 'Aerodynamic shape factor (0 = ideal vacuum, 0.47 = sphere, 1.05 = cube).',
  },
  {
    id: 'crossSectionArea',
    label: 'Cross-Section Area (A)',
    min: 0.005,
    max: 0.15,
    step: 0.005,
    defaultValue: 0.03,
    unit: 'm²',
    description: 'Frontal area perpendicular to airflow.',
  },
  {
    id: 'airDensity',
    label: 'Air Density (ρ)',
    min: 0.0,
    max: 2.5,
    step: 0.05,
    defaultValue: 1.225,
    unit: 'kg/m³',
    description: 'Fluid density of the atmosphere (1.225 kg/m³ at Earth sea level; 0 = vacuum space).',
  },
  {
    id: 'gravity',
    label: 'Gravitational Field (g)',
    min: 1.0,
    max: 25.0,
    step: 0.2,
    defaultValue: 9.807,
    unit: 'm/s²',
    description: 'Downward gravitational acceleration (Earth = 9.81, Moon = 1.62, Mars = 3.71).',
  },
];
