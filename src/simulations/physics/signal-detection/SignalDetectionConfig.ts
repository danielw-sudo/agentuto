import { ParameterDescriptor } from '../../../core/types/simulation';

export interface SignalDetectionParams extends Record<string, number> {
  dPrime: number;
  criterion: number;
  signalProbability: number;
  trialRate: number;
  seed: number;
}

export const SIGNAL_DETECTION_DEFAULT_PARAMS: SignalDetectionParams = {
  dPrime: 1.81,
  criterion: 0.52,
  signalProbability: 0.5,
  trialRate: 20,
  seed: 12345,
};

export const SIGNAL_DETECTION_METADATA = {
  id: 'signal-detection',
  title: 'Signal Detection Theory',
  discipline: 'Psychology',
  curriculum: 'MIT 9.00 Introduction to Psychology',
  governingODE: "d' = z(H) - z(FA), \\quad c = -z(FA), \\quad H = \\Phi(d' - c), \\quad FA = \\Phi(-c)",
  formattedODE: "d' = z(H) - z(FA),  c = -z(FA),  H = Φ(d' - c),  FA = Φ(-c)",
  description:
    "Psychophysics and classifier evaluation: separate sensory sensitivity (d') from decision bias or criterion (c). Run virtual yes/no detection trials under Gaussian noise and signal-plus-noise distributions, observe trial counts accumulate into hit and false-alarm rates, and trace empirical ROC curves against theoretical sensitivity contours.",
};

export const SIGNAL_DETECTION_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'dPrime',
    label: "Sensitivity (d')",
    min: 0.0,
    max: 4.0,
    step: 0.05,
    defaultValue: 1.81,
    unit: '',
    description: "Distance between noise and signal-plus-noise distribution means in standard deviation units.",
  },
  {
    id: 'criterion',
    label: 'Criterion (c)',
    min: -2.0,
    max: 3.0,
    step: 0.05,
    defaultValue: 0.52,
    unit: '',
    description: "Decision threshold relative to noise distribution mean. Evidence x > c prompts a 'yes' report.",
  },
  {
    id: 'signalProbability',
    label: 'Signal Probability',
    min: 0.1,
    max: 0.9,
    step: 0.05,
    defaultValue: 0.5,
    unit: '',
    description: 'Prior probability P(Signal) of presenting a signal trial rather than pure noise.',
  },
  {
    id: 'trialRate',
    label: 'Trial Rate',
    min: 1.0,
    max: 50.0,
    step: 1.0,
    defaultValue: 20.0,
    unit: '',
    description: 'Frequency of virtual detection trials presented per second.',
  },
  {
    id: 'seed',
    label: 'RNG Seed',
    min: 1.0,
    max: 1000000.0,
    step: 1.0,
    defaultValue: 12345.0,
    unit: '',
    description: 'Integer seed for reproducible pseudo-random number generation.',
  },
];
