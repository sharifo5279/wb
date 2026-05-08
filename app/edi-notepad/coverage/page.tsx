import Link from 'next/link';
import { listCoverage } from '@/src/lib/edi/dictionaries';
import type { CoverageEntry } from '@/src/lib/edi/dictionaries';

export const metadata = {
  title: 'EDI Notepad 2026 — Standards Coverage',
};

function StatusPill({ kind, label }: { kind: 'full' | 'partial' | 'stub' | 'none'; label: string }) {
  return <span className={`np-cov-pill np-cov-pill--${kind}`}>{label}</span>;
}

function CoverageRow({ entry }: { entry: CoverageEntry }) {
  const href = `/edi-notepad/coverage/${entry.standard}/${entry.version}/${entry.code}`;
  return (
    <tr className="np-cov-rowlink">
      <td className="np-cov-code"><Link href={href}>{entry.code}</Link></td>
      <td><Link href={href}>{entry.name}</Link></td>
      <td className="np-cov-industry">{entry.industry}</td>
      <td>
        {entry.segmentCoverage === 'full' ? (
          <StatusPill kind="full" label="Full" />
        ) : (
          <StatusPill kind="stub" label="Stub" />
        )}
      </td>
      <td>
        {entry.elementCoverage === 'full' && <StatusPill kind="full" label="Full" />}
        {entry.elementCoverage === 'partial' && <StatusPill kind="partial" label="Partial" />}
        {entry.elementCoverage === 'none' && <StatusPill kind="none" label="—" />}
      </td>
    </tr>
  );
}

function CoverageTable({ title, version, entries }: { title: string; version: string; entries: CoverageEntry[] }) {
  const fullCount = entries.filter((e) => e.segmentCoverage === 'full').length;
  return (
    <section className="np-cov-section">
      <header className="np-cov-section__header">
        <h2 className="np-cov-section__title">{title}</h2>
        <span className="np-cov-section__version">{version}</span>
        <span className="np-cov-section__count">
          {fullCount} of {entries.length} with full segment list
        </span>
      </header>
      <div className="np-cov-table-wrap">
        <table className="np-cov-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Industry</th>
              <th>Segments</th>
              <th>Elements</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <CoverageRow key={`${e.standard}-${e.version}-${e.code}`} entry={e} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function CoveragePage() {
  const all = listCoverage();
  const x12 = all.filter((e) => e.standard === 'X12');
  const edifact = all.filter((e) => e.standard === 'EDIFACT');
  const tradacoms = all.filter((e) => e.standard === 'TRADACOMS');
  const totalFull = all.filter((e) => e.segmentCoverage === 'full').length;

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
            element-level definitions. Transactions marked <em>Stub</em> are recognized but
            their segment list is still being authored.
          </p>
          <p className="np-cov-page__totals">
            <strong>{totalFull}</strong> of <strong>{all.length}</strong> transactions have a full
            segment list. Browse the underlying{' '}
            <Link href="/edi-notepad/coverage/segments" className="np-cov-inline-link">
              segment dictionary
            </Link>{' '}
            for every defined segment across all three standards.
          </p>
        </header>

        <CoverageTable title="ANSI X12" version="005010" entries={x12} />
        <CoverageTable title="UN/EDIFACT" version="D01B" entries={edifact} />
        <CoverageTable title="TRADACOMS" version="ANA001" entries={tradacoms} />
      </div>

      <div className="wb-statusbar" aria-label="Notepad status">
        <span>EDI Notepad 2026 v0.1</span>
        <span className="wb-statusbar__ready">● Ready</span>
      </div>
    </div>
  );
}
