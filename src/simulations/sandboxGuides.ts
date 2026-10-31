export interface SandboxGuideEntry {
  /** Short 3-step empirical measurement protocol shown in the right HUD dock */
  labProtocol: [string, string, string];
  /** Faculty-verified exploration notes shown in the in-app User Guide */
  whatToExplore: { title: string; detail: string }[];
  /** Socratic quick prompts for the optional AI tutor */
  quickPrompts: string[];
}

export const SANDBOX_LAB_GUIDES: Record<string, SandboxGuideEntry> = {
  'lorentz-force': {
    labProtocol: [
      'Set E_y = 0 and vary B_z or v_0x to observe circular cyclotron orbits.',
      'Record telemetry or use the Caliper to measure orbital radius r = mv/(qB).',
      'Set E_y = v_0x · B_z to verify undeflected velocity-selector equilibrium.',
    ],
    whatToExplore: [
      {
        title: 'Pure Cyclotron Orbits',
        detail: 'Set E_y = 0, B_z > 0. Verify that orbital radius satisfies r = mv/(qB) and magnetic fields do zero work (kinetic energy stays constant).',
      },
      {
        title: 'Velocity Selector Equilibrium',
        detail: 'Adjust E_y and B_z so that v_x = E_y / B_z. Electric and magnetic forces cancel, and the charge travels in a straight line undeflected.',
      },
      {
        title: 'Cycloidal Drift Trajectories',
        detail: 'Set E_y ≠ 0 with initial speed below or above E/B to observe trochoidal and cycloidal E × B drift.',
      },
    ],
    quickPrompts: [
      'Analyze my current trajectory',
      'Why does increasing Bz shrink the cyclotron radius?',
      'What happens if charge q is negative?',
      'Explain the velocity selector balance (v = E/B)',
    ],
  },
  'harmonic-oscillator': {
    labProtocol: [
      'Compare underdamped (b < 2√(km)), critical (b = 2√(km)), and overdamped regimes.',
      'Click Record during underdamped motion and open Lab Notebook to fit exponential amplitude decay.',
      'Enable driving force F₀ > 0 and sweep ω across ω₀ = √(k/m) to measure steady-state amplitude.',
    ],
    whatToExplore: [
      {
        title: 'Three Damping Regimes',
        detail: 'Underdamped: b < 2√(km) (decaying spiral). Critically damped: b = 2√(km) (fastest return without overshoot). Overdamped: b > 2√(km) (slow exponential return).',
      },
      {
        title: 'Driven Resonance & Phase Lag',
        detail: 'At ω = ω₀ the response lags the drive by π/2. With light damping, peak amplitude occurs slightly below ω₀ at ω_r = √(ω₀² − b²/2m²).',
      },
      {
        title: 'Phase Portrait (x vs. ẋ)',
        detail: 'Observe inward spirals for free damped motion and a closed steady-state elliptical orbit once a driven linear oscillator settles.',
      },
    ],
    quickPrompts: [
      'Analyze my current phase portrait (x vs ẋ)',
      'How do I achieve critical damping?',
      'Why does the amplitude peak slightly below ω₀ when damped?',
      'Where is kinetic energy maximum during the oscillation?',
    ],
  },
  'lorenz-attractor': {
    labProtocol: [
      'Set initial perturbation Δx₀ = 0.0001 and click Reset + Record.',
      'Open the Lab Notebook and plot t vs. divergence Δr during the early exponential growth phase.',
      'Run Exponential Regression (y = A·e^(Bx)) before saturation to estimate the Lyapunov exponent λ.',
    ],
    whatToExplore: [
      {
        title: 'Sensitive Dependence (Butterfly Effect)',
        detail: 'Twin trajectories separated by Δx₀ = 10⁻³ (or down to 10⁻⁴) evolve nearly identically before diverging exponentially onto opposite attractor lobes.',
      },
      {
        title: 'Rayleigh Bifurcation Threshold',
        detail: 'Compare ρ < 24.74 (trajectories spiral into stable fixed-point sinks) against ρ = 28 (chaotic strange attractor).',
      },
      {
        title: 'Lyapunov Exponent Fit Caveat',
        detail: 'Fit only the early exponential growth window in the Lab Notebook; once Δr reaches the attractor diameter, separation saturates.',
      },
    ],
    quickPrompts: [
      'Analyze the Butterfly strange attractor',
      'Why do the twin trajectories diverge exponentially?',
      'What happens when Rayleigh number rho < 1 vs rho > 24.74?',
      'How do I calculate the Lyapunov exponent from the early growth phase?',
    ],
  },
  'faraday-induction': {
    labProtocol: [
      'Release the oscillating bar magnet through the solenoid with low resistance R.',
      'Observe that induced EMF is zero at the coil center (z = 0) and peaks at the coil edges.',
      'Record telemetry and fit mechanical_energy vs. t in the Lab Notebook to measure Lenz damping.',
    ],
    whatToExplore: [
      {
        title: 'Lenz Eddy-Current Braking',
        detail: 'Lowering coil resistance R increases induced current I = ℰ/R, rapidly dissipating mechanical energy into Ohmic Joule heat (I²R).',
      },
      {
        title: 'Flux vs. EMF Phase Relationship',
        detail: 'Magnetic flux Φ_B is maximum at z = 0 where dΦ_B/dz = 0, so induced EMF vanishes at the center and peaks where the flux gradient is steepest.',
      },
    ],
    quickPrompts: [
      'Why does EMF equal zero at the coil center (z = 0) even when speed is highest?',
      'How does reducing coil resistance R affect the oscillation decay rate?',
      "Explain why Lenz's force always opposes the magnet velocity",
      'How does doubling the coil turns N change the induced current and braking?',
    ],
  },
  'maxwell-boltzmann': {
    labProtocol: [
      'Hold T constant and vary piston position L_x while recording empirical wall pressure P.',
      'Verify the 2D isothermal gas relation P · A = N k_B T in the Lab Notebook.',
      'Quadruple temperature T and verify that root-mean-square speed v_rms doubles (v_rms ∝ √T).',
    ],
    whatToExplore: [
      {
        title: '2D Ideal Gas Law & Boyle Compression',
        detail: 'In this 2D chamber, volume is box area A = L_x L_y and P · A = N k_B T. Halving piston width L_x at constant T doubles wall-impulse pressure.',
      },
      {
        title: '2D Maxwell Speed Distribution',
        detail: 'Elastic hard-sphere collisions relax speeds to f_2D(v) = (mv / k_B T) exp(−mv² / 2k_B T). Increasing T broadens the curve with v_rms ∝ √(T/m).',
      },
    ],
    quickPrompts: [
      "Why does compressing the piston increase wall collision pressure (Boyle's Law)?",
      'How does root-mean-square speed scale with absolute temperature (v_rms ∝ √T)?',
      'What microscopic mechanism causes speeds to relax to Maxwell-Boltzmann?',
      'How does increasing molecular mass m shift the peak of the speed distribution?',
    ],
  },
  'quantum-tunneling': {
    labProtocol: [
      'Set particle energy E = 5 eV below barrier height V₀ = 8 eV.',
      'Sweep barrier width d from 0.5 nm to 2.0 nm, recording transmission probability T after impact.',
      'Verify exponential attenuation T ∝ exp(−2κd) while total norm ∫|ψ|² dx stays 1.000000.',
    ],
    whatToExplore: [
      {
        title: 'Sub-Barrier Evanescent Tunneling (E < V₀)',
        detail: 'Classical particles reflect 100%, but the quantum wavefunction penetrates the forbidden region with exponential decay T ∝ exp(−2κd).',
      },
      {
        title: 'Over-Barrier Quantum Reflection (E > V₀)',
        detail: 'Set E > V₀ to observe partial wave reflection at the potential step discontinuity.',
      },
      {
        title: 'Unitarity Conservation',
        detail: 'Crank-Nicolson Cayley time evolution preserves total probability T + R + P_barrier = 1 to machine precision.',
      },
    ],
    quickPrompts: [
      'Why does a quantum particle penetrate the barrier even when E < V0?',
      'How does transmission probability decay as I increase barrier width d?',
      'Why is there partial reflection even when incident energy exceeds the barrier (E > V0)?',
      'Explain why the total norm ∫|ψ|² dx stays strictly 100% at all times (unitarity)',
    ],
  },
  'wave-optics': {
    labProtocol: [
      'Open the Virtual Caliper and measure the distance Δy between adjacent bright fringes on screen.',
      'Record telemetry while sweeping wavelength λ from 400 nm to 700 nm.',
      'Fit fringe_spacing_mm vs. wavelength_nm in the Lab Notebook to verify Δy = (L/d) · λ.',
    ],
    whatToExplore: [
      {
        title: 'Young Double-Slit Fringe Spacing',
        detail: 'Sweep laser wavelength from 380 nm (violet) to 750 nm (deep red) and verify Δy = λL/d.',
      },
      {
        title: 'Single-Slit Diffraction Envelope',
        detail: 'Adjust slit width a to see how the broad Fraunhofer sinc²(β) envelope modulates the rapid interference fringes.',
      },
      {
        title: 'Multi-Slit Diffraction Grating (N = 5)',
        detail: 'Increase slit count N to sharpen principal maxima into narrow bright peaks separated by N − 2 secondary sub-peaks.',
      },
    ],
    quickPrompts: [
      'Why does switching from red (633 nm) to violet (405 nm) laser compress the fringe spacing Δy?',
      'What is the physical meaning of the broad envelope modulating the rapid interference fringes?',
      'How can I use the Virtual Caliper on screen to determine the slit separation d experimentally?',
      'Why does increasing the number of slits N sharpen the principal maxima into fine peaks?',
    ],
  },
  'kepler-orbits': {
    labProtocol: [
      'Wait 1 full revolution for Measured T (2π orbit) to register on the telemetry card.',
      'Repeat across 3–4 initial radii r₀ or tangential speeds v_t, noting semi-major axis a and Measured T.',
      'Plot T² vs. a³ in a spreadsheet or Lab Notebook to verify Kepler’s 3rd Law slope 4π²/(GM).',
    ],
    whatToExplore: [
      {
        title: 'Conic Section Classification',
        detail: 'At initial radius r₀: v_t = √(GM/r₀) gives a circle (e = 0); v_t < √(2GM/r₀) gives an ellipse (ε < 0); v_t ≥ √(2GM/r₀) escapes on a parabola/hyperbola (ε ≥ 0).',
      },
      {
        title: 'Kepler’s 2nd Law (Equal Areas)',
        detail: 'Specific angular momentum h = |r × v| is conserved to 10⁻¹³, causing speed to peak at perihelion and slow at aphelion.',
      },
      {
        title: 'Independent Period Measurement (No Circularity)',
        detail: 'Use Measured T (from 2π orbital angle crossings) rather than Predicted T (computed from Kepler III) when testing T² ∝ a³.',
      },
    ],
    quickPrompts: [
      "Why does the planet accelerate at perihelion and decelerate at aphelion (Kepler's 2nd Law)?",
      'What initial tangential velocity v_t gives a perfectly circular orbit at r = 5 AU?',
      'How does total orbital energy ε distinguish bound ellipses (ε < 0) from escape hyperbolas (ε > 0)?',
      "Why must we use Measured T rather than Predicted T when testing Kepler's 3rd Law?",
    ],
  },
  'projectile-drag': {
    labProtocol: [
      'Compare the solid amber atmospheric trajectory against the dashed cyan vacuum parabola (C_d = 0).',
      'Sweep launch angle θ in 2° increments and record impact range x to find the drag-shifted optimum.',
      'Launch from height y₀ = 40 m with v₀ = 5 m/s to observe speed approaching terminal velocity v_term.',
    ],
    whatToExplore: [
      {
        title: 'Condition-Dependent Optimal Angle',
        detail: 'In vacuum, 45° maximizes ground-to-ground range. With quadratic drag, the optimum shifts lower depending on drag-to-weight ratio (~41° at defaults, ~35° at 80 m/s, ~25° for light fast projectiles).',
      },
      {
        title: 'Asymmetric Descent & Terminal Velocity',
        detail: 'Air resistance steepens the descent angle and caps vertical speed at v_term = √(2mg / C_d ρ A).',
      },
    ],
    quickPrompts: [
      'Why does air drag cause the projectile descent to be steeper than its ascent?',
      'How does aerodynamic drag shift the optimal launch angle below 45°?',
      'What is the formula for terminal velocity when aerodynamic drag balances gravity?',
      'How can I measure the percentage range reduction compared to vacuum?',
    ],
  },
  'lcr-circuit': {
    labProtocol: [
      'Sweep driving frequency f across resonant frequency f₀ = 1/(2π√LC) ≈ 159.2 Hz.',
      'Observe phase angle φ cross 0° and impedance collapse to Z = R at resonance.',
      'Lower resistance R to increase Quality Factor Q = (1/R)√(L/C) and sharpen the current peak.',
    ],
    whatToExplore: [
      {
        title: 'Electrical Resonance (X_L = X_C)',
        detail: 'At f = f₀, inductive reactance ωL cancels capacitive reactance 1/(ωC), leaving purely resistive impedance Z = R and zero phase shift (φ = 0°).',
      },
      {
        title: 'Capacitive Lead vs. Inductive Lag',
        detail: 'Below f₀ (X_C > X_L), current leads voltage (φ < 0°). Above f₀ (X_L > X_C), current lags voltage (φ > 0°).',
      },
    ],
    quickPrompts: [
      'Why does current reach maximum when driving frequency matches f₀ = 1/(2π√LC)?',
      'How does the phase angle φ between voltage and current switch from capacitive to inductive?',
      'Explain the mathematical isomorphism between this LCR circuit (L, R, 1/C) and the mechanical oscillator (m, b, k)',
      'Why does lowering resistance R make the resonance curve sharper and increase the Q factor?',
    ],
  },
  'standing-waves': {
    labProtocol: [
      'Select harmonic mode n = 1..6 and verify node positions where displacement y(x, t) ≡ 0.',
      'Vary tension T and linear density μ while recording wave_speed and harmonic_freq_Hz.',
      'Verify v = √(T/μ) and f_n = n·v/(2L) using linear regression in the Lab Notebook.',
    ],
    whatToExplore: [
      {
        title: 'Normal Modes & Stationary Nodes',
        detail: 'Counter-propagating waves interfere to form n antinodes and n + 1 nodes at fixed spatial intervals x = k·L/n.',
      },
      {
        title: 'Tension & Dispersion Scaling',
        detail: 'Quadrupling string tension T doubles wave propagation speed v = √(T/μ) and doubles all harmonic frequencies f_n.',
      },
    ],
    quickPrompts: [
      'Why does a standing wave remain stationary in space even though it is formed by traveling waves?',
      'How does increasing string tension T increase wave speed v = √(T/μ) and raise pitch?',
      'Why are stationary nodes located at exact integer fractions x = m·L/n while antinodes occur at half-integers?',
      'What happens to the total energy as it shifts between pure kinetic and pure elastic potential energy?',
    ],
  },
  'doppler-shift': {
    labProtocol: [
      'Set source speed v_s < c (subsonic) and record observed frequency f_receiver_Hz before and after transit.',
      'Compare measured ahead/behind frequencies against f′ = f₀ c / (c ∓ v_s).',
      'Increase v_s > c (supersonic) to observe the Mach shock cone with half-angle μ = arcsin(1/M).',
    ],
    whatToExplore: [
      {
        title: 'Subsonic Wavefront Compression (M < 1)',
        detail: 'Approaching motion compresses wavefront spacing λ_ahead = (c − v_s)/f₀, raising observed frequency.',
      },
      {
        title: 'Supersonic Mach Cone (M > 1)',
        detail: 'When v_s > c, expanding wavefronts form a coherent conical shock envelope at angle sin μ = c/v_s = 1/M.',
      },
    ],
    quickPrompts: [
      "Why does the observed frequency f' increase when the source moves toward the observer?",
      'How does the Mach cone angle μ relate to the ratio of wave speed c to source speed vs?',
      'What happens physically at Mach 1 (transonic) when source speed equals wave speed?',
      'Why does an off-axis observer at yr > 0 hear a continuously dropping pitch rather than a step change?',
    ],
  },
  'photoelectric-effect': {
    labProtocol: [
      'Select a metal work function Φ and sweep wavelength λ across the threshold cutoff λ_c = hc/Φ.',
      'Adjust retarding voltage to V = −V_stop until photocurrent drops to 0 μA.',
      'Record k_max_eV across several wavelengths and verify Einstein’s linear law K_max = hf − Φ.',
    ],
    whatToExplore: [
      {
        title: 'Frequency Cutoff Threshold',
        detail: 'When photon energy hf < Φ, zero photoelectrons are emitted even at 100% beam intensity.',
      },
      {
        title: 'Stopping Potential & Planck’s Constant',
        detail: 'Maximum kinetic energy K_max = eV_stop depends linearly on light frequency f with slope h, independent of intensity.',
      },
    ],
    quickPrompts: [
      'Why does light below threshold wavelength λ_c fail to emit photoelectrons even at 100% intensity?',
      'How does the stopping potential V_stop allow us to measure the Planck constant h empirically?',
      'Why is the relationship between stopping voltage V_stop and frequency f linear rather than quadratic?',
      'Why does increasing beam intensity increase saturation photocurrent without changing electron max kinetic energy?',
    ],
  },
  'carnot-cycle': {
    labProtocol: [
      'Observe the 4 reversible strokes on the synchronized P–V and T–S indicator diagrams.',
      'Vary hot and cold reservoir temperatures T_H and T_C and record thermal efficiency η.',
      'Verify η = 1 − T_C/T_H and confirm net cycle work matches the rectangular T–S loop area ΔT·ΔS.',
    ],
    whatToExplore: [
      {
        title: 'Dual P–V and T–S Indicator Planes',
        detail: 'Two isothermal strokes (constant T) and two adiabatic strokes (constant S) trace a curved loop in P–V space and an exact rectangle in T–S space.',
      },
      {
        title: 'Second Law Efficiency Bound & Clausius Integral',
        detail: 'Efficiency depends only on reservoir temperatures (η = 1 − T_C/T_H), while cyclic entropy change satisfies ∮ dQ_rev/T = 0.',
      },
    ],
    quickPrompts: [
      'Why is Carnot efficiency η = 1 - T_C/T_H the absolute upper bound for any heat engine?',
      'Why is the Carnot cycle an exact rectangle on the T-S plane, and what does its area represent?',
      'Explain why entropy change over one complete reversible cycle is zero: ∮ dQ/T = 0',
      'How does net work output relate to the enclosed loop area on the P-V indicator diagram?',
    ],
  },
  'gauss-flux': {
    labProtocol: [
      'Enclose a single point charge (q₂ = 0) and vary Gaussian surface radius R_G from 0.8 m to 2.5 m.',
      'Verify that numerical surface integral ∮ E·dA remains invariant and equals Q_enc/ε₀.',
      'Set an equal and opposite dipole (q₁ = +2 nC, q₂ = −2 nC) inside the surface to verify zero net flux.',
    ],
    whatToExplore: [
      {
        title: 'Surface Radius & Shape Invariance',
        detail: 'Switching between Sphere, Cylinder, and Box or changing R_G leaves net electric flux constant as long as enclosed charge Q_enc is unchanged.',
      },
      {
        title: 'Dipole Cancellation & External Charges',
        detail: 'Enclosing a neutral dipole or placing charges outside the Gaussian surface yields ∮ E·dA = 0 because inward and outward flux cancel.',
      },
    ],
    quickPrompts: [
      'Why is the net electric flux zero when a Gaussian surface encloses both charges of a dipole?',
      'Why does moving a Gaussian surface completely outside a charge produce zero net flux?',
      "How does Gauss's Law show that electric flux is independent of the surface radius or shape?",
      'What happens to the numerical surface integral ∮ E · dA when the surface intersects a point charge?',
    ],
  },
  'conservation-momentum': {
    labProtocol: [
      'Record collision telemetry before either puck touches the outer table boundary rails.',
      'Compare total momentum P_total and V_cm before and after collision for elastic (e = 1) and inelastic (e = 0) runs.',
      'Test the 2D Glancing Scatter preset (m₁ = m₂, v₂ = 0, e = 1) to observe 90° post-collision separation.',
    ],
    whatToExplore: [
      {
        title: 'Center-of-Mass Velocity Invariance (Isolated Regime)',
        detail: 'Prior to wall contact, total momentum P = m₁v₁ + m₂v₂ and V_cm remain invariant for any restitution e ∈ [0, 1].',
      },
      {
        title: 'Koenig Kinetic Energy Decomposition',
        detail: 'Total KE splits into K_cm = ½(m₁+m₂)V_cm² (conserved during collision) plus internal relative energy K_int (dissipated when e < 1).',
      },
      {
        title: 'Boundary Wall Caveat',
        detail: 'Table rails apply external impulse; once a puck contacts a wall, the two-puck system is no longer isolated and P_total shifts.',
      },
    ],
    quickPrompts: [
      'Why does total linear momentum P remain strictly constant even in completely inelastic collisions (e = 0)?',
      'Explain why the Center of Mass moves in a straight line at constant velocity V_cm before wall contact',
      'In an equal-mass 2D elastic collision with the target initially at rest, why is the scattering angle 90°?',
      "How does Koenig's theorem decompose total kinetic energy into CoM motion (K_cm) and relative internal motion (K_int)?",
    ],
  },
  'rc-rl-circuits': {
    labProtocol: [
      'Reset with Switch = Charge and click Record to capture the transient voltage/current relaxation.',
      'Verify that V_C(t) reaches 63.2% of V₀ at t = τ = RC (or I(t) reaches 63.2% at t = τ = L/R).',
      'Fit v_resistor vs. t in the Lab Notebook using Exponential Regression to extract slope −1/τ.',
    ],
    whatToExplore: [
      {
        title: 'The 63.2% Time-Constant Rule (1τ)',
        detail: 'After one time constant τ = RC (capacitive) or τ = L/R (inductive), the transient variable completes 1 − 1/e ≈ 63.21% of its step change.',
      },
      {
        title: '50% Capacitive Energy Theorem',
        detail: 'Charging an initially uncharged capacitor from a DC source stores ½CV₀² in the electric field and dissipates ½CV₀² as resistor heat, independent of R.',
      },
    ],
    quickPrompts: [
      'Why does the capacitor voltage reach 63.2% of V0 after one time constant τ = RC?',
      'Explain why 50% of source energy is dissipated as heat in an RC step-charging circuit regardless of R',
      'How does an inductor resist rapid current changes via Faraday back-EMF (VL = -L di/dt)?',
      'Compare the time constant of an RC circuit (τ = RC) with an RL circuit (τ = L/R): why is R in the denominator for RL?',
    ],
  },
};
