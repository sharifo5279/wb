'use client';

import { useEffect, useState } from 'react';
import type React from 'react';
import { getTheme, toggleTheme, type Theme } from './theme';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

/**
 * ThemeToggle — flips between light and dark mode. Observes the `data-theme`
 * attribute on <html> via MutationObserver so the icon stays in sync when
 * the theme is changed elsewhere (e.g., from the command palette).
 */
export function ThemeToggle() {
  const [theme, setLocalTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocalTheme(getTheme());
    setMounted(true);

    const root = document.documentElement;
    const obs = new MutationObserver(() => setLocalTheme(getTheme()));
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  function handleClick() {
    toggleTheme();
    // Local state updates via the MutationObserver above.
  }

  const iconName = theme === 'dark' ? 'sun' : 'moon';
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      className="ds-toolbar__btn ds-theme-toggle"
      onClick={handleClick}
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
