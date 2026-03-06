'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'EDI Workbench', href: '/edi-workbench' },
  { label: 'Trading Partners', href: '/trading-partners' },
  { label: 'Reports', href: '/reports' },
  { label: 'Settings', href: '/settings' },
];

/**
 * Portal-level navigation bar. Rendered once in the root layout and inherited
 * by all route segments — do not re-render inside child pages.
 *
 * Active-item detection uses `usePathname()`: the Dashboard item matches only
 * the exact root path (`/`); all other items match by `startsWith` so that
 * nested routes (e.g. `/edi-workbench/...`) keep the correct item highlighted.
 */
export function PortalNav() {
  const pathname = usePathname();

  return (
    <header className="portal-nav">
      <div className="portal-nav__brand">
        <span className="portal-nav__brand-name">OpenText Business Network</span>
      </div>

      <nav className="portal-nav__nav" aria-label="Portal navigation">
        <ul className="portal-nav__list">
          {NAV_ITEMS.map(({ label, href }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);

            return (
              <li key={href} className="portal-nav__item">
                <Link
                  href={href}
                  className={[
                    'portal-nav__link',
                    isActive ? 'portal-nav__link--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
