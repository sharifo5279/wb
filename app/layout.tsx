import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenText Business Network — EDI Notepad 2026',
  description: 'EDI Notepad 2026 — modern successor to the Liaison EDI Notepad.',
};

/**
 * Root layout — every route fills the viewport directly.
 *
 * The earlier portal-style nav has been removed; this app is single-purpose
 * (EDI Notepad 2026). Each route owns its own header / toolbar.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
