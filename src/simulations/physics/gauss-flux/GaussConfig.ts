import { ParameterDescriptor } from '../../../core/types/simulation';

export interface GaussParams extends Record<string, number> {
  charge1: number;          // Primary charge q1 in nC (-5.0 to +5.0 nC)
  charge2: number;          // Secondary charge q2 in nC (-5.0 to +5.0 nC)
  chargeSeparation: number; // Distance between charges in meters (0.0 to 4.0 m)
  surfaceRadius: number;    // Radius / characteristic half-width of Gaussian surface (0.5 to 3.5 m)
  surfaceCenterX: number;   // X-position offset of Gaussian surface center (-3.0 to +3.0 m)
  surfaceCenterY: number;   // Y-position offset of Gaussian surface center (-2.0 to +2.0 m)
  surfaceType: number;      // 0: Sphere, 1: Cylinder, 2: Cube
}

export const GAUSS_DEFAULT_PARAMS: GaussParams = {
  charge1: 2.0,             // +2.0 nC (Source)
  charge2: -2.0,            // -2.0 nC (Sink: Dipole configuration)
  chargeSeparation: 2.0,    // 2.0 m apart
  surfaceRadius: 1.5,       // 1.5 m radius
  surfaceCenterX: 0.0,      // Centered between dipole
  surfaceCenterY: 0.0,
  surfaceType: 0,           // Sphere
};

export const GAUSS_METADATA = {
  id: 'gauss-flux',
  title: "Gauss's Law & Electrostatic Flux Symmetry",
  discipline: 'Physics',
  curriculum: 'MIT 8.02 Electricity and Magnetism',
  governingODE: '\\oint_{\\mathcal{S}} \\mathbf{E} \\cdot d\\mathbf{A} = \\frac{Q_{\\text{enc}}}{\\varepsilon_0}, \\quad \\mathbf{E}(\\mathbf{r}) = \\sum_k \\frac{q_k}{4\\pi\\varepsilon_0} \\frac{\\mathbf{r} - \\mathbf{r}_k}{\\|\\mathbf{r} - \\mathbf{r}_k\\|^3}',
  formattedODE: '∮ E · dA = Q_enc / ε₀,  E(r) = ∑ (ke · q_k / r_k²) r̂_k',
  description:
    'Carl Friedrich Gauss’s foundational field law: explore total electric flux through closed 3D Gaussian surfaces, numerical surface integration (∮ E·dA), enclosed charge invariance (Q_enc), dipole cancellation, and external charge flux neutrality.',
};

export const GAUSS_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'charge1',
    label: 'Primary Charge (q₁)',
    min: -5.0,
    max: 5.0,
    step: 0.5,
    defaultValue: 2.0,
    unit: 'nC',
    description: 'Magnitude and sign of the first point charge located at (-d/2, 0, 0).',
  },
  {
    id: 'charge2',
    label: 'Secondary Charge (q₂)',
    min: -5.0,
    max: 5.0,
    step: 0.5,
    defaultValue: -2.0,
    unit: 'nC',
    description: 'Magnitude and sign of the second point charge located at (+d/2, 0, 0). Equal and opposite charges form an electric dipole.',
  },
  {
    id: 'chargeSeparation',
    label: 'Charge Separation (d)',
    min: 0.0,
    max: 4.0,
    step: 0.2,
    defaultValue: 2.0,
    unit: 'm',
    description: 'Physical distance separating the two point charges along the x-axis.',
  },
  {
    id: 'surfaceRadius',
    label: 'Gaussian Surface Radius (R_G)',
    min: 0.5,
    max: 3.5,
    step: 0.1,
    defaultValue: 1.5,
    unit: 'm',
    description: 'Radius of the spherical or cylindrical Gaussian integration surface.',
  },
  {
    id: 'surfaceCenterX',
    label: 'Surface Center X (x_G)',
    min: -3.0,
    max: 3.0,
    step: 0.1,
    defaultValue: 0.0,
    unit: 'm',
    description: 'Horizontal translation of the closed Gaussian boundary. Move across charges to observe discrete flux jumps.',
  },
  {
    id: 'surfaceCenterY',
    label: 'Surface Center Y (y_G)',
    min: -2.0,
    max: 2.0,
    step: 0.1,
    defaultValue: 0.0,
    unit: 'm',
    description: 'Vertical translation of the Gaussian boundary.',
  },
  {
    id: 'surfaceType',
    label: 'Surface Topology',
    min: 0,
    max: 2,
    step: 1,
    defaultValue: 0,
    unit: 'type',
    description: 'Closed boundary geometry: 0 = Sphere, 1 = Cylinder, 2 = Cube.',
  },
];
