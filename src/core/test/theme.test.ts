import { THEME_CHOICES, THEME_STORAGE_KEY, applyTheme, instrumentTheme, loadTheme, parseTheme, saveTheme } from '../../ui/theme';

/**
 * Colour-theme choice checks. What a learner relies on: a saved choice comes back, anything unreadable means
 * "follow my system" rather than a broken page, a browser that refuses storage does not throw, and "auto" leaves
 * the page's attribute off so the operating system decides.
 */
function memory(initial?: string) {
  const data = new Map<string, string>(initial === undefined ? [] : [[THEME_STORAGE_KEY, initial]]);
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}
function element() {
  const attrs = new Map<string, string>();
  return { attrs, setAttribute: (n: string, v: string) => void attrs.set(n, v), removeAttribute: (n: string) => void attrs.delete(n) };
}

export function runThemeVerification(): void {
  if (THEME_CHOICES.join(',') !== 'auto,light,dark,contrast') throw new Error('the four choices should be auto, light, dark, contrast in that order');

  // Parsing: exactly the four words, anything else defaults to light.
  for (const [raw, want] of [['light', 'light'], ['dark', 'dark'], ['contrast', 'contrast'], ['auto', 'auto'], ['Light', 'light'], ['', 'light'], [null, 'light'], [undefined, 'light'], [3, 'light'], ['purple', 'light']] as const) {
    if (parseTheme(raw) !== want) throw new Error(`parseTheme(${JSON.stringify(raw)}) should be ${want}`);
  }

  // Round trip through storage, and a stored value from elsewhere falls back to light.
  for (const choice of THEME_CHOICES) {
    const store = memory();
    if (!saveTheme(store, choice)) throw new Error(`saving ${choice} reported failure on working storage`);
    if (loadTheme(store) !== choice) throw new Error(`${choice} did not come back after saving`);
  }
  if (loadTheme(memory()) !== 'light') throw new Error('an empty store should read as light');
  if (loadTheme(memory('solarized')) !== 'light') throw new Error('an unknown stored value should read as light');
  if (loadTheme(null) !== 'light' || loadTheme(undefined) !== 'light') throw new Error('no storage should read as light');

  // A browser that blocks storage: reading says light, writing says it failed, nothing throws.
  const blocked = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  if (loadTheme(blocked) !== 'light') throw new Error('blocked storage should read as light');
  if (saveTheme(blocked, 'dark') !== false) throw new Error('a blocked write should report false');
  if (saveTheme(null, 'dark') !== false) throw new Error('no storage should report false');

  // Applying: light and dark set the attribute, auto removes it again.
  const root = element();
  applyTheme(root, 'dark');
  if (root.attrs.get('data-theme') !== 'dark') throw new Error('dark should set data-theme="dark"');
  applyTheme(root, 'light');
  if (root.attrs.get('data-theme') !== 'light') throw new Error('light should set data-theme="light"');
  applyTheme(root, 'auto');
  if (root.attrs.has('data-theme')) throw new Error('auto should remove data-theme so the system preference decides');

  // Instrument screens: dark, unless high contrast was chosen.
  for (const [attr, want] of [[null, 'dark'], ['light', 'dark'], ['dark', 'dark'], ['contrast', 'contrast'], ['purple', 'dark']] as const) {
    if (instrumentTheme({ getAttribute: () => attr }) !== want) throw new Error(`instrumentTheme(${attr}) should be ${want}`);
  }

  console.log('✓ Theme choice verified: four words only, saved choice returns, unknown or blocked storage reads as auto, auto clears the attribute');
}
