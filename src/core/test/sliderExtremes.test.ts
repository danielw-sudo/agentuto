import { SIMULATION_CATALOG } from '../../simulations';

/**
 * Every slider, at both ends, on every instrument. A reading that stops being a number is the plainest way an instrument
 * can fail a learner, and the closed-form cases only visit settings they chose: the RL half of one instrument diverged at
 * its own default values for days because they used a slower circuit.
 *
 * Each setting is reached the two ways the app reaches it: at the start of a run, and with the slider moved mid-run.
 */
const DT = 0.005; // the app's 200 Hz step

type Settings = [string, Record<string, number>];

function badChannels(snapshot: Record<string, unknown>): string[] {
  return Object.entries(snapshot)
    .filter(([, value]) => typeof value === 'number' && !Number.isFinite(value))
    .map(([channel, value]) => `${channel} = ${value}`);
}

export async function runSliderExtremesVerification(): Promise<void> {
  let settings = 0;
  const problems: string[] = [];
  for (const [id, reg] of Object.entries(SIMULATION_CATALOG)) {
    const mod = await reg.load();
    const list: Settings[] = [['the defaults', {}]];
    const low: Record<string, number> = {};
    const high: Record<string, number> = {};
    for (const d of reg.paramDescriptors) {
      list.push([`${d.id} = ${d.min}`, { [d.id]: d.min }], [`${d.id} = ${d.max}`, { [d.id]: d.max }]);
      low[d.id] = d.min;
      high[d.id] = d.max;
    }
    list.push(['every slider at its minimum', low], ['every slider at its maximum', high]);

    for (const [label, change] of list) {
      settings += 1;
      const atStart: any = mod.createEngine();
      atStart.init({ ...reg.defaultParams, ...change });
      for (let i = 0; i < 400; i += 1) atStart.step(DT);
      const startBad = badChannels(atStart.getTelemetrySnapshot());
      if (startBad.length > 0) problems.push(`${id}, ${label}, from the start: ${startBad.slice(0, 3).join(', ')}`);

      const moved: any = mod.createEngine();
      moved.init({ ...reg.defaultParams });
      for (let i = 0; i < 50; i += 1) moved.step(DT);
      moved.setParameters(change);
      for (let i = 0; i < 200; i += 1) moved.step(DT);
      const movedBad = badChannels(moved.getTelemetrySnapshot());
      if (movedBad.length > 0) problems.push(`${id}, ${label}, moved mid-run: ${movedBad.slice(0, 3).join(', ')}`);
    }
  }
  if (problems.length > 0) throw new Error(`Readings that are not numbers:\n  - ${problems.join('\n  - ')}`);
  console.log(`✓ Slider extremes verified: ${settings} settings across ${Object.keys(SIMULATION_CATALOG).length} instruments, each from the start and moved mid-run, every reading a finite number`);
}
