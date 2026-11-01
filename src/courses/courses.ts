/**
 * Courses are data over the sandboxes (Constitution Art. 6.3): an ordered list of instruments with a
 * line on what the learner measures in each. A course owns no engine and no parameter; a sandbox may
 * appear in more than one course (RC & RL circuits sit in both 8.02 and 18.03).
 *
 * The code on each course (`8.02`) is a topic alignment label only. Agentuto is not affiliated with or
 * endorsed by any institution (Art. 3.4).
 *
 * `npm test` holds this list against each sandbox's own `curriculum` string, so the two cannot drift: a
 * sandbox that claims a course must be listed in it, and the other way round.
 *
 * The `measure` lines are descriptions of what to do, not quantitative claims, but they are new text and
 * wait for a faculty read (Art. 1.4).
 */
export interface CourseModule {
  sandboxId: string;
  /** Completes "You measure …". Written for this course: the same sandbox may be used differently in another. */
  measure: string;
}

export interface Course {
  /** The alignment code, used in addresses: `#/course/8.02`. */
  id: string;
  title: string;
  /** Short form for filter chips. */
  shortTitle: string;
  /** One governing relation, as plain text, for the course card. */
  equation: string;
  lead: string;
  modules: CourseModule[];
  /** True for a course read from `local/courses.ts`: unreviewed, shown as such. */
  local?: boolean;
}

export const COURSES: Course[] = [
  {
    id: '8.01',
    title: 'Mechanics',
    shortTitle: 'Mechanics',
    equation: 'm a = F',
    lead: 'Motion under forces: a projectile that meets the air, a collision that must conserve momentum, a planet that obeys one inverse-square law.',
    modules: [
      { sandboxId: 'projectile-drag', measure: 'the launch angle that gives the longest range, with and without air drag.' },
      { sandboxId: 'conservation-momentum', measure: 'total momentum and centre-of-mass velocity through a collision, elastic or not.' },
      { sandboxId: 'kepler-orbits', measure: 'the orbital period against the size of the orbit.' },
    ],
  },
  {
    id: '8.02',
    title: 'Electricity & Magnetism',
    shortTitle: 'E&M',
    equation: '∇·E = ρ/ε₀',
    lead: 'Five instruments, from a charge in crossed fields to the transient response of a circuit. Work through them in order, or open any one.',
    modules: [
      { sandboxId: 'lorentz-force', measure: 'the cyclotron radius, and the speed at which a charge goes undeflected.' },
      { sandboxId: 'faraday-induction', measure: 'the induced emf and the braking force on the moving magnet.' },
      { sandboxId: 'gauss-flux', measure: 'the flux through a surface you move, and how it cancels for a dipole.' },
      { sandboxId: 'lcr-circuit', measure: 'the resonant frequency and the phase lag across the driving range.' },
      { sandboxId: 'rc-rl-circuits', measure: 'the time constant, from the 63.2% mark on the rising trace.' },
    ],
  },
  {
    id: '8.03',
    title: 'Waves & Optics',
    shortTitle: 'Waves & Optics',
    equation: '∂²y/∂t² = v² ∂²y/∂x²',
    lead: 'Waves on a string, waves from a moving source, waves through a pair of slits.',
    modules: [
      { sandboxId: 'standing-waves', measure: 'the harmonic frequencies, and the nodes that stay still.' },
      { sandboxId: 'doppler-shift', measure: 'the frequency ahead of and behind a moving source, and the Mach angle once it is supersonic.' },
      { sandboxId: 'wave-optics', measure: 'the fringe spacing, and how the slit width changes the pattern.' },
    ],
  },
  {
    id: '8.04',
    title: 'Quantum Physics',
    shortTitle: 'Quantum',
    equation: 'iħ ∂ψ/∂t = Hψ',
    lead: 'Light that comes in quanta, and a particle that gets through a wall it classically could not.',
    modules: [
      { sandboxId: 'photoelectric-effect', measure: 'the stopping voltage against frequency, and the slope that gives Planck’s constant.' },
      { sandboxId: 'quantum-tunneling', measure: 'the share of the wave packet that gets through as you change the barrier width.' },
    ],
  },
  {
    id: '8.044',
    title: 'Thermodynamics',
    shortTitle: 'Thermodynamics',
    equation: 'η = 1 − T_C / T_H',
    lead: 'A gas as a crowd of colliding molecules, and the cycle that sets the best efficiency an engine can have.',
    modules: [
      { sandboxId: 'maxwell-boltzmann', measure: 'the speed distribution, and how the pressure responds to the piston.' },
      { sandboxId: 'carnot-cycle', measure: 'the efficiency from heat taken in and given out, against 1 − T_C / T_H.' },
    ],
  },
  {
    id: '18.03',
    title: 'Differential Equations',
    shortTitle: 'Diff. Eq.',
    equation: 'm x″ + b x′ + k x = F',
    lead: 'The same equations in three guises: an oscillator you drive, a circuit that relaxes, a system that will not settle.',
    modules: [
      { sandboxId: 'harmonic-oscillator', measure: 'the resonance peak, and how damping shifts the phase.' },
      { sandboxId: 'rc-rl-circuits', measure: 'how a first-order equation relaxes towards its steady state.' },
      { sandboxId: 'lorenz-attractor', measure: 'how fast two nearby trajectories pull apart.' },
    ],
  },
];

export function courseById(id: string): Course | undefined {
  return COURSES.find((course) => course.id === id);
}

/** Courses that list a sandbox, in course order. */
export function coursesOfSandbox(sandboxId: string): Course[] {
  return COURSES.filter((course) => course.modules.some((m) => m.sandboxId === sandboxId));
}
