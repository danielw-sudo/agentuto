/**
 * Choosing which sandbox to open first.
 *
 * Pure on purpose: the decision depends only on the catalogue and on whether WebGL is usable, so it
 * can be asserted in the headless test suite instead of being discovered in a browser by a user
 * whose machine has no GPU.
 */
export interface SandboxModeEntry {
  mode: '2D' | '3D';
}

/**
 * Returns the sandbox to open on load.
 *
 * With WebGL the preferred sandbox is used as-is. Without it, a preferred 3D sandbox is replaced by
 * the first 2D sandbox in catalogue order — twelve of seventeen need no GPU, so a visitor without
 * WebGL still lands on something that runs instead of on an error panel.
 */
export function chooseInitialSandbox<T extends SandboxModeEntry>(
  catalog: Record<string, T>,
  webglAvailable: boolean,
  preferred: string,
): string {
  const order = Object.keys(catalog);

  if (webglAvailable) return preferred;

  const preferredEntry = catalog[preferred];
  if (preferredEntry && preferredEntry.mode !== '3D') return preferred;

  const first2D = order.find((id) => catalog[id].mode !== '3D');
  return first2D ?? preferred;
}

/** True when a sandbox needs WebGL, i.e. cannot run on a machine without it. */
export function sandboxNeedsWebGL<T extends SandboxModeEntry>(entry: T | undefined): boolean {
  return entry?.mode === '3D';
}
