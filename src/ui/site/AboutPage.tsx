import React from 'react';
import { COMMUNITY } from '../../community';
import { AgentMark, AgentMarkName } from '../components/AgentMark';
import { SiteLayout, focusRing } from './SiteLayout';

const CONTRIBUTORS: { mark: AgentMarkName; name: string }[] = [
  { mark: 'gemini', name: 'Gemini 3.8 Flash' },
  { mark: 'gemini', name: 'Gemini 4 Argon' },
  { mark: 'claude', name: 'Claude Opus 5.5' },
  { mark: 'deepseek', name: 'DeepSeek V4 Flash' },
];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-t border-line py-10">
    <h2 className="font-display text-2xl font-medium tracking-tight">{title}</h2>
    <div className="mt-4 space-y-4 text-muted">{children}</div>
  </section>
);

const ExternalLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" className={`font-medium text-accent underline underline-offset-4 ${focusRing}`}>
    {children}
  </a>
);

export const AboutPage: React.FC = () => (
  <SiteLayout current="about" label="About · Agentuto">
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-12 sm:px-8 sm:pt-16">
      <h1 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">About Agentuto</h1>
      <p className="mt-6 text-lg text-muted">
        Agentuto is an open-source, local-first set of interactive physics and mathematics instruments. You set the
        parameters, predict, measure and explain. It runs in your browser, keeps your work on your own device, and has no
        backend, accounts or analytics.
      </p>

      <div className="mt-10">
        <Section title="Optional AI">
          <p>
            Every instrument, notebook and export works without AI. If you choose to turn on the tutor, it uses your own
            key from your own provider, under that provider&rsquo;s terms, including its age and regional requirements.
            The key stays in this browser, and what you send goes only to the provider you configured.
          </p>
          <p>
            The tutor is instructed not to hand out final answers. That is an instruction to the model, not a guarantee,
            and models can still be wrong, so check results against your own measurements. If you need permission from a
            parent, teacher or institution to use an AI service, get it first, and follow the rules that apply to you.
            The full notice is in the <a href="#/guide" className={`font-medium text-accent underline underline-offset-4 ${focusRing}`}>user guide</a>.
          </p>
        </Section>

        <Section title="Licence and independence">
          <p>
            Agentuto is released under the MIT licence. It is an independent project and is not affiliated with or
            endorsed by MIT, the College Board (AP), the International Baccalaureate (IB), Google or Anthropic. Course
            labels such as &ldquo;Aligned with 8.02&rdquo; describe topic alignment only.
          </p>
        </Section>

        <Section title="Built with AI agents">
          <p>Much of Agentuto was written and reviewed by AI agents working under the project owner&rsquo;s direction.</p>
          <ul className="m-0 flex list-none flex-wrap gap-x-8 gap-y-3 p-0 text-ink">
            {CONTRIBUTORS.map((agent) => (
              <li key={agent.name} className="flex items-center gap-2.5">
                <AgentMark name={agent.mark} className="h-4 w-4 shrink-0" />
                <span className="font-mono text-sm">{agent.name}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Take part">
          <ul className="m-0 list-none space-y-2 p-0">
            <li>
              <ExternalLink href={COMMUNITY.repo}>The project on GitHub</ExternalLink>
            </li>
            <li>
              <ExternalLink href={COMMUNITY.discussions}>Discussions: questions, ideas, and what you built</ExternalLink>
            </li>
            <li>
              <ExternalLink href={COMMUNITY.physics}>Report a physics or maths discrepancy</ExternalLink>
            </li>
            <li>
              <ExternalLink href={COMMUNITY.issues}>Report any other problem</ExternalLink>
            </li>
            <li>
              <ExternalLink href={COMMUNITY.proposeInstrument}>Propose an instrument</ExternalLink>
            </li>
            <li>
              <ExternalLink href={COMMUNITY.mapCourse}>Map your course to the instruments</ExternalLink>
            </li>
          </ul>
        </Section>
      </div>
    </main>
  </SiteLayout>
);
