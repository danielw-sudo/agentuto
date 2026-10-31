/**
 * Agentuto Benchmark Course Equivalence Registry
 * Grounded in Constitution Art. 3.4 (independent topic alignment; not affiliated)
 */

export interface CourseEquivalence {
  mit: string;
  utsg: string;
  secondary: string;
}

export const COURSE_EQUIVALENCE_MAP: Record<string, CourseEquivalence> = {
  'lorentz-force': {
    mit: 'MIT 8.02 (E&M)',
    utsg: 'UTSG PHY152 (Electromagnetism)',
    secondary: 'AP Physics C: E&M / IB Topic 5 & 11',
  },
  'harmonic-oscillator': {
    mit: 'MIT 18.03 (Diff Eq)',
    utsg: 'UTSG MAT244 / PHY254 (Classical Mech)',
    secondary: 'AP Physics C: Mech / IB Topic 4 & 9',
  },
  'lorenz-attractor': {
    mit: 'MIT 18.03 (Chaos)',
    utsg: 'UTSG MAT244 / APM346 (Dynamical Systems)',
    secondary: 'Advanced Calculus & Non-Linear Dynamics',
  },
  'faraday-induction': {
    mit: 'MIT 8.02 (Induction)',
    utsg: 'UTSG PHY152 (Electromagnetism)',
    secondary: 'AP Physics C: E&M / IB Topic 11',
  },
  'maxwell-boltzmann': {
    mit: 'MIT 8.044 (Statistical Physics)',
    utsg: 'UTSG PHY252 (Thermal Physics)',
    secondary: 'AP Physics 2 (Fluids/Thermo) / IB Topic 3',
  },
  'quantum-tunneling': {
    mit: 'MIT 8.04 (Quantum Mechanics)',
    utsg: 'UTSG PHY256 (Intro to Quantum)',
    secondary: 'IB Physics Option: Quantum & Nuclear',
  },
  'wave-optics': {
    mit: 'MIT 8.03 (Waves & Optics)',
    utsg: 'UTSG PHY152 / PHY254',
    secondary: 'AP Physics 2 / IB Topic 9',
  },
  'kepler-orbits': {
    mit: 'MIT 8.01 (Classical Mechanics)',
    utsg: 'UTSG PHY151 (Foundations of Physics I)',
    secondary: 'AP Physics 1/C: Mech / IB Topic 10',
  },
  'projectile-drag': {
    mit: 'MIT 8.01 (Classical Mechanics)',
    utsg: 'UTSG PHY151 (Mechanics Lab: Fluid Drag)',
    secondary: 'AP Physics 1/C: Mech',
  },
  'lcr-circuit': {
    mit: 'MIT 8.02 / 18.03 (AC Resonance)',
    utsg: 'UTSG PHY152 / MAT244',
    secondary: 'AP Physics C: E&M / IB Topic 11',
  },
  'standing-waves': {
    mit: 'MIT 8.03 (Wave Dynamics)',
    utsg: 'UTSG PHY152 / PHY254',
    secondary: 'AP Physics 1 / IB Topic 4',
  },
  'doppler-shift': {
    mit: 'MIT 8.03 (Wave Dynamics)',
    utsg: 'UTSG PHY152 (Acoustics & Waves)',
    secondary: 'AP Physics 1 / IB Topic 9',
  },
  'photoelectric-effect': {
    mit: 'MIT 8.04 (Quantum Foundations)',
    utsg: 'UTSG PHY256 (Modern Physics)',
    secondary: 'AP Physics 2 / IB Topic 7 & 12',
  },
  'carnot-cycle': {
    mit: 'MIT 8.044 (Thermodynamics)',
    utsg: 'UTSG PHY252 (Thermal Physics)',
    secondary: 'AP Physics 2 (Thermo) / IB Topic B.2',
  },
  'gauss-flux': {
    mit: 'MIT 8.02 (Electrostatic Flux)',
    utsg: 'UTSG PHY152 (Fields & Gauss)',
    secondary: 'AP Physics C: E&M / IB Topic 10',
  },
  'conservation-momentum': {
    mit: 'MIT 8.01 (Collisions & CoM)',
    utsg: 'UTSG PHY151 (Collision Kinematics)',
    secondary: 'AP Physics 1/C: Mech',
  },
  'rc-rl-circuits': {
    mit: 'MIT 8.02 / 18.03 (Transient Circuits)',
    utsg: 'UTSG PHY152 / MAT244',
    secondary: 'AP Physics C: E&M',
  },
};
