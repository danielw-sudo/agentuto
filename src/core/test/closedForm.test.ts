import { SIMULATION_CATALOG } from '../../simulations';

/**
 * Independent closed-form checks, one per instrument (Constitution Art. 1.5; roadmap R6).
 *
 * The rule: a check must fail when the physics is wrong, so the expected values here are worked out from the
 * textbook formula, with constants written out below, and never read from the engine's own constants, helpers
 * or integration path. The engine is reached only through the registry (`load()`, then the eight-method
 * contract), at the 200 Hz step the app uses, and always with parameters that are NOT the defaults, so a
 * formula that only happens to fit the defaults is caught too.
 *
 * Each case lists what it compares and the tolerance it needs. A tolerance is the integrator's own error at
 * 200 Hz (fourth order or better: 1e-6 or tighter) unless the line says it is statistical or a discretised
 * grid.
 */

// Physical constants, CODATA 2018 (exact where the SI defines them). Deliberately not imported.
const PLANCK = 6.62607015e-34; // J·s
const SPEED_OF_LIGHT = 299792458; // m/s
const ELEMENTARY_CHARGE = 1.602176634e-19; // C
const ELECTRON_MASS = 9.1093837015e-31; // kg
const BOLTZMANN = 1.380649e-23; // J/K
const GAS_CONSTANT = 8.314462618; // J/(mol·K)
const EPSILON_0 = 8.8541878128e-12; // F/m
const MU_0 = 4e-7 * Math.PI; // H/m (real vacuum)
const MU_EFFECTIVE = 1e-3; // T·m/A: the engine's own stated scaling for a visible demonstration (not the real μ0)

const DT = 0.005; // the app's 200 Hz step

type Channels = Record<string, number>;
interface Run {
  t: Channels;
  state: any;
  engine: any;
}

async function run(id: string, overrides: Record<string, number>, seconds: number): Promise<Run> {
  const registration = SIMULATION_CATALOG[id];
  const engine: any = (await registration.load()).createEngine();
  engine.init({ ...registration.defaultParams, ...overrides });
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i += 1) engine.step(DT);
  return { t: engine.getTelemetrySnapshot() as Channels, state: engine.getState(), engine };
}

class Report {
  readonly misses: string[] = [];
  constructor(private readonly id: string) {}
  /** Relative tolerance, with an absolute floor for values near zero. */
  near(what: string, got: number, want: number, rel: number, abs = 0): void {
    const tolerance = Math.max(Math.abs(want) * rel, abs);
    if (!Number.isFinite(got) || !(Math.abs(got - want) <= tolerance)) {
      this.misses.push(`${what}: the engine gives ${got}, the closed form gives ${want} (tolerance ${tolerance.toExponential(2)})`);
    }
  }
  fail(message: string): void {
    this.misses.push(message);
  }
  done(): void {
    if (this.misses.length > 0) {
      throw new Error(`${this.id} does not agree with its closed form:\n  - ${this.misses.join('\n  - ')}`);
    }
  }
}

type Case = (r: Report) => Promise<void>;

