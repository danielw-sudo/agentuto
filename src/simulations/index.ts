import { SimulationEngine, ViewportRenderer, ParameterDescriptor, SimulationState } from '../core/types/simulation';
import type { SandboxGuideEntry } from './sandboxGuides';
import { LORENTZ_METADATA, LORENTZ_DEFAULT_PARAMS, LORENTZ_PARAM_DESCRIPTORS } from './physics/lorentz-force/LorentzConfig';
import { OSCILLATOR_METADATA, OSCILLATOR_DEFAULT_PARAMS, OSCILLATOR_PARAM_DESCRIPTORS } from './physics/harmonic-oscillator/OscillatorConfig';
import { LORENZ_METADATA, LORENZ_DEFAULT_PARAMS, LORENZ_PARAM_DESCRIPTORS } from './physics/lorenz-attractor/LorenzConfig';
import { INDUCTION_METADATA, INDUCTION_DEFAULT_PARAMS, INDUCTION_PARAM_DESCRIPTORS } from './physics/faraday-induction/InductionConfig';
import { GAS_METADATA, GAS_DEFAULT_PARAMS, GAS_PARAM_DESCRIPTORS } from './physics/maxwell-boltzmann/GasConfig';
import { QUANTUM_METADATA, QUANTUM_DEFAULT_PARAMS, QUANTUM_PARAM_DESCRIPTORS } from './physics/quantum-tunneling/QuantumConfig';
import { OPTICS_METADATA, OPTICS_DEFAULT_PARAMS, OPTICS_PARAM_DESCRIPTORS } from './physics/wave-optics/OpticsConfig';
import { KEPLER_METADATA, KEPLER_DEFAULT_PARAMS, KEPLER_PARAM_DESCRIPTORS } from './physics/kepler-orbits/KeplerConfig';
import { PROJECTILE_METADATA, PROJECTILE_DEFAULT_PARAMS, PROJECTILE_PARAM_DESCRIPTORS } from './physics/projectile-drag/ProjectileConfig';
import { LCR_METADATA, LCR_DEFAULT_PARAMS, LCR_PARAM_DESCRIPTORS } from './physics/lcr-circuit/LcrConfig';
import { STANDING_WAVES_METADATA, STANDING_WAVES_DEFAULT_PARAMS, STANDING_WAVES_PARAM_DESCRIPTORS } from './physics/standing-waves/StandingWavesConfig';
import { DOPPLER_METADATA, DOPPLER_DEFAULT_PARAMS, DOPPLER_PARAM_DESCRIPTORS } from './physics/doppler-shift/DopplerConfig';
import { PHOTOELECTRIC_METADATA, PHOTOELECTRIC_DEFAULT_PARAMS, PHOTOELECTRIC_PARAM_DESCRIPTORS } from './physics/photoelectric-effect/PhotoelectricConfig';
import { CARNOT_METADATA, CARNOT_DEFAULT_PARAMS, CARNOT_PARAM_DESCRIPTORS } from './physics/carnot-cycle/CarnotConfig';
import { GAUSS_METADATA, GAUSS_DEFAULT_PARAMS, GAUSS_PARAM_DESCRIPTORS } from './physics/gauss-flux/GaussConfig';
import { MOMENTUM_METADATA, MOMENTUM_DEFAULT_PARAMS, MOMENTUM_PARAM_DESCRIPTORS } from './physics/conservation-momentum/MomentumConfig';
import { TRANSIENT_METADATA, TRANSIENT_DEFAULT_PARAMS, TRANSIENT_PARAM_DESCRIPTORS } from './physics/rc-rl-circuits/TransientConfig';

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
  'lorentz-force': { x: 'm', y: 'm', z: 'm', vx: 'm/s', vy: 'm/s', vz: 'm/s', speed: 'm/s', kinetic_energy: 'µJ', B_z: 'T', E_y: 'V/m' },
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

/** What a sandbox needs to run. Loaded on demand, so the heavy engine and renderer code is not part of the first page. */
export interface SimulationRuntime<TParams = any, TState extends SimulationState = SimulationState> {
  createEngine: () => SimulationEngine<TParams, TState>;
  createRenderer: () => ViewportRenderer<TState>;
}

/**
 * One sandbox's manifest entry. Everything a catalogue, a course page, a search index or the journal needs
 * is plain data here and is available at once. The engine and renderer are not: `load()` fetches them
 * when a learner opens the sandbox.
 */
