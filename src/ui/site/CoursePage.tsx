import React from 'react';
import { SIMULATION_CATALOG } from '../../simulations';
import { Course, coursesOfSandbox } from '../../courses/courses';
import { SiteLayout, focusRing } from './SiteLayout';

interface CoursePageProps {
  course: Course;
  /** When false the 3D instruments are marked, instead of failing on click. */
  webglAvailable: boolean;
}

export const CoursePage: React.FC<CoursePageProps> = ({ course, webglAvailable }) => (
  <SiteLayout current="course" label={`${course.title} · Agentuto`}>
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <a href="#/" className={`hover:underline ${focusRing}`}>Courses</a>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{course.title}</span>
      </nav>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
        <div className="max-w-2xl flex-[1_1_30rem]">
          <div className="font-mono text-[13px] tracking-wide text-accent">Aligned with {course.id}</div>
          <h1 className="mt-3 font-display text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl">
            {course.title}
          </h1>
          <p className="mt-5 text-lg text-muted sm:text-xl">{course.lead}</p>
        </div>
        <p className="max-w-xs text-sm text-muted">
          Topic alignment only. Agentuto is not affiliated with or endorsed by MIT or any institution.
        </p>
      </div>

      <ol className="mt-14 list-none border-t border-line p-0">
        {course.modules.map((module, index) => {
          const sandbox = SIMULATION_CATALOG[module.sandboxId];
          const elsewhere = coursesOfSandbox(module.sandboxId).filter((c) => c.id !== course.id);
          const blocked = sandbox.mode === '3D' && !webglAvailable;
          return (
            <li key={module.sandboxId} className="border-b border-line">
              <a
                href={`#/sandbox/${encodeURIComponent(module.sandboxId)}`}
                className={`grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 px-2 py-8 text-ink no-underline hover:bg-sunken md:grid-cols-[3.5rem_minmax(0,1.2fr)_minmax(0,1fr)_6rem] md:items-center md:gap-x-8 ${focusRing}`}
              >
                <span className="font-mono text-sm text-muted">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0">
                  <span className="block font-display text-2xl font-medium leading-snug tracking-tight">{sandbox.title}</span>
                  <span className="mt-2 block font-mono text-sm text-muted">{sandbox.formattedODE}</span>
                </span>
                <span className="col-start-2 text-[15px] text-muted md:col-start-auto">
                  <span className="font-medium text-ink">You measure </span>
                  {module.measure}
                  {elsewhere.length > 0 && (
                    <span className="mt-2 block text-sm">
                      Also in {elsewhere.map((c) => c.id).join(', ')}.
                    </span>
                  )}
                </span>
                <span className="col-start-2 flex items-center gap-3 md:col-start-auto md:justify-self-end">
                  <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[13px] text-muted">
                    {sandbox.mode}
                  </span>
                  {blocked && <span className="text-sm text-muted">needs WebGL</span>}
                  <span className="text-accent" aria-hidden="true">&rarr;</span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>

      <p className="mt-12 text-[15px]">
        <a href="#/" className={`font-medium text-ink hover:underline ${focusRing}`}>&larr; All courses</a>
      </p>
    </main>
  </SiteLayout>
);
