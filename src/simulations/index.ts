import { SimulationEngine, ViewportRenderer, ParameterDescriptor, SimulationState } from '../core/types/simulation';
import {
  LorentzEngine,
  LorentzRenderer3D,
  LORENTZ_METADATA,
  LORENTZ_DEFAULT_PARAMS,
  LORENTZ_PARAM_DESCRIPTORS,
} from './physics/lorentz-force';

import {
  OscillatorEngine,
  OscillatorRenderer2D,
  OSCILLATOR_METADATA,
  OSCILLATOR_DEFAULT_PARAMS,
  OSCILLATOR_PARAM_DESCRIPTORS,
} from './physics/harmonic-oscillator';

import {
  LorenzEngine,
  LorenzRenderer3D,
  LORENZ_METADATA,
  LORENZ_DEFAULT_PARAMS,
  LORENZ_PARAM_DESCRIPTORS,
} from './physics/lorenz-attractor';

import {
  InductionEngine,
  InductionRenderer3D,
  INDUCTION_METADATA,
  INDUCTION_DEFAULT_PARAMS,
  INDUCTION_PARAM_DESCRIPTORS,
} from './physics/faraday-induction';

import {
  GasEngine,
  GasRenderer2D,
  GAS_METADATA,
  GAS_DEFAULT_PARAMS,
  GAS_PARAM_DESCRIPTORS,
} from './physics/maxwell-boltzmann';

import {
  QuantumEngine,
  QuantumRenderer2D,
  QUANTUM_METADATA,
  QUANTUM_DEFAULT_PARAMS,
  QUANTUM_PARAM_DESCRIPTORS,
} from './physics/quantum-tunneling';

import {
  OpticsEngine,
  OpticsRenderer2D,
  OPTICS_METADATA,
  OPTICS_DEFAULT_PARAMS,
  OPTICS_PARAM_DESCRIPTORS,
} from './physics/wave-optics';

import {
  KeplerEngine,
  KeplerRenderer3D,
  KEPLER_METADATA,
  KEPLER_DEFAULT_PARAMS,
  KEPLER_PARAM_DESCRIPTORS,
} from './physics/kepler-orbits';

import {
  ProjectileEngine,
  ProjectileRenderer2D,
  PROJECTILE_METADATA,
  PROJECTILE_DEFAULT_PARAMS,
  PROJECTILE_PARAM_DESCRIPTORS,
} from './physics/projectile-drag';

import {
  LcrEngine,
  LcrRenderer2D,
  LCR_METADATA,
  LCR_DEFAULT_PARAMS,
  LCR_PARAM_DESCRIPTORS,
} from './physics/lcr-circuit';

import {
  StandingWavesEngine,
  StandingWavesRenderer2D,
  STANDING_WAVES_METADATA,
  STANDING_WAVES_DEFAULT_PARAMS,
  STANDING_WAVES_PARAM_DESCRIPTORS,
} from './physics/standing-waves';

import {
  DopplerEngine,
  DopplerRenderer2D,
  DOPPLER_METADATA,
  DOPPLER_DEFAULT_PARAMS,
  DOPPLER_PARAM_DESCRIPTORS,
} from './physics/doppler-shift';

import {
  PhotoelectricEngine,
  PhotoelectricRenderer2D,
  PHOTOELECTRIC_METADATA,
  PHOTOELECTRIC_DEFAULT_PARAMS,
  PHOTOELECTRIC_PARAM_DESCRIPTORS,
} from './physics/photoelectric-effect';

import {
  CarnotEngine,
  CarnotRenderer2D,
  CARNOT_METADATA,
  CARNOT_DEFAULT_PARAMS,
  CARNOT_PARAM_DESCRIPTORS,
} from './physics/carnot-cycle';

import {
  GaussEngine,
  GaussRenderer3D,
  GAUSS_METADATA,
  GAUSS_DEFAULT_PARAMS,
  GAUSS_PARAM_DESCRIPTORS,
} from './physics/gauss-flux';

import {
  MomentumEngine,
  MomentumRenderer2D,
  MOMENTUM_METADATA,
  MOMENTUM_DEFAULT_PARAMS,
  MOMENTUM_PARAM_DESCRIPTORS,
} from './physics/conservation-momentum';

import {
  TransientEngine,
  TransientRenderer2D,
  TRANSIENT_METADATA,
  TRANSIENT_DEFAULT_PARAMS,
  TRANSIENT_PARAM_DESCRIPTORS,
} from './physics/rc-rl-circuits';