/**
 * A result worked out by hand that the module checker holds an engine to: run for `time` seconds from the
 * default parameters (or `params` laid over them) and each `expected` channel must match within `tolerance`
 * (relative, default 1e-6). It is only as good as the calculation behind it, so it must not be read off the engine.
 */
export interface ModuleBenchmark {
  time: number;
  expected: Record<string, number>;
  params?: Record<string, number>;
  tolerance?: number;
}

export interface SimulationRegistration<TParams = any, TState extends SimulationState = SimulationState> {
  id: string;
  title: string;
  discipline: string;
  curriculum: string;
  governingODE: string;
  formattedODE: string;
  description: string;
  mode: '3D' | '2D';
  load: () => Promise<SimulationRuntime<TParams, TState>>;
  defaultParams: TParams;
  paramDescriptors: ParameterDescriptor<number>[];
  /** Unit of every numeric telemetry channel this sandbox emits; checked against the engine. */
  telemetryUnits: Record<string, string>;
  /** True for a private module read from `local/`: never reviewed, shown as such, never part of the public build. */
  local?: boolean;
  /** Optional worked result for `npm run check:module`; see {@link ModuleBenchmark}. */
  benchmark?: ModuleBenchmark;
  /**
   * The three-step lab protocol, what to explore and the tutor's quick prompts. Optional for a private module;
   * required to share one. Built-in instruments still keep theirs in `sandboxGuides.ts`; use `guideOf()`.
   */
  guide?: SandboxGuideEntry;
}