const CASES: Record<string, Case> = {
  // q/m = 3 (µC per mg is 1 in SI), B = 3 T, so ω = 9 rad/s; E×B drift = E/B = 2 m/s along +x.
  // Velocity relative to the drift rotates at ω: v = v_d + (v0 − v_d)(cos ωt, −sin ωt).
  async 'lorentz-force'(r) {
    const q = 1.5e-6, m = 0.5e-6, B = 3, E = 6, v0 = 8;
    const w = (q / m) * B;
    const drift = E / B;
    const t = 2;
    const { t: s } = await run('lorentz-force', { charge: 1.5, mass: 0.5, magneticFieldZ: B, electricFieldY: E, initialSpeedX: v0 }, t);
    const u0 = v0 - drift;
    r.near('vx', s.vx, drift + u0 * Math.cos(w * t), 1e-6, 1e-8);
    r.near('vy', s.vy, -u0 * Math.sin(w * t), 1e-6, 1e-8);
    r.near('x', s.x, drift * t + (u0 / w) * Math.sin(w * t), 1e-6, 1e-8);
    r.near('y', s.y, (u0 / w) * (Math.cos(w * t) - 1), 1e-5, 1e-8); // RK4 at 200 Hz over 18 rad of phase
    // Kinetic energy is ½ m v² with m in kilograms; the channel is read in whatever unit the manifest declares for it.
    const unit = SIMULATION_CATALOG['lorentz-force'].telemetryUnits.kinetic_energy;
    const perJoule: Record<string, number> = { J: 1, 'mJ': 1e3, 'µJ': 1e6 };
    if (!(unit in perJoule)) r.fail('kinetic_energy is declared in ' + unit + ', which this check cannot convert');
    const speed2 = (drift + u0 * Math.cos(w * t)) ** 2 + (u0 * Math.sin(w * t)) ** 2;
    r.near('kinetic_energy (' + unit + ')', s.kinetic_energy, 0.5 * m * speed2 * (perJoule[unit] ?? 1), 1e-5);
  },

  // Damped free decay x = x0 e^{-γt}(cos ω_d t + (γ/ω_d) sin ω_d t) and the driven steady state x = A cos(ωt − δ).
  async 'harmonic-oscillator'(r) {
    const k = 7, b = 0.6, m = 1.4, x0 = 3;
    const gamma = b / (2 * m);
    const wd = Math.sqrt(k / m - gamma * gamma);
    const t = 3;
    const free = await run('harmonic-oscillator', { springConstant: k, damping: b, mass: m, initialDisplacement: x0, drivingAmplitude: 0 }, t);
    r.near('free x(3 s)', free.t.x, x0 * Math.exp(-gamma * t) * (Math.cos(wd * t) + (gamma / wd) * Math.sin(wd * t)), 1e-6, 1e-9);
    r.near('free v(3 s)', free.t.v, -x0 * ((k / m) / wd) * Math.exp(-gamma * t) * Math.sin(wd * t), 1e-6, 1e-9);

    const F0 = 3, w = 2.5, bd = 2, tEnd = 40;
    const A = F0 / Math.hypot(k - m * w * w, bd * w);
    const delta = Math.atan2(bd * w, k - m * w * w);
    const driven = await run('harmonic-oscillator', { springConstant: k, damping: bd, mass: m, drivingAmplitude: F0, drivingFrequency: w }, tEnd);
    r.near('driven x(40 s)', driven.t.x, A * Math.cos(w * tEnd - delta), 1e-5, 1e-8);
    r.near('driven v(40 s)', driven.t.v, -A * w * Math.sin(w * tEnd - delta), 1e-5, 1e-8);
  },

  // The equations ẋ = σ(y−x), ẏ = x(ρ−z)−y, ż = xy−βz, checked on a trajectory, then their fixed points: the origin for
  // ρ < 1, C± = (±√(β(ρ−1)), ±√(β(ρ−1)), ρ−1) for 1 < ρ < ρ_H. Both are stable here, so the trajectory must end on one.
  async 'lorenz-attractor'(r) {
    // The equations themselves: the engine's own trajectory, differenced in time (central difference over one
    // 200 Hz step either side), must satisfy ẋ = σ(y−x), ẏ = x(ρ−z)−y, ż = xy−βz at the middle sample. This is a
    // statement of the ODE, not a re-run of the integrator, and it pins σ, ρ and β separately.
    {
      const sg = 12, rh = 22, bt = 3;
      const at = await run('lorenz-attractor', { rho: rh, sigma: sg, beta: bt }, 1.0 - DT);
      const first = { ...at.t };
      at.engine.step(DT);
      const mid = { ...at.engine.getTelemetrySnapshot() } as Channels;
      at.engine.step(DT);
      const last = at.engine.getTelemetrySnapshot() as Channels;
      const rate = (c: string): number => (last[c] - first[c]) / (2 * DT);
      r.near('dx/dt = σ(y−x)', rate('x1'), sg * (mid.y1 - mid.x1), 3e-3, 0.03);
      r.near('dy/dt = x(ρ−z)−y', rate('y1'), mid.x1 * (rh - mid.z1) - mid.y1, 3e-3, 0.03);
      r.near('dz/dt = xy−βz', rate('z1'), mid.x1 * mid.y1 - bt * mid.z1, 3e-3, 0.03);
    }
    const origin = await run('lorenz-attractor', { rho: 0.5, sigma: 10, beta: 2 }, 60);
    for (const c of ['x1', 'y1', 'z1', 'x2', 'y2', 'z2']) r.near(`origin, ${c}`, origin.t[c], 0, 0, 1e-6);
    const sigma = 10, beta = 2, rho = 10;
    const root = Math.sqrt(beta * (rho - 1));
    const settled = await run('lorenz-attractor', { rho, sigma, beta }, 80);
    const sign = Math.sign(settled.t.x1) || 1;
    r.near('C±, x', settled.t.x1, sign * root, 1e-4);
    r.near('C±, y', settled.t.y1, sign * root, 1e-4);
    r.near('C±, z', settled.t.z1, rho - 1, 1e-4);
    r.near('both trajectories end on the same fixed point (x2)', settled.t.x2, settled.t.x1, 1e-4);
  },

  // On-axis dipole through a loop of radius R at height z: Φ = N μ0 m R² / (2 (R² + z²)^{3/2}), emf = −dΦ/dz · ż,
  // I = emf / R_coil, and the force on the magnet is I dΦ/dz. The loop radius is read from the engine's own
  // parameter set (it is a parameter, not a formula).
  async 'faraday-induction'(r) {
    const m = 11, N = 150, Rc = 4;
    const ov = { magnetMoment: m, turns: N, coilResistance: Rc };
    const registration = SIMULATION_CATALOG['faraday-induction'];
    const R = (registration.defaultParams as any).coilRadius as number;
    for (const seconds of [0.5, 1.3, 2.7]) {
      const { t: s } = await run('faraday-induction', ov, seconds);
      const flux = (N * MU_EFFECTIVE * m * R * R) / (2 * Math.pow(R * R + s.z * s.z, 1.5));
      const dPhiDz = (-3 * N * MU_EFFECTIVE * m * R * R * s.z) / (2 * Math.pow(R * R + s.z * s.z, 2.5));
      const emf = -dPhiDz * s.vz;
      r.near(`flux at z=${s.z.toFixed(3)}`, s.flux, flux, 1e-9);
      r.near(`emf at t=${seconds}`, s.emf, emf, 1e-9, 1e-15);
      r.near(`current at t=${seconds}`, s.current, emf / Rc, 1e-9, 1e-15);
      r.near(`dissipated power at t=${seconds}`, s.dissipated_power, (emf * emf) / Rc, 1e-9, 1e-18);
      r.near(`|magnetic force| at t=${seconds}`, Math.abs(s.lenz_force), Math.abs((emf / Rc) * dPhiDz), 1e-9, 1e-15);
    }
  },

  // Two dimensions, k_B = 1 and m = 1 in the engine's reduced units: ⟨E_k⟩ = k_B T per particle (two quadratic
  // degrees of freedom), v_rms = √(2 k_B T/m), P A = N k_B T. Mean speed is the Rayleigh mean √(π k_B T / 2m)
  // and is statistical (N ≤ 250, so ±4σ ≈ 15 %).
  async 'maxwell-boltzmann'(r) {
    const T = 450, N = 200, mass = 2.5, X = 7.5; // chamber 7.5 × 6
    const { t: s, state } = await run('maxwell-boltzmann', { temperature: T, particleCount: N, particleMass: mass, pistonX: X }, 0);
    const area = X * 6;
    r.near('kinetic energy = N k T', s.kinetic_energy, N * T, 1e-9);
    r.near('v_rms = √(2kT/m)', s.v_rms, Math.sqrt((2 * T) / mass), 1e-9);
    r.near('ideal pressure = N k T / A', s.ideal_pressure, (N * T) / area, 1e-9);
    r.near('volume', s.volume, area, 1e-12);
    const speeds = state.particles.map((p: any) => Math.hypot(p.vx, p.vy));
    const mean = speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length;
    r.near('mean speed of the particles', mean, Math.sqrt((Math.PI * T) / (2 * mass)), 0.15);
    const rms = Math.sqrt(speeds.reduce((a: number, b: number) => a + b * b, 0) / speeds.length);
    r.near('rms speed of the particles', rms, Math.sqrt((2 * T) / mass), 1e-9);
  },

  // Reduced units, as the engine states them: ħ = m = 1, so k = √(2E). A packet is a Gaussian spread of
  // wave numbers, |φ(k)|² centred on k0 with standard deviation 1/(2σ); each k is transmitted by the textbook
  // rectangular-barrier coefficient T(k) = 1 / (1 + V0² sinh²(κd) / (4E(V0−E))), κ = √(2(V0−E)), and the
  // packet's transmission is their weighted sum (waves above the barrier use sin in place of sinh). The grid
  // is 240 points across 20 length units, so the barrier is drawn as a whole number of 0.0837-unit cells (its width is
  // rounded to that, and T changes by e^{−2κ·Δd}), and the packet is only roughly Gaussian near the barrier, so this is held to 8 % of T.
  async 'quantum-tunneling'(r) {
    const dx = 20 / 239;
    const cells = (width: number): number => {
      let n = 0;
      for (let i = 0; i < 240; i += 1) if (Math.abs(-10 + i * dx) <= width / 2) n += 1;
      return n * dx;
    };
    for (const [E, V0, dSet, sigma] of [[5, 8, 1, 0.9], [3, 9, 0.8, 1.2]] as const) {
      const d = cells(dSet);
      const { t: s } = await run('quantum-tunneling', { particleEnergy: E, barrierHeight: V0, barrierWidth: dSet, packetSigma: sigma }, 4.5);
      const k0 = Math.sqrt(2 * E);
      const sk = 1 / (2 * sigma);
      const transmission = (k: number): number => {
        const energy = (k * k) / 2;
        if (Math.abs(energy - V0) < 1e-9) return 1 / (1 + (V0 * d * d) / 2);
        if (energy < V0) {
          const kappa = Math.sqrt(2 * (V0 - energy));
          return 1 / (1 + (V0 * V0 * Math.sinh(kappa * d) ** 2) / (4 * energy * (V0 - energy)));
        }
        const q = Math.sqrt(2 * (energy - V0));
        return 1 / (1 + (V0 * V0 * Math.sin(q * d) ** 2) / (4 * energy * (energy - V0)));
      };
      let weight = 0;
      let sum = 0;
      for (let k = Math.max(0.05, k0 - 6 * sk); k <= k0 + 6 * sk; k += sk / 400) {
        const w = Math.exp(-((k - k0) ** 2) / (2 * sk * sk));
        weight += w;
        sum += w * transmission(k);
      }
      r.near(`T for E=${E}, V0=${V0}, d=${dSet} (grid width ${d.toFixed(3)}), σ=${sigma}`, s.transmission_T, sum / weight, 0.08);
      r.near('probability is conserved: T + R + barrier', s.transmission_T + s.reflection_R + s.barrier_prob, 1, 1e-3);
      r.near('norm', s.norm, 1, 1e-3);
      r.near('k0 = √(2E)', s.wave_number, k0, 1e-12);
    }
  },

  // Far-field multi-slit: I(y)/I0 = sinc²(β) · (sin(Nδ) / (N sin δ))², β = π a y/(λL), δ = π d y/(λL), with
  // fringe spacing λL/d and envelope full width 2λL/a. Compared on all 250 screen points; small-angle form.
  async 'wave-optics'(r) {
    for (const [wl, d, a, N, L] of [[532, 40, 9, 3, 1.8], [450, 30, 12, 5, 0.9], [700, 20, 5, 2, 2.2]] as const) {
      const { t: s, state } = await run('wave-optics', { wavelength: wl, slitSeparation: d, slitWidth: a, slitCount: N, screenDistance: L }, 0);
      const lam = wl * 1e-9;
      const dm = d * 1e-6;
      const am = a * 1e-6;
      r.near('fringe spacing λL/d (mm)', s.fringe_spacing_mm, ((lam * L) / dm) * 1e3, 1e-9);
      r.near('envelope width 2λL/a (mm)', s.envelope_width_mm, ((2 * lam * L) / am) * 1e3, 1e-9);
      let worst = 0;
      let at = 0;
      for (let i = 0; i < state.screenY.length; i += 1) {
        const y = state.screenY[i];
        const beta = (Math.PI * am * y) / (lam * L);
        const delta = (Math.PI * dm * y) / (lam * L);
        const single = Math.abs(beta) < 1e-12 ? 1 : (Math.sin(beta) / beta) ** 2;
        const multi = Math.abs(Math.sin(delta)) < 1e-9 ? 1 : (Math.sin(N * delta) / (N * Math.sin(delta))) ** 2;
        const miss = Math.abs(state.intensity[i] - single * multi);
        if (miss > worst) {
          worst = miss;
          at = y;
        }
      }
      if (worst > 2e-3) r.fail(`intensity profile (${wl} nm, d=${d}, a=${a}, N=${N}): worst miss ${worst.toExponential(2)} of the peak, at y = ${at} m`);
    }
  },

  // μ = G M (G in units of G_0, M in solar masses, AU and years). Vis-viva a = 1/(2/r − v²/μ), e from the
  // angular momentum, T = 2π√(a³/μ). Starts at aphelion; position at later times from Kepler's equation
  // M = E − e sin E, solved here by bisection, not by integrating.
  async 'kepler-orbits'(r) {
    const mass = 60, G = 1.7, r0 = 6, vt = 3.5;
    const mu = G * mass;
    const a = 1 / (2 / r0 - (vt * vt) / mu);
    const h = r0 * vt;
    const e = Math.sqrt(1 - (h * h) / (mu * a));
    const period = 2 * Math.PI * Math.sqrt((a * a * a) / mu);
    const t = 0.37 * period;
    const { t: s } = await run('kepler-orbits', { centralMass: mass, gravitationalConstant: G, initialRadius: r0, initialTangentialVelocity: vt, initialRadialVelocity: 0, orbitalInclination: 0 }, t);
    if (Math.abs(a * (1 + e) - r0) > 1e-9) r.fail(`test set-up: aphelion ${a * (1 + e)} is not r0 ${r0}`);
    const M = Math.PI + (2 * Math.PI * s.t) / period; // starts at aphelion, mean anomaly π
    let lo = 0;
    let hi = 4 * Math.PI;
    for (let i = 0; i < 200; i += 1) {
      const mid = (lo + hi) / 2;
      if (mid - e * Math.sin(mid) < M) lo = mid;
      else hi = mid;
    }
    const E = (lo + hi) / 2;
    const rr = a * (1 - e * Math.cos(E));
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const phi = nu - Math.PI; // aphelion is at angle 0
    r.near('semi-major axis', s.semi_major_axis, a, 1e-6);
    r.near('eccentricity', s.eccentricity, e, 1e-5, 1e-6);
    r.near('orbital period', s.orbital_period, period, 1e-6);
    r.near('angular momentum', s.angular_momentum, h, 1e-9);
    r.near('specific energy', s.specific_energy, -mu / (2 * a), 1e-8);
    r.near('r at 0.37 T', s.r, rr, 1e-5);
    r.near('speed at 0.37 T (vis-viva)', s.speed, Math.sqrt(mu * (2 / rr - 1 / a)), 1e-5);
    r.near('x at 0.37 T', s.x, rr * Math.cos(phi), 1e-5, 1e-6);
    r.near('y at 0.37 T', s.y, rr * Math.sin(phi), 1e-5, 1e-6);
  },

  // No drag: x = v cosθ t, y = h + v sinθ t − ½ g t², range = v cosθ · t_f with t_f = (v sinθ + √(v² sin²θ + 2gh)) / g.
  // Heavy drag (quadratic, F = ½ ρ C_d A v²): the fall settles at terminal v_t = √(2 m g / (ρ C_d A)).
  async 'projectile-drag'(r) {
    const v = 42, th = (37 * Math.PI) / 180, h0 = 12, g = 8.6;
    const tf = (v * Math.sin(th) + Math.sqrt((v * Math.sin(th)) ** 2 + 2 * g * h0)) / g;
    const mid = 2.0;
    const vacuum = { launchSpeed: v, launchAngle: 37, launchHeight: h0, airDensity: 0, gravity: g };
    const a = await run('projectile-drag', vacuum, mid);
    r.near('x at 2 s', a.t.x, v * Math.cos(th) * mid, 1e-8);
    r.near('y at 2 s', a.t.y, h0 + v * Math.sin(th) * mid - 0.5 * g * mid * mid, 1e-8);
    r.near('vy at 2 s', a.t.vy, v * Math.sin(th) - g * mid, 1e-8, 1e-9);
    const landed = await run('projectile-drag', vacuum, tf + 1);
    r.near('range', landed.t.range, v * Math.cos(th) * tf, 2e-3);
    r.near('maximum altitude', landed.t.max_altitude, h0 + (v * Math.sin(th)) ** 2 / (2 * g), 1e-3);
    const m = 0.05, rho = 2.5, cd = 1.2, A = 0.15, gg = 9.807;
    const vt = Math.sqrt((2 * m * gg) / (rho * cd * A));
    const f = await run('projectile-drag', { launchSpeed: 5, launchAngle: 85, launchHeight: 40, mass: m, dragCoefficient: cd, crossSectionArea: A, airDensity: rho, gravity: gg }, 6);
    r.near('terminal speed', f.t.speed, vt, 0.01);
    r.near('drag force at terminal speed = weight', f.t.drag_force, m * gg, 0.02);
  },

  // Series RLC. Free decay from q0 (source off): q = q0 e^{−αt}(cos ω_d t + (α/ω_d) sin ω_d t), α = R/2L.
  // Driven steady state, source V cos ωt: i = (V/|Z|) cos(ωt − φ), |Z| = √(R² + (ωL − 1/ωC)²), tan φ = (ωL − 1/ωC)/R.
  async 'lcr-circuit'(r) {
    const L = 0.08, C = 30e-6, R = 25;
    const alpha = R / (2 * L);
    const wd = Math.sqrt(1 / (L * C) - alpha * alpha);
    const t = 0.012;
    const q0 = 60;
    const free = await run('lcr-circuit', { inductance: 80, capacitance: 30, resistance: R, drivingVoltage: 0, initialCharge: q0 }, t);
    r.near('free q(' + (free.t.t * 1e3).toFixed(0) + ' ms) in µC' /* RK4 at 200 Hz, ~1e-5 */, free.t.q_uC, q0 * Math.exp(-alpha * free.t.t) * (Math.cos(wd * free.t.t) + (alpha / wd) * Math.sin(wd * free.t.t)), 1e-4, 1e-6);
    const f = 100, w = 2 * Math.PI * f, V = 15;
    const X = w * L - 1 / (w * C);
    const Z = Math.hypot(R, X);
    const phi = Math.atan2(X, R);
    const tEnd = 0.5;
    const d = await run('lcr-circuit', { inductance: 80, capacitance: 30, resistance: R, drivingVoltage: V, drivingFrequency: f }, tEnd);
    r.near('impedance |Z|', d.t.impedance_ohm, Z, 1e-9);
    r.near('phase angle (degrees)', d.t.phase_deg, (phi * 180) / Math.PI, 1e-6, 1e-9);
    r.near('resonant frequency', d.t.f_resonance_Hz, 1 / (2 * Math.PI * Math.sqrt(L * C)), 1e-9);
    r.near('quality factor', d.t.quality_factor, Math.sqrt(L / C) / R, 1e-9);
    r.near('steady-state current i(0.5 s)', d.t.current_A, (V / Z) * Math.cos(w * tEnd - phi), 1e-4, 1e-8);
    r.near('source voltage', d.t.v_source, V * Math.cos(w * tEnd), 1e-9, 1e-12);
  },

  // Wave speed √(T/μ), f_n = n v / 2L, λ_n = 2L/n, k = 2π/λ, n + 1 nodes, n antinodes, and for y = A sin(nπx/L) cos(2πf t)
  // the total energy is constant at ¼ μ L ω² A².
  async 'standing-waves'(r) {
    const Ls = 1.7, T = 220, mu = 4.2e-3, n = 3, A = 0.06;
    const v = Math.sqrt(T / mu);
    const { t: s } = await run('standing-waves', { stringLength: Ls, tension: T, linearDensity: 4.2, harmonicMode: n, amplitude: 6, harmonic2Amp: 0, harmonic3Amp: 0 }, 0.3);
    r.near('wave speed', s.wave_speed, v, 1e-9);
    r.near('fundamental', s.fundamental_freq_Hz, v / (2 * Ls), 1e-9);
    r.near('harmonic frequency', s.harmonic_freq_Hz, (n * v) / (2 * Ls), 1e-9);
    r.near('wavelength', s.wavelength_m, (2 * Ls) / n, 1e-9);
    r.near('wave number', s.wave_number_rad_m, (n * Math.PI) / Ls, 1e-9);
    r.near('nodes', s.node_count, n + 1, 0);
    r.near('antinodes', s.antinode_count, n, 0);
    const w = (2 * Math.PI * n * v) / (2 * Ls);
    r.near('total energy (mJ)', s.total_energy_mJ, 1e3 * 0.25 * mu * Ls * w * w * A * A, 1e-6);
  },

  // f' = f (v − u_r) / (v − u_s) when the source is on the −x side of the receiver, and f (v + u_r) / (v + u_s)
  // on the +x side (velocities along +x). Supersonic: Mach number u_s/v and cone half-angle asin(v/u_s).
  async 'doppler-shift'(r) {
    const v = 120, us = 45, f0 = 14, ur = 20;
    const before = await run('doppler-shift', { waveSpeed: v, sourceSpeed: us, sourceFrequency: f0, receiverX: 150, receiverY: 0, receiverSpeed: ur }, 0.5);
    // Receiver speed is positive along +x on every channel, so the ahead/behind channels include it too.
    r.near('receiver ahead of the source', before.t.freq_receiver_Hz, (f0 * (v - ur)) / (v - us), 1e-9);
    r.near('freq ahead', before.t.freq_ahead_Hz, (f0 * (v - ur)) / (v - us), 1e-9);
    r.near('freq behind', before.t.freq_behind_Hz, (f0 * (v + ur)) / (v + us), 1e-9);
    r.near('mach number', before.t.mach_number, us / v, 1e-9);
    r.near('wavelength ahead', before.t.wavelength_ahead_m, (v - us) / f0, 1e-9);
    r.near('wavelength behind', before.t.wavelength_behind_m, (v + us) / f0, 1e-9);
    const sup = await run('doppler-shift', { waveSpeed: 90, sourceSpeed: 140, sourceFrequency: f0 }, 0.5);
    r.near('supersonic mach number', sup.t.mach_number, 140 / 90, 1e-9);
    r.near('mach cone half-angle (degrees)', sup.t.mach_angle_deg, (Math.asin(90 / 140) * 180) / Math.PI, 1e-9);
  },

  // E = hc/λ, K_max = E − φ (zero emission below the work function), V_stop = K_max/e, v_max = √(2 K_max/m_e),
  // saturation current ∝ intensity, and no current beyond the stopping potential.
  async 'photoelectric-effect'(r) {
    const wl = 330, phi = 3.4, I = 40;
    const E = (PLANCK * SPEED_OF_LIGHT) / (wl * 1e-9) / ELEMENTARY_CHARGE;
    const K = E - phi;
    const { t: s } = await run('photoelectric-effect', { wavelength: wl, workFunction: phi, intensity: I, appliedVoltage: 0 }, 0.5);
    r.near('photon energy (eV)', s.photon_energy_eV, E, 1e-4);
    r.near('K_max (eV)', s.k_max_eV, K, 1e-3, 1e-4);
    r.near('stopping potential (V)', s.stopping_potential_V, K, 1e-3, 1e-4);
    r.near('v_max (km/s)', s.v_max_km_s, Math.sqrt((2 * K * ELEMENTARY_CHARGE) / ELECTRON_MASS) / 1e3, 1e-3);
    const dbl = await run('photoelectric-effect', { wavelength: wl, workFunction: phi, intensity: 2 * I, appliedVoltage: 0 }, 0.5);
    r.near('doubling the intensity doubles the saturation current', dbl.t.saturation_uA, 2 * s.saturation_uA, 1e-9);
    const stopped = await run('photoelectric-effect', { wavelength: wl, workFunction: phi, intensity: I, appliedVoltage: -(K + 0.2) }, 0.5);
    r.near('no photocurrent beyond the stopping potential', stopped.t.photocurrent_uA, 0, 0, 1e-12);
    const below = await run('photoelectric-effect', { wavelength: 600, workFunction: 2.3, intensity: I }, 0.5);
    r.near('no K_max below threshold (600 nm, 2.3 eV)', below.t.k_max_eV, 0, 0, 1e-12);
    r.near('no emission below threshold', below.t.is_emission, 0, 0, 0);
  },

  // Ideal-gas Carnot cycle (V1 = 10 L as the engine starts): V2 = r V1; adiabats T V^{γ−1} = const; Q_h = nR T_h ln r;
  // Q_c = nR T_c ln r; W = Q_h − Q_c; η = 1 − T_c/T_h; p V = nRT at every instant; S − S1 = nR ln(V/V1) + C_v ln(T/T_h).
  async 'carnot-cycle'(r) {
    const th = 700, tc = 280, ratio = 2.4, n = 1.7, gamma = 1.4;
    const Cv = (n * GAS_CONSTANT) / (gamma - 1);
    const base = { th, tc, compressionRatio: ratio, gasMoles: n, gamma, cycleSpeed: 1 };
    const Qh = n * GAS_CONSTANT * th * Math.log(ratio);
    const Qc = n * GAS_CONSTANT * tc * Math.log(ratio);
    const first = await run('carnot-cycle', base, 1);
    const V1 = 10; // litres: the cycle's starting volume
    const V2 = ratio * V1;
    const V3 = V2 * Math.pow(th / tc, 1 / (gamma - 1));
    r.near('Q_h', first.t.heat_in_Qh_J, Qh, 1e-6);
    r.near('Q_c', first.t.heat_out_Qc_J, Qc, 1e-6);
    r.near('net work', first.t.work_net_J, Qh - Qc, 1e-6);
    r.near('efficiency (%)', first.t.efficiency_pct, 100 * (1 - tc / th), 1e-9);
    for (const seconds of [1, 3, 5, 7]) {
      const { t: s } = await run('carnot-cycle', base, seconds);
      const T = s.temperature_K;
      const V = s.volume_liters;
      r.near(`pV = nRT at ${seconds} s (kPa·L = J)`, s.pressure_kPa * V, n * GAS_CONSTANT * T, 1e-6);
      r.near(`entropy at ${seconds} s`, s.entropy_J_K, n * GAS_CONSTANT * Math.log(V / V1) + Cv * Math.log(T / th), 1e-5, 1e-6);
    }
    r.near('stage 1 is isothermal at T_h', first.t.temperature_K, th, 1e-9);
    r.near('stage 1 volume at its midpoint (geometric mean of V1, V2)', first.t.volume_liters, Math.sqrt(V1 * V2), 1e-3);
    const end2 = await run('carnot-cycle', base, 4.0);
    r.near('stage 2 ends at T_c', end2.t.temperature_K, tc, 2e-3);
    r.near('stage 2 ends at V3 = V2 (T_h/T_c)^(1/(γ−1))', end2.t.volume_liters, V3, 5e-3);
  },

  // Gauss: Φ = Q_enc / ε0 for any closed surface. The two charges sit at x = ∓ separation/2; a charge is inside a
  // sphere when its distance from the centre is less than the radius. The numerical sum over patches is held to
  // Q/ε0, and to zero where nothing is enclosed.
  async 'gauss-flux'(r) {
    const cases = [
      { q1: 3.5, q2: -1.5, sep: 2.4, R: 1.5, cx: 0, cy: 0 },
      { q1: 3.5, q2: -1.5, sep: 2.4, R: 1.1, cx: 0.4, cy: 0.3 },
      { q1: 2, q2: 4.5, sep: 3.2, R: 2.0, cx: -1.6, cy: 0 },
      { q1: 2, q2: 4.5, sep: 3.2, R: 3.4, cx: 0, cy: 0 },
    ];
    for (const c of cases) {
      const { t: s } = await run('gauss-flux', { charge1: c.q1, charge2: c.q2, chargeSeparation: c.sep, surfaceRadius: c.R, surfaceCenterX: c.cx, surfaceCenterY: c.cy, surfaceType: 0 }, 0);
      const in1 = Math.hypot(-c.sep / 2 - c.cx, c.cy) < c.R;
      const in2 = Math.hypot(c.sep / 2 - c.cx, c.cy) < c.R;
      const Q = (in1 ? c.q1 : 0) + (in2 ? c.q2 : 0);
      const theory = (Q * 1e-9) / EPSILON_0;
      const label = `R=${c.R} at (${c.cx}, ${c.cy})`;
      r.near(`enclosed charge, ${label} (nC)`, s.q_enclosed_nC, Q, 1e-12, 1e-12);
      r.near(`Q/ε0, ${label}`, s.flux_theoretical_N_m2_C, theory, 1e-6, 1e-9);
      r.near(`numerical flux, ${label}`, s.flux_numerical_N_m2_C, theory, 5e-3, 2e-2);
    }
  },

  // Two discs on a line, restitution e: v1' = (m1 v1 + m2 v2 + m2 e (v2 − v1)) / (m1 + m2), v2' symmetric; total momentum
  // is conserved, the centre of mass moves at (m1 v1 + m2 v2)/(m1 + m2), and the kinetic energy lost is
  // ½ μ (1 − e²)(v1 − v2)², with μ the reduced mass.
  async 'conservation-momentum'(r) {
    const m1 = 3, m2 = 1.5, v1 = 6, v2 = -2, e = 0.6;
    const M = m1 + m2;
    const w1 = (m1 * v1 + m2 * v2 + m2 * e * (v2 - v1)) / M;
    const w2 = (m1 * v1 + m2 * v2 + m1 * e * (v1 - v2)) / M;
    const { t: s } = await run('conservation-momentum', { mass1: m1, mass2: m2, velocity1: v1, velocity2: v2, impactParameter: 0, restitution: e }, 1.0);
    if (s.collision_count !== 1 || s.wall_contacts !== 0) r.fail(`set-up: expected one collision and no wall contact at 1 s, got ${s.collision_count} and ${s.wall_contacts}`);
    r.near("v1' after impact", s.body1_vx, w1, 1e-9, 1e-12);
    r.near("v2' after impact", s.body2_vx, w2, 1e-9, 1e-12);
    r.near('total momentum', s.total_p_x, m1 * v1 + m2 * v2, 1e-9);
    r.near('centre-of-mass velocity', s.com_vx, (m1 * v1 + m2 * v2) / M, 1e-9);
    const mu = (m1 * m2) / M;
    r.near('kinetic energy after', s.kinetic_energy_total_J, 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2 - 0.5 * mu * (1 - e * e) * (v1 - v2) ** 2, 1e-9);
    const off = await run('conservation-momentum', { mass1: m1, mass2: m2, velocity1: v1, velocity2: v2, impactParameter: 0.3, restitution: 1 }, 1.0);
    r.near('glancing impact: total momentum x', off.t.total_p_x, m1 * v1 + m2 * v2, 1e-9);
    r.near('glancing impact: total momentum y', off.t.total_p_y, 0, 0, 1e-9);
    r.near('glancing impact keeps kinetic energy when e = 1', off.t.kinetic_energy_total_J, 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2, 1e-9);
  },

  // RC charging v_C = V(1 − e^{−t/τ}), τ = RC, current (V/R) e^{−t/τ}, heat ½CV²(1 − e^{−2t/τ}); RL growth
  // i = (V/R)(1 − e^{−t/τ}), τ = L/R, stored energy ½Li².
  async 'rc-rl-circuits'(r) {
    // Slow square wave (0.5 Hz) so the source stays on for the whole run; times are whole steps and the
    // closed form is evaluated at the engine's own clock.
    const slow = { squareWaveFreq: 0.5, switchState: 1 };
    const R = 470, C = 220e-6, V = 9;
    const tau = R * C;
    for (const seconds of [0.05, 0.1, 0.25]) {
      const { t: s } = await run('rc-rl-circuits', { ...slow, circuitType: 0, resistance: R, capacitance: 220, sourceVoltage: V }, seconds);
      const k = s.t / tau;
      const vc = V * (1 - Math.exp(-k));
      r.near('RC time constant (ms)', s.tau_ms, tau * 1e3, 1e-9);
      r.near(`RC v_C at ${s.t.toFixed(2)} s`, s.v_component, vc, 2e-3, 1e-6);
      r.near(`RC current (mA) at ${s.t.toFixed(2)} s`, s.current_mA, (V / R) * Math.exp(-k) * 1e3, 2e-3, 1e-6);
      r.near(`RC charge (µC) at ${s.t.toFixed(2)} s`, s.charge_uC, C * vc * 1e6, 2e-3, 1e-6);
      r.near(`RC stored energy (mJ) at ${s.t.toFixed(2)} s`, s.stored_energy_mJ, 0.5 * C * vc * vc * 1e3, 4e-3, 1e-6);
      r.near(`RC heat (mJ) at ${s.t.toFixed(2)} s`, s.heat_dissipated_mJ, 0.5 * C * V * V * (1 - Math.exp(-2 * k)) * 1e3, 4e-3, 1e-6);
    }
    const Lh = 0.5, Rl = 25; // τ = 20 ms
    const tauL = Lh / Rl;
    for (const seconds of [0.01, 0.02, 0.05]) {
      const { t: s } = await run('rc-rl-circuits', { ...slow, circuitType: 1, resistance: Rl, inductance: 500, sourceVoltage: V }, seconds);
      const k = s.t / tauL;
      const i = (V / Rl) * (1 - Math.exp(-k));
      r.near('RL time constant (ms)', s.tau_ms, tauL * 1e3, 1e-9);
      r.near(`RL current (mA) at ${s.t.toFixed(2)} s`, s.current_mA, i * 1e3, 2e-3, 1e-6);
      r.near(`RL inductor voltage at ${s.t.toFixed(2)} s`, s.v_component, V * Math.exp(-k), 2e-3, 1e-6);
      r.near(`RL stored energy (mJ) at ${s.t.toFixed(2)} s`, s.stored_energy_mJ, 0.5 * Lh * i * i * 1e3, 4e-3, 1e-6);
    }
  },
};