/**
 * Units of every numeric telemetry channel, per sandbox (Constitution Art. 5.1: the manifest is the
 * single source of truth, and everything else is derived from it).
 *
 * This exists because nothing declared channel units: the CSV exporter hard-coded a units line, the
 * telemetry card printed bare numbers, and the Inquiry Log could record a measurement's unit without
 * being able to check it. Every channel a sandbox emits is listed here exactly once, and
 * `src/core/test/journal.test.ts` fails if a declaration and the running engine ever disagree in
 * either direction — so a renamed or added channel cannot go unnoticed.
 *
 * `dimensionless` is written out rather than left empty: an empty cell cannot be told apart from a
 * channel nobody got round to describing.
 */
const TELEMETRY_UNITS = {
  'lorentz-force': { x: 'm', y: 'm', z: 'm', vx: 'm/s', vy: 'm/s', vz: 'm/s', speed: 'm/s', kinetic_energy: 'J', B_z: 'T', E_y: 'V/m' },
  'harmonic-oscillator': { x: 'm', v: 'm/s', accel: 'm/s²', driving_force: 'N', kinetic_energy: 'J', potential_energy: 'J', total_energy: 'J', damping_b: 'N·s/m', spring_k: 'N/m' },
  'lorenz-attractor': { x1: 'dimensionless', y1: 'dimensionless', z1: 'dimensionless', x2: 'dimensionless', y2: 'dimensionless', z2: 'dimensionless', divergence: 'dimensionless', sigma: 'dimensionless', rho: 'dimensionless', beta: 'dimensionless' },
  'faraday-induction': { z: 'm', vz: 'm/s', emf: 'V', current: 'A', flux: 'Wb', lenz_force: 'N', mechanical_energy: 'J', dissipated_power: 'W' },
  'maxwell-boltzmann': { temperature: 'K', volume: 'm³', piston_x: 'm', empirical_pressure: 'Pa', ideal_pressure: 'Pa', v_rms: 'm/s', v_avg: 'm/s', kinetic_energy: 'J' },
  'quantum-tunneling': { transmission_T: 'dimensionless', reflection_R: 'dimensionless', barrier_prob: 'dimensionless', norm: 'dimensionless', energy_E: 'eV', barrier_V0: 'eV', barrier_width: 'nm', wave_number: '1/nm' },
  'wave-optics': { wavelength_nm: 'nm', slit_separation_um: 'µm', slit_width_um: 'µm', slit_count: 'dimensionless', screen_distance_m: 'm', fringe_spacing_mm: 'mm', envelope_width_mm: 'mm' },
  'kepler-orbits': { x: 'AU', y: 'AU', z: 'AU', vx: 'AU/yr', vy: 'AU/yr', vz: 'AU/yr', r: 'AU', speed: 'AU/yr', angular_momentum: 'AU²/yr', specific_energy: 'AU²/yr²', semi_major_axis: 'AU', eccentricity: 'dimensionless', orbital_period: 'yr', measured_period: 'yr' },
  'projectile-drag': { x: 'm', y: 'm', vx: 'm/s', vy: 'm/s', speed: 'm/s', accel_x: 'm/s²', accel_y: 'm/s²', drag_force: 'N', kinetic_energy: 'J', potential_energy: 'J', total_energy: 'J', range: 'm', max_altitude: 'm' },
  'lcr-circuit': { q_uC: 'µC', current_A: 'A', v_source: 'V', v_resistor: 'V', v_capacitor: 'V', v_inductor: 'V', power_W: 'W', energy_E_mJ: 'mJ', energy_B_mJ: 'mJ', total_energy_mJ: 'mJ', impedance_ohm: 'Ω', phase_deg: '°', f_resonance_Hz: 'Hz', quality_factor: 'dimensionless' },
  'standing-waves': { wave_speed: 'm/s', fundamental_freq_Hz: 'Hz', harmonic_freq_Hz: 'Hz', wavelength_m: 'm', wave_number_rad_m: 'rad/m', harmonic_mode: 'dimensionless', amplitude_cm: 'cm', kinetic_energy_mJ: 'mJ', potential_energy_mJ: 'mJ', total_energy_mJ: 'mJ', node_count: 'dimensionless', antinode_count: 'dimensionless' },
  'doppler-shift': { source_x: 'm', source_speed: 'm/s', mach_number: 'dimensionless', mach_angle_deg: '°', freq_emitted_Hz: 'Hz', freq_ahead_Hz: 'Hz', freq_behind_Hz: 'Hz', freq_receiver_Hz: 'Hz', wavelength_ahead_m: 'm', wavelength_behind_m: 'm' },
  'photoelectric-effect': { wavelength_nm: 'nm', intensity_pct: '%', work_function_eV: 'eV', applied_voltage_V: 'V', photon_energy_eV: 'eV', k_max_eV: 'eV', stopping_potential_V: 'V', v_max_km_s: 'km/s', photocurrent_uA: 'µA', saturation_uA: 'µA', is_emission: 'dimensionless', is_cutoff: 'dimensionless' },
  'carnot-cycle': { stage_index: 'dimensionless', pressure_kPa: 'kPa', pressure_atm: 'atm', volume_liters: 'L', temperature_K: 'K', entropy_J_K: 'J/K', work_net_J: 'J', heat_in_Qh_J: 'J', heat_out_Qc_J: 'J', efficiency_pct: '%' },
  'gauss-flux': { charge1_nC: 'nC', charge2_nC: 'nC', q_enclosed_nC: 'nC', flux_theoretical_N_m2_C: 'N·m²/C', flux_numerical_N_m2_C: 'N·m²/C', flux_error_pct: '%', q1_enclosed: 'dimensionless', q2_enclosed: 'dimensionless', surface_radius_m: 'm', surface_center_x: 'm', surface_center_y: 'm' },
  'conservation-momentum': { body1_x: 'm', body1_y: 'm', body2_x: 'm', body2_y: 'm', body1_vx: 'm/s', body1_vy: 'm/s', body2_vx: 'm/s', body2_vy: 'm/s', com_x: 'm', com_y: 'm', com_vx: 'm/s', com_vy: 'm/s', total_p_x: 'kg·m/s', total_p_y: 'kg·m/s', total_p_mag: 'kg·m/s', kinetic_energy_total_J: 'J', kinetic_energy_com_J: 'J', kinetic_energy_internal_J: 'J', collision_count: 'dimensionless', wall_contacts: 'dimensionless', is_isolated: 'dimensionless' },
  'rc-rl-circuits': { circuit_mode: 'dimensionless', tau_ms: 'ms', v_in: 'V', v_component: 'V', v_resistor: 'V', current_mA: 'mA', charge_uC: 'µC', stored_energy_mJ: 'mJ', heat_dissipated_mJ: 'mJ', relaxation_pct: '%' },
} satisfies Record<string, Record<string, string>>;

