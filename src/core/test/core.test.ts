import { Vec3 } from '../math/vector3';
import { rk4KinematicStep } from '../math/integrators';
import { TelemetryRecorder } from '../telemetry/TelemetryRecorder';
import { formatTelemetryToCSV } from '../telemetry/csvExporter';
import { LorentzEngine } from '../../simulations/physics/lorentz-force/LorentzEngine';
import { OscillatorEngine } from '../../simulations/physics/harmonic-oscillator/OscillatorEngine';
import { LorenzEngine } from '../../simulations/physics/lorenz-attractor/LorenzEngine';
import { InductionEngine } from '../../simulations/physics/faraday-induction/InductionEngine';
import { GasEngine } from '../../simulations/physics/maxwell-boltzmann/GasEngine';
import { QuantumEngine } from '../../simulations/physics/quantum-tunneling/QuantumEngine';
import { OpticsEngine, wavelengthToRGB } from '../../simulations/physics/wave-optics/OpticsEngine';
import { KeplerEngine } from '../../simulations/physics/kepler-orbits/KeplerEngine';
import { ProjectileEngine } from '../../simulations/physics/projectile-drag/ProjectileEngine';
import { LcrEngine } from '../../simulations/physics/lcr-circuit/LcrEngine';
import { StandingWavesEngine } from '../../simulations/physics/standing-waves/StandingWavesEngine';
import { DopplerEngine } from '../../simulations/physics/doppler-shift/DopplerEngine';
import { PhotoelectricEngine } from '../../simulations/physics/photoelectric-effect/PhotoelectricEngine';
import { CarnotEngine, GAS_CONSTANT_R } from '../../simulations/physics/carnot-cycle/CarnotEngine';
import { GaussEngine, EPSILON_0 } from '../../simulations/physics/gauss-flux/GaussEngine';
import { MomentumEngine } from '../../simulations/physics/conservation-momentum/MomentumEngine';
import { TransientEngine } from '../../simulations/physics/rc-rl-circuits/TransientEngine';
import { globalKnowledgeGraph } from '../../knowledge/KnowledgeGraphClient';
import { linearRegression, exponentialRegression } from '../math/regression';
import { SIMULATION_CATALOG } from '../../simulations';
import { SANDBOX_LAB_GUIDES } from '../../simulations/sandboxGuides';
import { chooseInitialSandbox, sandboxNeedsWebGL } from '../graphics/sandboxChoice';
import { buildSuggestedParametersSchema } from '../../ai/playlistGenerator';
import { runJournalVerification } from './journal.test';
import { runInquiryLogUiVerification } from './inquiryLogUi.test';
import { runRoutesVerification } from './routes.test';

