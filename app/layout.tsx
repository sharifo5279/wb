import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenText Business Network — EDI Notepad 2026',
  description: 'EDI Notepad 2026 — modern successor to the Liaison EDI Notepad.',
};

/**
 * Inline script that runs synchronously before paint to set the theme
 * from localStorage (or system preference). Prevents a flash of the
 * wrong theme on first load.
 */
const themeBootScript = `
  try {
    var t = localStorage.getItem('np-theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.dataset.theme = t;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
