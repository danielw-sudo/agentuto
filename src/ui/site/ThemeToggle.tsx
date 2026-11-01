import React, { useState } from 'react';
import { THEME_CHOICES, applyTheme, browserThemeStorage, loadTheme, saveTheme } from '../theme';
import type { ThemePreference } from '../theme';
import { focusRing } from './SiteLayout';

const LABEL: Record<ThemePreference, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };

/** Auto / Light / Dark for the site pages, in the footer so the header stays uncrowded. */
export const ThemeToggle: React.FC = () => {
  const [choice, setChoice] = useState<ThemePreference>(() => loadTheme(browserThemeStorage()));

  const pick = (next: ThemePreference) => {
    setChoice(next);
    applyTheme(document.documentElement, next);
    saveTheme(browserThemeStorage(), next);
  };

  return (
    <span role="group" aria-label="Colour theme" className="flex items-center gap-1">
      <span className="mr-1">Theme</span>
      {THEME_CHOICES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={choice === option}
          onClick={() => pick(option)}
          className={`inline-flex min-h-11 cursor-pointer items-center rounded-md px-2.5 ${focusRing} ${
            choice === option ? 'bg-sunken font-medium text-ink' : 'hover:underline'
          }`}
        >
          {LABEL[option]}
        </button>
      ))}
    </span>
  );
};