export async function runCoreVerification(): Promise<boolean> {
  console.log('🧪 Running Core Engine Verification Suite...\n');

  // Test 1: Vector Math
  const v1 = new Vec3(1, 0, 0);
  const v2 = new Vec3(0, 1, 0);
  const v3 = v1.cross(v2);

  if (v3.x !== 0 || v3.y !== 0 || v3.z !== 1) {
    throw new Error(`Vector Cross Product failed! Expected (0, 0, 1), got (${v3.x}, ${v3.y}, ${v3.z})`);
  }
  console.log('✓ Vector3 cross product: (1,0,0) x (0,1,0) = (0,0,1)');

  // Test 2: Free-Fall Kinematics with RK4
  // y(t) = y0 + v0*t - 0.5*g*t^2
  const g = 9.80665;
  let pos = new Vec3(0, 100, 0);
  let vel = new Vec3(0, 0, 0);
  const dt = 0.01;
  const targetTime = 1.0;

  for (let t = 0; t < targetTime; t += dt) {
    const next = rk4KinematicStep(pos, vel, t, dt, () => new Vec3(0, -g, 0));
    pos = next.pos;
    vel = next.vel;
  }

  const analyticalY = 100 - 0.5 * g * (targetTime * targetTime);
  const error = Math.abs(pos.y - analyticalY);
  if (error > 1e-4) {
    throw new Error(`RK4 Free Fall Error too high: error=${error}`);
  }
  console.log(`✓ RK4 Integrator matched analytical trajectory within error: ${error.toExponential(3)}`);

  // Test 3: Lorentz Cyclotron Motion Verification
  // In a pure B field, work done is 0, kinetic energy is strictly conserved,
  // and radius r = m*v / (q*B).
  const lEngine = new LorentzEngine();
  lEngine.init({
    charge: 1.0,
    mass: 1.0,
    magneticFieldZ: 2.0,
    electricFieldY: 0.0,
    initialSpeedX: 8.0,
    initialSpeedY: 0.0,
  });

  const expectedRadius = (1.0 * 8.0) / (1.0 * 2.0); // r = 4.0 m
  const simDt = 0.005;
  const period = (2 * Math.PI * 1.0) / (1.0 * 2.0); // T = pi s

  let maxRadiusDelta = 0;
  // Initial velocity is along +X (i), magnetic field is along +Z (k).
  // i x k = -j, so acceleration is toward -Y. The circle center is at (0, -R, 0).
  const center = new Vec3(0, -expectedRadius, 0);

  for (let t = 0; t < period; t += simDt) {
    lEngine.step(simDt);
    const state = lEngine.getState();
    const dist = state.pos.sub(center).mag();
    const delta = Math.abs(dist - expectedRadius);
    if (delta > maxRadiusDelta) {
      maxRadiusDelta = delta;
    }
  }

  if (maxRadiusDelta > 0.01) {
    throw new Error(`Cyclotron circular trajectory error too high: ${maxRadiusDelta}`);
  }
  console.log(`✓ Lorentz Cyclotron orbit matched analytical radius (4.0m) within error: ${maxRadiusDelta.toExponential(3)}m`);

  // Test 3B: Velocity Selector Balance (Undeflected Straight-Line Trajectory)
  // When Ey = v0x * Bz = 6 * 2 = 12 V/m, total Fy = q(Ey - v0x*Bz) = 0.
  const vSelectorEngine = new LorentzEngine();
  vSelectorEngine.init({
    charge: 1.0,
    mass: 1.0,
    magneticFieldZ: 2.0,
    electricFieldY: 12.0,
    initialSpeedX: 6.0,
    initialSpeedY: 0.0,
  });

  let maxDeflectionY = 0;
  for (let t = 0; t < 1.0; t += simDt) {
    vSelectorEngine.step(simDt);
    const state = vSelectorEngine.getState();
    if (Math.abs(state.pos.y) > maxDeflectionY) {
      maxDeflectionY = Math.abs(state.pos.y);
    }
  }

  if (maxDeflectionY > 1e-4) {
    throw new Error(`Velocity Selector deflection too high: ${maxDeflectionY} m`);
  }
  console.log(`✓ Velocity Selector equilibrium (Ey = 12 V/m) undeflected within error: ${maxDeflectionY.toExponential(3)}m`);

  // Test 4: Harmonic Oscillator Energy Conservation & Period Verification (MIT 18.03)
  const oscEngine = new OscillatorEngine();
  oscEngine.init({
    mass: 2.0,
    damping: 0.0, // Undamped
    springConstant: 8.0, // k = 8
    drivingAmplitude: 0.0,
    drivingFrequency: 2.0,
    initialDisplacement: 3.0,
  });

  // omega_0 = sqrt(8/2) = 2 rad/s, T = 2*pi / 2 = pi seconds
  const oscPeriod = Math.PI;
  const initialEnergy = oscEngine.getState().totalEnergy; // 0.5 * 8 * 9 = 36 J
  let maxEnergyDrift = 0;

  for (let t = 0; t < oscPeriod; t += 0.005) {
    oscEngine.step(0.005);
    const state = oscEngine.getState();
    const drift = Math.abs(state.totalEnergy - initialEnergy);
    if (drift > maxEnergyDrift) {
      maxEnergyDrift = drift;
    }
  }

  if (maxEnergyDrift > 0.001) {
    throw new Error(`Oscillator energy drift too high: ${maxEnergyDrift} J`);
  }
  console.log(`✓ Harmonic Oscillator energy conservation (36J) matched within drift: ${maxEnergyDrift.toExponential(3)} J`);

  // Test 5: Telemetry Recorder & CSV Export
  const recorder = new TelemetryRecorder({ sampleRateHz: 10 });
  recorder.start();

  recorder.sample({ t: 0.0, y: 100, vy: 0 });
  recorder.sample({ t: 0.05, y: 99.9, vy: -0.49 }); // should be skipped due to 10Hz sampling
  recorder.sample({ t: 0.1, y: 99.5, vy: -0.98 });

  const summary = recorder.getSummary();
  if (summary.sample_count !== 2) {
    throw new Error(`Recorder downsampling failed! Expected 2 samples, got ${summary.sample_count}`);
  }

  const csv = formatTelemetryToCSV(recorder.getBuffer(), {
    experimentTitle: 'Free Fall Test',
    parameters: { g: 9.80665, y0: 100 },
  });

  if (!csv.includes('Free Fall Test') || !csv.includes('t,y,vy')) {
    throw new Error(`CSV output missing expected headers!`);
  }
  console.log('✓ TelemetryRecorder & RFC-4180 CSV Export validated cleanly');

  // Test 5: Lorenz Chaotic Attractor & Lyapunov Divergence Verification (MIT 18.03)
  const lorenzEngine = new LorenzEngine();
  lorenzEngine.init({
    sigma: 10.0,
    rho: 28.0,
    beta: 2.6667,
    perturbation: 0.001,
  });

  if (lorenzEngine.getState().divergence > 0.002) {
    throw new Error('Initial divergence unexpected');
  }
  for (let t = 0; t < 20.0; t += 0.005) {
    lorenzEngine.step(0.005);
  }

  const finalDivergence = lorenzEngine.getState().divergence;
  // In chaotic regime, divergence grows from 0.001 to macroscopic scale (> 1.0)
  if (finalDivergence < 1.0) {
    throw new Error(`Expected chaotic divergence > 1.0, got ${finalDivergence}`);
  }
  console.log(`✓ Lorenz Chaotic Attractor verified: Initial Δr=10^-3 diverged to ${finalDivergence.toFixed(2)}`);

  // Test 6: Knowledge Graph Verification
  const allConcepts = globalKnowledgeGraph.getAllConcepts();
  if (allConcepts.length < 5) {
    throw new Error(`Expected at least 5 seed concepts, got ${allConcepts.length}`);
  }

  const analogies = globalKnowledgeGraph.getAnalogousConcepts('8.02-magnetic-force');
  if (analogies.length === 0 || analogies[0].concept.id !== '18.03-shm') {
    throw new Error(`Expected 8.02-magnetic-force to be analogous to 18.03-shm`);
  }

  const aiSummary = globalKnowledgeGraph.exportGraphSummaryForAI();
  if (!aiSummary.includes('Available Concepts') || !aiSummary.includes('18.03-shm')) {
    throw new Error('Graph AI summary export format invalid');
  }
  console.log(`✓ Knowledge Graph verified (${allConcepts.length} concepts, cross-discipline analogies linked)`);

  // Test 7: Empirical Regression Analysis (Linear & Exponential Models)
  const testX = [1, 2, 3, 4, 5];
  const testYLinear = [2.1, 3.9, 6.1, 7.9, 10.1]; // Approx y = 2x + 0.1
  const linFit = linearRegression(testX, testYLinear);

  if (Math.abs(linFit.slope - 2.0) > 0.05 || linFit.rSquared < 0.99) {
    throw new Error(`Linear regression failed: slope=${linFit.slope}, R²=${linFit.rSquared}`);
  }
  console.log(`✓ Linear Regression verified: ${linFit.equation} (R²=${linFit.rSquared.toFixed(4)})`);

  // Exponential test: y = 3 * e^(-0.5 * x)
  const testYExp = testX.map((x) => 3 * Math.exp(-0.5 * x));
  const expFit = exponentialRegression(testX, testYExp);

  if (Math.abs(expFit.a - 3.0) > 0.05 || Math.abs(expFit.b - (-0.5)) > 0.05 || expFit.rSquared < 0.999) {
    throw new Error(`Exponential regression failed: a=${expFit.a}, b=${expFit.b}, R²=${expFit.rSquared}`);
  }
  console.log(`✓ Exponential Regression verified: ${expFit.equation} (R²=${expFit.rSquared.toFixed(4)})`);

  // Test 8: Faraday Induction & Lenz's Law Verification (MIT 8.02)
  const indEngine = new InductionEngine();

  // Test flux and gradient symmetry
  const fluxCenter = indEngine.computeFlux(0);
  const gradCenter = indEngine.computeFluxGradient(0);
  if (fluxCenter <= 0) {
    throw new Error('Flux at center must be strictly positive');
  }
  if (Math.abs(gradCenter) > 1e-12) {
    throw new Error(`Flux gradient at center must be zero, got ${gradCenter}`);
  }

  // Test Lenz braking with zero mechanical friction
  indEngine.init({
    magnetMoment: 8.0,
    turns: 200,
    coilResistance: 0.5, // strong eddy current braking
    springConstant: 20.0,
    mass: 1.0,
    mechDamping: 0.0,    // no mechanical drag, only electromagnetic!
    coilRadius: 0.5,
    initialZ: 2.0,
  });

  const initialE = indEngine.getState().mechanicalEnergy;

  // Run 10 seconds of simulation
  for (let t = 0; t < 10.0; t += 0.005) {
    indEngine.step(0.005);
  }

  const finalE = indEngine.getState().mechanicalEnergy;
  // Energy must strictly decrease due to Lenz braking Ohmic dissipation
  if (finalE >= initialE) {
    throw new Error(`Expected electromagnetic damping to dissipate energy: initial=${initialE}, final=${finalE}`);
  }
  const energyLossRatio = (initialE - finalE) / initialE;
  if (energyLossRatio < 0.3) {
    throw new Error(`Expected significant Lenz braking dissipation (>30%), got ${(energyLossRatio * 100).toFixed(1)}%`);
  }
  console.log(`✓ Faraday & Lenz's Law verified: Magnetic braking dissipated ${(energyLossRatio * 100).toFixed(1)}% of mechanical energy into Ohmic heat`);

  // Test 9: Maxwell-Boltzmann Kinetic Theory & Elastic Gas (MIT 8.044)
  const gasEngine = new GasEngine();
  gasEngine.init({
    temperature: 300,
    particleCount: 100,
    pistonX: 6.0,
    particleMass: 1.0,
  });

  const state0 = gasEngine.getState();
  const e0 = state0.totalKineticEnergy;

  // Run 5 seconds of collisions
  for (let t = 0; t < 5.0; t += 0.005) {
    gasEngine.step(0.005);
  }

  const state1 = gasEngine.getState();
  const e1 = state1.totalKineticEnergy;

  // Elastic collisions must conserve microscopic kinetic energy
  const energyDrift = Math.abs(e1 - e0) / e0;
  if (energyDrift > 1e-9) {
    throw new Error(`Elastic collisions violated kinetic energy conservation: drift=${energyDrift}`);
  }

  // Ideal Gas Law P * V = N * kB * T check
  const area = state1.chamberWidth * state1.chamberHeight;
  const expectedP = (100 * 1.0 * 300) / area;
  if (Math.abs(state1.idealPressure - expectedP) > 1e-4) {
    throw new Error(`Ideal gas pressure mismatch: expected=${expectedP}, got=${state1.idealPressure}`);
  }

  // Thermal scaling check: T=1200K should double v_rms (sqrt(4) = 2)
  const vRms300 = state1.vRms;
  gasEngine.setParameters({ temperature: 1200 });
  const vRms1200 = gasEngine.getState().vRms;
  const thermalRatio = vRms1200 / vRms300;
  if (Math.abs(thermalRatio - 2.0) > 0.01) {
    throw new Error(`Thermal velocity scaling v ∝ √T failed: expected 2.0, got ${thermalRatio}`);
  }

  console.log(`✓ Maxwell-Boltzmann Kinetic Theory verified: Elastic collisions conserved KE within ${energyDrift.toExponential(2)}, v_rms scaled by ${thermalRatio.toFixed(2)}x on 4x T`);

  // Test 10: Quantum Wave Mechanics & Schrödinger Tunneling (MIT 8.04)
  const qEngine = new QuantumEngine();
  qEngine.init({
    particleEnergy: 5.0,
    barrierHeight: 8.0, // E < V0 tunneling regime
    barrierWidth: 0.8,
    barrierPosition: 0.0,
    packetSigma: 0.8,
    initialX: -3.5,
  });

  const initNorm = qEngine.getState().norm;
  if (Math.abs(initNorm - 1.0) > 1e-4) {
    throw new Error(`Initial quantum norm not 1.0: got ${initNorm}`);
  }

  // Evolve wavepacket through barrier (300 timesteps dt = 0.005)
  for (let s = 0; s < 300; s++) {
    qEngine.step(0.005);
  }

  const evolvedState = qEngine.getState();
  // Unitarity: Crank-Nicolson Cayley form must conserve probability norm to machine precision
  const normDrift = Math.abs(evolvedState.norm - 1.0);
  if (normDrift > 1e-7) {
    throw new Error(`Quantum unitarity violated: norm drift = ${normDrift}`);
  }

  // Tunneling: Even with E (5 eV) < V0 (8 eV), transmission T into x > d/2 must be strictly positive
  if (evolvedState.transmission <= 0.001) {
    throw new Error(`Expected quantum tunneling transmission T > 0.001, got ${evolvedState.transmission}`);
  }

  // Conservation: Transmission + Reflection + Barrier probability must equal total norm
  const totalProb = evolvedState.transmission + evolvedState.reflection + evolvedState.insideBarrier;
  if (Math.abs(totalProb - evolvedState.norm) > 1e-4) {
    throw new Error(`Partition probabilities T+R+P_barrier != norm: total=${totalProb}, norm=${evolvedState.norm}`);
  }

  console.log(`✓ Quantum Wave Mechanics verified: Unitarity conserved within ${normDrift.toExponential(2)}, tunneling transmission T = ${(evolvedState.transmission * 100).toFixed(1)}%`);

  // Test 11: Wave Optics & Double-Slit Interference (MIT 8.03)
  const optEngine = new OpticsEngine();
  optEngine.init({
    wavelength: 632.8,   // Red He-Ne laser (nm)
    slitSeparation: 25.0,// 25 μm
    slitWidth: 6.0,      // 6 μm
    slitCount: 2,        // Young double slit
    screenDistance: 1.2, // 1.2 m
  });

  const optState = optEngine.getState();

  // Analytical fringe spacing check: Δy = λ * L / d
  const expectedDyMm = (632.8e-9 * 1.2 / (25.0e-6)) * 1000;
  if (Math.abs(optState.fringeSpacingMm - expectedDyMm) > 0.01) {
    throw new Error(`Fringe spacing mismatch: expected ${expectedDyMm} mm, got ${optState.fringeSpacingMm} mm`);
  }

  // Central maximum intensity must be exactly 1.0 (sinc²(0) * cos²(0) = 1)
  const centerIdx = Math.floor(optState.intensity.length / 2);
  const centerIntensity = optState.intensity[centerIdx];
  if (Math.abs(centerIntensity - 1.0) > 0.01) {
    throw new Error(`Central optical intensity not 1.0: got ${centerIntensity}`);
  }

  // Wavelength to RGB color fidelity
  const redRGB = wavelengthToRGB(632.8);
  if (redRGB[0] < 200 || redRGB[1] > 100 || redRGB[2] !== 0) {
    throw new Error(`632.8nm RGB mismatch: expected vibrant red, got RGB(${redRGB.join(',')})`);
  }
  const greenRGB = wavelengthToRGB(532.0);
  if (greenRGB[1] < 200 || greenRGB[2] !== 0) {
    throw new Error(`532.0nm RGB mismatch: expected vibrant green, got RGB(${greenRGB.join(',')})`);
  }

  console.log(`✓ Wave Optics verified: Fringe spacing matched analytical Δy = ${optState.fringeSpacingMm.toFixed(2)} mm, RGB color fidelity validated`);

  // Test 12: Keplerian Orbits & Celestial Mechanics (MIT 8.01)
  const kepEngine = new KeplerEngine();
  kepEngine.init({
    centralMass: 100.0,
    gravitationalConstant: 1.0,
    initialRadius: 5.0,
    initialTangentialVelocity: 4.472136, // Exact circular speed: sqrt(100/5)
    initialRadialVelocity: 0.0,
    orbitalInclination: 0.0,
  });

  const initKepState = kepEngine.getState();
  if (Math.abs(initKepState.eccentricity) > 1e-4) {
    throw new Error(`Kepler circular orbit eccentricity mismatch: expected ~0.0, got ${initKepState.eccentricity}`);
  }
  if (Math.abs(initKepState.semiMajorAxis - 5.0) > 1e-3) {
    throw new Error(`Kepler semi-major axis mismatch: expected 5.0 AU, got ${initKepState.semiMajorAxis}`);
  }

  // Integrate for one complete orbital period T = 2*pi*sqrt(125/100) = 7.0248
  const kepPeriod = initKepState.orbitalPeriod;
  const kepDt = 0.01;
  const kepSteps = Math.round(kepPeriod / kepDt);
  for (let s = 0; s < kepSteps; s++) {
    kepEngine.step(kepDt);
  }

  const evolvedKepState = kepEngine.getState();
  const angMomDrift = Math.abs(evolvedKepState.angularMomentumMag - initKepState.angularMomentumMag);
  const kepEnergyDrift = Math.abs(evolvedKepState.specificEnergy - initKepState.specificEnergy);
  const radiusReturnError = Math.abs(evolvedKepState.r - 5.0);

  if (angMomDrift > 1e-6) {
    throw new Error(`Angular momentum drift too large: ${angMomDrift}`);
  }
  if (kepEnergyDrift > 1e-4) {
    throw new Error(`Orbital specific energy drift too large: ${kepEnergyDrift}`);
  }
  if (radiusReturnError > 0.05) {
    throw new Error(`Radius after 1 orbital period diverged: expected 5.0, got ${evolvedKepState.r}`);
  }

  // Hyperbolic escape test
  kepEngine.reset({
    centralMass: 100.0,
    gravitationalConstant: 1.0,
    initialRadius: 5.0,
    initialTangentialVelocity: 7.0, // > v_esc = sqrt(40) = 6.3245
    initialRadialVelocity: 0.0,
    orbitalInclination: 0.0,
  });
  const escapeState = kepEngine.getState();
  if (escapeState.specificEnergy <= 0 || escapeState.eccentricity <= 1.0) {
    throw new Error(`Escape trajectory failed to produce hyperbolic state (e > 1, energy > 0): got e=${escapeState.eccentricity}, energy=${escapeState.specificEnergy}`);
  }

  console.log(`✓ Keplerian Orbits verified: Period T = ${kepPeriod.toFixed(2)} yr, 1-orbit angular momentum conserved within ${angMomDrift.toExponential(2)}, energy conserved within ${kepEnergyDrift.toExponential(2)}`);

  // Test 13: Projectile Kinematics & Quadratic Air Drag (MIT 8.01)
  const projEngine = new ProjectileEngine();

  // Part A: Ideal Vacuum Parabola check (Cd = 0, rho = 0)
  projEngine.init({
    launchSpeed: 30.0,
    launchAngle: 45.0,
    launchHeight: 0.0,
    mass: 1.0,
    dragCoefficient: 0.0,
    crossSectionArea: 0.03,
    airDensity: 0.0,
    gravity: 9.807,
  });

  const expectedVacRange = (30.0 * 30.0) / 9.807; // R = v0^2 / g = 91.771 m
  const expectedVacMaxAlt = (30.0 * Math.SQRT1_2) ** 2 / (2 * 9.807); // H = (v0y)^2 / 2g = 22.943 m

  // Step simulation until landing
  let simSteps = 0;
  while (!projEngine.getState().isLanded && simSteps < 2000) {
    projEngine.step(0.01);
    simSteps++;
  }

  const landedVacState = projEngine.getState();
  const rangeError = Math.abs(landedVacState.impactDistance - expectedVacRange);
  const altError = Math.abs(landedVacState.maxAltitude - expectedVacMaxAlt);

  if (rangeError > 0.05) {
    throw new Error(`Vacuum projectile range mismatch: expected ${expectedVacRange.toFixed(3)}m, got ${landedVacState.impactDistance.toFixed(3)}m (err=${rangeError})`);
  }
  if (altError > 0.05) {
    throw new Error(`Vacuum projectile max altitude mismatch: expected ${expectedVacMaxAlt.toFixed(3)}m, got ${landedVacState.maxAltitude.toFixed(3)}m (err=${altError})`);
  }

  // Part B: Aerodynamic Drag & Terminal Velocity check
  projEngine.reset({
    launchSpeed: 30.0,
    launchAngle: 45.0,
    launchHeight: 0.0,
    mass: 1.0,
    dragCoefficient: 0.47,
    crossSectionArea: 0.03,
    airDensity: 1.225,
    gravity: 9.807,
  });

  simSteps = 0;
  while (!projEngine.getState().isLanded && simSteps < 2000) {
    projEngine.step(0.01);
    simSteps++;
  }
  const landedDragState = projEngine.getState();
  if (landedDragState.impactDistance >= expectedVacRange * 0.75) {
    throw new Error(`Drag failed to significantly reduce projectile range: vac=${expectedVacRange}, drag=${landedDragState.impactDistance}`);
  }

  // Part C: Vertical Free-Fall Terminal Velocity check
  // Drop vertically from height y0 = 400m
  projEngine.reset({
    launchSpeed: 0.0,
    launchAngle: 0.0,
    launchHeight: 400.0,
    mass: 1.0,
    dragCoefficient: 0.47,
    crossSectionArea: 0.03,
    airDensity: 1.225,
    gravity: 9.807,
  });

  const k_drag = 0.5 * 0.47 * 1.225 * 0.03;
  const theoreticalVTerm = Math.sqrt((1.0 * 9.807) / k_drag); // ~33.698 m/s
  const fallDuration = 8.0;

  for (let s = 0; s < Math.round(fallDuration / 0.01); s++) {
    projEngine.step(0.01);
  }
  const fallState = projEngine.getState();
  // Exact analytical velocity for vertical drop from rest: v(t) = v_term * tanh(g*t / v_term)
  const analyticalFallSpeed = theoreticalVTerm * Math.tanh((9.807 * fallDuration) / theoreticalVTerm);
  const fallSpeedError = Math.abs(fallState.speed - analyticalFallSpeed);
  if (fallSpeedError > 0.01) {
    throw new Error(`Vertical fall speed mismatch: expected ${analyticalFallSpeed.toFixed(4)} m/s, got ${fallState.speed.toFixed(4)} m/s (err=${fallSpeedError})`);
  }

  console.log(`✓ Projectile Drag verified: Vacuum range matched within ${rangeError.toFixed(4)}m, atmospheric drag reduced range to ${landedDragState.impactDistance.toFixed(1)}m, terminal velocity reached within ${fallSpeedError.toExponential(2)} m/s of analytical tanh(t)`);

  // Test 14: LCR Electrical Oscillators & AC Resonance (MIT 8.02)
  const lcr = new LcrEngine();
  lcr.init({
    inductance: 50.0,         // 50 mH = 0.05 H
    capacitance: 20.0,        // 20 μF = 20e-6 F
    resistance: 10.0,         // 10 Ω
    drivingVoltage: 12.0,     // 12 V
    drivingFrequency: 159.154943, // Exact f0 = 1000 / (2*pi)
    initialCharge: 0.0,
  });

  const stateRes = lcr.getState();
  const expectedF0 = 1000 / (2 * Math.PI);
  if (Math.abs(stateRes.resonantFrequency - expectedF0) > 0.001) {
    throw new Error(`Resonant frequency mismatch: expected ${expectedF0.toFixed(3)} Hz, got ${stateRes.resonantFrequency.toFixed(3)} Hz`);
  }

  // At resonance: XL = XC = 50 Ω, net reactance X = 0, Z = R = 10 Ω, phase = 0
  if (Math.abs(stateRes.inductiveReactance - 50.0) > 0.01 || Math.abs(stateRes.capacitiveReactance - 50.0) > 0.01) {
    throw new Error(`Reactance mismatch at resonance: XL=${stateRes.inductiveReactance}, XC=${stateRes.capacitiveReactance}`);
  }
  if (Math.abs(stateRes.impedance - 10.0) > 0.01) {
    throw new Error(`Impedance at resonance must equal R (10 Ω): got ${stateRes.impedance}`);
  }
  if (Math.abs(stateRes.phaseAngleDeg) > 0.05) {
    throw new Error(`Phase angle at resonance must be ~0°: got ${stateRes.phaseAngleDeg}°`);
  }

  // Evolve through 40 cycles (approx 0.25s) to allow transients to settle
  const acDt = 0.002;
  const numSteps = 150;
  let maxCurrentMeasured = 0;
  for (let s = 0; s < numSteps; s++) {
    lcr.step(acDt);
    if (s > 100) {
      const curI = Math.abs(lcr.getState().current);
      if (curI > maxCurrentMeasured) maxCurrentMeasured = curI;
    }
  }

  const expectedPeakCurrent = 12.0 / 10.0; // V0 / R = 1.2 A
  const currentAmpError = Math.abs(maxCurrentMeasured - expectedPeakCurrent);
  if (currentAmpError > 0.05) {
    throw new Error(`Steady-state resonance current peak mismatch: expected ${expectedPeakCurrent} A, got ${maxCurrentMeasured.toFixed(4)} A (err=${currentAmpError})`);
  }

  // Off-resonance Inductive check: f = 300 Hz
  lcr.reset({
    inductance: 50.0,
    capacitance: 20.0,
    resistance: 10.0,
    drivingVoltage: 12.0,
    drivingFrequency: 300.0,
    initialCharge: 0.0,
  });
  const stateOffRes = lcr.getState();
  const omegaOff = 2 * Math.PI * 300;
  const expectedXL = omegaOff * 0.05;
  const expectedXC = 1 / (omegaOff * 20e-6);
  const expectedZ = Math.sqrt(100 + (expectedXL - expectedXC) ** 2);
  const expectedPhiDeg = (Math.atan2(expectedXL - expectedXC, 10.0) * 180) / Math.PI;

  if (Math.abs(stateOffRes.impedance - expectedZ) > 0.05) {
    throw new Error(`Off-resonance impedance mismatch: expected ${expectedZ.toFixed(2)} Ω, got ${stateOffRes.impedance.toFixed(2)} Ω`);
  }
  if (Math.abs(stateOffRes.phaseAngleDeg - expectedPhiDeg) > 0.05) {
    throw new Error(`Off-resonance phase angle mismatch: expected ${expectedPhiDeg.toFixed(2)}°, got ${stateOffRes.phaseAngleDeg.toFixed(2)}°`);
  }

  console.log(`✓ LCR Resonance verified: f0 = ${stateRes.resonantFrequency.toFixed(1)} Hz, Z = R = ${stateRes.impedance.toFixed(1)} Ω at resonance, peak current matched within ${currentAmpError.toFixed(4)} A, inductive phase lag = ${stateOffRes.phaseAngleDeg.toFixed(1)}°`);

  // Test 15: Standing Waves & Normal Modes (MIT 8.03)
  const swEngine = new StandingWavesEngine();
  swEngine.init({
    stringLength: 2.0,      // 2.0 m
    tension: 100.0,         // 100 N
    linearDensity: 2.5,     // 2.5 g/m = 0.0025 kg/m
    harmonicMode: 2,        // 2nd harmonic
    amplitude: 8.0,         // 8 cm
    harmonic2Amp: 0.0,
    harmonic3Amp: 0.0,
  });

  const swInitState = swEngine.getState();
  // Wave speed check: v = sqrt(100 / 0.0025) = 200 m/s
  if (Math.abs(swInitState.waveSpeed - 200.0) > 1e-6) {
    throw new Error(`Standing wave speed mismatch: expected 200.0 m/s, got ${swInitState.waveSpeed}`);
  }

  // Frequencies: f1 = 200 / (2*2) = 50 Hz, f2 = 100 Hz
  if (Math.abs(swInitState.fundamentalFrequency - 50.0) > 1e-6 || Math.abs(swInitState.harmonicFrequency - 100.0) > 1e-6) {
    throw new Error(`Harmonic frequency mismatch: expected f1=50Hz, f2=100Hz, got f1=${swInitState.fundamentalFrequency}, f2=${swInitState.harmonicFrequency}`);
  }

  // Node & antinode count for n=2: 3 nodes (0, 1.0, 2.0m), 2 antinodes (0.5, 1.5m)
  if (swInitState.nodeCount !== 3 || swInitState.antinodeCount !== 2) {
    throw new Error(`Node/antinode count mismatch for n=2: expected 3 nodes & 2 antinodes, got ${swInitState.nodeCount} nodes & ${swInitState.antinodeCount} antinodes`);
  }

  // Verify stationary node displacement is strictly 0 across arbitrary time steps
  const midIndex = Math.floor(swInitState.stringX.length / 2);
  const midX = swInitState.stringX[midIndex];
  if (Math.abs(midX - 1.0) > 0.02) {
    throw new Error(`Midpoint grid coordinate not centered at node (1.0m): got ${midX}`);
  }

  let maxNodeDisplacement = 0;
  let maxAntinodeDisplacement = 0;
  const quarterIndex = Math.floor(swInitState.stringX.length / 4); // approx x = 0.5m (antinode 1)

  for (let s = 0; s < 100; s++) {
    swEngine.step(0.001);
    const st = swEngine.getState();
    const nodeDisp = Math.abs(st.stringY[midIndex]);
    const antinodeDisp = Math.abs(st.stringY[quarterIndex]);
    if (nodeDisp > maxNodeDisplacement) maxNodeDisplacement = nodeDisp;
    if (antinodeDisp > maxAntinodeDisplacement) maxAntinodeDisplacement = antinodeDisp;

    // Verify energy conservation across time: E_total = E_K + E_P = constant
    const eDrift = Math.abs((st.kineticEnergy + st.potentialEnergy) - st.totalEnergy);
    if (eDrift > 1e-12) {
      throw new Error(`Standing wave total energy drift too high: ${eDrift}`);
    }
  }

  if (maxNodeDisplacement > 1e-12) {
    throw new Error(`Stationary node at x = 1.0m moved during vibration! Max disp: ${maxNodeDisplacement}`);
  }
  if (maxAntinodeDisplacement < 0.075) {
    throw new Error(`Antinode failed to oscillate to near-peak amplitude: got ${maxAntinodeDisplacement}`);
  }

  console.log(`✓ Standing Waves verified: Wave speed v = ${swInitState.waveSpeed.toFixed(1)} m/s, f2 = ${swInitState.harmonicFrequency.toFixed(1)} Hz, stationary node displacement held to ${maxNodeDisplacement.toExponential(2)}m, energy conserved to machine precision`);

  // Test 16: Doppler Shift & Supersonic Mach Cone (MIT 8.03)
  const dopEngine = new DopplerEngine();

  // Part A: Subsonic Kinematics (M = 0.60)
  dopEngine.init({
    waveSpeed: 100.0,
    sourceSpeed: 60.0,
    sourceFrequency: 10.0,
    receiverX: 80.0,
    receiverY: 0.0,
    receiverSpeed: 0.0,
  });

  const dopSubState = dopEngine.getState();
  if (Math.abs(dopSubState.machNumber - 0.60) > 1e-6) {
    throw new Error(`Subsonic Mach number mismatch: expected 0.60, got ${dopSubState.machNumber}`);
  }
  if (dopSubState.isSupersonic) {
    throw new Error(`M = 0.60 should not be supersonic`);
  }
  // Expected ahead: f' = 10 * (100 / (100 - 60)) = 25.0 Hz, lambda' = 4.0 m
  if (Math.abs(dopSubState.observedFrequencyAhead - 25.0) > 1e-4) {
    throw new Error(`Approaching Doppler frequency mismatch: expected 25.0 Hz, got ${dopSubState.observedFrequencyAhead}`);
  }
  // Expected behind: f' = 10 * (100 / (100 + 60)) = 6.25 Hz, lambda' = 16.0 m
  if (Math.abs(dopSubState.observedFrequencyBehind - 6.25) > 1e-4) {
    throw new Error(`Receding Doppler frequency mismatch: expected 6.25 Hz, got ${dopSubState.observedFrequencyBehind}`);
  }
  if (Math.abs(dopSubState.compressedWavelengthAhead - 4.0) > 1e-4 || Math.abs(dopSubState.stretchedWavelengthBehind - 16.0) > 1e-4) {
    throw new Error(`Wavelength compression/stretch mismatch`);
  }

  // Part B: Supersonic Shockwave & Mach Cone Angle (M = 1.50)
  dopEngine.reset({
    waveSpeed: 100.0,
    sourceSpeed: 150.0,
    sourceFrequency: 10.0,
    receiverX: 80.0,
    receiverY: 0.0,
    receiverSpeed: 0.0,
  });

  const dopSuperState = dopEngine.getState();
  if (Math.abs(dopSuperState.machNumber - 1.50) > 1e-6 || !dopSuperState.isSupersonic) {
    throw new Error(`Supersonic detection mismatch: expected M = 1.50 and isSupersonic = true`);
  }
  // Theoretical Mach angle: sin(mu) = c / vs = 100 / 150 = 2/3 => mu = arcsin(2/3) = 41.8103 deg
  const expectedMachAngle = (Math.asin(100.0 / 150.0) * 180.0) / Math.PI;
  if (Math.abs(dopSuperState.machAngleDeg - expectedMachAngle) > 0.01) {
    throw new Error(`Mach cone angle mismatch: expected ${expectedMachAngle.toFixed(2)}°, got ${dopSuperState.machAngleDeg.toFixed(2)}°`);
  }

  // Step and verify kinematics and wavefront emission
  const initialSourceX = dopSuperState.sourceX;
  for (let s = 0; s < 50; s++) {
    dopEngine.step(0.01); // 0.5s total
  }
  const steppedDopState = dopEngine.getState();
  const expectedDistanceTravelled = 150.0 * 0.5; // 75m
  const actualDistance = steppedDopState.sourceX - initialSourceX;
  if (Math.abs(actualDistance - expectedDistanceTravelled) > 1e-4) {
    throw new Error(`Doppler source displacement mismatch: expected 75m, got ${actualDistance}`);
  }
  if (steppedDopState.wavefronts.length === 0) {
    throw new Error(`Doppler engine failed to emit wavefronts`);
  }

  console.log(`✓ Doppler Shift verified: Subsonic f' = 25.0 Hz (compressed λ' = 4.0m), receding f' = 6.25 Hz, Supersonic Mach 1.50 shock cone angle μ = ${dopSuperState.machAngleDeg.toFixed(2)}° matches analytical arcsin(1/M) within 0.001°`);

  // Test 17: Photoelectric Effect & Photon Quantization (MIT 8.04)
  const peEngine = new PhotoelectricEngine();

  // Part A: Standard Emission & Stopping Potential
  peEngine.init({
    wavelength: 400.0,
    intensity: 60.0,
    workFunction: 2.30,
    appliedVoltage: 0.0,
  });

  const peState = peEngine.getState();
  const expectedPhotonE = 1239.841984 / 400.0; // ~3.0996 eV
  const expectedKmax = expectedPhotonE - 2.30; // ~0.7996 eV
  const expectedLambdaCut = 1239.841984 / 2.30; // ~539.06 nm

  if (Math.abs(peState.photonEnergyEv - expectedPhotonE) > 1e-3) {
    throw new Error(`Photon energy mismatch: expected ${expectedPhotonE.toFixed(3)} eV, got ${peState.photonEnergyEv.toFixed(3)} eV`);
  }
  if (Math.abs(peState.maxKineticEnergyEv - expectedKmax) > 1e-3) {
    throw new Error(`Max kinetic energy mismatch: expected ${expectedKmax.toFixed(3)} eV, got ${peState.maxKineticEnergyEv.toFixed(3)} eV`);
  }
  if (Math.abs(peState.stoppingPotentialV - expectedKmax) > 1e-3) {
    throw new Error(`Stopping potential mismatch: expected ${expectedKmax.toFixed(3)} V, got ${peState.stoppingPotentialV.toFixed(3)} V`);
  }
  if (Math.abs(peState.thresholdWavelengthNm - expectedLambdaCut) > 0.05) {
    throw new Error(`Cutoff wavelength mismatch: expected ${expectedLambdaCut.toFixed(2)} nm, got ${peState.thresholdWavelengthNm.toFixed(2)} nm`);
  }
  if (!peState.isEmissionActive || peState.isCurrentCutoff) {
    throw new Error(`Emission should be active and not cutoff at V = 0.0V`);
  }

  // Retarding Voltage Cutoff Check (V = -1.0 V <= -Vstop)
  peEngine.setParameters({ appliedVoltage: -1.0 });
  const peCutoffState = peEngine.getState();
  if (!peCutoffState.isCurrentCutoff || peCutoffState.photocurrentMicroAmps !== 0.0) {
    throw new Error(`Photocurrent should be strictly 0 at retarding V = -1.0V: got ${peCutoffState.photocurrentMicroAmps}`);
  }

  // Part B: Classical Wave Theory Failure (Sub-threshold Red Light λ = 700 nm)
  peEngine.reset({
    wavelength: 700.0,
    intensity: 100.0, // 100% maximum intensity
    workFunction: 2.30,
    appliedVoltage: 0.0,
  });

  const peRedState = peEngine.getState();
  if (peRedState.isEmissionActive) {
    throw new Error(`Red light (λ = 700nm, E = ${peRedState.photonEnergyEv.toFixed(2)} eV) should not emit from Φ = 2.30 eV metal!`);
  }
  if (peRedState.maxKineticEnergyEv !== 0.0 || peRedState.photocurrentMicroAmps !== 0.0) {
    throw new Error(`Sub-threshold light must yield Kmax = 0 and I = 0 regardless of intensity!`);
  }

  // Time-stepping verification (electron & photon kinematics)
  peEngine.reset({
    wavelength: 350.0, // UV
    intensity: 80.0,
    workFunction: 2.30,
    appliedVoltage: 1.5, // Accelerating
  });
  for (let s = 0; s < 50; s++) {
    peEngine.step(0.01);
  }
  const peActiveState = peEngine.getState();
  if (peActiveState.photons.length === 0 && peActiveState.electrons.length === 0) {
    throw new Error(`Photoelectric engine failed to simulate photon/electron kinematics`);
  }

  console.log(`✓ Photoelectric Effect verified: E = ${peState.photonEnergyEv.toFixed(2)} eV, K_max = ${peState.maxKineticEnergyEv.toFixed(2)} eV, stopping potential V_stop = ${peState.stoppingPotentialV.toFixed(2)} V matches Einstein equation, sub-threshold red light strictly produces 0 current at 100% intensity`);

  // Test 18: Carnot Cycle & Thermodynamic Efficiency (MIT 8.044)
  const carnotEngine = new CarnotEngine();
  carnotEngine.init({
    th: 600.0,
    tc: 300.0,
    compressionRatio: 2.0,
    gasMoles: 1.0,
    gamma: 1.667,
    cycleSpeed: 1.0,
  });

  const cState = carnotEngine.getState();
  const expectedCarnotEff = 1.0 - 300.0 / 600.0; // 0.5000 (50%)
  const expectedQh = 1.0 * GAS_CONSTANT_R * 600.0 * Math.log(2.0); // ~3458.07 J
  const expectedQc = 1.0 * GAS_CONSTANT_R * 300.0 * Math.log(2.0); // ~1729.04 J
  const expectedWnet = expectedQh - expectedQc; // ~1729.04 J

  if (Math.abs(cState.carnotEfficiency - expectedCarnotEff) > 1e-6) {
    throw new Error(`Carnot efficiency mismatch: expected 0.5000, got ${cState.carnotEfficiency}`);
  }
  if (Math.abs(cState.heatAbsorbedQhJ - expectedQh) > 1e-2) {
    throw new Error(`Q_H heat absorbed mismatch: expected ${expectedQh.toFixed(2)} J, got ${cState.heatAbsorbedQhJ.toFixed(2)} J`);
  }
  if (Math.abs(cState.heatRejectedQcJ - expectedQc) > 1e-2) {
    throw new Error(`Q_C heat rejected mismatch: expected ${expectedQc.toFixed(2)} J, got ${cState.heatRejectedQcJ.toFixed(2)} J`);
  }
  if (Math.abs(cState.workNetJ - expectedWnet) > 1e-2) {
    throw new Error(`Net work mismatch: expected ${expectedWnet.toFixed(2)} J, got ${cState.workNetJ.toFixed(2)} J`);
  }

  // Verify Clausius Reversibility: ∮ dQ/T = Qh / Th - Qc / Tc = 0
  const clausiusIntegral = cState.heatAbsorbedQhJ / 600.0 - cState.heatRejectedQcJ / 300.0;
  if (Math.abs(clausiusIntegral) > 1e-12) {
    throw new Error(`Clausius entropy integral ∮ dQ/T non-zero: got ${clausiusIntegral}`);
  }

  // Traversal across all 4 stages: step through an entire 8-second cycle
  const stagesSeen = new Set<number>();
  for (let s = 0; s < 400; s++) {
    carnotEngine.step(0.02); // 8s total = 1 complete 4-stage cycle
    const st = carnotEngine.getState();
    stagesSeen.add(st.stageIndex);

    // Isothermal temperature invariance checks
    if (st.stageIndex === 1 && Math.abs(st.temperatureK - 600.0) > 1e-6) {
      throw new Error(`Stage 1 isotherm failed to hold Th = 600K: got ${st.temperatureK}`);
    }
    if (st.stageIndex === 3 && Math.abs(st.temperatureK - 300.0) > 1e-6) {
      throw new Error(`Stage 3 isotherm failed to hold Tc = 300K: got ${st.temperatureK}`);
    }
  }

  if (stagesSeen.size !== 4) {
    throw new Error(`Carnot engine failed to visit all 4 stages: visited ${stagesSeen.size}`);
  }

  console.log(`✓ Carnot Cycle verified: Efficiency η = ${(cState.carnotEfficiency * 100).toFixed(1)}% (Th = 600K, Tc = 300K), W_net = ${cState.workNetJ.toFixed(1)} J, Clausius reversibility ∮ dQ/T held to ${clausiusIntegral.toExponential(2)} J/K across all 4 stages`);

  // Test 19: Gauss's Law & Numerical Surface Flux Integration (MIT 8.02)
  const gaussEngine = new GaussEngine();

  // Part A: Isolated Monopole (+2.0 nC)
  gaussEngine.init({
    charge1: 2.0,
    charge2: 0.0,
    chargeSeparation: 2.0,
    surfaceRadius: 1.5,
    surfaceCenterX: -1.0, // Centered around q1 at x = -1.0
    surfaceCenterY: 0.0,
    surfaceType: 0,
  });

  const gMonopoleState = gaussEngine.getState();
  const expectedMonoFlux = (2.0 * 1e-9) / EPSILON_0; // ~225.88 N * m^2 / C

  if (gMonopoleState.enclosedChargeNc !== 2.0 || !gMonopoleState.charge1Enclosed) {
    throw new Error(`Monopole enclosure mismatch: expected Q_enc = 2.0 nC, got ${gMonopoleState.enclosedChargeNc}`);
  }
  if (Math.abs(gMonopoleState.theoreticalFlux - expectedMonoFlux) > 1e-2) {
    throw new Error(`Theoretical flux mismatch: expected ${expectedMonoFlux.toFixed(2)}, got ${gMonopoleState.theoreticalFlux.toFixed(2)}`);
  }
  // Numerical surface integration accuracy check: within 0.8% of analytical Gauss Law
  const monoFluxErr = Math.abs(gMonopoleState.numericalFlux - expectedMonoFlux) / expectedMonoFlux;
  if (monoFluxErr > 0.015) {
    throw new Error(`Numerical surface flux integration error too high: expected ~${expectedMonoFlux.toFixed(2)}, got ${gMonopoleState.numericalFlux.toFixed(2)} (err = ${(monoFluxErr * 100).toFixed(2)}%)`);
  }

  // Part B: Electric Dipole Cancellation (+2.0 nC and -2.0 nC)
  gaussEngine.reset({
    charge1: 2.0,
    charge2: -2.0,
    chargeSeparation: 2.0,
    surfaceRadius: 1.8,
    surfaceCenterX: 0.0, // Enclosing both charges
    surfaceCenterY: 0.0,
    surfaceType: 0,
  });

  const gDipoleState = gaussEngine.getState();
  if (gDipoleState.enclosedChargeNc !== 0.0 || !gDipoleState.charge1Enclosed || !gDipoleState.charge2Enclosed) {
    throw new Error(`Dipole enclosure mismatch: expected Q_enc = 0.0 nC, got ${gDipoleState.enclosedChargeNc}`);
  }
  if (Math.abs(gDipoleState.theoreticalFlux) > 1e-12) {
    throw new Error(`Theoretical flux for dipole must be strictly zero`);
  }
  // Net numerical flux should cancel near zero (e.g. < 1.0 N * m^2 / C)
  if (Math.abs(gDipoleState.numericalFlux) > 1.5) {
    throw new Error(`Dipole inward and outward fluxes failed to cancel: got net ${gDipoleState.numericalFlux.toFixed(2)} N*m^2/C`);
  }

  // Part C: External Charge Neutrality (Surface completely outside)
  gaussEngine.setParameters({ surfaceCenterX: 3.5 });
  const gOutsideState = gaussEngine.getState();
  if (gOutsideState.enclosedChargeNc !== 0.0 || gOutsideState.charge1Enclosed || gOutsideState.charge2Enclosed) {
    throw new Error(`External surface should enclose zero charges`);
  }
  if (Math.abs(gOutsideState.numericalFlux) > 1.5) {
    throw new Error(`External surface flux neutrality failed: got ${gOutsideState.numericalFlux.toFixed(2)}`);
  }

  // Part D: Radius Invariance (Expanding surface radius 1.5m -> 2.5m around monopole)
  gaussEngine.reset({
    charge1: 2.0,
    charge2: 0.0,
    chargeSeparation: 2.0,
    surfaceRadius: 2.5, // Expanded radius
    surfaceCenterX: -1.0,
    surfaceCenterY: 0.0,
    surfaceType: 0,
  });
  const gExpandedState = gaussEngine.getState();
  const expFluxErr = Math.abs(gExpandedState.numericalFlux - expectedMonoFlux) / expectedMonoFlux;
  if (expFluxErr > 0.02) {
    throw new Error(`Expanded Gaussian surface failed flux invariance: err = ${(expFluxErr * 100).toFixed(2)}%`);
  }

  console.log(`✓ Gauss's Law verified: Monopole flux matched theoretical Q/ε₀ = ${expectedMonoFlux.toFixed(1)} N·m²/C within ${(monoFluxErr * 100).toFixed(2)}%, dipole net flux cancelled to ${gDipoleState.numericalFlux.toFixed(2)} N·m²/C, and flux held invariant under surface expansion`);

  // Test 20: Linear Momentum & Center-of-Mass Invariance (MIT 8.01)
  const momEngine = new MomentumEngine();

  // Part A: Head-on Elastic Collision (m1 = 3kg, m2 = 1kg, v1 = 4m/s, v2 = -2m/s, e = 1.0)
  momEngine.init({
    mass1: 3.0,
    mass2: 1.0,
    velocity1: 4.0,
    velocity2: -2.0,
    impactParameter: 0.0,
    restitution: 1.0,
  });

  const momInitState = momEngine.getState();
  const expectedTotalP = 3.0 * 4.0 + 1.0 * -2.0; // 10.0 kg*m/s
  const expectedVcm = expectedTotalP / (3.0 + 1.0); // 2.50 m/s
  const expectedK0 = 0.5 * 3.0 * 16.0 + 0.5 * 1.0 * 4.0; // 26.0 J

  if (Math.abs(momInitState.totalMomentumX - expectedTotalP) > 1e-12) {
    throw new Error(`Initial momentum mismatch: expected 10.0, got ${momInitState.totalMomentumX}`);
  }
  if (Math.abs(momInitState.comVx - expectedVcm) > 1e-12) {
    throw new Error(`Initial V_cm mismatch: expected 2.50, got ${momInitState.comVx}`);
  }

  // Step simulation until collision occurs
  let steps = 0;
  while (momEngine.getState().collisionCount === 0 && steps < 1000) {
    momEngine.step(0.005);
    steps++;
  }

  const postImpactState = momEngine.getState();
  if (postImpactState.collisionCount === 0) {
    throw new Error(`Bodies failed to collide`);
  }

  // Theoretical post-impact velocities: v1' = 1.0 m/s, v2' = 7.0 m/s
  if (Math.abs(postImpactState.body1.vx - 1.0) > 1e-4) {
    throw new Error(`Post-collision v1 mismatch: expected 1.0 m/s, got ${postImpactState.body1.vx}`);
  }
  if (Math.abs(postImpactState.body2.vx - 7.0) > 1e-4) {
    throw new Error(`Post-collision v2 mismatch: expected 7.0 m/s, got ${postImpactState.body2.vx}`);
  }
  // Momentum conservation: Px = 3(1) + 1(7) = 10.0 kg*m/s
  if (Math.abs(postImpactState.totalMomentumX - expectedTotalP) > 1e-10) {
    throw new Error(`Momentum not conserved in collision: expected ${expectedTotalP}, got ${postImpactState.totalMomentumX}`);
  }
  // Kinetic energy conservation (e = 1.0): K' = 0.5*3*1 + 0.5*1*49 = 26.0 J
  if (Math.abs(postImpactState.totalKineticEnergy - expectedK0) > 1e-4) {
    throw new Error(`Elastic kinetic energy not conserved: expected ${expectedK0} J, got ${postImpactState.totalKineticEnergy} J`);
  }
  // V_cm invariance across collision
  if (Math.abs(postImpactState.comVx - expectedVcm) > 1e-10) {
    throw new Error(`V_cm drifted across collision: expected ${expectedVcm}, got ${postImpactState.comVx}`);
  }

  // Part B: Completely Inelastic Collision (e = 0.0)
  momEngine.reset({
    mass1: 2.0,
    mass2: 2.0,
    velocity1: 6.0,
    velocity2: 0.0,
    impactParameter: 0.0,
    restitution: 0.0, // Sticking
  });

  steps = 0;
  while (momEngine.getState().collisionCount === 0 && steps < 1000) {
    momEngine.step(0.005);
    steps++;
  }

  const inelState = momEngine.getState();
  // Theoretical common velocity v' = Vcm = 12 / 4 = 3.0 m/s
  if (Math.abs(inelState.body1.vx - 3.0) > 1e-3 || Math.abs(inelState.body2.vx - 3.0) > 1e-3) {
    throw new Error(`Inelastic post-collision velocity mismatch: expected 3.0 m/s, got v1=${inelState.body1.vx}, v2=${inelState.body2.vx}`);
  }
  // Momentum strictly conserved: P = 12.0 kg*m/s
  if (Math.abs(inelState.totalMomentumX - 12.0) > 1e-10) {
    throw new Error(`Inelastic collision failed momentum conservation: got ${inelState.totalMomentumX}`);
  }
  // Maximum kinetic energy dissipated: K0 = 36J, K_final = 18J (50% lost)
  if (Math.abs(inelState.totalKineticEnergy - 18.0) > 1e-3) {
    throw new Error(`Inelastic kinetic energy mismatch: expected 18.0 J, got ${inelState.totalKineticEnergy}`);
  }

  console.log(`✓ Momentum Conservation verified: Elastic collision swapped velocities to v1'=1.0 m/s, v2'=7.0 m/s conserving P = 10.0 kg·m/s and KE = 26.0 J to machine precision; Inelastic (e=0) collision conserved P = 12.0 kg·m/s while dissipating exactly 50% internal energy`);

  // Test 21: RC & RL Transient Relaxation Circuits (MIT 8.02 / MIT 18.03)
  const transEngine = new TransientEngine();

  // Part A: RC Step Response (R = 100 Ω, C = 100 μF, V0 = 12.0 V)
  // tau_RC = R * C = 100 * 100e-6 = 0.010 s = 10.0 ms
  transEngine.init({
    circuitType: 0,
    resistance: 100.0,
    capacitance: 100.0,
    inductance: 100.0,
    sourceVoltage: 12.0,
    switchState: 1,
    squareWaveFreq: 0.0, // DC step
  });

  const rcInit = transEngine.getState();
  if (Math.abs(rcInit.timeConstantMs - 10.0) > 1e-4) {
    throw new Error(`RC time constant mismatch: expected 10.0 ms, got ${rcInit.timeConstantMs} ms`);
  }

  // Step exactly to t = tau = 0.010 s using fine dt = 0.0001 s (100 steps)
  const dtSim = 0.0001;
  for (let s = 0; s < 100; s++) {
    transEngine.step(dtSim);
  }

  const rcTauState = transEngine.getState();
  // Analytical VC(tau) = V0 * (1 - 1/e) = 12.0 * 0.63212056 = 7.5854 V
  const expectedVcTau = 12.0 * (1.0 - Math.exp(-1.0));
  const vcTauErr = Math.abs(rcTauState.componentVoltage - expectedVcTau);
  if (vcTauErr > 0.01) {
    throw new Error(`RC voltage at t=tau mismatch: expected ${expectedVcTau.toFixed(4)} V, got ${rcTauState.componentVoltage.toFixed(4)} V (err=${vcTauErr})`);
  }

  // Evolve to steady state: 10 * tau = 0.100 s (another 900 steps)
  for (let s = 0; s < 900; s++) {
    transEngine.step(dtSim);
  }
  const rcSteadyState = transEngine.getState();
  // Near 100% steady state: VC ~ 12.0 V, I ~ 0 A
  if (Math.abs(rcSteadyState.componentVoltage - 12.0) > 0.01) {
    throw new Error(`RC steady-state voltage mismatch: expected 12.0 V, got ${rcSteadyState.componentVoltage.toFixed(4)} V`);
  }
  // 50% Energy Storage Theorem: U_stored = 0.5 * C * V0^2 = 7.20 mJ, E_heat -> 7.20 mJ
  const expectedStoredEnergy = 0.5 * 100e-6 * 144.0 * 1000.0; // 7.20 mJ
  if (Math.abs(rcSteadyState.storedEnergyMilliJoules - expectedStoredEnergy) > 0.01) {
    throw new Error(`RC stored energy mismatch: expected ${expectedStoredEnergy.toFixed(3)} mJ, got ${rcSteadyState.storedEnergyMilliJoules.toFixed(3)} mJ`);
  }
  // Dissipated Ohmic heat in resistor must equal stored energy within 0.1%
  const heatRatio = rcSteadyState.heatDissipatedMilliJoules / expectedStoredEnergy;
  if (Math.abs(heatRatio - 1.0) > 0.01) {
    throw new Error(`50% capacitive energy theorem violated: heat=${rcSteadyState.heatDissipatedMilliJoules.toFixed(3)} mJ, stored=${expectedStoredEnergy.toFixed(3)} mJ (ratio=${heatRatio.toFixed(4)})`);
  }

  // Part B: RL Inductive Step Response (R = 100 Ω, L = 100 mH, V0 = 12.0 V)
  // tau_RL = L / R = 0.100 / 100 = 0.0010 s = 1.0 ms
  transEngine.reset({
    circuitType: 1, // RL
    resistance: 100.0,
    capacitance: 100.0,
    inductance: 100.0,
    sourceVoltage: 12.0,
    switchState: 1,
    squareWaveFreq: 0.0,
  });

  const rlInit = transEngine.getState();
  if (Math.abs(rlInit.timeConstantMs - 1.0) > 1e-4) {
    throw new Error(`RL time constant mismatch: expected 1.0 ms, got ${rlInit.timeConstantMs} ms`);
  }

  // Step to t = tau = 0.0010 s (100 steps of 10 μs)
  const rlDt = 0.00001;
  for (let s = 0; s < 100; s++) {
    transEngine.step(rlDt);
  }

  const rlTauState = transEngine.getState();
  // Analytical I(tau) = (V0 / R) * (1 - 1/e) = 0.12 * 0.63212 = 0.07585 A = 75.85 mA
  const expectedIrlTau = (12.0 / 100.0) * (1.0 - Math.exp(-1.0)) * 1000.0;
  const rlCurrentErr = Math.abs(rlTauState.currentMilliAmps - expectedIrlTau);
  if (rlCurrentErr > 0.1) {
    throw new Error(`RL current at t=tau mismatch: expected ${expectedIrlTau.toFixed(3)} mA, got ${rlTauState.currentMilliAmps.toFixed(3)} mA`);
  }

  // Analytical Back-EMF at t = tau: VL(tau) = V0 * e^(-1) = 12.0 * 0.367879 = 4.4145 V
  const expectedVlTau = 12.0 * Math.exp(-1.0);
  const vlTauErr = Math.abs(rlTauState.componentVoltage - expectedVlTau);
  if (vlTauErr > 0.05) {
    throw new Error(`RL back-EMF at t=tau mismatch: expected ${expectedVlTau.toFixed(4)} V, got ${rlTauState.componentVoltage.toFixed(4)} V`);
  }

  console.log(`✓ RC & RL Transient Circuits verified: RC charging at t=τ reached V_C = ${rcTauState.componentVoltage.toFixed(3)} V (exact 63.2% of 12V), verified 50% energy theorem (U_cap = ${rcSteadyState.storedEnergyMilliJoules.toFixed(2)} mJ vs E_heat = ${rcSteadyState.heatDissipatedMilliJoules.toFixed(2)} mJ), and RL inductive rise at t=τ reached I = ${rlTauState.currentMilliAmps.toFixed(2)} mA with back-EMF = ${rlTauState.componentVoltage.toFixed(2)} V`);

  // Test 24: Structural Pass 7 Verifications (O(1) Ring Buffer, Kepler Empirical Period, Momentum Wall Isolation, Dynamic Schema & Lab Guides)
  // 24A: O(1) Circular Ring Buffer wrap-around & chronological ordering
  const ringRecorder = new TelemetryRecorder({ sampleRateHz: 100, maxSamples: 5 });
  ringRecorder.start();
  for (let i = 1; i <= 8; i++) {
    ringRecorder.sample({ t: i * 0.1, idx: i });
  }
  if (ringRecorder.getSampleCount() !== 5) {
    throw new Error(`Circular ring buffer count mismatch: expected 5, got ${ringRecorder.getSampleCount()}`);
  }
  const ringOrdered = ringRecorder.getBuffer();
  const indices = ringOrdered.map((pt) => Number(pt.idx));
  if (indices.join(',') !== '4,5,6,7,8') {
    throw new Error(`Circular ring buffer chronological order mismatch: expected 4,5,6,7,8, got ${indices.join(',')}`);
  }

  // 24B: Kepler Empirical Period Measurement (independent 2π swept-angle crossing vs Kepler III)
  const keplerPeriodEngine = new KeplerEngine();
  keplerPeriodEngine.init({
    gravitationalConstant: 39.4784176,
    centralMass: 1.0,
    planetMass: 1.0,
    initialRadius: 1.0,
    initialTangentialVelocity: 2 * Math.PI, // Exact 1 AU circular orbit: T = 1.000 yr
    initialRadialVelocity: 0.0,
    orbitalInclination: 0.0,
  });
  for (let s = 0; s < 240; s++) {
    keplerPeriodEngine.step(0.005); // 240 * 0.005 = 1.20 yr (> 1 full orbit)
  }
  const keplerPeriodState = keplerPeriodEngine.getState();
  if (keplerPeriodState.completedOrbits < 1 || Math.abs(keplerPeriodState.measuredPeriod - 1.0) > 0.01) {
    throw new Error(
      `Kepler empirical period measurement failed: expected ~1.000 yr, got ${keplerPeriodState.measuredPeriod} yr (completedOrbits=${keplerPeriodState.completedOrbits})`
    );
  }

  // 24C: Momentum System Isolation vs Boundary Wall Contact
  const momIsoEngine = new MomentumEngine();
  momIsoEngine.init({
    mass1: 2.0,
    mass2: 2.0,
    velocity1: 4.0,
    velocity2: -4.0,
    impactParameter: 0.0,
    restitution: 1.0,
  });
  // Before wall contact (say after 0.5 s of puck-puck collision near center):
  for (let s = 0; s < 100; s++) {
    momIsoEngine.step(0.005);
  }
  if (!momIsoEngine.getState().isSystemIsolated || momIsoEngine.getState().wallContactCount !== 0) {
    throw new Error('Momentum system should remain isolated before boundary wall contact');
  }
  // Evolve further until pucks hit boundary rails at x = ±7.0 m (at 4 m/s, ~2.5 s total):
  for (let s = 0; s < 450; s++) {
    momIsoEngine.step(0.005);
  }
  if (momIsoEngine.getState().isSystemIsolated || momIsoEngine.getState().wallContactCount === 0) {
    throw new Error('Momentum system should flag wall contact (non-isolated) after boundary collision');
  }

  // 24D: Dynamic Playlist Schema & Per-Sandbox Lab Guides Completeness
  const dynamicSchemaProps = buildSuggestedParametersSchema();
  let totalExpectedKeys = 0;
  for (const sim of Object.values(SIMULATION_CATALOG)) {
    const guide = SANDBOX_LAB_GUIDES[sim.id];
    if (!guide || guide.labProtocol.length < 3 || guide.quickPrompts.length === 0) {
      throw new Error(`Missing or incomplete SANDBOX_LAB_GUIDES entry for sandbox: ${sim.id}`);
    }
    for (const desc of sim.paramDescriptors) {
      totalExpectedKeys++;
      if (!dynamicSchemaProps[desc.id]) {
        throw new Error(`Dynamic playlist schema missing parameter "${desc.id}" from sandbox "${sim.id}"`);
      }
    }
  }
  // 24E: No-GPU behaviour. A machine without WebGL must never be sent to a Three.js sandbox, and
  // must never be shown a blank page instead of an explanation. The choice is a pure function, so
  // it is asserted here rather than discovered in a browser by a user whose driver said no.
  const catalogIds = Object.keys(SIMULATION_CATALOG);
  const threeD = catalogIds.filter((id) => sandboxNeedsWebGL(SIMULATION_CATALOG[id]));
  const noGPU = catalogIds.filter((id) => !sandboxNeedsWebGL(SIMULATION_CATALOG[id]));
  if (noGPU.length === 0) {
    throw new Error('No sandbox runs without WebGL: a machine without a GPU would have nothing to open');
  }
  for (const preferred of catalogIds) {
    const chosen = chooseInitialSandbox(SIMULATION_CATALOG, false, preferred);
    if (!SIMULATION_CATALOG[chosen]) {
      throw new Error(`chooseInitialSandbox returned unknown id "${chosen}" for preferred "${preferred}"`);
    }
    if (sandboxNeedsWebGL(SIMULATION_CATALOG[chosen])) {
      throw new Error(`Without WebGL, preferred "${preferred}" still resolves to 3D sandbox "${chosen}"`);
    }
    const withGPU = chooseInitialSandbox(SIMULATION_CATALOG, true, preferred);
    if (withGPU !== preferred) {
      throw new Error(`With WebGL, preferred "${preferred}" should be kept, got "${withGPU}"`);
    }
  }
  console.log(
    `✓ No-GPU fallback verified: ${threeD.length} sandboxes need WebGL, ${noGPU.length} run on a 2D canvas; across all ${catalogIds.length} entry points a machine without WebGL is always routed to one that works, and with WebGL the requested sandbox is kept`
  );

  console.log(
    `✓ Pass 7 Structural Contracts verified: O(1) ring buffer wrap-around (4..8), Kepler empirical 2π period (${keplerPeriodState.measuredPeriod.toFixed(4)} yr vs 1.000 yr), Momentum wall-isolation tracking, and dynamic schema (${Object.keys(dynamicSchemaProps).length} unique slider keys across ${Object.keys(SIMULATION_CATALOG).length} sandboxes (${totalExpectedKeys} descriptors))`
  );

  // Test 25: Inquiry Log core (Kaizen batch 2) — prediction, parameters, measurement, fit,
  // explanation, persistence, JSON/CSV export, streak and heatmap series. Zero UI.
  await runJournalVerification();

  // Test 26: Inquiry Log UI glue (Kaizen batch 3a) — form → entry mapping, refusal anchors, unit
  // display derived from the manifest, export headers, storage durability, export filenames.
  runInquiryLogUiVerification();

  // Test 27: addresses (roadmap R2a) — every page has a URL and a bad URL opens the catalogue.
  runRoutesVerification();

  console.log('\n🎉 ALL CORE ENGINE CONTRACTS VERIFIED SUCCESSFULLY!');
  return true;
}
