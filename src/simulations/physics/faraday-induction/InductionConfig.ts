import { ParameterDescriptor } from '../../../core/types/simulation';
import { InductionParams } from './InductionEngine';

export const INDUCTION_METADATA = {
  id: 'faraday-induction',
  title: "Faraday's Law & Lenz's Induction",
  discipline: 'Physics',
  curriculum: 'AP Physics C / IB Physics HL / MIT 8.02',
  governingODE: '\\mathcal{E} = -\\frac{d\\Phi_B}{dt}, \\quad F_{\\text{Lenz}} = -\\frac{\\mathcal{E}^2}{R \\, v_z}',
  formattedODE: 'EMF = -dΦ/dt,  F_Lenz = -(dΦ/dz)²·v / R',
  description:
    "Observe magnetic flux change through a solenoid coil as a bar magnet oscillates. Verify Lenz's law opposing force and electromagnetic damping.",
};

export const INDUCTION_DEFAULT_PARAMS: InductionParams = {
  magnetMoment: 8.0,
  turns: 200,
  coilResistance: 2.0,
  springConstant: 15.0,
  mass: 0.8,
  mechDamping: 0.05,
  coilRadius: 0.6,
  initialZ: 2.2,
};

export const INDUCTION_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'magnetMoment',
    label: 'Dipole Moment (M)',
    unit: 'A·m²',
    min: 1.0,
    max: 20.0,
    step: 0.5,
    defaultValue: 8.0,
    description: 'Magnetic dipole strength of the bar magnet. Higher strength creates higher flux and induced EMF.',
  },
  {
    id: 'turns',
    label: 'Coil Turns (N)',
    unit: 'turns',
    min: 50,
    max: 500,
    step: 10,
    defaultValue: 200,
    description: 'Number of turns in the solenoid coil. Multiplies the total linked magnetic flux.',
  },
  {
    id: 'coilResistance',
    label: 'Coil Resistance (R)',
    unit: 'Ω',
    min: 0.2,
    max: 20.0,
    step: 0.2,
    defaultValue: 2.0,
    description: 'Electrical resistance of the coil. Lower resistance increases induced current and Lenz braking.',
  },
  {
    id: 'springConstant',
    label: 'Spring Constant (k)',
    unit: 'N/m',
    min: 5.0,
    max: 50.0,
    step: 1.0,
    defaultValue: 15.0,
    description: 'Stiffness of the suspension spring anchoring the magnet.',
  },
  {
    id: 'mass',
    label: 'Magnet Mass (m)',
    unit: 'kg',
    min: 0.2,
    max: 3.0,
    step: 0.1,
    defaultValue: 0.8,
    description: 'Inertial mass of the oscillating bar magnet.',
  },
  {
    id: 'mechDamping',
    label: 'Mechanical Friction (b)',
    unit: 'N·s/m',
    min: 0.0,
    max: 0.5,
    step: 0.01,
    defaultValue: 0.05,
    description: 'Viscous air friction on the magnet. Set to 0 to observe pure electromagnetic damping.',
  },
];
