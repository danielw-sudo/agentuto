import { ParameterDescriptor } from '../../../core/types/simulation';
import { LorentzParams } from './LorentzEngine';

export const LORENTZ_METADATA = {
  id: 'lorentz-force',
  title: 'Lorentz Force in E & B Fields',
  discipline: 'Physics',
  curriculum: 'AP Physics C / IB Physics HL / MIT 8.02',
  governingODE: 'm\\frac{d\\vec{v}}{dt} = q(\\vec{E} + \\vec{v} \\times \\vec{B})',
  formattedODE: 'm·a = q(E + v × B)',
  description:
    'Observe the helical deflection and cyclotron motion of a charged particle in perpendicular electric and magnetic fields.',
};

export const LORENTZ_DEFAULT_PARAMS: LorentzParams = {
  charge: 1.0,
  mass: 1.0,
  magneticFieldZ: 2.0,
  electricFieldY: 0.0,
  initialSpeedX: 8.0,
  initialSpeedY: 0.0,
};

export const LORENTZ_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'charge',
    label: 'Charge (q)',
    unit: 'μC',
    min: -3.0,
    max: 3.0,
    step: 0.1,
    defaultValue: 1.0,
    description: 'Electric charge of the particle. Negative charges reverse the Lorentz deflection.',
  },
  {
    id: 'mass',
    label: 'Mass (m)',
    unit: 'mg',
    min: 0.2,
    max: 5.0,
    step: 0.1,
    defaultValue: 1.0,
    description: 'Inertial mass in milligrams (10^-6 kg). With charge in μC, ratio q/m is in exact SI C/kg.',
  },
  {
    id: 'magneticFieldZ',
    label: 'Magnetic Field (Bz)',
    unit: 'T',
    min: -5.0,
    max: 5.0,
    step: 0.2,
    defaultValue: 2.0,
    description: 'Out-of-plane magnetic field. Causes centripetal circular deflection.',
  },
  {
    id: 'electricFieldY',
    label: 'Electric Field (Ey)',
    unit: 'V/m',
    min: -15.0,
    max: 15.0,
    step: 0.5,
    defaultValue: 0.0,
    description: 'Uniform vertical electric field. Produces cycloidal drift velocity.',
  },
  {
    id: 'initialSpeedX',
    label: 'Initial Speed (v0x)',
    unit: 'm/s',
    min: 1.0,
    max: 20.0,
    step: 0.5,
    defaultValue: 8.0,
    description: 'Initial horizontal velocity component.',
  },
];