export interface SimulationRegistration<TParams = any, TState extends SimulationState = SimulationState> {
  id: string;
  title: string;
  discipline: string;
  curriculum: string;
  governingODE: string;
  formattedODE: string;
  description: string;
  mode: '3D' | '2D';
  createEngine: () => SimulationEngine<TParams, TState>;
  createRenderer: () => ViewportRenderer<TState>;
  defaultParams: TParams;
  paramDescriptors: ParameterDescriptor<number>[];
  /** Unit of every numeric telemetry channel this sandbox emits; checked against the engine. */
  telemetryUnits: Record<string, string>;
}

export const SIMULATION_CATALOG: Record<string, SimulationRegistration> = {
  'lorentz-force': {
    ...LORENTZ_METADATA,
    mode: '3D',
    telemetryUnits: TELEMETRY_UNITS['lorentz-force'],
    createEngine: () => new LorentzEngine(),
    createRenderer: () => new LorentzRenderer3D(),
    defaultParams: LORENTZ_DEFAULT_PARAMS,
    paramDescriptors: LORENTZ_PARAM_DESCRIPTORS,
  },
  'harmonic-oscillator': {
    ...OSCILLATOR_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['harmonic-oscillator'],
    createEngine: () => new OscillatorEngine(),
    createRenderer: () => new OscillatorRenderer2D(),
    defaultParams: OSCILLATOR_DEFAULT_PARAMS,
    paramDescriptors: OSCILLATOR_PARAM_DESCRIPTORS,
  },
  'lorenz-attractor': {
    ...LORENZ_METADATA,
    mode: '3D',
    telemetryUnits: TELEMETRY_UNITS['lorenz-attractor'],
    createEngine: () => new LorenzEngine(),
    createRenderer: () => new LorenzRenderer3D(),
    defaultParams: LORENZ_DEFAULT_PARAMS,
    paramDescriptors: LORENZ_PARAM_DESCRIPTORS,
  },
  'faraday-induction': {
    ...INDUCTION_METADATA,
    mode: '3D',
    telemetryUnits: TELEMETRY_UNITS['faraday-induction'],
    createEngine: () => new InductionEngine(),
    createRenderer: () => new InductionRenderer3D(),
    defaultParams: INDUCTION_DEFAULT_PARAMS,
    paramDescriptors: INDUCTION_PARAM_DESCRIPTORS,
  },
  'maxwell-boltzmann': {
    ...GAS_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['maxwell-boltzmann'],
    createEngine: () => new GasEngine(),
    createRenderer: () => new GasRenderer2D(),
    defaultParams: GAS_DEFAULT_PARAMS,
    paramDescriptors: GAS_PARAM_DESCRIPTORS,
  },
  'quantum-tunneling': {
    ...QUANTUM_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['quantum-tunneling'],
    createEngine: () => new QuantumEngine(),
    createRenderer: () => new QuantumRenderer2D(),
    defaultParams: QUANTUM_DEFAULT_PARAMS,
    paramDescriptors: QUANTUM_PARAM_DESCRIPTORS,
  },
  'wave-optics': {
    ...OPTICS_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['wave-optics'],
    createEngine: () => new OpticsEngine(),
    createRenderer: () => new OpticsRenderer2D(),
    defaultParams: OPTICS_DEFAULT_PARAMS,
    paramDescriptors: OPTICS_PARAM_DESCRIPTORS,
  },
  'kepler-orbits': {
    ...KEPLER_METADATA,
    mode: '3D',
    telemetryUnits: TELEMETRY_UNITS['kepler-orbits'],
    createEngine: () => new KeplerEngine(),
    createRenderer: () => new KeplerRenderer3D(),
    defaultParams: KEPLER_DEFAULT_PARAMS,
    paramDescriptors: KEPLER_PARAM_DESCRIPTORS,
  },
  'projectile-drag': {
    ...PROJECTILE_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['projectile-drag'],
    createEngine: () => new ProjectileEngine(),
    createRenderer: () => new ProjectileRenderer2D(),
    defaultParams: PROJECTILE_DEFAULT_PARAMS,
    paramDescriptors: PROJECTILE_PARAM_DESCRIPTORS,
  },
  'lcr-circuit': {
    ...LCR_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['lcr-circuit'],
    createEngine: () => new LcrEngine(),
    createRenderer: () => new LcrRenderer2D(),
    defaultParams: LCR_DEFAULT_PARAMS,
    paramDescriptors: LCR_PARAM_DESCRIPTORS,
  },
  'standing-waves': {
    ...STANDING_WAVES_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['standing-waves'],
    createEngine: () => new StandingWavesEngine(),
    createRenderer: () => new StandingWavesRenderer2D(),
    defaultParams: STANDING_WAVES_DEFAULT_PARAMS,
    paramDescriptors: STANDING_WAVES_PARAM_DESCRIPTORS,
  },
  'doppler-shift': {
    ...DOPPLER_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['doppler-shift'],
    createEngine: () => new DopplerEngine(),
    createRenderer: () => new DopplerRenderer2D(),
    defaultParams: DOPPLER_DEFAULT_PARAMS,
    paramDescriptors: DOPPLER_PARAM_DESCRIPTORS,
  },
  'photoelectric-effect': {
    ...PHOTOELECTRIC_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['photoelectric-effect'],
    createEngine: () => new PhotoelectricEngine(),
    createRenderer: () => new PhotoelectricRenderer2D(),
    defaultParams: PHOTOELECTRIC_DEFAULT_PARAMS,
    paramDescriptors: PHOTOELECTRIC_PARAM_DESCRIPTORS,
  },
  'carnot-cycle': {
    ...CARNOT_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['carnot-cycle'],
    createEngine: () => new CarnotEngine(),
    createRenderer: () => new CarnotRenderer2D(),
    defaultParams: CARNOT_DEFAULT_PARAMS,
    paramDescriptors: CARNOT_PARAM_DESCRIPTORS,
  },
  'gauss-flux': {
    ...GAUSS_METADATA,
    mode: '3D',
    telemetryUnits: TELEMETRY_UNITS['gauss-flux'],
    createEngine: () => new GaussEngine(),
    createRenderer: () => new GaussRenderer3D(),
    defaultParams: GAUSS_DEFAULT_PARAMS,
    paramDescriptors: GAUSS_PARAM_DESCRIPTORS,
  },
  'conservation-momentum': {
    ...MOMENTUM_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['conservation-momentum'],
    createEngine: () => new MomentumEngine(),
    createRenderer: () => new MomentumRenderer2D(),
    defaultParams: MOMENTUM_DEFAULT_PARAMS,
    paramDescriptors: MOMENTUM_PARAM_DESCRIPTORS,
  },
  'rc-rl-circuits': {
    ...TRANSIENT_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['rc-rl-circuits'],
    createEngine: () => new TransientEngine(),
    createRenderer: () => new TransientRenderer2D(),
    defaultParams: TRANSIENT_DEFAULT_PARAMS,
    paramDescriptors: TRANSIENT_PARAM_DESCRIPTORS,
  },
};

export type SimulationId = keyof typeof SIMULATION_CATALOG;
