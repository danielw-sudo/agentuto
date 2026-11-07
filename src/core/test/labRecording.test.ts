import { TelemetryRecorder } from '../telemetry/TelemetryRecorder';
import { formatPercent } from '../telemetry/formatPercent';
import { sparklineMetric } from '../../ui/components/LiveTelemetryCard';
import { SIMULATION_CATALOG } from '../../simulations';
import { SANDBOX_LAB_GUIDES } from '../../simulations/sandboxGuides';

const DT = 0.005;
// Steps per width in the sweep: 12 s, past the 8 s the slowest of these widths needs before T reads as settled (the packet starts 7 sigma clear of the barrier)
const SWEEP_STEPS = 2400;

async function tunnelling(overrides: Record<string, number>) {
  const registration = SIMULATION_CATALOG['quantum-tunneling'];
  const engine: any = (await registration.load()).createEngine();
  engine.init({ ...registration.defaultParams, ...overrides });
  return engine;
}

/** A lab run as a learner does it: what is recorded, and what the card lets them read. */
export async function runLabRecordingVerification(): Promise<void> {
  // A slider that restarts the run must not silence Record: the clock goes back to 0, and every sample used to look
  // older than the last one kept, so a sweep kept only its first width.
  const engine = await tunnelling({ particleEnergy: 3, barrierHeight: 9, barrierWidth: 0.5, packetSigma: 1.2 });
  const recorder = new TelemetryRecorder();
  recorder.start();
  const widths = [0.5, 0.6, 0.7];
  for (const width of widths) {
    engine.setParameters({ barrierWidth: width });
    for (let i = 0; i < SWEEP_STEPS; i += 1) {
      engine.step(DT);
      recorder.sample(engine.getTelemetrySnapshot());
    }
  }
  const rows = recorder.getBuffer();
  for (const width of widths) {
    const own = rows.filter((row) => Math.abs(Number(row.barrier_width) - width) < 1e-9);
    if (own.length < 200) throw new Error(`Record kept only ${own.length} rows at d = ${width} in a sweep`);
    if (Number(own[0].settled) !== 0) throw new Error(`the first row at d = ${width} is marked settled before the packet has arrived`);
    const settled = own.filter((row) => row.settled === 1);
    if (settled.length === 0) throw new Error(`no row is marked settled at d = ${width}, so the export cannot be filtered to readable T`);
    if (own.some((row) => row.settled !== 0 && row.settled !== 1)) throw new Error('settled must be 0 or 1');
  }
  const seconds = 3 * SWEEP_STEPS * DT;
  const { duration_s: duration } = recorder.getSummary();
  if (Math.abs(duration - seconds) > 0.1) throw new Error(`a three-run recording lasted ${seconds} s, the summary says ${duration}`);

  // Recording within one run still keeps to the sample rate: 20 ms, or 25 when rounding lands a step short.
  const steady = new TelemetryRecorder();
  steady.start();
  for (let i = 0; i < 100; i += 1) steady.sample({ t: i * DT });
  if (steady.getSampleCount() < 20 || steady.getSampleCount() > 25) throw new Error(`0.5 s at 50 Hz kept ${steady.getSampleCount()} samples`);

  // The guide's RC/RL step quotes the gap between recorded samples.
  const circuitRegistration = SIMULATION_CATALOG['rc-rl-circuits'];
  const circuit: any = (await circuitRegistration.load()).createEngine();
  circuit.init({ ...circuitRegistration.defaultParams });
  const recorded = new TelemetryRecorder();
  recorded.start();
  for (let i = 0; i < 400; i += 1) {
    circuit.step(DT);
    recorded.sample(circuit.getTelemetrySnapshot());
  }
  const times = recorded.getBuffer().map((row) => Number(row.t));
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  if (Math.min(...gaps) < 0.0199 || Math.max(...gaps) > 0.0251) throw new Error(`recorded samples are ${Math.min(...gaps)} to ${Math.max(...gaps)} s apart, the guide says 20 to 25 ms`);
  const guide = SANDBOX_LAB_GUIDES['rc-rl-circuits'].labProtocol.join(' ');
  if (!guide.includes('every 20 to 25 ms')) throw new Error('the RC/RL guide no longer quotes the Record interval');

  // Every width in the tunnelling lab has to be readable from the card, and tell itself from its neighbour.
  const shown: string[] = [];
  for (let k = 5; k <= 15; k += 1) {
    const run = await tunnelling({ particleEnergy: 3, barrierHeight: 9, barrierWidth: k / 10, packetSigma: 1.2 });
    let text = '';
    for (let i = 0; i < 2000 && !text; i += 1) {
      run.step(DT);
      const state = run.getState();
      if (state.settled) text = formatPercent(state.transmission * 100);
    }
    if (!text) throw new Error(`d = ${k / 10} did not settle in the lab sweep`);
    if (text.startsWith('<') || parseFloat(text) === 0) throw new Error(`d = ${k / 10} reads ${text} on the card`);
    shown.push(text);
  }
  if (new Set(shown).size !== shown.length) throw new Error(`two widths read the same on the card: ${shown.join(', ')}`);

  const cases: [number, string][] = [[100, '100.0%'], [6.25, '6.3%'], [1, '1.0%'], [0.9, '0.90%'], [0.046, '0.046%'], [0.001, '0.0010%'], [0.0009, '< 0.001%'], [0, '< 0.001%']];
  for (const [value, want] of cases) {
    if (formatPercent(value) !== want) throw new Error(`formatPercent(${value}) gives ${formatPercent(value)}, expected ${want}`);
  }

  // The sparkline is labelled %, so it carries a percentage, the same number as the box above it.
  const metric = sparklineMetric('quantum-tunneling', { transmission: 0.0625 });
  if (metric !== 6.25) throw new Error(`the tunnelling sparkline carries ${metric} for T = 6.25 %`);

  console.log('✓ Lab recording: a sweep keeps every run, Record interval as the guide says, every lab width readable on the card');
}
