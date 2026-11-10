import React, { Suspense, lazy } from 'react';
import { SIMULATION_CATALOG } from '../../simulations';
import { COURSES, SUBJECTS } from '../../courses/courses';
import type { SubjectId } from '../../courses/courses';
import { localReport } from '../../simulations/loadLocal';
import { COMMUNITY } from '../../community';
import { LocalBadge } from './LocalBadge';
import { SiteLayout, focusRing } from './SiteLayout';

// Reads the learner's Inquiry Log, so it carries the journal code; kept out of the first load.
const ActivityCard = lazy(() => import('./ActivityCard').then((m) => ({ default: m.ActivityCard })));

interface HomePageProps {
  /** The sandbox already open underneath, if any, so the learner can pick the experiment back up. */
  resumeSandboxId: string | null;
}

const STEPS = [
  { n: '01', title: 'Predict', body: 'Write down what you expect before you touch a slider. The Inquiry Log keeps it next to the result.' },
  { n: '02', title: 'Measure', body: 'Read telemetry with its units, fit your own line, and export the data as CSV for the tools you already use.' },
  { n: '03', title: 'Explain', body: 'Say what you found in your own words. Agentuto never hands you the answer.' },
];

function subjectIcon(id: SubjectId): React.ReactNode {
  if (id === 'physics') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="10" cy="10" r="1.8" fill="currentColor" stroke="none" />
        <ellipse cx="10" cy="10" rx="8" ry="3.2" transform="rotate(-30 10 10)" />
        <ellipse cx="10" cy="10" rx="8" ry="3.2" transform="rotate(30 10 10)" />
      </svg>
    );
  }
  if (id === 'mathematics') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="2" y1="15" x2="18" y2="15" />
        <path d="M 3 14 C 6 14, 7 5, 10 5 C 13 5, 14 14, 17 14" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M 2 10 C 5 5, 15 5, 18 10 C 15 15, 5 15, 2 10 Z" />
      <circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export const HomePage: React.FC<HomePageProps> = ({ resumeSandboxId }) => {
  const resume = resumeSandboxId ? SIMULATION_CATALOG[resumeSandboxId] : undefined;
  const sandboxCount = Object.keys(SIMULATION_CATALOG).length;

  return (
    <SiteLayout current="home" label="Courses · Agentuto">
      <main>
        {/* Hero Section */}
        <section className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-16 gap-y-6 sm:gap-y-12 px-6 py-8 sm:px-8 sm:py-20">
          <div className="min-w-0 flex-[1_1_28rem] max-w-xl">
            <p className="mb-4 text-xs font-semibold tracking-wider uppercase text-muted sm:text-sm">
              {SUBJECTS.map((s) => s.name).join(' · ')}
            </p>
            <h1 className="font-display text-4xl font-medium leading-[1.08] tracking-tight sm:text-6xl">
              Measure it. Don&rsquo;t just watch it.
            </h1>
            <p className="mt-5 sm:mt-7 text-lg leading-relaxed text-muted sm:text-xl">
              {sandboxCount} open interactive science and mathematics instruments that run in your browser, record real
              data, and ask you to predict before you measure.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
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
            <p className="mt-6 sm:mt-8 text-sm text-muted">Free and open source. Works offline once opened. No account, no tracking.</p>
          </div>

          {/* 3 Hero Preview Cards */}
          <div className="m-0 min-w-0 max-w-lg flex-[1_1_22rem] flex flex-col gap-3.5" role="presentation">
            {/* Top full-width card: Physics (damped oscillator) */}
            <div className="rounded-2xl border border-line bg-card p-4">
              <div className="mb-2 flex items-center justify-between font-mono text-xs">
                <span className="font-semibold" style={{ color: 'var(--subject-physics)' }}>Physics</span>
                <span className="text-muted">Standing Waves</span>
              </div>
              <svg
                viewBox="0 0 320 80"
                className="block h-16 w-full"
                aria-hidden="true"
              >
                <line x1="8" y1="40" x2="312" y2="40" stroke="var(--line)" strokeWidth="1" />
                <path
                  d="M 8 40 Q 24 5, 40 40 T 72 40 T 104 40 T 136 40 T 168 40 T 200 40 T 232 40 T 264 40 T 296 40"
                  fill="none"
                  style={{ stroke: 'var(--subject-physics)' }}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Bottom 2 side-by-side cards: Mathematics & Psychology */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Mathematics: Lorenz loop */}
              <div className="rounded-2xl border border-line bg-card p-4">
                <div className="mb-2 flex items-center justify-between font-mono text-xs">
                  <span className="font-semibold" style={{ color: 'var(--subject-mathematics)' }}>Mathematics</span>
                  <span className="text-muted truncate">Lorenz</span>
                </div>
                <svg
                  viewBox="0 0 140 70"
                  className="block h-14 w-full"
                  aria-hidden="true"
                >
                  <path
                    d="M 70 38 C 50 14, 18 16, 18 36 C 18 56, 54 60, 70 38 C 86 16, 122 14, 122 36 C 122 56, 90 60, 70 38 C 56 24, 28 26, 28 38 C 28 48, 56 52, 70 38 C 84 24, 112 26, 112 38 C 112 48, 84 52, 70 38"
                    fill="none"
                    style={{ stroke: 'var(--subject-mathematics)' }}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Psychology: Overlapping bell curves + dashed criterion */}
              <div className="rounded-2xl border border-line bg-card p-4">
                <div className="mb-2 flex items-center justify-between font-mono text-xs">
                  <span className="font-semibold" style={{ color: 'var(--subject-psychology)' }}>Psychology</span>
                  <span className="text-muted truncate">Signal</span>
                </div>
                <svg
                  viewBox="0 0 140 70"
                  className="block h-14 w-full"
                  aria-hidden="true"
                >
                  <line x1="8" y1="58" x2="132" y2="58" stroke="var(--line)" strokeWidth="1" />
                  {/* Noise distribution */}
                  <path
                    d="M 12 58 C 28 58, 38 18, 50 18 C 62 18, 72 58, 88 58"
                    fill="none"
                    style={{ stroke: 'var(--subject-psychology)' }}
                    strokeWidth="1.8"
                    strokeOpacity="0.55"
                  />
                  {/* Signal + noise distribution */}
                  <path
                    d="M 52 58 C 68 58, 78 18, 90 18 C 102 18, 112 58, 128 58"
                    fill="none"
                    style={{ stroke: 'var(--subject-psychology)' }}
                    strokeWidth="1.8"
                  />
                  {/* Decision criterion line */}
                  <line
                    x1="70"
                    y1="12"
                    x2="70"
                    y2="58"
                    stroke="var(--muted)"
                    strokeWidth="1.4"
                    strokeDasharray="3 3"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {(localReport.sandboxes.length > 0 || localReport.courses.length > 0 || localReport.problems.length > 0) && (
          <section aria-label="Private modules" className="border-t border-line bg-card">
            <div className="mx-auto max-w-6xl px-6 py-6 text-sm sm:px-8">
              <p className="flex flex-wrap items-center gap-3 text-ink">
                <LocalBadge />
                <span>
                  {localReport.sandboxes.length} instrument{localReport.sandboxes.length === 1 ? '' : 's'} and {localReport.courses.length} course
                  {localReport.courses.length === 1 ? '' : 's'} loaded from your local/ folder.
                </span>
              </p>
              {localReport.problems.length > 0 && (
                <ul className="mt-3 list-none space-y-1 p-0 text-muted">
                  {localReport.problems.map((problem) => (
                    <li key={problem.source + problem.reason}>
                      <span className="font-mono text-ink">{problem.source}</span> was not loaded: {problem.reason}.
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* Courses Section - Grouped by Subject */}
        <section id="courses" className="scroll-mt-4 border-t border-line bg-sunken">
          <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 sm:py-20">
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
              <h2 className="font-display text-3xl font-medium tracking-tight">Courses</h2>
              <p className="max-w-md text-sm text-muted">
                Topics aligned with MIT OpenCourseWare, University of Toronto and AP/IB syllabi. Not affiliated with or
                endorsed by any institution.
              </p>
            </div>

            {/* Subjects share rows: a large subject spans the full width, small ones sit side by side. */}
            <div className="mt-6 space-y-6 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-14 sm:space-y-0 lg:grid-cols-3">
              {[
                ...SUBJECTS.map((subj) => ({
                  id: subj.id,
                  name: subj.name,
                  color: `var(--subject-${subj.id})`,
                  softColor: `var(--subject-${subj.id}-soft)`,
                  icon: subjectIcon(subj.id),
                  courses: COURSES.filter((c) => c.subject === subj.id),
                })),
                {
                  id: 'local',
                  name: 'Your courses',
                  color: 'var(--accent)',
                  softColor: 'var(--sunken)',
                  icon: <LocalBadge />,
                  courses: COURSES.filter((c) => !c.subject),
                },
              ]
                .filter((group) => group.courses.length > 0)
                .map((group) => {
                  const distinctInstruments = new Set(
                    group.courses.flatMap((c) => c.modules.map((m) => m.sandboxId))
                  ).size;
                  const nCourses = group.courses.length;
                  const span = nCourses > 2 ? 'sm:col-span-2 lg:col-span-3' : nCourses === 2 ? 'sm:col-span-2' : '';
                  const cols = nCourses > 2 ? 'sm:grid-cols-2 lg:grid-cols-3' : nCourses === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1';

                  return (
                    <div key={group.id} className={`space-y-3 sm:space-y-6 ${span}`} data-subject-group={group.id}>
                      {/* Subject Group Header */}
                      <div className="flex items-center gap-3.5">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: group.softColor,
                            color: group.color,
                          }}
                        >
                          {group.icon}
                        </div>
                        <div>
                          <h3 className="font-display text-xl font-medium tracking-tight text-ink">{group.name}</h3>
                          <p className="text-xs text-muted">
                            {nCourses} course{nCourses === 1 ? '' : 's'} · {distinctInstruments} instrument{distinctInstruments === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      {/* Desktop Cards Grid (>= 640px) */}
                      <ul className={`hidden sm:grid ${cols} gap-6 list-none p-0`}>
                        {group.courses.map((course) => (
                          <li key={course.id} className="flex">
                            <div className="relative flex w-full flex-col gap-4 rounded-2xl border border-line bg-card p-7 text-ink hover:border-accent">
                              {/* Tag chips */}
                              <div className="relative z-10 flex flex-wrap items-center gap-2">
                                {course.tags ? (
                                  course.tags.map((tag) => {
                                    const isMit = tag.school === 'MIT' || tag.code === course.id;
                                    return (
                                      <a
                                        key={tag.code}
                                        href={tag.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={`Aligned with ${tag.code}, ${tag.school} (opens the course page)`}
                                        aria-label={`Aligned with ${tag.code}, ${tag.school} (opens the course page)`}
                                        style={
                                          isMit
                                            ? undefined
                                            : {
                                                backgroundColor: group.softColor,
                                                color: group.color,
                                              }
                                        }
                                        className={`inline-flex min-h-8 items-center rounded-md px-2.5 py-1 font-mono text-xs font-medium no-underline hover:opacity-85 ${
                                          isMit
                                            ? 'border border-line bg-sunken text-muted hover:border-accent hover:text-ink'
                                            : ''
                                        } ${focusRing}`}
                                      >
                                        {isMit ? `MIT ${tag.code}` : tag.code}
                                      </a>
                                    );
                                  })
                                ) : (
                                  <span className="font-mono text-xs text-accent">Course {course.id}</span>
                                )}
                                {course.local && <LocalBadge />}
                              </div>

                              {/* Title with stretched link */}
                              <a
                                href={`#/course/${encodeURIComponent(course.id)}`}
                                className={`font-display text-2xl font-medium leading-snug tracking-tight text-ink no-underline after:absolute after:inset-0 after:rounded-2xl ${focusRing}`}
                              >
                                {course.title}
                              </a>

                              {/* Course lead */}
                              <p className="text-sm leading-relaxed text-muted">
                                {course.lead}
                              </p>

                              {/* Footer */}
                              <span className="mt-auto flex items-center justify-between text-sm text-muted pt-2 border-t border-line/60">
                                <span>
                                  {course.modules.length} instrument{course.modules.length === 1 ? '' : 's'}
                                </span>
                                <span
                                  className="font-medium"
                                  style={{ color: group.color }}
                                >
                                  Open &rarr;
                                </span>
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* Mobile Rows (< 640px) */}
                      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card sm:hidden">
                        {group.courses.map((course) => {
                          const tagCodes = course.tags ? course.tags.map((t) => t.code) : [`Course ${course.id}`];
                          const metaLine = [...tagCodes, `${course.modules.length} instrument${course.modules.length === 1 ? '' : 's'}`].join(' · ');

                          return (
                            <a
                              key={course.id}
                              href={`#/course/${encodeURIComponent(course.id)}`}
                              className={`flex min-h-[72px] items-center justify-between gap-4 px-4 py-3 text-ink no-underline hover:bg-sunken ${focusRing}`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-display text-lg font-medium leading-snug tracking-tight text-ink">
                                  {course.title}
                                </div>
                                <div className="mt-1 font-mono text-xs text-muted">
                                  {metaLine}
                                </div>
                              </div>
                              <span
                                className="text-base font-semibold"
                                style={{ color: group.color }}
                                aria-hidden="true"
                              >
                                &rarr;
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </section>

        <Suspense fallback={null}>
          <ActivityCard />
        </Suspense>

        <section className="mx-auto max-w-6xl px-6 py-8 sm:px-8 sm:py-20">
          <h2 className="font-display text-3xl font-medium tracking-tight">One loop in every instrument</h2>
          <ol className="mt-6 sm:mt-12 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-3 md:gap-12">
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
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 sm:gap-8 px-6 py-8 sm:px-8 sm:py-20">
            <div className="max-w-2xl flex-[1_1_28rem]">
              <h2 className="font-display text-3xl font-medium tracking-tight">
                Use it. Extend it privately. Share it if you&rsquo;re proud of it.
              </h2>
              <p className="mt-5 text-lg text-muted">
                Run Agentuto on your own computer and add instruments of your own that stay on your machine. If one turns
                out well, fork the project or send it upstream.
              </p>
              <p className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
                {[
                  { label: 'Ask or discuss', href: COMMUNITY.discussions },
                  { label: 'Report a problem', href: COMMUNITY.issues },
                  { label: 'Share what you built', href: COMMUNITY.showAndTell },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4 ${focusRing}`}
                  >
                    {link.label} &rarr;
                  </a>
                ))}
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
