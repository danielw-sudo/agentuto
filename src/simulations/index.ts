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
}

export const SIMULATION_CATALOG: Record<string, SimulationRegistration> = {
  'lorentz-force': {
    ...LORENTZ_METADATA,
    mode: '3D',
    createEngine: () => new LorentzEngine(),
    createRenderer: () => new LorentzRenderer3D(),
    defaultParams: LORENTZ_DEFAULT_PARAMS,
    paramDescriptors: LORENTZ_PARAM_DESCRIPTORS,
  },
  'harmonic-oscillator': {
    ...OSCILLATOR_METADATA,
    mode: '2D',
    createEngine: () => new OscillatorEngine(),
    createRenderer: () => new OscillatorRenderer2D(),
    defaultParams: OSCILLATOR_DEFAULT_PARAMS,
    paramDescriptors: OSCILLATOR_PARAM_DESCRIPTORS,
  },
  'lorenz-attractor': {
    ...LORENZ_METADATA,
    mode: '3D',
    createEngine: () => new LorenzEngine(),
    createRenderer: () => new LorenzRenderer3D(),
    defaultParams: LORENZ_DEFAULT_PARAMS,
    paramDescriptors: LORENZ_PARAM_DESCRIPTORS,
  },
  'faraday-induction': {
    ...INDUCTION_METADATA,
    mode: '3D',
    createEngine: () => new InductionEngine(),
    createRenderer: () => new InductionRenderer3D(),
    defaultParams: INDUCTION_DEFAULT_PARAMS,
    paramDescriptors: INDUCTION_PARAM_DESCRIPTORS,
  },
  'maxwell-boltzmann': {
    ...GAS_METADATA,
    mode: '2D',
    createEngine: () => new GasEngine(),
    createRenderer: () => new GasRenderer2D(),
    defaultParams: GAS_DEFAULT_PARAMS,
    paramDescriptors: GAS_PARAM_DESCRIPTORS,
  },
  'quantum-tunneling': {
    ...QUANTUM_METADATA,
    mode: '2D',
    createEngine: () => new QuantumEngine(),
    createRenderer: () => new QuantumRenderer2D(),
    defaultParams: QUANTUM_DEFAULT_PARAMS,
    paramDescriptors: QUANTUM_PARAM_DESCRIPTORS,
  },
  'wave-optics': {
    ...OPTICS_METADATA,
    mode: '2D',
    createEngine: () => new OpticsEngine(),
    createRenderer: () => new OpticsRenderer2D(),
    defaultParams: OPTICS_DEFAULT_PARAMS,
    paramDescriptors: OPTICS_PARAM_DESCRIPTORS,
  },
  'kepler-orbits': {
    ...KEPLER_METADATA,
    mode: '3D',
    createEngine: () => new KeplerEngine(),
    createRenderer: () => new KeplerRenderer3D(),
    defaultParams: KEPLER_DEFAULT_PARAMS,
    paramDescriptors: KEPLER_PARAM_DESCRIPTORS,
  },
  'projectile-drag': {
    ...PROJECTILE_METADATA,
    mode: '2D',
    createEngine: () => new ProjectileEngine(),
    createRenderer: () => new ProjectileRenderer2D(),
    defaultParams: PROJECTILE_DEFAULT_PARAMS,
    paramDescriptors: PROJECTILE_PARAM_DESCRIPTORS,
  },
  'lcr-circuit': {
    ...LCR_METADATA,
    mode: '2D',
    createEngine: () => new LcrEngine(),
    createRenderer: () => new LcrRenderer2D(),
    defaultParams: LCR_DEFAULT_PARAMS,
    paramDescriptors: LCR_PARAM_DESCRIPTORS,
  },
  'standing-waves': {
    ...STANDING_WAVES_METADATA,
    mode: '2D',
    createEngine: () => new StandingWavesEngine(),
    createRenderer: () => new StandingWavesRenderer2D(),
    defaultParams: STANDING_WAVES_DEFAULT_PARAMS,
    paramDescriptors: STANDING_WAVES_PARAM_DESCRIPTORS,
  },
  'doppler-shift': {
    ...DOPPLER_METADATA,
    mode: '2D',
    createEngine: () => new DopplerEngine(),
    createRenderer: () => new DopplerRenderer2D(),
    defaultParams: DOPPLER_DEFAULT_PARAMS,
    paramDescriptors: DOPPLER_PARAM_DESCRIPTORS,
  },
  'photoelectric-effect': {
    ...PHOTOELECTRIC_METADATA,
    mode: '2D',
    createEngine: () => new PhotoelectricEngine(),
    createRenderer: () => new PhotoelectricRenderer2D(),
    defaultParams: PHOTOELECTRIC_DEFAULT_PARAMS,
    paramDescriptors: PHOTOELECTRIC_PARAM_DESCRIPTORS,
  },
  'carnot-cycle': {
    ...CARNOT_METADATA,
    mode: '2D',
    createEngine: () => new CarnotEngine(),
    createRenderer: () => new CarnotRenderer2D(),
    defaultParams: CARNOT_DEFAULT_PARAMS,
    paramDescriptors: CARNOT_PARAM_DESCRIPTORS,
  },
  'gauss-flux': {
    ...GAUSS_METADATA,
    mode: '3D',
    createEngine: () => new GaussEngine(),
    createRenderer: () => new GaussRenderer3D(),
    defaultParams: GAUSS_DEFAULT_PARAMS,
    paramDescriptors: GAUSS_PARAM_DESCRIPTORS,
  },
  'conservation-momentum': {
    ...MOMENTUM_METADATA,
    mode: '2D',
    createEngine: () => new MomentumEngine(),
    createRenderer: () => new MomentumRenderer2D(),
    defaultParams: MOMENTUM_DEFAULT_PARAMS,
    paramDescriptors: MOMENTUM_PARAM_DESCRIPTORS,
  },
  'rc-rl-circuits': {
    ...TRANSIENT_METADATA,
    mode: '2D',
    createEngine: () => new TransientEngine(),
    createRenderer: () => new TransientRenderer2D(),
    defaultParams: TRANSIENT_DEFAULT_PARAMS,
    paramDescriptors: TRANSIENT_PARAM_DESCRIPTORS,
  },
};

export type SimulationId = keyof typeof SIMULATION_CATALOG;
