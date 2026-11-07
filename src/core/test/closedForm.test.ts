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
    const q = 1.5e-6, m = 0.5e-6, B = 3, E = 6, v0 = 8, v0y = 3;
    const w = (q / m) * B;
    const drift = E / B;
    const t = 2;
    const { t: s } = await run('lorentz-force', { charge: 1.5, mass: 0.5, magneticFieldZ: B, electricFieldY: E, initialSpeedX: v0, initialSpeedY: v0y }, t);
    // Relative to the drift the velocity rotates: u(t) = (u0x cos wt + u0y sin wt, −u0x sin wt + u0y cos wt).
    const u0 = v0 - drift;
    const c = Math.cos(w * t), sn = Math.sin(w * t);
    r.near('vx', s.vx, drift + u0 * c + v0y * sn, 1e-9, 1e-9);
    r.near('vy', s.vy, -u0 * sn + v0y * c, 1e-9, 1e-9);
    r.near('x', s.x, drift * t + (u0 * sn + v0y * (1 - c)) / w, 1e-9, 1e-9);
    r.near('y', s.y, (u0 * (c - 1) + v0y * sn) / w, 1e-9, 1e-9);
    // Kinetic energy is ½ m v² with m in kilograms; the channel is read in whatever unit the manifest declares for it.
    const unit = SIMULATION_CATALOG['lorentz-force'].telemetryUnits.kinetic_energy;
    const perJoule: Record<string, number> = { J: 1, 'mJ': 1e3, 'µJ': 1e6 };
    if (!(unit in perJoule)) r.fail('kinetic_energy is declared in ' + unit + ', which this check cannot convert');
    const speed2 = (drift + u0 * c + v0y * sn) ** 2 + (-u0 * sn + v0y * c) ** 2;
    r.near('kinetic_energy (' + unit + ')', s.kinetic_energy, 0.5 * m * speed2 * (perJoule[unit] ?? 1), 1e-9);

    // A magnetic field does no work, however fast the turning and however long the run: ω = 75 rad/s, the top of the
    // slider ranges, for a minute. The radius stays mv/(qB), held by the orbit's centre at (0, −r), since v starts along +x.
    const fast = await run('lorentz-force', { charge: 3, mass: 0.2, magneticFieldZ: 5, electricFieldY: 0, initialSpeedX: 8, initialSpeedY: 0 }, 60);
    r.near('speed after 60 s at ω = 75', fast.t.speed, 8, 1e-9);
    r.near('orbit radius after 60 s at ω = 75', Math.hypot(fast.t.x, fast.t.y + 8 / 75), 8 / 75, 1e-9);

    // No magnetic field: plain constant acceleration qE/m along y.
    const free = await run('lorentz-force', { charge: 2, mass: 0.5, magneticFieldZ: 0, electricFieldY: 3, initialSpeedX: 4, initialSpeedY: 1 }, 2);
    const accel = (2 / 0.5) * 3;
    r.near('B = 0: x', free.t.x, 4 * free.t.t, 1e-9);
    r.near('B = 0: y', free.t.y, free.t.t + 0.5 * accel * free.t.t * free.t.t, 1e-9);
    r.near('B = 0: vy', free.t.vy, 1 + accel * free.t.t, 1e-9);
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
    const R = 0.9; // the coil-radius slider, not the default
    const ov = { magnetMoment: m, turns: N, coilResistance: Rc, coilRadius: R };
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

    // The release height at t = 0: at rest, no emf, flux and energy as the closed forms give for that z, not for the default 2.2.
    for (const z0 of [0.5, 1.3, 3.0]) {
      const { t: s } = await run('faraday-induction', { ...ov, springConstant: 20, initialZ: z0 }, 0);
      r.near(`initialZ ${z0}: z at t=0`, s.z, z0, 1e-12);
      r.near(`initialZ ${z0}: vz at t=0`, s.vz, 0, 0, 1e-12);
      r.near(`initialZ ${z0}: emf at t=0`, s.emf, 0, 0, 1e-12);
      r.near(`initialZ ${z0}: current at t=0`, s.current, 0, 0, 1e-12);
      r.near(`initialZ ${z0}: flux at t=0`, s.flux, (N * MU_EFFECTIVE * m * R * R) / (2 * Math.pow(R * R + z0 * z0, 1.5)), 1e-9);
      r.near(`initialZ ${z0}: mechanical energy at t=0`, s.mechanical_energy, 0.5 * 20 * z0 * z0, 1e-9);
    }

    // Free decay from a set height. magnetMoment: 0 is below the slider's minimum of 1 and is used because it removes the
    // braking, so z and vz follow the damped oscillator exactly.
    {
      const k = 20, b = 0.4, mass = 1.6, z0 = 1.3, tEnd = 2.7;
      const gamma = b / (2 * mass);
      const w0Sq = k / mass;
      const wd = Math.sqrt(w0Sq - gamma * gamma);
      const { t: s } = await run('faraday-induction', { ...ov, magnetMoment: 0, springConstant: k, mechDamping: b, mass, initialZ: z0 }, tEnd);
      r.near('initialZ 1.3, magnet off: z(2.7 s)', s.z, z0 * Math.exp(-gamma * tEnd) * (Math.cos(wd * tEnd) + (gamma / wd) * Math.sin(wd * tEnd)), 1e-6, 1e-9);
      r.near('initialZ 1.3, magnet off: vz(2.7 s)', s.vz, -z0 * (w0Sq / wd) * Math.exp(-gamma * tEnd) * Math.sin(wd * tEnd), 1e-6, 1e-9);
    }

    // The slider says it takes effect when the run is reset: setting it mid-run leaves z alone, and a reset starts from it.
    {
      const moved = await run('faraday-induction', { initialZ: 0.8 }, 1);
      const zBefore = moved.engine.getState().z;
      moved.engine.setParameters({ initialZ: 2.9 });
      r.near('initialZ set mid-run: z is unchanged', moved.engine.getState().z, zBefore, 0, 1e-12);
      moved.engine.reset();
      const again = moved.engine.getState();
      r.near('initialZ set mid-run: z after reset', again.z, 2.9, 1e-12);
      r.near('initialZ set mid-run: vz after reset', again.vz, 0, 0, 1e-12);
      r.near('initialZ set mid-run: time after reset', again.time, 0, 0, 1e-12);
    }

    // A reset with no slider move returns to the set height.
    {
      const plain = await run('faraday-induction', { initialZ: 0.8 }, 1);
      plain.engine.reset();
      r.near('initialZ 0.8, reset with no slider move: z', plain.engine.getState().z, 0.8, 1e-12);
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

    // What the guide tells a learner to expect of P·A / N k T. The disks have size, so it is above 1 by an amount that
    // grows as the box fills: these are measured values, with room for the sampling spread.
    for (const [n, width, low, high] of [[40, 6, 1.01, 1.07], [120, 6, 1.04, 1.11], [250, 3, 1.24, 1.34]] as const) {
      const gas: any = (await SIMULATION_CATALOG['maxwell-boltzmann'].load()).createEngine();
      gas.init({ temperature: 300, particleCount: n, particleMass: 1, pistonX: width });
      for (let i = 0; i < 400; i += 1) gas.step(DT);
      let sum = 0;
      let count = 0;
      let last = NaN;
      let ideal = 0;
      for (let i = 0; i < 4000; i += 1) {
        gas.step(DT);
        const now = gas.getState();
        if (now.empiricalPressure !== last) {
          last = now.empiricalPressure;
          ideal = now.idealPressure;
          sum += last;
          count += 1;
        }
      }
      const ratio = sum / count / ideal;
      if (!(ratio > low && ratio < high)) r.fail(`P·A / N k T at N=${n}, L_x=${width} is ${ratio.toFixed(3)}, and the guide says ${low} to ${high}`);
    }
  },

  // Reduced units, as the engine states them: ħ = m = 1, so k = √(2E). A packet is a Gaussian spread of
  // wave numbers, |φ(k)|² centred on k0 with standard deviation 1/(2σ); each k is transmitted by the textbook
  // rectangular-barrier coefficient T(k) = 1 / (1 + V0² sinh²(κd) / (4E(V0−E))), κ = √(2(V0−E)), and the
  // packet's transmission is their weighted sum (waves above the barrier use sin in place of sinh). A slow packet also
  // holds some k < 0, which moves away from the barrier and never meets it: that part counts in the weight and transmits
  // nothing (7.9 % of the packet at E = 1, σ = 0.5). T is read when the engine says it is settled (T has stopped rising,
  // and nothing has reached the edge of the box). The barrier is averaged over grid cells, so its area is exactly V0·d and
  // its width is the one set. What is left is the scheme's dispersion, second order in the cell, so a check of one reading
  // is held to 2 % and a check of every settled step to 3 %.
  async 'quantum-tunneling'(r) {
    const transmission = (k: number, V0: number, d: number): number => {
      const energy = (k * k) / 2;
      if (Math.abs(energy - V0) < 1e-9) return 1 / (1 + (V0 * d * d) / 2);
      if (energy < V0) {
        const kappa = Math.sqrt(2 * (V0 - energy));
        return 1 / (1 + (V0 * V0 * Math.sinh(kappa * d) ** 2) / (4 * energy * (V0 - energy)));
      }
      const q = Math.sqrt(2 * (energy - V0));
      return 1 / (1 + (V0 * V0 * Math.sin(q * d) ** 2) / (4 * energy * (energy - V0)));
    };
    const packet = (E: number, V0: number, d: number, sigma: number): number => {
      const k0 = Math.sqrt(2 * E);
      const sk = 1 / (2 * sigma);
      let weight = 0;
      let sum = 0;
      for (let k = k0 - 6 * sk; k <= k0 + 6 * sk; k += sk / 400) {
        const w = Math.exp(-((k - k0) ** 2) / (2 * sk * sk));
        weight += w;
        if (k > 0.05) sum += w * transmission(k, V0, d);
      }
      return sum / weight;
    };
    // One-sided Gaussian tail beyond 7 standard deviations: Q(7) = 1.28e-12.
    const Q7 = 1.28e-12;
    /** Runs until the engine reports T as readable, and returns that reading (or fails). */
    const settledReading = async (overrides: Record<string, number>): Promise<{ s: Channels; state: any } | null> => {
      const registration = SIMULATION_CATALOG['quantum-tunneling'];
      const engine: any = (await registration.load()).createEngine();
      engine.init({ ...registration.defaultParams, ...overrides });
      for (let i = 0; i < 6000; i += 1) {
        engine.step(DT);
        const state = engine.getState();
        if (state.settled) return { s: engine.getTelemetrySnapshot() as Channels, state };
      }
      return null;
    };

    for (const [E, V0, d, sigma] of [[5, 8, 1, 0.9], [3, 9, 0.8, 1.2]] as const) {
      const got = await settledReading({ particleEnergy: E, barrierHeight: V0, barrierWidth: d, packetSigma: sigma });
      if (!got) {
        r.fail(`T never became readable (settled) for E=${E}, V0=${V0}, d=${d}, σ=${sigma}`);
        continue;
      }
      const { s } = got;
      r.near(`T for E=${E}, V0=${V0}, d=${d}, σ=${sigma}`, s.transmission_T, packet(E, V0, d, sigma), 0.02);
      r.near('probability is conserved: T + R + barrier', s.transmission_T + s.reflection_R + s.barrier_prob, 1, 1e-3);
      r.near('norm', s.norm, 1, 1e-3);
      r.near('k0 = √(2E)', s.wave_number, Math.sqrt(2 * E), 1e-12);
    }

    // What a packet starts with is not transmission: it starts 7σ clear of the barrier (or at x = -5 if that is further),
    // so at most Q(7) of it is at or past the barrier's left edge at t = 0, whatever the sliders say. Read from the density.
    for (const [d, sigma] of [[2.5, 2.0], [1.5, 1.4], [1.5, 1.2], [1, 0.9], [0.2, 0.5]] as const) {
      const { state } = await run('quantum-tunneling', { barrierWidth: d, packetSigma: sigma }, 0);
      const dx = state.gridX[1] - state.gridX[0];
      const centre = state.probabilityDensity.reduce((a: number, p: number, i: number) => a + p * state.gridX[i] * dx, 0);
      r.near(`packet centre at the start for d=${d}, σ=${sigma}`, centre, -Math.max(5, d / 2 + 7 * sigma), 1e-6);
      if (!(state.transmission + state.insideBarrier < 2 * Q7)) r.fail(`d=${d}, σ=${sigma} starts with ${state.transmission + state.insideBarrier} at or past the barrier, more than the 7σ tail`);
    }

    // Settled means readable, and every case below says which way it must go, so no case can pass without being tested.
    // The first list must settle, and on every settled step T is the packet's value. The second must never settle, and
    // the clock has no stop, so all of them run for 90 s, long past every bounce.
    // The first list holds settings that once read wrong while marked settled: too high from a packet that started
    // overlapping the barrier (the wide packets, including the lab sweep's d = 1.5), and too low from T being read while
    // still rising and from the grid (E = 12, E = 2 at σ = 0.5, and the Thick Barrier preset). The second list pins today's
    // box, so a larger box would legitimately move it: T is still rising when the reflected packet reaches the wall, so the
    // mark stays off. The E = 1 cases are slow, and a little of the packet is still at the barrier when the wall is reached.
    const settling = [
      [10, 12, 0.6, 0.9], [8, 4, 0.6, 1.6], [8, 16, 0.6, 0.5], [2, 20, 0.6, 0.9], [3, 4, 1.5, 1.2],
      [10, 12, 0.6, 2.0], [12, 20, 1, 2.0], [2, 20, 1, 2.0],
      [3, 9, 1.5, 1.2], [5, 12, 2, 0.9], [5, 20, 1.5, 1.4], [5, 16, 1.5, 1.4], [3, 12, 1.5, 1.2],
      [12, 20, 1.5, 0.9], [12, 16, 1.5, 1.2], [2, 16, 0.2, 0.5],
    ] as const;
    const never = [[5, 20, 2.5, 0.9], [3, 20, 1.5, 1.2], [12, 20, 2.5, 0.9], [8, 20, 2.5, 0.5], [1, 12, 1.5, 1.2], [1, 4, 0.2, 0.5]] as const;
    for (const [E, V0, d, sigma, mustSettle] of [...settling.map((c) => [...c, true] as const), ...never.map((c) => [...c, false] as const)]) {
      const registration = SIMULATION_CATALOG['quantum-tunneling'];
      const engine: any = (await registration.load()).createEngine();
      engine.init({ ...registration.defaultParams, particleEnergy: E, barrierHeight: V0, barrierWidth: d, packetSigma: sigma });
      const exact = packet(E, V0, d, sigma);
      const who = `E=${E}, V0=${V0}, d=${d}, σ=${sigma}`;
      let worst = 0;
      let readings = 0;
      for (let i = 0; i < 18000; i += 1) {
        engine.step(DT);
        const state = engine.getState();
        if (!state.settled) continue;
        readings += 1;
        worst = Math.max(worst, Math.abs(state.transmission - exact) / exact);
      }
      if (mustSettle && readings === 0) r.fail(`${who}: expected T to become readable, but it never settled in 90 s`);
      else if (mustSettle && worst > 0.03) r.fail(`${who}: T was reported settled while ${(worst * 100).toFixed(1)} % away from the packet value (${readings} settled steps)`);
      if (!mustSettle && readings !== 0) r.fail(`${who}: expected T never to be readable, but it was reported settled on ${readings} steps`);
      if (!engine.getState().wallReached) r.fail(`${who}: expected the packet to reach the wall within 90 s, but wallReached is false`);
    }

    // The lab protocol, as a learner would run it: E = 3, V0 = 9, σ = 1.2, d from 0.5 to 1.5. Every width settles on the
    // packet's value, ln T falls at the packet's slope, which the guide states (−6.2, short of −2κ = −6.9), and the norm
    // holds to the six places shown.
    const widths: number[] = [];
    const logs: number[] = [];
    const exactLogs: number[] = [];
    for (let i = 0; i <= 10; i += 1) {
      const d = 0.5 + i * 0.1;
      const got = await settledReading({ particleEnergy: 3, barrierHeight: 9, barrierWidth: d, packetSigma: 1.2 });
      if (!got) {
        r.fail(`the lab protocol's d=${d.toFixed(1)} never settles`);
        continue;
      }
      widths.push(d);
      logs.push(Math.log(got.s.transmission_T));
      exactLogs.push(Math.log(packet(3, 9, d, 1.2)));
      r.near(`T in the lab protocol at d=${d.toFixed(1)}`, got.s.transmission_T, packet(3, 9, d, 1.2), 0.01);
      r.near(`norm at d=${d.toFixed(1)}`, got.s.norm, 1, 5e-7);
    }
    const meanD = widths.reduce((a, b) => a + b, 0) / widths.length;
    const slopeOf = (ys: number[]): number => {
      const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
      return widths.reduce((a, d, i) => a + (d - meanD) * (ys[i] - meanY), 0) / widths.reduce((a, d) => a + (d - meanD) ** 2, 0);
    };
    r.near('the lab protocol\'s slope of ln T against d, against the packet', slopeOf(logs), slopeOf(exactLogs), 0.005);
    r.near('the lab protocol\'s slope of ln T against d, as the guide states it', slopeOf(logs), -6.2, 0.005);

    // A reading belongs to one barrier: moving a barrier slider starts the run again, so an old T is never marked as
    // the new barrier's, and the new run settles on the new barrier's value. Setting a value it already has changes nothing.
    for (const [change, V0Now, dNow] of [[{ barrierWidth: 1.2 }, 8, 1.2], [{ barrierHeight: 10 }, 10, 1], [{ barrierPosition: 1 }, 8, 1]] as const) {
      const registration = SIMULATION_CATALOG['quantum-tunneling'];
      const engine: any = (await registration.load()).createEngine();
      engine.init({ ...registration.defaultParams });
      for (let i = 0; i < 2000 && !engine.getState().settled; i += 1) engine.step(DT);
      if (!engine.getState().settled) r.fail('the default run never settled');
      engine.setParameters({ barrierHeight: registration.defaultParams.barrierHeight });
      if (!engine.getState().settled) r.fail('setting a value the barrier already has cleared the reading');
      engine.setParameters(change);
      const moved = engine.getState();
      if (moved.settled || moved.time !== 0) r.fail(`after ${JSON.stringify(change)} the run did not start again (t=${moved.time}, settled=${moved.settled})`);
      for (let i = 0; i < 2000 && !engine.getState().settled; i += 1) engine.step(DT);
      const after = engine.getState();
      if (!after.settled) r.fail(`T never became readable after ${JSON.stringify(change)}`);
      r.near(`T after ${JSON.stringify(change)}`, after.transmission, packet(5, V0Now, dNow, 0.9), 0.02);
    }

    // After a bounce the mark stays off for that run, and a reset gives the next run its own reading.
    {
      const registration = SIMULATION_CATALOG['quantum-tunneling'];
      const engine: any = (await registration.load()).createEngine();
      engine.init({ ...registration.defaultParams });
      for (let i = 0; i < 4000; i += 1) engine.step(DT);
      if (!engine.getState().wallReached) r.fail('a default run went 20 s without reaching the edge of the box');
      engine.reset();
      for (let i = 0; i < 2000 && !engine.getState().settled; i += 1) engine.step(DT);
      if (!engine.getState().settled) r.fail('a reset run never settled: the wall mark survived the reset');
    }

    // The width the learner sets is the width drawn: the barrier's area is V0·d exactly, for widths that fall inside a
    // cell and widths that do not, and T falls steadily as the slider moves (no staircase).
    const V0 = 8;
    const readings: number[] = [];
    for (const d of [0.7, 0.8, 0.9, 1.0, 1.1, 1.2]) {
      const { state } = await run('quantum-tunneling', { barrierHeight: V0, barrierWidth: d }, 0);
      const dx = state.gridX[1] - state.gridX[0];
      const area = state.potential.reduce((a: number, v: number) => a + v, 0) * dx;
      r.near(`barrier area for d=${d}`, area, V0 * d, 1e-9);
      const got = await settledReading({ barrierHeight: V0, barrierWidth: d });
      if (got) readings.push(got.s.transmission_T);
      else r.fail(`T never became readable for d=${d}`);
    }
    for (let i = 1; i < readings.length; i += 1) {
      if (!(readings[i] < readings[i - 1] * 0.95)) r.fail(`T did not fall by at least 5 % between neighbouring widths (${readings[i - 1]} then ${readings[i]}): a staircase`);
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

    // The centre of mass stays on its straight line through the impact, on every step, even with very unequal masses
    // and the fastest closing speed; head-on and glancing. And a body's position after an impact and after a wall is where
    // the textbook puts it, not where the 5 ms step left it.
    for (const [ma, mb, b, rest] of [[10, 0.5, 0, 1], [0.5, 10, 0, 0], [10, 0.5, 0.4, 1], [4, 1, 0.3, 0.5]] as const) {
      const registration = SIMULATION_CATALOG['conservation-momentum'];
      const engine: any = (await registration.load()).createEngine();
      engine.init({ ...registration.defaultParams, mass1: ma, mass2: mb, velocity1: 10, velocity2: -10, impactParameter: b, restitution: rest });
      const Mt = ma + mb;
      const start = { x: (ma * -3.5 + mb * 3.5) / Mt, y: ((ma - mb) * (b / 2)) / Mt };
      const vcm = (10 * ma - 10 * mb) / Mt;
      let impacts = 0;
      for (let i = 0; i < 800; i += 1) {
        engine.step(DT);
        const now = engine.getState();
        if (now.wallContactCount > 0) break;
        impacts = now.collisionCount;
        r.near(`centre of mass x, m=${ma},${mb}, b=${b}`, now.comX, start.x + vcm * now.time, 1e-9, 1e-9);
        r.near(`centre of mass y, m=${ma},${mb}, b=${b}`, now.comY, start.y, 0, 1e-9);
      }
      if (impacts !== 1) r.fail(`set-up: m=${ma},${mb}, b=${b} had ${impacts} impacts before a wall`);
    }
    const hit = (7 - 0.7) / (v1 - v2); // the gap closes from 7 to two radii
    const after = await run('conservation-momentum', { mass1: m1, mass2: m2, velocity1: v1, velocity2: v2, impactParameter: 0, restitution: e }, 1);
    r.near('body 1 position after the impact', after.t.body1_x, -3.5 + v1 * hit + w1 * (after.t.t - hit), 1e-9);
    r.near('body 2 position after the impact', after.t.body2_x, 3.5 + v2 * hit + w2 * (after.t.t - hit), 1e-9);
    const walled = await run('conservation-momentum', { mass1: 2, mass2: 2, velocity1: -10, velocity2: 10, impactParameter: 0, restitution: 1 }, 0.5);
    r.near('body 1 position after the wall', walled.t.body1_x, -4.85 + 10 * (walled.t.t - 0.135), 1e-9);

    const table = async (overrides: Record<string, number>) => {
      const registration = SIMULATION_CATALOG['conservation-momentum'];
      const engine: any = (await registration.load()).createEngine();
      engine.init({ ...registration.defaultParams, ...overrides });
      return engine;
    };

    // Equal masses, head-on, e = 1: the discs swap velocities, so as a pair they move like two points that pass through
    // each other and bounce off the walls. Shrink each disc to a point by moving its wall in by one diameter's half: a point
    // then travels a triangle wave in ±4.5. This holds through walls and impacts in any order, arriving part-way through a
    // step, with no event logic of its own.
    const fold = (u: number) => {
      const span = 18;
      const wrapped = ((u + 4.5) % span + span) % span;
      return (wrapped <= 9 ? wrapped : span - wrapped) - 4.5;
    };
    for (const [va, vb] of [[-8, 5], [9.5, -6.5], [-10, -7.5], [3.5, 3], [10, 10], [0.5, -9]] as const) {
      const engine = await table({ mass1: 2, mass2: 2, velocity1: va, velocity2: vb, impactParameter: 0, restitution: 1 });
      for (let i = 1; i <= 2400; i += 1) {
        engine.step(DT);
        if (i % 7 !== 0) continue;
        const now = engine.getState();
        const [left, right] = [fold(-3.15 + va * now.time), fold(3.15 + vb * now.time)].sort((p, q) => p - q);
        r.near(`equal masses v=${va},${vb}, left disc at t=${now.time.toFixed(3)}`, now.body1.x, left - 0.35, 0, 1e-9);
        r.near(`equal masses v=${va},${vb}, right disc at t=${now.time.toFixed(3)}`, now.body2.x, right + 0.35, 0, 1e-9);
      }
    }

    // In one dimension nothing is chaotic, so the path cannot depend on the step: the order of events is the physics.
    // The last case traps a light disc, which rattles many times inside one step.
    for (const [ma, mb, va, vb, rest] of [[0.5, 2, -10, 5, 1], [10, 0.5, 7.5, -3, 1], [3, 1, 2.5, 10, 1], [0.5, 10, -10, -10, 0.05]] as const) {
      const a = await table({ mass1: ma, mass2: mb, velocity1: va, velocity2: vb, impactParameter: 0, restitution: rest });
      const b = await table({ mass1: ma, mass2: mb, velocity1: va, velocity2: vb, impactParameter: 0, restitution: rest });
      for (let i = 0; i < 2400; i += 1) {
        a.step(DT);
        for (let j = 0; j < 7; j += 1) b.step(DT / 7);
      }
      r.near(`m=${ma},${mb}: same path at a seventh of the step`, a.getState().body1.x, b.getState().body1.x, 0, 1e-6);
      r.near(`m=${ma},${mb}: same collisions at a seventh of the step`, a.getState().collisionCount, b.getState().collisionCount, 0);
    }

    // A pair that stops sticking at e = 0 comes to rest touching, against the wall, and a light disc trapped by a heavy one
    // ends the same way: the last collisions drain the motion into the wall. It is never pushed through.
    for (const [ma, mb, va, vb, left] of [[2, 2, 5, -3, 4.15], [0.5, 10, -3, -10, -4.85], [10, 0.5, 10, 10, 4.15]] as const) {
      const engine = await table({ mass1: ma, mass2: mb, velocity1: va, velocity2: vb, impactParameter: 0, restitution: 0 });
      for (let i = 0; i < 2400; i += 1) engine.step(DT);
      const now = engine.getState();
      r.near(`e = 0, m=${ma},${mb}: rests at the wall`, now.body1.x, left, 0, 1e-6);
      r.near(`e = 0, m=${ma},${mb}: rests touching`, now.body2.x - now.body1.x, 0.7, 0, 1e-9);
      r.near(`e = 0, m=${ma},${mb}: at rest`, now.totalKineticEnergy, 0, 0, 1e-9);
    }

    // One collision at e = 0, one count: rounding after it must not look like another.
    const stuck = await table({ mass1: 0.5, mass2: 10, velocity1: 5, velocity2: -10, impactParameter: 0, restitution: 0 });
    while (stuck.getState().body1.x > -4.4) stuck.step(DT);
    if (stuck.getState().collisionCount !== 1) r.fail(`one inelastic impact counted ${stuck.getState().collisionCount} times`);

    // A touch far shorter than one step is still a collision. Offset b of 0.7: n = (√(1 − (b/0.7)²), −b/0.7), and equal
    // masses swap the normal part of their velocity. Exactly at b = 0.7 the discs only brush, and nothing happens.
    const graze = 0.6995;
    const brush = await table({ mass1: 2, mass2: 2, velocity1: 10, velocity2: -10, impactParameter: graze, restitution: 1 });
    for (let i = 0; i < 70; i += 1) brush.step(DT);
    const nx = Math.sqrt(1 - (graze / 0.7) ** 2);
    const after2 = brush.getState();
    if (after2.collisionCount !== 1) r.fail(`a grazing touch counted ${after2.collisionCount} collisions`);
    r.near('grazing touch: v_x after', after2.body1.vx, 10 - 20 * nx * nx, 1e-9);
    r.near('grazing touch: v_y after', after2.body1.vy, 20 * nx * (graze / 0.7), 1e-9);
    const missed = await table({ mass1: 2, mass2: 2, velocity1: 10, velocity2: -10, impactParameter: 0.7, restitution: 1 });
    for (let i = 0; i < 70; i += 1) missed.step(DT);
    if (missed.getState().collisionCount !== 0) r.fail('discs that only brush at b = 0.7 counted a collision');

    // No setting of the sliders leaves the discs overlapping or off the table, at any moment.
    let tightest = Infinity;
    let widest = 0;
    for (const ma of [0.5, 2, 10]) for (const mb of [0.5, 10]) for (const va of [-10, -3, 5, 10]) for (const vb of [-10, -3, 3, 10]) for (const b of [0, 0.3, 0.6]) for (const rest of [0, 0.25, 0.5, 1]) {
      const engine = await table({ mass1: ma, mass2: mb, velocity1: va, velocity2: vb, impactParameter: b, restitution: rest });
      for (let i = 0; i < 1600; i += 1) {
        engine.step(DT);
        const { body1, body2 } = engine.getState();
        tightest = Math.min(tightest, Math.hypot(body2.x - body1.x, body2.y - body1.y));
        widest = Math.max(widest, Math.abs(body1.x), Math.abs(body2.x), Math.abs(body1.y) + 2.4, Math.abs(body2.y) + 2.4);
      }
    }
    if (tightest < 0.7 - 1e-9) r.fail(`discs overlapped: centres ${tightest} apart`);
    if (widest > 4.85 + 1e-9) r.fail(`a disc left the table: ${widest}`);

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
    // Fast circuits, where τ is far below the 5 ms step, as the sliders reach: the default RL circuit (τ = 1 ms), and the
    // fastest of each (RC τ = 0.1 ms, RL τ = 10 µs). Across a whole run the source does work = stored energy + heat.
    for (const [type, Rq, X, tauFast] of [[1, 100, 100, 1e-3], [0, 10, 10, 1e-4], [1, 1000, 10, 1e-5]] as const) {
      const { t: s } = await run('rc-rl-circuits', { ...slow, circuitType: type, resistance: Rq, capacitance: X, inductance: X, sourceVoltage: V }, 0.25);
      r.near(`τ (ms), type ${type}, R=${Rq}`, s.tau_ms, tauFast * 1e3, 1e-9);
      if (type === 1) {
        const settled = V / Rq;
        r.near(`RL settled current (mA), R=${Rq}`, s.current_mA, settled * 1e3, 1e-9);
        r.near(`RL settled v_L, R=${Rq}`, s.v_component, 0, 0, 1e-9);
        r.near(`RL stored energy (mJ), R=${Rq}`, s.stored_energy_mJ, 0.5 * X * 1e-3 * settled * settled * 1e3, 1e-9);
        // Heat closes the energy balance: V ∫ i dt = ½ L i² + heat, and ∫ i dt = (V/R)(t − τ) once settled.
        r.near(`RL heat (mJ), R=${Rq}`, s.heat_dissipated_mJ, (V * settled * (s.t - tauFast) - 0.5 * X * 1e-3 * settled * settled) * 1e3, 1e-6);
      } else {
        r.near(`RC settled v_C, R=${Rq}`, s.v_component, V, 1e-9);
        r.near(`RC settled current, R=${Rq}`, s.current_mA, 0, 0, 1e-6);
        r.near(`RC stored energy (mJ), R=${Rq}`, s.stored_energy_mJ, 0.5 * X * 1e-6 * V * V * 1e3, 1e-9);
        // A capacitor charged through R loses as much to heat as it stores, however fast.
        r.near(`RC heat (mJ), R=${Rq}`, s.heat_dissipated_mJ, 0.5 * X * 1e-6 * V * V * 1e3, 1e-6);
      }
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
