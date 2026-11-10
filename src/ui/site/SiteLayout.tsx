import React, { useEffect, useState } from 'react';
import { SiteSearch } from './SiteSearch';
import { COMMUNITY } from '../../community';
import { ThemeToggle } from './ThemeToggle';

const IconMenu: React.FC<{ open: boolean }> = ({ open }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    {open ? <path d="M 4 4 L 16 16 M 16 4 L 4 16" /> : <path d="M 3 5 L 17 5 M 3 10 L 17 10 M 3 15 L 17 15" />}
  </svg>
);

/** Shared by every link and button on the site pages, so keyboard focus is always visible. */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export type SitePageName = 'home' | 'course' | 'about' | 'instruments' | 'guide';

const NAV: { href: string; label: string; page?: SitePageName }[] = [
  { href: '#/', label: 'Courses', page: 'home' },
  { href: '#/instruments', label: 'Instruments', page: 'instruments' },
  { href: '#/guide', label: 'User guide', page: 'guide' },
  { href: '#/about', label: 'About', page: 'about' },
];

const BrandMark: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <circle cx="14" cy="14" r="2.4" fill="currentColor" stroke="none" />
    <ellipse cx="14" cy="14" rx="11" ry="4.6" transform="rotate(-30 14 14)" />
    <ellipse cx="14" cy="14" rx="11" ry="4.6" transform="rotate(30 14 14)" />
  </svg>
);

interface SiteLayoutProps {
  current: SitePageName;
  /** The page's name, shown in the browser tab and history. */
  label: string;
  children: React.ReactNode;
}

/**
 * A full-window page laid over the workspace, so an experiment in progress keeps running underneath
 * (the workspace is made inert while a page is open). Header and footer carry nothing but links.
 */
export const SiteLayout: React.FC<SiteLayoutProps> = ({ current, label, children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = label;
    return () => {
      document.title = previous;
    };
  }, [label]);

  return (
  <div
    data-site-page={current}
    className="fixed inset-0 z-50 overflow-y-auto bg-paper text-ink font-sans text-base leading-relaxed select-text"
  >
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-10 gap-y-2 px-6 py-3 sm:px-8">
        <a
          href="#/"
          className={`order-1 flex min-h-11 items-center gap-2.5 text-lg font-semibold tracking-tight text-ink no-underline ${focusRing}`}
        >
          <span className="text-accent">
            <BrandMark />
          </span>
          Agentuto
        </a>
        <div className="order-2 ml-auto flex items-center gap-1 sm:order-5 sm:ml-0">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink sm:hidden ${focusRing}`}
          >
            <IconMenu open={mobileMenuOpen} />
          </button>
        </div>
        <nav aria-label="Main" className="order-3 hidden flex-wrap gap-x-7 text-[15px] sm:flex">
          {NAV.map((item) => {
            const active = item.page === current;
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center no-underline hover:underline ${focusRing} ${
                  active ? 'font-medium text-ink' : 'text-muted'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        {mobileMenuOpen && (
          <nav id="mobile-nav" aria-label="Mobile Main" className="order-3 flex w-full flex-col border-t border-line pt-2 pb-1 sm:hidden">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={item.page === current ? 'page' : undefined}
                className={`flex min-h-11 items-center px-2 text-base no-underline hover:underline ${focusRing} ${
                  item.page === current ? 'font-medium text-ink' : 'text-muted'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
        <div className="order-4 w-full sm:ml-auto sm:w-80 lg:w-96">
          <SiteSearch />
        </div>
      </div>
    </header>

    {children}

    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-x-8 gap-y-2 px-6 py-6 text-sm text-muted sm:px-8">
        <span>Open source under the MIT licence. Not affiliated with any institution.</span>
        <span className="flex flex-wrap items-center gap-x-6">
          {[
            { label: 'Discuss', href: COMMUNITY.discussions },
            { label: 'Report a problem', href: COMMUNITY.issues },
            { label: 'Propose an instrument', href: COMMUNITY.proposeInstrument },
            { label: 'GitHub', href: COMMUNITY.repo },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex min-h-11 items-center hover:underline ${focusRing}`}
            >
              {link.label}
            </a>
          ))}
        </span>
      </div>
    </footer>
  </div>
  );
};
