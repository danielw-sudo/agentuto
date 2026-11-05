import { SIMULATION_CATALOG } from '../../simulations';

/**
 * Unit honesty (ROADMAP §4 item 6). Three instruments run in scaled units. What a learner must be able to rely on:
 *
 * - each of them says so, in one sentence from its manifest (shown under its telemetry card);
 * - none of them labels a scaled number with an SI unit that would make it read as a real measurement;
 * - no other instrument claims to be scaled, so the words keep their meaning.
 *
 * The conventions themselves (mu_eff = 1e-3, hbar = m = 1, k_B = 1) are held by the closed-form cases; this holds the
 * labels to the conventions.
 */
const REDUCED = ['quantum-tunneling', 'maxwell-boltzmann'] as const;
const SCALED_CHANNELS: Record<string, string[]> = { 'faraday-induction': ['emf', 'current', 'flux', 'lenz_force', 'dissipated_power'] };
const NEUTRAL = new Set(['reduced', 'dimensionless', 'atoms', 'slits', 'type', 'turns', 'state', 'mode', 'coeff']);

export function runUnitsVerification(): void {
  const noted = Object.keys(SIMULATION_CATALOG).filter((id) => SIMULATION_CATALOG[id].unitsNote);
  const expected = [...REDUCED, ...Object.keys(SCALED_CHANNELS)].sort();
  if (noted.sort().join(',') !== expected.join(',')) throw new Error(`instruments with a units note: [${noted}], expected [${expected}]`);
  for (const id of noted) {
    const note = SIMULATION_CATALOG[id].unitsNote ?? '';
    if (note.length < 60 || !/reduced|scaling|scaled/i.test(note)) throw new Error(`${id}: the units note should say plainly that the units are reduced or scaled, got "${note}"`);
  }

  // Reduced-unit instruments: every unit on a slider and every channel is "reduced" (or a plain count or a pure number).
  for (const id of REDUCED) {
    const reg = SIMULATION_CATALOG[id];
    const units = [...reg.paramDescriptors.map((d) => d.unit ?? ''), ...Object.values(reg.telemetryUnits)];
    const bad = units.filter((u) => !NEUTRAL.has(u));
    if (bad.length > 0) throw new Error(`${id} is in reduced units but still labels something "${[...new Set(bad)].join('", "')}"`);
  }

  // Scaled instrument: the electrical channels say scaled; the mechanical ones keep their real units.
  for (const [id, channels] of Object.entries(SCALED_CHANNELS)) {
    const reg = SIMULATION_CATALOG[id];
    for (const c of channels) {
      if (!/^scaled /.test(reg.telemetryUnits[c] ?? '')) throw new Error(`${id}.${c} is scaled but is labelled "${reg.telemetryUnits[c]}"`);
    }
    for (const c of Object.keys(reg.telemetryUnits).filter((k) => !channels.includes(k))) {
      if (/^scaled /.test(reg.telemetryUnits[c])) throw new Error(`${id}.${c} is labelled scaled but is a mechanical quantity`);
    }
  }

  // No one else uses the words.
  for (const [id, reg] of Object.entries(SIMULATION_CATALOG)) {
    if (noted.includes(id)) continue;
    const units = [...reg.paramDescriptors.map((d) => d.unit ?? ''), ...Object.values(reg.telemetryUnits)];
    if (units.some((u) => /reduced|scaled/i.test(u))) throw new Error(`${id} labels a unit reduced or scaled but has no units note`);
  }

  console.log(`✓ Unit honesty verified: ${noted.length} instruments in scaled or reduced units each say so in one sentence, none labels a scaled number with an SI unit, and no other instrument uses the words`);
}
