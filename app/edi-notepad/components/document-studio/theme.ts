// ─── Shared theme helper ────────────────────────────────────────────────────
//
// Toggling lives on `<html data-theme="...">` so the inline boot script in
// app/layout.tsx can apply it before paint. localStorage persists the choice.
// Multiple components can call toggleTheme(); the ThemeToggle button observes
// the attribute via MutationObserver so it stays in sync with palette toggles.

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setTheme(t: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('np-theme', t); } catch { /* ignore */ }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