// Constants above are used by the cases that follow; referenced here so a case being written never hides an unused one.
void [MU_0, BOLTZMANN];

export async function runClosedFormVerification(only?: string[]): Promise<void> {
  const ids = Object.keys(SIMULATION_CATALOG).filter((id) => !SIMULATION_CATALOG[id].local);
  // A built-in instrument has a case above; one shared by a learner through npm run export:module has a hand-worked
  // benchmark in its manifest instead, which the module checker already holds its engine to.
  const missing = ids.filter((id) => !(id in CASES) && !SIMULATION_CATALOG[id].benchmark);
  if (missing.length > 0) throw new Error(`no closed-form case (and no manifest benchmark) for: ${missing.join(', ')}. Every shipped instrument needs one (Art. 1.5).`);
  const stale = Object.keys(CASES).filter((id) => !(id in SIMULATION_CATALOG));
  if (stale.length > 0) throw new Error(`closed-form cases for instruments that no longer exist: ${stale.join(', ')}`);
  const failures: string[] = [];
  for (const id of ids.filter((id) => id in CASES)) {
    if (only && !only.includes(id)) continue;
    const report = new Report(id);
    try {
      await CASES[id](report);
      report.done();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (failures.length > 0) throw new Error(failures.join('\n'));
  console.log(`✓ Closed forms verified independently for ${Object.keys(CASES).length} instruments (own constants, off-default parameters, 200 Hz step)`);
}
