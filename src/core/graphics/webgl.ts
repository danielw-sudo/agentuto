/**
 * WebGL capability probe (Constitution Art. 7.4 is about motion; this is Art. 8 simplicity:
 * a 3D sandbox must not be the thing that decides whether the page loads).
 *
 * Five of the seventeen sandboxes are Three.js; the other twelve draw to a 2D canvas and need no
 * GPU at all. Plenty of real machines have no usable WebGL — hardware acceleration switched off,
 * old integrated GPUs, virtual machines, remote desktops, locked-down enterprise browsers — and
 * the previous behaviour there was an uncaught `Error creating WebGL context` thrown while React
 * was rendering, which unmounted the tree and left a blank page with no explanation.
 *
 * The probe runs once per page load and the answer is cached: context creation is not free and the
 * answer cannot change mid-session in any way we care about.
 */
let cached: boolean | null = null;

export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached;

  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    cached = Boolean(context);
  } catch {
    cached = false;
  }

  // Release the probe context immediately — browsers cap live contexts per page.
  if (cached) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const lose = (context as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context');
    lose?.loseContext();
  }

  return cached;
}

/** Test seam: lets a unit test reset the memoised answer. */
export function resetWebGLProbe(): void {
  cached = null;
}
