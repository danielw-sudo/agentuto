/**
 * The learner's colour-scheme choice for the site pages: follow the operating system (auto), or force light or
 * dark. Kept in this browser only. It is applied as `data-theme` on <html>, which the token sheet
 * (src/styles/globals.css) already understands; "auto" removes the attribute so the OS preference decides.
 * The instrument screens stay dark whatever is chosen, because their drawings are made for a dark ground.
 *
 * Plain functions over a storage-shaped object and an element-shaped object, so the rules are checked in Node.
 */

export type ThemePreference = 'auto' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'agentuto.theme.v1';
export const THEME_CHOICES: readonly ThemePreference[] = ['auto', 'light', 'dark'];

interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
interface ThemeRoot {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/** Anything that is not exactly one of the three words means auto: a stored value from a future version must not break the page. */
export function parseTheme(raw: unknown): ThemePreference {
  return raw === 'light' || raw === 'dark' ? raw : 'auto';
}

export function loadTheme(storage: ThemeStorage | null | undefined): ThemePreference {
  try {
    return parseTheme(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'auto';
  }
}

/** Returns false when the browser refused the write: the choice then lasts until the tab closes, and the caller can say so. */
export function saveTheme(storage: ThemeStorage | null | undefined, preference: ThemePreference): boolean {
  try {
    if (!storage) return false;
    storage.setItem(THEME_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

export function applyTheme(root: ThemeRoot, preference: ThemePreference): void {
  if (preference === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
}

/** The browser's storage if it has one and lets us touch it, else null. */
export function browserThemeStorage(): ThemeStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
