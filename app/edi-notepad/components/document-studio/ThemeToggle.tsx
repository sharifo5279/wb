'use client';

import { useEffect, useState } from 'react';
import type React from 'react';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

type Theme = 'light' | 'dark';

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

/**
 * ThemeToggle — small icon button that flips the page between light and
 * dark mode. Initial value is read from `document.documentElement.dataset.theme`,
 * which is set by an inline script in app/layout.tsx so there's no flash of
 * wrong theme before hydration. Persists to localStorage on toggle.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('np-theme', next); } catch { /* ignore */ }
  }

  // Render an aria-only placeholder during SSR to keep layout stable.
  const iconName = theme === 'dark' ? 'sun' : 'moon';
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      className="ds-toolbar__btn ds-theme-toggle"
      onClick={toggle}
      aria-label={label}
      title={label}
      suppressHydrationWarning
    >
      <span
        className="ds-toolbar__icon"
        aria-hidden="true"
        style={mounted ? icon(iconName) : icon('sun')}
      />
    </button>
  );
}
