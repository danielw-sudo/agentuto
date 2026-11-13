import { SIMULATION_CATALOG } from '../../simulations';
import { photogateReading } from '../../app/photogate';

/**
 * The Virtual Photogate reads a position and a speed from the running instrument. An instrument whose state has
 * neither used to feed it 0 for ever, in a box labelled m and m/s. The reading is now null there and the gate is not
 * offered. Held here against the real engines: 5 simulated seconds at the app's 1/200 s step, from the defaults.
 */
const DT = 1 / 200;
const STEPS = 1000;

export async function runPhotogateVerification(): Promise<void> {
  // The oscillator's own state names: position x, speed |v|.
  const osc = photogateReading('harmonic-oscillator', { x: 0.3, v: -2 }, {});
  if (!osc || osc.position !== 0.3 || osc.speed !== 2) throw new Error(`harmonic-oscillator {x: 0.3, v: -2} read ${JSON.stringify(osc)}, expected position 0.3, speed 2`);

  // An instrument the function does not name is read through pos.x and speed, and only if both are really there.
  if (photogateReading('no-such-instrument', {}, {}) !== null) throw new Error('an unknown instrument with an empty state must read null');
  if (photogateReading('no-such-instrument', undefined, undefined) !== null) throw new Error('an unknown instrument with no state must read null');
  if (photogateReading('registration.local', { pos: { x: 1 } }, {}) !== null) throw new Error('a state with pos.x but no speed must read null');
  if (photogateReading('registration.local', { pos: { x: Number.NaN }, speed: 1 }, {}) !== null) throw new Error('a state with a NaN pos.x must read null');
  const own = photogateReading('registration.local', { pos: { x: 1.5 }, speed: 2.5 }, {});
  if (!own || own.position !== 1.5 || own.speed !== 2.5) throw new Error(`an unknown instrument whose state has pos.x and speed read ${JSON.stringify(own)}, expected 1.5 and 2.5`);

  const nullIds: string[] = [];
  const readIds: string[] = [];
  const flatPosition: string[] = [];
  const flatSpeed: string[] = [];
  for (const [id, reg] of Object.entries(SIMULATION_CATALOG)) {
    const mod = await reg.load();
    const engine: any = mod.createEngine();
    engine.init({ ...reg.defaultParams });
    let nulls = 0;
    let positionMoves = false;
    let speedMoves = false;
    for (let i = 0; i <= STEPS; i += 1) {
      const reading = photogateReading(id, engine.getState(), reg.defaultParams);
      if (reading === null) {
        nulls += 1;
      } else {
        if (!Number.isFinite(reading.position) || !Number.isFinite(reading.speed)) throw new Error(`${id}: the photogate read ${JSON.stringify(reading)} at step ${i}`);
        if (reading.position !== 0) positionMoves = true;
        if (reading.speed !== 0) speedMoves = true;
      }
      engine.step(DT);
    }
    // The gate is offered or not for the whole run, never in and out.
    if (nulls !== 0 && nulls !== STEPS + 1) throw new Error(`${id}: the photogate was offered for ${STEPS + 1 - nulls} of ${STEPS + 1} steps`);
    if (nulls === 0) {
      readIds.push(id);
      if (!positionMoves) flatPosition.push(id);
      if (!speedMoves) flatSpeed.push(id);
    } else {
      nullIds.push(id);
    }
  }
  // The instruments measured to have nothing to read (state without pos.x and speed) offer no gate; two that do keep it.
  for (const id of ['signal-detection', 'quantum-tunneling', 'wave-optics']) {
    if (!nullIds.includes(id)) throw new Error(`${id} has no position or speed in its state, yet the photogate is offered`);
  }
  for (const id of ['lorentz-force', 'kepler-orbits', 'harmonic-oscillator']) {
    if (!readIds.includes(id)) throw new Error(`${id} has a position and a speed, yet the photogate is not offered`);
  }
  // Position and speed are held separately, so a gate that loses one of the two is caught. Two readings are known to stay
  // at 0 over this run and are recorded as limits, not offered as right: gauss-flux encloses no net charge at its defaults,
  // and lorenz-attractor has no speed in its state. Nothing else may join them unnoticed.
  if (flatPosition.join(",") !== "gauss-flux") throw new Error(`the photogate position stays 0 for 5 s on [${flatPosition.join(", ")}], expected only [gauss-flux]`);
  if (flatSpeed.join(",") !== "lorenz-attractor") throw new Error(`the photogate speed stays 0 for 5 s on [${flatSpeed.join(", ")}], expected only [lorenz-attractor]`);
  // The withheld set is exactly the four measured on 2026-11-12 (engine at defaults, 5 s, old id chains read 0 and 0).
  // The smoke test takes its expectation from photogateReading, so this list is what stops a gate vanishing unnoticed:
  // an instrument joins it only by a deliberate edit here.
  const WITHHELD = ['maxwell-boltzmann', 'quantum-tunneling', 'signal-detection', 'wave-optics'];
  if ([...nullIds].sort().join(',') !== WITHHELD.join(',')) {
    throw new Error(`the photogate is withheld for [${[...nullIds].sort().join(', ')}], expected exactly [${WITHHELD.join(', ')}]`);
  }

  console.log(`✓ Photogate verified: offered for ${readIds.length} instruments with finite readings, position and speed each moving over 5 s (bar two known limits), withheld for ${nullIds.length} that have nothing to read (${nullIds.join(', ')})`);
}
