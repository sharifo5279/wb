import type { Metadata } from 'next';
import './globals.css';
import { PortalNav } from '@/components/portal-nav';

export const metadata: Metadata = {
  title: 'OpenText Business Network',
  description: 'EDI Workbench Portal 2026',
};

/**
 * Root layout — shared by every route in the portal.
 *
 * Layout bands (flex column on <body>):
 *   1. <PortalNav>   — fixed-height portal navigation bar (56 px)
 *   2. {children}    — remaining viewport height; each route fills this space
 *
 * The <body> owns the `height: 100vh / display: flex / overflow: hidden`
 * contract so that the EDI Workbench workspace (and any other full-bleed
 * route) can achieve a zero-outer-scroll layout without re-rendering the nav.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PortalNav />
        {children}
      </body>
    </html>
  );
}
