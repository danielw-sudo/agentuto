import { ParameterDescriptor } from '../../../core/types/simulation';
import { OpticsParams } from './OpticsEngine';

export const OPTICS_METADATA = {
  id: 'wave-optics',
  title: 'Wave Optics: Interference & Diffraction',
  discipline: 'Physics',
  curriculum: 'AP Physics 2 / IB Physics HL / MIT 8.03',
  governingODE: 'I(\\theta) = I_0 \\left[\\frac{\\sin(\\beta)}{\\beta}\\right]^2 \\left[\\frac{\\sin(N\\alpha)}{N\\sin(\\alpha)}\\right]^2',
  formattedODE: 'I(y) = I_0 · sinc²(β) · [sin(Nα) / (N·sin α)]²',
  description:
    'Observe Young double-slit interference modulated by single-slit diffraction envelopes. Measure fringe spacing Δy = λL/d and verify the wave nature of light.',
};

export const OPTICS_DEFAULT_PARAMS: OpticsParams = {
  wavelength: 632.8,   // Red He-Ne laser (nm)
  slitSeparation: 25.0,// 25 μm
  slitWidth: 6.0,      // 6 μm
  slitCount: 2,        // Double slit
  screenDistance: 1.2, // 1.2 m
};

export const OPTICS_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'wavelength',
    label: 'Wavelength (λ)',
    unit: 'nm',
    min: 380,
    max: 750,
    step: 5,
    defaultValue: 632.8,
    description: 'Laser wavelength across the visible spectrum (violet ~400 nm to red ~700 nm). Changes laser beam color and fringe spacing.',
  },
  {
    id: 'slitSeparation',
    label: 'Slit Separation (d)',
    unit: 'μm',
    min: 0,
    max: 60,
    step: 1,
    defaultValue: 25.0,
    description: 'Center-to-center distance between slits. Set to 0 to observe pure single-slit diffraction. Larger separation narrows interference fringes.',
  },
  {
    id: 'slitWidth',
    label: 'Slit Aperture (a)',
    unit: 'μm',
    min: 2.0,
    max: 20.0,
    step: 0.5,
    defaultValue: 6.0,
    description: 'Width of each individual slit aperture. Controls the broader diffraction envelope that modulates the interference fringes.',
  },
  {
    id: 'slitCount',
    label: 'Number of Slits (N)',
    unit: 'slits',
    min: 1,
    max: 5,
    step: 1,
    defaultValue: 2,
    description: '1 = Single slit, 2 = Young double slit, 3-5 = Diffraction grating (sharpens principal interference maxima).',
  },
  {
    id: 'screenDistance',
    label: 'Screen Distance (L)',
    unit: 'm',
    min: 0.5,
    max: 2.5,
    step: 0.1,
    defaultValue: 1.2,
    description: 'Distance from the slit aperture barrier to the viewing screen. Magnifies the projected fringe pattern linearly.',
  },
];
