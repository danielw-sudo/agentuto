import React, { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_CHOICES, applyTheme, browserThemeStorage, loadTheme, saveTheme } from '../theme';
import type { ThemePreference } from '../theme';
import { focusRing } from './SiteLayout';

const LABEL: Record<ThemePreference, string> = { auto: 'Auto (follows your system)', light: 'Light', dark: 'Dark' };
const ICON: Record<ThemePreference, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  auto: Monitor,
  light: Sun,
  dark: Moon,
};

/** One icon button at the top right of the site pages: shows the current choice, and each press moves to the next. */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [choice, setChoice] = useState<ThemePreference>(() => loadTheme(browserThemeStorage()));
  const next = THEME_CHOICES[(THEME_CHOICES.indexOf(choice) + 1) % THEME_CHOICES.length];
  const Icon = ICON[choice];
  const label = `Colour theme: ${LABEL[choice]}. Press for ${LABEL[next]}.`;

  const press = () => {
    setChoice(next);
    applyTheme(document.documentElement, next);
    saveTheme(browserThemeStorage(), next);
  };

  return (
    <button
      type="button"
      data-theme-toggle
      data-choice={choice}
      aria-label={label}
      title={label}
      onClick={press}
      className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink ${focusRing} ${className}`}
    >
      <Icon className="size-5" aria-hidden={true} />
    </button>
  );
};
