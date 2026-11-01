import React, { useState } from 'react';
import { Compass, GitMerge, ArrowRight, Sparkles, Loader2, PlayCircle, CheckCircle } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { StudyPlaylist, PlaylistStep } from '../../knowledge/types';
import { globalKnowledgeGraph } from '../../knowledge/KnowledgeGraphClient';
import { generateCustomStudyPlaylist } from '../../ai/playlistGenerator';

export interface RoadmapDeckProps {
  currentSandboxId: string;
  hasApiKey: boolean;
  apiKey: string;
  onSelectSandbox: (sandboxId: string) => void;
  onApplyPreset: (sandboxId: string, params: Record<string, number>) => void;
}

export const RoadmapDeck: React.FC<RoadmapDeckProps> = React.memo(({
  currentSandboxId,
  hasApiKey,
  apiKey,
  onSelectSandbox,
  onApplyPreset,
}) => {
  const [activePlaylist, setActivePlaylist] = useState<StudyPlaylist | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [goalInput, setGoalInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Curated Preset Experiments
  const curatedPresets: Record<string, { label: string; desc: string; sandbox: string; params: Record<string, number> }[]> = {
    'harmonic-oscillator': [
      {
        label: 'Underdamped Spiral',
        desc: 'b = 0.3 << 2√(km). Phase portrait forms an inward spiral attractor.',
        sandbox: 'harmonic-oscillator',
        params: { damping: 0.3, springConstant: 5.0, mass: 1.0, drivingAmplitude: 0.0, initialDisplacement: 3.0 },
      },
      {
        label: 'Critical Damping Benchmark',
        desc: 'b = 2√(km) = 4.47. Fastest return to equilibrium without oscillating.',
        sandbox: 'harmonic-oscillator',
        params: { damping: 4.47, springConstant: 5.0, mass: 1.0, drivingAmplitude: 0.0, initialDisplacement: 3.0 },
      },
      {
        label: 'Resonance (Steady-State Orbit)',
        desc: 'Driven near natural frequency (ω ≈ 2.236 rad/s; amplitude peaks at ω_r = √(ω₀² − b²/2m²)).',
        sandbox: 'harmonic-oscillator',
        params: { damping: 0.3, springConstant: 5.0, mass: 1.0, drivingAmplitude: 3.0, drivingFrequency: 2.236, initialDisplacement: 0.5 },
      },
    ],
    'lorentz-force': [
      {
        label: 'Pure Cyclotron Orbit',
        desc: 'E = 0, Bz = 2.0 T. Centripetal circular motion with radius r = mv/(qB).',
        sandbox: 'lorentz-force',
        params: { charge: 1.0, mass: 1.0, magneticFieldZ: 2.0, electricFieldY: 0.0, initialSpeedX: 8.0, initialSpeedY: 0.0 },
      },
      {
        label: 'Velocity Selector Balance',
        desc: 'Electric and magnetic forces balance: v = Ey / Bz = 6.0 m/s.',
        sandbox: 'lorentz-force',
        params: { charge: 1.0, mass: 1.0, magneticFieldZ: 2.0, electricFieldY: 12.0, initialSpeedX: 6.0, initialSpeedY: 0.0 },
      },
      {
        label: 'Cycloidal Drift Trajectory',
        desc: 'Perpendicular fields cause net drift perpendicular to both E and B.',
        sandbox: 'lorentz-force',
        params: { charge: 1.0, mass: 1.0, magneticFieldZ: 2.0, electricFieldY: 8.0, initialSpeedX: 2.0, initialSpeedY: 0.0 },
      },
    ],
    'lorenz-attractor': [
      {
        label: 'Butterfly Strange Attractor',
        desc: 'ρ = 28 > 24.74. Deterministic chaos on a 3D fractal manifold.',
        sandbox: 'lorenz-attractor',
        params: { sigma: 10.0, rho: 28.0, beta: 2.6667, perturbation: 0.001 },
      },
      {
        label: 'Stable Spiral Sink (Pre-Chaos)',
        desc: 'ρ = 15 < 24.74. Trajectory spirals into fixed point attractors.',
        sandbox: 'lorenz-attractor',
        params: { sigma: 10.0, rho: 15.0, beta: 2.6667, perturbation: 0.001 },
      },
      {
        label: 'Butterfly Effect Sensitivity',
        desc: 'Twin trajectories with Δx0 = 10^-4 rapidly diverge in space.',
        sandbox: 'lorenz-attractor',
        params: { sigma: 10.0, rho: 28.0, beta: 2.6667, perturbation: 0.0001 },
      },
    ],
    'faraday-induction': [
      {
        label: 'Strong Lenz Eddy Braking',
        desc: 'R = 0.3 Ω, N = 350. Heavy eddy currents rapidly damp mechanical oscillation into heat.',
        sandbox: 'faraday-induction',
        params: { coilResistance: 0.3, turns: 350, magnetMoment: 12.0, springConstant: 15.0, mass: 0.8, mechDamping: 0.0, initialZ: 2.2 },
      },
      {
        label: 'Open-Circuit Free Oscillation',
        desc: 'R = 20.0 Ω, b = 0. Negligible induced current allows nearly undamped mechanical motion.',
        sandbox: 'faraday-induction',
        params: { coilResistance: 20.0, turns: 100, magnetMoment: 5.0, springConstant: 15.0, mass: 0.8, mechDamping: 0.0, initialZ: 2.2 },
      },
      {
        label: 'Standard Solenoid Benchmark',
        desc: 'R = 2.0 Ω, N = 200 turns. Classic AP Physics C / MIT 8.02 experimental regime.',
        sandbox: 'faraday-induction',
        params: { coilResistance: 2.0, turns: 200, magnetMoment: 8.0, springConstant: 15.0, mass: 0.8, mechDamping: 0.05, initialZ: 2.2 },
      },
    ],
    'maxwell-boltzmann': [
      {
        label: "Boyle's Law Isothermal Compression",
        desc: 'Compress piston from Lx=7.0m to 3.5m at T=300K; observe doubled wall pressure.',
        sandbox: 'maxwell-boltzmann',
        params: { temperature: 300, pistonX: 3.5, particleCount: 140, particleMass: 1.0 },
      },
      {
        label: 'High-Temperature Thermal Dispersion',
        desc: 'T = 750 K. Broad speed distribution with shifted high v_rms peak.',
        sandbox: 'maxwell-boltzmann',
        params: { temperature: 750, pistonX: 6.0, particleCount: 120, particleMass: 1.0 },
      },
      {
        label: 'Heavy Molecular Gas (m = 4.0 u)',
        desc: 'Heavier mass narrows the Maxwellian curve, shifting peak toward slower speeds.',
        sandbox: 'maxwell-boltzmann',
        params: { temperature: 300, pistonX: 6.0, particleCount: 120, particleMass: 4.0 },
      },
    ],
    'quantum-tunneling': [
      {
        label: 'Quantum Tunneling Benchmark (E < V0)',
        desc: 'E = 5 eV < V0 = 8 eV. Finite wavepacket penetrates the forbidden zone.',
        sandbox: 'quantum-tunneling',
        params: { particleEnergy: 5.0, barrierHeight: 8.0, barrierWidth: 1.0, packetSigma: 0.9, barrierPosition: 0.0, initialX: -5.0 },
      },
      {
        label: 'Thick Barrier Evanescent Suppression',
        desc: 'd = 2.0 nm, V0 = 12 eV. Demonstrates exponential attenuation T ∝ exp(-2κd).',
        sandbox: 'quantum-tunneling',
        params: { particleEnergy: 5.0, barrierHeight: 12.0, barrierWidth: 2.0, packetSigma: 0.9, barrierPosition: 0.0, initialX: -5.0 },
      },
      {
        label: 'Over-Barrier Transmission (E > V0)',
        desc: 'E = 9 eV > V0 = 4 eV. Observe quantum reflections even when energy exceeds the barrier!',
        sandbox: 'quantum-tunneling',
        params: { particleEnergy: 9.0, barrierHeight: 4.0, barrierWidth: 1.2, packetSigma: 0.9, barrierPosition: 0.0, initialX: -5.0 },
      },
    ],
    'wave-optics': [
      {
        label: "Young's Double-Slit (He-Ne 633nm)",
        desc: 'Classic interference: λ = 633 nm, d = 25 μm, L = 1.2 m. Measure fringe spacing Δy with caliper.',
        sandbox: 'wave-optics',
        params: { wavelength: 632.8, slitSeparation: 25.0, slitWidth: 6.0, slitCount: 2, screenDistance: 1.2 },
      },
      {
        label: 'Green Laser (532 nm) Comparison',
        desc: 'Shorter wavelength produces tighter fringe spacing (Δy ∝ λ). Observe visual green laser color.',
        sandbox: 'wave-optics',
        params: { wavelength: 532.0, slitSeparation: 25.0, slitWidth: 6.0, slitCount: 2, screenDistance: 1.2 },
      },
      {
        label: 'Diffraction Grating (N = 5 Slits)',
        desc: 'Multiple slits sharpen principal interference maxima into bright needles with sub-peaks.',
        sandbox: 'wave-optics',
        params: { wavelength: 632.8, slitSeparation: 20.0, slitWidth: 4.0, slitCount: 5, screenDistance: 1.2 },
      },
      {
        label: 'Single-Slit Diffraction Envelope',
        desc: 'd = 0. Pure single-slit diffraction with wide central maximum 2λL/a.',
        sandbox: 'wave-optics',
        params: { wavelength: 632.8, slitSeparation: 0.0, slitWidth: 12.0, slitCount: 1, screenDistance: 1.5 },
      },
    ],
    'kepler-orbits': [
      {
        label: 'Stable Circular Orbit (e = 0.00)',
        desc: 'v = √(GM/r₀) = 4.47 AU/yr at r₀ = 5.0 AU. Centripetal gravitational equilibrium.',
        sandbox: 'kepler-orbits',
        params: { centralMass: 100.0, gravitationalConstant: 1.0, initialRadius: 5.0, initialTangentialVelocity: 4.472, initialRadialVelocity: 0.0, orbitalInclination: 0.0 },
      },
      {
        label: 'Highly Elliptical Orbit (e = 0.65)',
        desc: 'v_t = 2.7 AU/yr < v_c. Observe dramatic speedup at perihelion (Kepler\'s 2nd Law).',
        sandbox: 'kepler-orbits',
        params: { centralMass: 100.0, gravitationalConstant: 1.0, initialRadius: 6.0, initialTangentialVelocity: 2.7, initialRadialVelocity: 0.0, orbitalInclination: 0.0 },
      },
      {
        label: 'Inclined 3D Orbit (i = 30°)',
        desc: 'Velocity out of the reference plane illustrates 3D angular momentum conservation.',
        sandbox: 'kepler-orbits',
        params: { centralMass: 100.0, gravitationalConstant: 1.0, initialRadius: 5.0, initialTangentialVelocity: 4.472, initialRadialVelocity: 0.0, orbitalInclination: 30.0 },
      },
      {
        label: 'Hyperbolic Escape Trajectory (e > 1)',
        desc: 'v_t = 7.0 AU/yr > v_esc = 6.32 AU/yr. Gravitational slingshot with positive specific energy.',
        sandbox: 'kepler-orbits',
        params: { centralMass: 100.0, gravitationalConstant: 1.0, initialRadius: 5.0, initialTangentialVelocity: 7.0, initialRadialVelocity: 0.0, orbitalInclination: 0.0 },
      },
    ],
    'projectile-drag': [
      {
        label: 'Ideal Vacuum Parabola (C_d = 0)',
        desc: 'Zero aerodynamic drag: trajectory follows exact symmetric parabola R = (v₀² sin 2θ) / g.',
        sandbox: 'projectile-drag',
        params: { launchSpeed: 35.0, launchAngle: 45.0, launchHeight: 0.0, mass: 1.0, dragCoefficient: 0.0, crossSectionArea: 0.03, airDensity: 0.0, gravity: 9.807 },
      },
      {
        label: 'Standard Atmospheric Flight (Earth)',
        desc: 'Realistic air drag compresses the descent trajectory, shortening range by ~35%.',
        sandbox: 'projectile-drag',
        params: { launchSpeed: 35.0, launchAngle: 45.0, launchHeight: 0.0, mass: 1.0, dragCoefficient: 0.47, crossSectionArea: 0.03, airDensity: 1.225, gravity: 9.807 },
      },
      {
        label: 'Optimal Drag Launch Angle (θ = 38°)',
        desc: 'With air resistance, the maximum range angle shifts lower from 45° to ~38°.',
        sandbox: 'projectile-drag',
        params: { launchSpeed: 45.0, launchAngle: 38.0, launchHeight: 0.0, mass: 1.0, dragCoefficient: 0.47, crossSectionArea: 0.03, airDensity: 1.225, gravity: 9.807 },
      },
      {
        label: 'Elevated Cliff Mortar Launch',
        desc: 'Starting altitude y0 = 30m; asymmetric downward plunge with terminal velocity approach.',
        sandbox: 'projectile-drag',
        params: { launchSpeed: 30.0, launchAngle: 30.0, launchHeight: 30.0, mass: 0.8, dragCoefficient: 0.5, crossSectionArea: 0.04, airDensity: 1.225, gravity: 9.807 },
      },
    ],
    'lcr-circuit': [
      {
        label: 'Pure Electrical Resonance (f = f₀)',
        desc: 'f = 159.15 Hz = 1/(2π√LC). XL = XC, net reactance X = 0, Z = R = 10 Ω, in-phase current (φ = 0°).',
        sandbox: 'lcr-circuit',
        params: { inductance: 50.0, capacitance: 20.0, resistance: 10.0, drivingVoltage: 12.0, drivingFrequency: 159.15, initialCharge: 0.0 },
      },
      {
        label: 'Inductive Lag Regime (f = 300 Hz)',
        desc: 'f > f₀: Inductor reactance dominates (XL > XC). Current waveform lags behind driving voltage (φ > 0).',
        sandbox: 'lcr-circuit',
        params: { inductance: 50.0, capacitance: 20.0, resistance: 10.0, drivingVoltage: 12.0, drivingFrequency: 300.0, initialCharge: 0.0 },
      },
      {
        label: 'Capacitive Lead Regime (f = 80 Hz)',
        desc: 'f < f₀: Capacitor reactance dominates (XC > XL). Current waveform leads driving voltage (φ < 0).',
        sandbox: 'lcr-circuit',
        params: { inductance: 50.0, capacitance: 20.0, resistance: 10.0, drivingVoltage: 12.0, drivingFrequency: 80.0, initialCharge: 0.0 },
      },
      {
        label: 'High-Q Sharp Bandpass (R = 2.0 Ω)',
        desc: 'Low resistance produces high quality factor Q = 25, creating massive current amplification at resonance.',
        sandbox: 'lcr-circuit',
        params: { inductance: 50.0, capacitance: 20.0, resistance: 2.0, drivingVoltage: 12.0, drivingFrequency: 159.15, initialCharge: 0.0 },
      },
    ],
    'standing-waves': [
      {
        label: 'Fundamental Mode (n = 1)',
        desc: 'Lowest resonant mode: λ = 2L = 4.0m. 2 end nodes and 1 central maximum antinode.',
        sandbox: 'standing-waves',
        params: { stringLength: 2.0, tension: 100.0, linearDensity: 2.5, harmonicMode: 1, amplitude: 10.0, harmonic2Amp: 0.0, harmonic3Amp: 0.0 },
      },
      {
        label: '2nd Harmonic (Octave n = 2)',
        desc: 'One stationary central node at x = 1.0m and two antinodes oscillating in anti-phase.',
        sandbox: 'standing-waves',
        params: { stringLength: 2.0, tension: 100.0, linearDensity: 2.5, harmonicMode: 2, amplitude: 8.0, harmonic2Amp: 0.0, harmonic3Amp: 0.0 },
      },
      {
        label: '3rd Harmonic Flute Mode (n = 3)',
        desc: 'Two internal nodes at x = 0.67m and 1.33m with λ = 1.33m (three antinodes).',
        sandbox: 'standing-waves',
        params: { stringLength: 2.0, tension: 100.0, linearDensity: 2.5, harmonicMode: 3, amplitude: 6.0, harmonic2Amp: 0.0, harmonic3Amp: 0.0 },
      },
      {
        label: 'High-Tension Speedup (T = 300 N)',
        desc: 'Increasing tension triples wave energy and accelerates propagation speed v = √(T/μ) to 346 m/s.',
        sandbox: 'standing-waves',
        params: { stringLength: 2.0, tension: 300.0, linearDensity: 2.5, harmonicMode: 2, amplitude: 8.0, harmonic2Amp: 0.0, harmonic3Amp: 0.0 },
      },
      {
        label: 'Multi-Harmonic Fourier Superposition',
        desc: 'Superposition of n=1, 2, and 3 produces asymmetric wave shapes illustrating acoustic timbre.',
        sandbox: 'standing-waves',
        params: { stringLength: 2.0, tension: 100.0, linearDensity: 2.5, harmonicMode: 1, amplitude: 8.0, harmonic2Amp: 4.0, harmonic3Amp: 2.5 },
      },
    ],
    'doppler-shift': [
      {
        label: 'Subsonic Jet Cruise (Mach 0.60)',
        desc: 'Wavefront compression ahead (λ\' compressed to 4m, pitch increases from 10 to 25 Hz) and stretching behind.',
        sandbox: 'doppler-shift',
        params: { waveSpeed: 100.0, sourceSpeed: 60.0, sourceFrequency: 10.0, receiverX: 80.0, receiverY: 0.0, receiverSpeed: 0.0 },
      },
      {
        label: 'Transonic Sound Barrier (Mach 1.0)',
        desc: 'Source matches wave speed vs = c = 100 m/s; wavefronts coalesce into a high-amplitude shock barrier.',
        sandbox: 'doppler-shift',
        params: { waveSpeed: 100.0, sourceSpeed: 100.0, sourceFrequency: 10.0, receiverX: 80.0, receiverY: 0.0, receiverSpeed: 0.0 },
      },
      {
        label: 'Supersonic Mach Cone (Mach 1.50)',
        desc: 'Emitter outruns wave propagation, generating a shock envelope cone with half-angle μ = arcsin(1/1.5) = 41.8°.',
        sandbox: 'doppler-shift',
        params: { waveSpeed: 100.0, sourceSpeed: 150.0, sourceFrequency: 10.0, receiverX: 80.0, receiverY: 0.0, receiverSpeed: 0.0 },
      },
      {
        label: 'Hypersonic Shockwave (Mach 2.0)',
        desc: 'vs = 200 m/s: Extreme wave envelope compression with narrow Mach cone μ = 30.0° and intense sonic boom wavefront piling.',
        sandbox: 'doppler-shift',
        params: { waveSpeed: 100.0, sourceSpeed: 200.0, sourceFrequency: 10.0, receiverX: 80.0, receiverY: 0.0, receiverSpeed: 0.0 },
      },
      {
        label: 'Oblique Observer Lateral Pass',
        desc: 'Detector placed off-axis at yr = 40m to experience continuous pitch slide f\'(t) as emitter sweeps past.',
        sandbox: 'doppler-shift',
        params: { waveSpeed: 100.0, sourceSpeed: 80.0, sourceFrequency: 10.0, receiverX: 0.0, receiverY: 40.0, receiverSpeed: 0.0 },
      },
    ],
    'photoelectric-effect': [
      {
        label: 'Potassium Target & Violet Light (λ = 400 nm)',
        desc: 'Photon energy E = 3.10 eV exceeds work function Φ = 2.30 eV. Photoelectrons emitted with K_max = 0.80 eV.',
        sandbox: 'photoelectric-effect',
        params: { wavelength: 400.0, intensity: 60.0, workFunction: 2.30, appliedVoltage: 0.0 },
      },
      {
        label: 'Stopping Potential Cutoff (V = -0.80 V)',
        desc: 'Opposing retarding voltage matches eV_stop = K_max. Zero photoelectrons reach anode; current drops strictly to 0 μA.',
        sandbox: 'photoelectric-effect',
        params: { wavelength: 400.0, intensity: 60.0, workFunction: 2.30, appliedVoltage: -0.80 },
      },
      {
        label: 'Classical Wave Failure: Red Light (λ = 680 nm)',
        desc: 'E = 1.82 eV < Φ = 2.30 eV. Even at 100% max intensity, zero electrons are emitted, disproving classical wave accumulation.',
        sandbox: 'photoelectric-effect',
        params: { wavelength: 680.0, intensity: 100.0, workFunction: 2.30, appliedVoltage: 0.0 },
      },
      {
        label: 'Ultraviolet on Zinc Metal (Φ = 4.30 eV)',
        desc: 'Deep UV light (λ = 250 nm, E = 4.96 eV) overcomes high work function to eject photoelectrons with K_max = 0.66 eV.',
        sandbox: 'photoelectric-effect',
        params: { wavelength: 250.0, intensity: 70.0, workFunction: 4.30, appliedVoltage: 0.0 },
      },
      {
        label: 'Accelerating Voltage & Saturation (V = +2.5 V)',
        desc: 'Positive collector voltage sweeps all liberated electrons across the vacuum gap, saturating photocurrent.',
        sandbox: 'photoelectric-effect',
        params: { wavelength: 400.0, intensity: 80.0, workFunction: 2.30, appliedVoltage: 2.5 },
      },
    ],
    'carnot-cycle': [
      {
        label: 'Standard Carnot Engine (η = 50.0%)',
        desc: 'Th = 600 K, Tc = 300 K. Maximum theoretical thermal efficiency exactly 1 - 300/600 = 50.0%.',
        sandbox: 'carnot-cycle',
        params: { th: 600.0, tc: 300.0, compressionRatio: 2.0, gasMoles: 1.0, gamma: 1.667, cycleSpeed: 1.0 },
      },
      {
        label: 'High-Temperature Super-Carnot (η = 68.8%)',
        desc: 'Furnace temperature Th = 800 K with cold sink Tc = 250 K achieves 68.8% efficiency, showing the Second Law drive for higher combustion heat.',
        sandbox: 'carnot-cycle',
        params: { th: 800.0, tc: 250.0, compressionRatio: 2.2, gasMoles: 1.0, gamma: 1.667, cycleSpeed: 1.0 },
      },
      {
        label: 'Cryogenic Sink Efficiency (η = 75.0%)',
        desc: 'Liquid nitrogen cold sink Tc = 150 K with Th = 600 K doubles work output and expands P-V cycle area.',
        sandbox: 'carnot-cycle',
        params: { th: 600.0, tc: 150.0, compressionRatio: 2.5, gasMoles: 1.0, gamma: 1.667, cycleSpeed: 1.0 },
      },
      {
        label: 'Narrow Spread OTEC Limit (η = 20.0%)',
        desc: 'Ocean Thermal Energy Conversion: Th = 375 K, Tc = 300 K. Narrow temperature delta fundamentally caps Carnot efficiency at 20%.',
        sandbox: 'carnot-cycle',
        params: { th: 375.0, tc: 300.0, compressionRatio: 1.5, gasMoles: 1.0, gamma: 1.667, cycleSpeed: 1.0 },
      },
      {
        label: 'Diatomic Air Working Fluid (γ = 1.40)',
        desc: 'Diatomic gas (γ = 7/5 = 1.40) exhibits milder adiabatic slopes than monatomic gas, altering cylinder expansion volumes.',
        sandbox: 'carnot-cycle',
        params: { th: 600.0, tc: 300.0, compressionRatio: 2.0, gasMoles: 1.0, gamma: 1.40, cycleSpeed: 1.0 },
      },
    ],
    'gauss-flux': [
      {
        label: 'Isolated Point Monopole (+2.0 nC)',
        desc: 'Spherical surface centered around a solitary positive charge demonstrates maximum radial outward flux Φ = q/ε₀.',
        sandbox: 'gauss-flux',
        params: { charge1: 2.0, charge2: 0.0, chargeSeparation: 2.0, surfaceRadius: 1.5, surfaceCenterX: -1.0, surfaceCenterY: 0.0, surfaceType: 0 },
      },
      {
        label: 'Electric Dipole Cancellation (Net 0 nC)',
        desc: 'Enclosing both +2 nC and -2 nC charges: inward flux exactly cancels outward flux, producing strictly zero net flux (Φ = 0).',
        sandbox: 'gauss-flux',
        params: { charge1: 2.0, charge2: -2.0, chargeSeparation: 2.0, surfaceRadius: 1.8, surfaceCenterX: 0.0, surfaceCenterY: 0.0, surfaceType: 0 },
      },
      {
        label: 'External Charge Neutrality (Outside)',
        desc: 'Translating the surface outside both charges (x = 3.0m): all entering field lines exit the other side, yielding net Φ = 0.',
        sandbox: 'gauss-flux',
        params: { charge1: 2.0, charge2: -2.0, chargeSeparation: 2.0, surfaceRadius: 1.2, surfaceCenterX: 2.8, surfaceCenterY: 0.0, surfaceType: 0 },
      },
      {
        label: 'Like-Charge Repulsion (+2 nC, +2 nC)',
        desc: 'Two positive charges enclosed simultaneously: net flux doubles to Q_enc = +4.0 nC with central field saddle point.',
        sandbox: 'gauss-flux',
        params: { charge1: 2.0, charge2: 2.0, chargeSeparation: 2.0, surfaceRadius: 1.8, surfaceCenterX: 0.0, surfaceCenterY: 0.0, surfaceType: 0 },
      },
      {
        label: 'Cylindrical Gaussian Surface',
        desc: 'Testing Gaussian cylinder geometry around positive source to observe geometric invariance of enclosed flux.',
        sandbox: 'gauss-flux',
        params: { charge1: 2.5, charge2: 0.0, chargeSeparation: 2.0, surfaceRadius: 1.4, surfaceCenterX: -1.0, surfaceCenterY: 0.0, surfaceType: 1 },
      },
    ],
    'conservation-momentum': [
      {
        label: 'Equal Mass Velocity Swap (e = 1.0)',
        desc: 'Identical 2.0 kg pucks in head-on elastic collision completely exchange velocities (v1 = 5 m/s, v2 = -3 m/s).',
        sandbox: 'conservation-momentum',
        params: { mass1: 2.0, mass2: 2.0, velocity1: 5.0, velocity2: -3.0, impactParameter: 0.0, restitution: 1.0 },
      },
      {
        label: 'Completely Inelastic Stick (e = 0.0)',
        desc: 'Bodies stick together post-impact. Maximum possible kinetic energy is dissipated, while V_cm remains strictly constant.',
        sandbox: 'conservation-momentum',
        params: { mass1: 3.0, mass2: 2.0, velocity1: 6.0, velocity2: 0.0, impactParameter: 0.0, restitution: 0.0 },
      },
      {
        label: '2D Glancing Scatter (b = 0.4 m)',
        desc: 'Off-axis impact parameter b = 0.4m deflects pucks at 90° angle in equal-mass elastic scattering.',
        sandbox: 'conservation-momentum',
        params: { mass1: 2.0, mass2: 2.0, velocity1: 6.0, velocity2: 0.0, impactParameter: 0.4, restitution: 1.0 },
      },
      {
        label: 'Heavy Projectile vs Light Target (m₁ = 8 kg)',
        desc: 'Heavy 8.0 kg projectile impacts stationary 1.0 kg target puck, propelling target forward at near 2x launch speed.',
        sandbox: 'conservation-momentum',
        params: { mass1: 8.0, mass2: 1.0, velocity1: 4.0, velocity2: 0.0, impactParameter: 0.0, restitution: 1.0 },
      },
      {
        label: 'Partial Restitution (e = 0.50)',
        desc: 'Semi-elastic collision dissipates half of internal kinetic energy while strictly conserving linear momentum P_total.',
        sandbox: 'conservation-momentum',
        params: { mass1: 2.0, mass2: 2.0, velocity1: 5.0, velocity2: -3.0, impactParameter: 0.2, restitution: 0.5 },
      },
    ],
    'rc-rl-circuits': [
      {
        label: 'Standard RC Charging (τ = 10 ms)',
        desc: 'R = 100 Ω, C = 100 μF yields time constant τ = 10 ms. Observe exponential voltage rise reaching 63.2% at t = τ.',
        sandbox: 'rc-rl-circuits',
        params: { circuitType: 0, resistance: 100.0, capacitance: 100.0, inductance: 100.0, sourceVoltage: 12.0, switchState: 1, squareWaveFreq: 2.0 },
      },
      {
        label: 'RC Discharging Relaxation',
        desc: 'Disconnect source to observe exponential decay VC(t) = V0·e^(-t/RC), dropping to 36.8% of initial value after one time constant.',
        sandbox: 'rc-rl-circuits',
        params: { circuitType: 0, resistance: 100.0, capacitance: 100.0, inductance: 100.0, sourceVoltage: 12.0, switchState: 0, squareWaveFreq: 0.0 },
      },
      {
        label: 'RL Inductive Energizing (τ = 1.0 ms)',
        desc: 'L = 100 mH, R = 100 Ω produces τ = 1.0 ms. Inductor generates strong initial back-EMF resisting rapid current change.',
        sandbox: 'rc-rl-circuits',
        params: { circuitType: 1, resistance: 100.0, capacitance: 100.0, inductance: 100.0, sourceVoltage: 12.0, switchState: 1, squareWaveFreq: 2.0 },
      },
      {
        label: 'High-Resistance Slow Relaxation (τ = 50 ms)',
        desc: 'Increasing resistance to 500 Ω stretches the RC charging curve across 250 ms (5τ) to reach 99.3% steady state.',
        sandbox: 'rc-rl-circuits',
        params: { circuitType: 0, resistance: 500.0, capacitance: 100.0, inductance: 100.0, sourceVoltage: 12.0, switchState: 1, squareWaveFreq: 1.0 },
      },
      {
        label: '50% Capacitive Energy Theorem',
        desc: 'Verifies the universal theorem: exactly 50% of energy supplied by the DC source is stored as ½CV², and 50% is lost as heat.',
        sandbox: 'rc-rl-circuits',
        params: { circuitType: 0, resistance: 200.0, capacitance: 200.0, inductance: 100.0, sourceVoltage: 15.0, switchState: 1, squareWaveFreq: 0.5 },
      },
    ],
  };

  const handleGeneratePlaylist = async () => {
    if (!goalInput.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);

    try {
      const playlist = await generateCustomStudyPlaylist({
        apiKey,
        studentGoal: goalInput.trim(),
      });
      setActivePlaylist(playlist);
      setActiveStepIndex(0);
      setGoalInput('');

      // Apply first step
      if (playlist.steps.length > 0) {
        const step = playlist.steps[0];
        onApplyPreset(step.sandbox_id, step.suggested_parameters);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate custom playlist.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectStep = (step: PlaylistStep) => {
    setActiveStepIndex(step.step_index);
    onApplyPreset(step.sandbox_id, step.suggested_parameters);
  };

  // Find active concept
  const activeConcepts = globalKnowledgeGraph
    .getAllConcepts()
    .filter((c) => c.sandbox_id === currentSandboxId);
  const primaryConcept = activeConcepts[0];
  const analogies = primaryConcept
    ? globalKnowledgeGraph.getAnalogousConcepts(primaryConcept.id)
    : [];

  return (
    <GlassPanel subtle className="w-full p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-2 text-ink">
          <Compass className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">Curriculum & Roadmap</h3>
        </div>
      </div>

      {/* Cross-Disciplinary Analogy Badge */}
      {analogies.length > 0 && (
        <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-2.5 text-[11px] flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-accent font-medium">
            <GitMerge className="w-3.5 h-3.5" />
            <span>Cross-Discipline Analogy:</span>
          </div>
          <p className="text-ink leading-relaxed text-[10px]">
            {analogies[0].explanation}
          </p>
          <button
            onClick={() => onSelectSandbox(analogies[0].concept.sandbox_id || 'harmonic-oscillator')}
            className="text-[10px] text-accent hover:text-accent flex items-center gap-1 mt-1 font-medium cursor-pointer"
          >
            <span>Compare with {analogies[0].concept.title}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Curated Presets */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-muted">Curated Lab Presets:</span>
        <div className="space-y-1.5">
          {curatedPresets[currentSandboxId]?.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onApplyPreset(preset.sandbox, preset.params)}
              className="w-full text-left p-2 rounded-xl bg-sunken hover:bg-sunken border border-line transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink group-hover:text-accent">
                  {preset.label}
                </span>
                <PlayCircle className="w-3.5 h-3.5 text-muted group-hover:text-accent" />
              </div>
              <p className="text-[10px] text-muted mt-0.5 leading-snug">{preset.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic AI Playlist Generator */}
      <div className="border-t border-line pt-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Dynamic Playlist Agent (Gemini)</span>
        </div>

        {activePlaylist ? (
          <div className="bg-sunken border border-indigo-500/30 rounded-xl p-2.5 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xs font-semibold text-accent">{activePlaylist.playlist_title}</h4>
                <p className="text-[10px] text-muted leading-snug mt-0.5">{activePlaylist.description}</p>
              </div>
              <button
                onClick={() => setActivePlaylist(null)}
                className="text-[10px] text-muted hover:text-ink cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="space-y-1.5 mt-1">
              {activePlaylist.steps.map((step) => (
                <button
                  key={step.step_index}
                  onClick={() => handleSelectStep(step)}
                  className={`w-full text-left p-2 rounded-lg text-[11px] transition-all cursor-pointer ${
                    activeStepIndex === step.step_index
                      ? 'bg-indigo-600/30 border border-indigo-500/50 text-ink'
                      : 'bg-sunken border border-line text-muted hover:text-ink'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {activeStepIndex === step.step_index ? (
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <span className="w-3 text-center text-[10px] text-muted">{step.step_index + 1}.</span>
                    )}
                    <span>{step.learning_objective}</span>
                  </div>
                  <p className="text-[10px] text-muted mt-1 pl-4.5 leading-snug">
                    🔬 {step.socratic_challenge}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder={hasApiKey ? 'E.g. I struggle with resonance vs damping...' : 'Add Gemini API key in AI Tutor...'}
              disabled={!hasApiKey || isGenerating}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGeneratePlaylist()}
              className="w-full bg-sunken border border-line rounded-xl px-2.5 py-1.5 text-[11px] text-ink placeholder-neutral-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
            <button
              onClick={handleGeneratePlaylist}
              disabled={!hasApiKey || !goalInput.trim() || isGenerating}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Traversing Knowledge Graph...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Custom Playlist</span>
                </>
              )}
            </button>
          </div>
        )}

        {error && <span className="text-[10px] text-rose-400">{error}</span>}
      </div>
    </GlassPanel>
  );
});
