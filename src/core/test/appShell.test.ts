import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TUTORIAL_REGISTRY } from '../../tutorials/registry';

/**
 * The shell opens a tutorial by asking the registry for it. Before, App.tsx named the one tutorial it knew, so a second
 * registered tutorial opened a blank page while the routes and courses checks still passed.
 */
export async function runAppShellVerification(): Promise<void> {
  const ids = Object.keys(TUTORIAL_REGISTRY);
  if (ids.length === 0) throw new Error('the tutorial registry is empty');

  // Every registered tutorial loads, and what it loads is a component a page can render.
  for (const id of ids) {
    const entry = TUTORIAL_REGISTRY[id];
    if (entry.id !== id) throw new Error(`the registry key "${id}" holds an entry whose id is "${entry.id}"`);
    const Page = await entry.load();
    if (typeof Page !== 'function') throw new Error(`tutorial "${id}": load() resolved to ${typeof Page}, not a component`);
  }

  // App asks the registry and spells no tutorial id of its own.
  const app = readFileSync(join('src', 'app', 'App.tsx'), 'utf8');
  if (!app.includes('TUTORIAL_REGISTRY')) throw new Error('src/app/App.tsx does not go through TUTORIAL_REGISTRY');
  for (const id of ids) {
    if (new RegExp(`['"\`]${id}['"\`]`).test(app)) throw new Error(`src/app/App.tsx spells the tutorial id "${id}" instead of reading it from the registry`);
  }

  // Nor does it import a tutorial directly: the registry is its only way in, so it cannot show one page for every id.
  for (const [, path] of app.matchAll(/(?:from|import\()\s*['"`]([^'"`]*tutorials\/[^'"`]*)['"`]/g)) {
    if (path !== '../tutorials/registry') throw new Error(`src/app/App.tsx imports "${path}"; a tutorial is reached only through ../tutorials/registry`);
  }

  console.log(`✓ App shell verified: all ${ids.length} registered tutorials (${ids.join(", ")}) load as components, and App.tsx names none of them`);
}
