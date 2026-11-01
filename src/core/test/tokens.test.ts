/**
 * Design-token checks (roadmap R4b, Constitution Art. 7.3: WCAG AA contrast).
 *
 * The tokens live in `src/styles/globals.css`, once for the light theme and once for the dark theme (a
 * dark OS preference and an explicit `data-theme="dark"` must give the same colours). This reads the real
 * file and measures the text-on-surface pairs the site pages use, so a palette change that makes grey text
 * unreadable fails here instead of being noticed on someone's screen.
 */
type Palette = Record<string, string>;

function declarations(block: string): Palette {
  const out: Palette = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The text of the first `{ … }` block that follows `selector`. */
function blockAfter(css: string, selector: string): string {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`globals.css has no "${selector}" block`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`unterminated "${selector}" block`);
}

export async function runTokensVerification(): Promise<void> {
  // Node's own module, imported by a computed name so the browser build needs no Node type definitions.
  const fsModule = 'node:fs';
  const { readFileSync } = (await import(fsModule)) as { readFileSync: (path: URL, encoding: string) => string };
  const css = readFileSync(new URL('../../styles/globals.css', import.meta.url), 'utf8');

  const light = declarations(blockAfter(css, ':root {'));
  const darkExplicit = declarations(blockAfter(css, '[data-theme="dark"] {'));
  const darkPreferred = declarations(blockAfter(blockAfter(css, '@media (prefers-color-scheme: dark)'), ':root:not([data-theme="light"])'));

  const required = ['paper', 'card', 'sunken', 'ink', 'muted', 'line', 'accent', 'on-accent', 'accent-soft', 'field-e', 'field-b', 'velocity'];
  for (const [name, palette] of [['light', light], ['dark', darkExplicit], ['dark (OS preference)', darkPreferred]] as const) {
    const missing = required.filter((key) => !palette[key]);
    if (missing.length > 0) throw new Error(`${name} theme is missing tokens: ${missing.join(', ')}`);
  }
  if (JSON.stringify(darkExplicit) !== JSON.stringify(darkPreferred)) {
    throw new Error('the dark theme differs between data-theme="dark" and the OS preference; one of them was edited alone');
  }

  // Text needs 4.5:1 on every surface it can sit on; a graphic (a field colour, a line) needs 3:1.
  const surfaces = ['paper', 'card', 'sunken'];
  const texts = ['ink', 'muted', 'accent'];
  let pairs = 0;
  let worst = Infinity;
  for (const [name, palette] of [['light', light], ['dark', darkExplicit]] as const) {
    const need = (fg: string, bg: string, minimum: number) => {
      const ratio = contrast(palette[fg], palette[bg]);
      pairs += 1;
      worst = Math.min(worst, ratio);
      if (ratio < minimum) {
        throw new Error(`${name} theme: ${fg} ${palette[fg]} on ${bg} ${palette[bg]} is ${ratio.toFixed(2)}:1, needs ${minimum}:1`);
      }
    };
    for (const text of texts) for (const surface of surfaces) need(text, surface, 4.5);
    need('on-accent', 'accent', 4.5);
    need('accent', 'accent-soft', 4.5);
    need('ink', 'accent-soft', 4.5);
    for (const graphic of ['field-e', 'field-b', 'velocity']) need(graphic, 'card', 3);
  }

  console.log(
    `✓ Design tokens verified: light and dark themes define all ${required.length} tokens, the two dark declarations agree, and ${pairs} text and graphic pairs meet WCAG AA (lowest ratio ${worst.toFixed(2)}:1)`
  );
}
