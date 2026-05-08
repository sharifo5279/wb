import Link from 'next/link';
import { listCoverage } from '@/src/lib/edi/dictionaries';
import { CoverageView } from './CoverageView';

export const metadata = {
  title: 'EDI Notepad 2026 — Standards Coverage',
};

export default function CoveragePage() {
  const all = listCoverage();

  return (
    <div
      className="wb-shell"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div className="np-cov-page">
        <header className="np-cov-page__header">
          <Link href="/edi-notepad" className="np-cov-back">
            ← Back to Notepad
          </Link>
          <h1 className="np-cov-page__title">Standards Coverage</h1>
          <p className="np-cov-page__sub">
            EDI Notepad 2026 ships a curated dictionary covering the transaction sets used in
            Supply Chain, Logistics, Retail, CPG, Manufacturing, Grocery &amp; Cold Chain, and
            Financial Services. Click any transaction row to drill into its segment list and
            element-level definitions. <strong>Complete</strong> entries have both a full segment
            list and element-level metadata for every segment; <strong>Incomplete</strong> entries
            are still being authored — their segments may be defined but element-level detail
            (data type, length, code lists) is missing for some segments.
          </p>
          <p className="np-cov-page__totals">
            Browse the underlying{' '}
            <Link href="/edi-notepad/coverage/segments" className="np-cov-inline-link">
              segment dictionary
            </Link>{' '}
            for every defined segment across all three standards. Filter by version to see which
            transactions are known to apply to that release.
          </p>
        </header>

        <CoverageView entries={all} />
      </div>

      <div className="wb-statusbar" aria-label="Notepad status">
        <span>EDI Notepad 2026 v0.1</span>
        <span className="wb-statusbar__ready">● Ready</span>
      </div>
    </div>
  );
}