export const SIMULATION_CATALOG: Record<string, SimulationRegistration> = {
  'lorentz-force': {
    ...LORENTZ_METADATA,
    mode: '3D',
    telemetryUnits: TELEMETRY_UNITS['lorentz-force'],
    defaultParams: LORENTZ_DEFAULT_PARAMS,
    paramDescriptors: LORENTZ_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/lorentz-force').then((m) => ({
        createEngine: () => new m.LorentzEngine(),
        createRenderer: () => new m.LorentzRenderer3D(),
      })),
  },
  'harmonic-oscillator': {
    ...OSCILLATOR_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['harmonic-oscillator'],
    defaultParams: OSCILLATOR_DEFAULT_PARAMS,
    paramDescriptors: OSCILLATOR_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/harmonic-oscillator').then((m) => ({
        createEngine: () => new m.OscillatorEngine(),
        createRenderer: () => new m.OscillatorRenderer2D(),
      })),
  },
  'lorenz-attractor': {
    ...LORENZ_METADATA,
    mode: '3D',
    telemetryUnits: TELEMETRY_UNITS['lorenz-attractor'],
    defaultParams: LORENZ_DEFAULT_PARAMS,
    paramDescriptors: LORENZ_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/lorenz-attractor').then((m) => ({
        createEngine: () => new m.LorenzEngine(),
        createRenderer: () => new m.LorenzRenderer3D(),
      })),
  },
  'faraday-induction': {
    ...INDUCTION_METADATA,
    mode: '3D',
    telemetryUnits: TELEMETRY_UNITS['faraday-induction'],
    defaultParams: INDUCTION_DEFAULT_PARAMS,
    paramDescriptors: INDUCTION_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/faraday-induction').then((m) => ({
        createEngine: () => new m.InductionEngine(),
        createRenderer: () => new m.InductionRenderer3D(),
      })),
  },
  'maxwell-boltzmann': {
    ...GAS_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['maxwell-boltzmann'],
    defaultParams: GAS_DEFAULT_PARAMS,
    paramDescriptors: GAS_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/maxwell-boltzmann').then((m) => ({
        createEngine: () => new m.GasEngine(),
        createRenderer: () => new m.GasRenderer2D(),
      })),
  },
  'quantum-tunneling': {
    ...QUANTUM_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['quantum-tunneling'],
    defaultParams: QUANTUM_DEFAULT_PARAMS,
    paramDescriptors: QUANTUM_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/quantum-tunneling').then((m) => ({
        createEngine: () => new m.QuantumEngine(),
        createRenderer: () => new m.QuantumRenderer2D(),
      })),
  },
  'wave-optics': {
    ...OPTICS_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['wave-optics'],
    defaultParams: OPTICS_DEFAULT_PARAMS,
    paramDescriptors: OPTICS_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/wave-optics').then((m) => ({
        createEngine: () => new m.OpticsEngine(),
        createRenderer: () => new m.OpticsRenderer2D(),
      })),
  },
  'kepler-orbits': {
    ...KEPLER_METADATA,
    mode: '3D',
    telemetryUnits: TELEMETRY_UNITS['kepler-orbits'],
    defaultParams: KEPLER_DEFAULT_PARAMS,
    paramDescriptors: KEPLER_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/kepler-orbits').then((m) => ({
        createEngine: () => new m.KeplerEngine(),
        createRenderer: () => new m.KeplerRenderer3D(),
      })),
  },
  'projectile-drag': {
    ...PROJECTILE_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['projectile-drag'],
    defaultParams: PROJECTILE_DEFAULT_PARAMS,
    paramDescriptors: PROJECTILE_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/projectile-drag').then((m) => ({
        createEngine: () => new m.ProjectileEngine(),
        createRenderer: () => new m.ProjectileRenderer2D(),
      })),
  },
  'lcr-circuit': {
    ...LCR_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['lcr-circuit'],
    defaultParams: LCR_DEFAULT_PARAMS,
    paramDescriptors: LCR_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/lcr-circuit').then((m) => ({
        createEngine: () => new m.LcrEngine(),
        createRenderer: () => new m.LcrRenderer2D(),
      })),
  },
  'standing-waves': {
    ...STANDING_WAVES_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['standing-waves'],
    defaultParams: STANDING_WAVES_DEFAULT_PARAMS,
    paramDescriptors: STANDING_WAVES_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/standing-waves').then((m) => ({
        createEngine: () => new m.StandingWavesEngine(),
        createRenderer: () => new m.StandingWavesRenderer2D(),
      })),
  },
  'doppler-shift': {
    ...DOPPLER_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['doppler-shift'],
    defaultParams: DOPPLER_DEFAULT_PARAMS,
    paramDescriptors: DOPPLER_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/doppler-shift').then((m) => ({
        createEngine: () => new m.DopplerEngine(),
        createRenderer: () => new m.DopplerRenderer2D(),
      })),
  },
  'photoelectric-effect': {
    ...PHOTOELECTRIC_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['photoelectric-effect'],
    defaultParams: PHOTOELECTRIC_DEFAULT_PARAMS,
    paramDescriptors: PHOTOELECTRIC_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/photoelectric-effect').then((m) => ({
        createEngine: () => new m.PhotoelectricEngine(),
        createRenderer: () => new m.PhotoelectricRenderer2D(),
      })),
  },
  'carnot-cycle': {
    ...CARNOT_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['carnot-cycle'],
    defaultParams: CARNOT_DEFAULT_PARAMS,
    paramDescriptors: CARNOT_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/carnot-cycle').then((m) => ({
        createEngine: () => new m.CarnotEngine(),
        createRenderer: () => new m.CarnotRenderer2D(),
      })),
  },
  'gauss-flux': {
    ...GAUSS_METADATA,
    mode: '3D',
    telemetryUnits: TELEMETRY_UNITS['gauss-flux'],
    defaultParams: GAUSS_DEFAULT_PARAMS,
    paramDescriptors: GAUSS_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/gauss-flux').then((m) => ({
        createEngine: () => new m.GaussEngine(),
        createRenderer: () => new m.GaussRenderer3D(),
      })),
  },
  'conservation-momentum': {
    ...MOMENTUM_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['conservation-momentum'],
    defaultParams: MOMENTUM_DEFAULT_PARAMS,
    paramDescriptors: MOMENTUM_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/conservation-momentum').then((m) => ({
        createEngine: () => new m.MomentumEngine(),
        createRenderer: () => new m.MomentumRenderer2D(),
      })),
  },
  'rc-rl-circuits': {
    ...TRANSIENT_METADATA,
    mode: '2D',
    telemetryUnits: TELEMETRY_UNITS['rc-rl-circuits'],
    defaultParams: TRANSIENT_DEFAULT_PARAMS,
    paramDescriptors: TRANSIENT_PARAM_DESCRIPTORS,
    load: () =>
      import('./physics/rc-rl-circuits').then((m) => ({
        createEngine: () => new m.TransientEngine(),
        createRenderer: () => new m.TransientRenderer2D(),
      })),
  },
};

export type SimulationId = keyof typeof SIMULATION_CATALOG;
