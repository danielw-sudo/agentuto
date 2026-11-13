import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SIMULATION_CATALOG } from '../../simulations';
import { guideOf } from '../../simulations/sandboxGuides';
import { formatTelemetryToCSV } from '../telemetry/csvExporter';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UnavailableViewport } from '../../ui/components/UnavailableViewport';

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

const SI_IN_TEXT = /\b(eV|nm)\b|m\/s|[\d}]m\b|m²|\bPa\b|\bJoules?\b/;

/** The text a reduced-unit renderer draws: every string literal, with comments left out. */
function canvasText(id: string): string[] {
  const folder = join('src', 'simulations', 'physics', id);
  const file = readdirSync(folder).find((name) => /Renderer/.test(name));
  if (!file) throw new Error(`${id} has no renderer`);
  const source = readFileSync(join(folder, file), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  return (source.match(/`[^`]*`|'[^'\n]*'/g) ?? []).filter((text) => /fillText|[a-zA-Z]{2}/.test(text) && !/^['`](rgba?|#|hsl)/.test(text));
}

export async function runUnitsExportVerification(): Promise<void> {
  // What a reduced-unit instrument draws and asks the learner to do carries no SI unit either.
  for (const id of REDUCED) {
    const bad = canvasText(id).filter((text) => SI_IN_TEXT.test(text));
    if (bad.length > 0) throw new Error(`${id} draws SI units on its canvas: ${bad.join(', ')}`);
    const guide = guideOf(SIMULATION_CATALOG[id]);
    if (!guide) throw new Error(`${id} has no guide`);
    const words = [...guide.labProtocol, ...guide.whatToExplore.map((item) => item.detail)];
    const inGuide = words.filter((text) => SI_IN_TEXT.test(text));
    if (inGuide.length > 0) throw new Error(`${id}'s guide still uses SI units: ${inGuide.join(' | ')}`);
  }

  // The exported file names every column's unit from the manifest, and says so when the units are scaled or reduced.
  for (const [id, reg] of Object.entries(SIMULATION_CATALOG)) {
    const engine: any = (await reg.load()).createEngine();
    engine.init({ ...reg.defaultParams });
    engine.step(0.005);
    const csv = formatTelemetryToCSV([engine.getTelemetrySnapshot()], { experimentTitle: reg.title, parameters: {}, units: reg.telemetryUnits, unitsNote: reg.unitsNote });
    const unitsLine = csv.split('\r\n').find((line) => line.startsWith('# Units: ')) ?? '';
    const columns = Object.keys(engine.getTelemetrySnapshot());
    for (const col of columns) {
      const unit = reg.telemetryUnits[col] ?? (col === 't' ? 's' : undefined);
      if (!unitsLine.includes(`${col}(${unit})`)) throw new Error(`${id}: the CSV units line does not give ${col} as declared: "${unitsLine}"`);
    }
    if (reg.unitsNote && !csv.includes(`# Units note: ${reg.unitsNote}`)) throw new Error(`${id}: the CSV does not carry the units note`);
    if (!reg.unitsNote && csv.includes('# Units note:')) throw new Error(`${id}: the CSV carries a units note it does not have`);
  }
  const bare = formatTelemetryToCSV([{ t: 0 }], { experimentTitle: 'x', parameters: {} });
  if (bare.includes('# Units')) throw new Error('a CSV with no declared units still claims some');

  // Formulas in the user guide reach KaTeX intact: a lost backslash leaves a tab or the bare word.
  const guideText = readFileSync(join('docs', 'USER_GUIDE.md'), 'utf8');
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\t]/.test(guideText)) throw new Error('docs/USER_GUIDE.md has a control character: a formula has probably lost a backslash');
  for (const math of guideText.match(/\$[^$\n]+\$/g) ?? []) {
    if (/(^|[^\\a-zA-Z])(hbar|mathrm|sqrt|times|frac|kappa|propto|sigma|lambda)\b/.test(math)) throw new Error(`docs/USER_GUIDE.md: a formula has lost a backslash: ${math}`);
  }

  // The user guide and the README say how many sandboxes need no GPU: the numbers are the catalogue's, in words up to twenty.
  const shipped = Object.values(SIMULATION_CATALOG).filter((sim) => !sim.local);
  const twoD = shipped.filter((sim) => sim.mode !== '3D').length;
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const spell = (n: number): string => words[n] ?? String(n);
  for (const [file, text] of [['docs/USER_GUIDE.md', guideText], ['README.md', readFileSync('README.md', 'utf8')]] as const) {
    const said = /(\S+) of the (\S+) sandboxes draw to a (?:plain )?2D/i.exec(text);
    if (!said) throw new Error(`${file} no longer says "N of the M sandboxes draw to a 2D canvas"`);
    if (said[1].toLowerCase() !== spell(twoD) || said[2].toLowerCase() !== spell(shipped.length)) {
      throw new Error(`${file} says "${said[1]} of the ${said[2]} sandboxes" draw to a 2D canvas; the catalogue has ${twoD} of ${shipped.length}`);
    }
  }

  // The panel shown to a machine without WebGL takes the same two numbers from the catalogue, not from its own words.
  const panel = readFileSync(join('src', 'ui', 'components', 'UnavailableViewport.tsx'), 'utf8');
  if (!panel.includes('SIMULATION_CATALOG') || /\b(?:twelve|thirteen|seventeen|eighteen)\b/i.test(panel)) throw new Error('src/ui/components/UnavailableViewport.tsx spells a sandbox count instead of counting the catalogue');
  // And the sentence it draws carries the right two: every sandbox in the catalogue, and those that are not 3D.
  const all = Object.values(SIMULATION_CATALOG);
  const drawn = renderToStaticMarkup(
    createElement(UnavailableViewport, { reason: 'r', sandboxTitle: 't', alternatives: [], onSelectSandbox: () => undefined }),
  ).replace(/<!--.*?-->/g, '');
  const wanted = `${all.filter((sim) => sim.mode !== '3D').length} of the ${all.length} sandboxes draw to a 2D canvas`;
  if (!drawn.includes(wanted)) throw new Error(`the no-WebGL panel should say "${wanted}"; it draws: ${drawn.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);

  console.log(`✓ Unit text verified: the ${REDUCED.length} reduced instruments' canvases and guides carry no SI units, all ${Object.keys(SIMULATION_CATALOG).length} CSV exports name each column's unit from the manifest, and the user guide's formulas are intact`);
}

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
