import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenText Business Network — EDI Notepad 2026',
  description: 'EDI Notepad 2026 — modern successor to the Liaison EDI Notepad.',
};

// Modern IDE-style pairing: Inter for UI, JetBrains Mono for code.
// These hit Google Fonts at build time and are self-hosted by Next, so the
// CSS variables are always available at first paint — no FOUT.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--wb-font-ui-loaded',
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--wb-font-mono-loaded',
  weight: ['400', '500', '600', '700'],
});

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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
