import React, { useMemo } from 'react';
import { SIMULATION_CATALOG } from '../../simulations';
import { COURSES } from '../../courses/courses';
import { SiteLayout, focusRing } from './SiteLayout';

interface HomePageProps {
  /** The sandbox already open underneath, if any, so the learner can pick the experiment back up. */
  resumeSandboxId: string | null;
}

/** x(t) for a damped oscillator, as polyline points. Decoration for the hero, not a measurement. */
function dampedCurve(sign: 0 | 1 | -1): string {
  const points: string[] = [];
  for (let x = 0; x <= 470; x += sign === 0 ? 2 : 5) {
    const envelope = 100 * Math.exp(-x / 190);
    const y = sign === 0 ? 130 - envelope * Math.cos(x / 24) : 130 - sign * envelope;
    points.push(`${40 + x},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

const STEPS = [
  { n: '01', title: 'Predict', body: 'Write down what you expect before you touch a slider. The Inquiry Log keeps it next to the result.' },
  { n: '02', title: 'Measure', body: 'Read telemetry with its units, fit your own line, and export the data as CSV for the tools you already use.' },
  { n: '03', title: 'Explain', body: 'Say what you found in your own words. Agentuto never hands you the answer.' },
];

export const HomePage: React.FC<HomePageProps> = ({ resumeSandboxId }) => {
  const curve = useMemo(() => dampedCurve(0), []);
  const up = useMemo(() => dampedCurve(1), []);
  const down = useMemo(() => dampedCurve(-1), []);
  const resume = resumeSandboxId ? SIMULATION_CATALOG[resumeSandboxId] : undefined;
  const sandboxCount = Object.keys(SIMULATION_CATALOG).length;

  return (
    <SiteLayout current="home" label="Courses · Agentuto">
      <main>
        <section className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-16 gap-y-12 px-6 py-16 sm:px-8 sm:py-24">
          <div className="min-w-0 flex-[1_1_28rem] max-w-xl">
            <h1 className="font-display text-4xl font-medium leading-[1.08] tracking-tight sm:text-6xl">
              Measure it. Don&rsquo;t just watch it.
            </h1>
            <p className="mt-7 text-lg leading-relaxed text-muted sm:text-xl">
              {sandboxCount} open physics and mathematics instruments that run in your browser, record real data, and
              ask you to predict before you measure.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href="#courses"
                className={`inline-flex min-h-12 items-center rounded-[10px] bg-accent px-6 font-semibold text-on-accent no-underline hover:opacity-90 ${focusRing}`}
              >
                Browse the courses
              </a>
              <a
                href="#/guide"
                className={`inline-flex min-h-12 items-center px-2 font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink ${focusRing}`}
              >
                Read the user guide
              </a>
            </div>
            {resume && (
              <p className="mt-6 text-[15px]">
                <a
                  href={`#/sandbox/${encodeURIComponent(resume.id)}`}
                  className={`font-medium text-accent underline underline-offset-4 ${focusRing}`}
                >
                  Resume {resume.title} &rarr;
                </a>
              </p>
            )}
            <p className="mt-10 text-sm text-muted">Free and open source. Works offline once opened. No account, no tracking.</p>
          </div>

          <figure className="m-0 min-w-0 max-w-lg flex-[1_1_22rem]">
            <div className="rounded-2xl border border-line bg-card p-6 pb-4">
              <svg
                viewBox="0 0 520 260"
                className="block w-full"
                role="img"
                aria-label="Position against time for a damped oscillator, decaying inside a dashed envelope"
              >
                <line x1="40" y1="130" x2="510" y2="130" className="stroke-line" strokeWidth="1" />
                <line x1="40" y1="16" x2="40" y2="244" className="stroke-line" strokeWidth="1" />
                <polyline points={up} fill="none" className="stroke-muted" strokeWidth="1" strokeDasharray="4 5" opacity="0.6" />
                <polyline points={down} fill="none" className="stroke-muted" strokeWidth="1" strokeDasharray="4 5" opacity="0.6" />
                <polyline points={curve} fill="none" className="stroke-velocity" strokeWidth="2.4" strokeLinejoin="round" />
                <text x="46" y="30" className="fill-muted font-mono" fontSize="13">x (m)</text>
                <text x="470" y="152" className="fill-muted font-mono" fontSize="13">t (s)</text>
              </svg>
              <figcaption className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-muted">
                <span>Damped &amp; Driven Harmonic Oscillator</span>
                <span className="font-mono text-[13px]">m&#7819; + b&#7819; + kx = F&#8320;cos&#969;t</span>
              </figcaption>
            </div>
          </figure>
        </section>

        <section id="courses" className="scroll-mt-4 border-t border-line bg-sunken">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-24">
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
              <h2 className="font-display text-3xl font-medium tracking-tight">Courses</h2>
              <p className="max-w-md text-sm text-muted">
                Topics aligned with MIT OpenCourseWare and AP/IB syllabi. Not affiliated with or endorsed by any
                institution.
              </p>
            </div>
            <ul className="mt-12 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {COURSES.map((course) => (
                <li key={course.id} className="flex">
                  <a
                    href={`#/course/${encodeURIComponent(course.id)}`}
                    className={`flex min-h-64 w-full flex-col gap-5 rounded-2xl border border-line bg-card p-8 text-ink no-underline hover:border-accent ${focusRing}`}
                  >
                    <span className="font-mono text-[13px] tracking-wide text-accent">Aligned with {course.id}</span>
                    <span className="font-display text-2xl font-medium leading-snug tracking-tight">{course.title}</span>
                    <span className="font-mono text-sm text-muted">{course.equation}</span>
                    <span className="mt-auto flex items-center justify-between text-sm text-muted">
                      <span>
                        {course.modules.length} instrument{course.modules.length === 1 ? '' : 's'}
                      </span>
                      <span className="font-medium text-accent">Open &rarr;</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-24">
          <h2 className="font-display text-3xl font-medium tracking-tight">One loop in every instrument</h2>
          <ol className="mt-12 grid list-none grid-cols-1 gap-10 p-0 md:grid-cols-3 md:gap-12">
            {STEPS.map((step) => (
              <li key={step.n}>
                <div className="font-mono text-sm text-accent">{step.n}</div>
                <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-6 py-16 sm:px-8 sm:py-24">
            <div className="max-w-2xl flex-[1_1_28rem]">
              <h2 className="font-display text-3xl font-medium tracking-tight">
                Use it. Extend it privately. Share it if you&rsquo;re proud of it.
              </h2>
              <p className="mt-5 text-lg text-muted">
                Run Agentuto on your own computer and add instruments of your own that stay on your machine. If one turns
                out well, fork the project or send it upstream.
              </p>
            </div>
            <a
              href="#/guide"
              className={`inline-flex min-h-12 items-center rounded-[10px] border border-ink px-6 font-semibold text-ink no-underline hover:bg-sunken ${focusRing}`}
            >
              How to make your own
            </a>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
};
