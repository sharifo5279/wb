'use client';

import Link from 'next/link';

/**
 * Masthead — the top branding strip rendered above the doc tabs / toolbar.
 *
 * Pure presentational. Left side carries the product wordmark
 * ("EDI Notepad"), right side carries the OpenText parent-brand wordmark.
 * Coverage link sits in the middle so it's always one click away from
 * any view.
 */
export function Masthead() {
  return (
    <header className="ds-masthead" role="banner">
      <div className="ds-masthead__product">
        <Link href="/edi-notepad" className="ds-masthead__wordmark" aria-label="EDI Notepad — go to home">
          <span className="ds-masthead__wordmark-glyph" aria-hidden="true">⌗</span>
          <span className="ds-masthead__wordmark-text">EDI Notepad</span>
        </Link>
        <span className="ds-masthead__sep" aria-hidden="true" />
        <Link href="/edi-notepad/coverage" className="ds-masthead__nav-link">
          Coverage
        </Link>
      </div>

      <div className="ds-masthead__partner" aria-label="OpenText Business Network">
        <span className="ds-masthead__partner-label">part of</span>
        <span className="ds-masthead__partner-mark">OpenText<span className="ds-masthead__partner-tm" aria-hidden="true">™</span></span>
      </div>
    </header>
  );
}
