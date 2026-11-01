import type { SimulationRegistration } from '../../src/simulations';

/**
 * The manifest of a private module: one object that says what the instrument is, which sliders it has, which
 * channels it records and in what units, and how to fetch its engine and renderer. Everything the app shows
 * about it (the course lists, the search, the control deck, the Inquiry Log units, the CSV) comes from here.
 *
 * Copy this folder to `local/<id>/` and make `id` below equal to the folder name. The folder `local/` is never
 * committed and never part of the public site.
 */
const manifest: SimulationRegistration = {
  id: 'free-fall',
  title: 'Free Fall',
  discipline: 'Physics (example)',
  curriculum: 'Example private module',
  governingODE: 'd2y/dt2 = -g',
  formattedODE: 'y″ = −g',
  description:
    'A ball thrown straight up or down under constant gravity. Measure how high it goes and when it lands, and compare with y = y₀ + v₀t − ½gt².',
  mode: '2D',

  defaultParams: { initialHeight: 20, initialSpeed: 5, gravity: 9.81 },
  paramDescriptors: [
    { id: 'initialHeight', label: 'Initial height', unit: 'm', min: 0, max: 100, step: 1, defaultValue: 20 },
    { id: 'initialSpeed', label: 'Initial speed (up is positive)', unit: 'm/s', min: -20, max: 30, step: 0.5, defaultValue: 5 },
    { id: 'gravity', label: 'Gravity g', unit: 'm/s²', min: 1, max: 25, step: 0.01, defaultValue: 9.81 },
  ],

  // Every number the engine's getTelemetrySnapshot() returns, apart from t, with its unit.
  // Write "dimensionless" for a quantity that has none; an empty unit is refused.
  telemetryUnits: { height: 'm', velocity: 'm/s' },

  // A result worked out by hand, not read off the engine: from rest at 20 m with 5 m/s upward and g = 9.81,
  // after 2 s the height is 20 + 5·2 − ½·9.81·2² = 10.38 m and the velocity 5 − 9.81·2 = −14.62 m/s.
  // `npm run check:module -- examples/local-module` holds the engine to it.
  benchmark: { time: 2, expected: { height: 10.38, velocity: -14.62 } },

  // Fetched only when the instrument is opened, so it costs nothing until then.
  load: async () => {
    const [{ FreeFallEngine }, { FreeFallRenderer2D }] = await Promise.all([
      import('./FreeFallEngine'),
      import('./FreeFallRenderer2D'),
    ]);
    return {
      createEngine: () => new FreeFallEngine(),
      createRenderer: () => new FreeFallRenderer2D(),
    };
  },
};

export default manifest;
