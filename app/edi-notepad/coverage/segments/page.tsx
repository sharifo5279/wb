import Link from 'next/link';
import { listSegments } from '@/src/lib/edi/dictionaries';
import { SegmentsBrowser } from './SegmentsBrowser';

export const metadata = {
  title: 'EDI Notepad 2026 — Segment Dictionary',
};

export default function SegmentsBrowserPage() {
  // Pre-compute segment lists at build time so the client component just
  // renders + filters; no dictionary data shipped through props that wasn't
  // already in the bundle.
  const x12 = listSegments('X12');
  const edifact = listSegments('EDIFACT');
  const tradacoms = listSegments('TRADACOMS');

  return (
    <div
      className="wb-shell"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div className="np-cov-page">
        <header className="np-cov-page__header">
          <Link href="/edi-notepad/coverage" className="np-cov-back">
            ← Back to coverage
          </Link>
          <h1 className="np-cov-page__title">Segment Dictionary</h1>
          <p className="np-cov-page__sub">
            Every segment defined in the curated reference dictionary. Click any segment to
            expand its element-level definition (data type, length, allowed codes).
          </p>
        </header>

        <SegmentsBrowser x12={x12} edifact={edifact} tradacoms={tradacoms} />
      </div>

      <div className="wb-statusbar" aria-label="Notepad status">
        <span>EDI Notepad 2026 v0.1</span>
        <span className="wb-statusbar__ready">● Ready</span>
      </div>
    </div>
  );
}
