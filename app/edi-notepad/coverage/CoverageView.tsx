'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { CoverageEntry } from '@/src/lib/edi/dictionaries';

/** Binary completeness: full segments + full element metadata = complete. */
function isComplete(e: CoverageEntry): boolean {
  return e.segmentCoverage === 'full' && e.elementCoverage === 'full';
}

function StatusPill({ kind, label }: { kind: 'complete' | 'incomplete'; label: string }) {
  return <span className={`np-cov-pill np-cov-pill--${kind === 'complete' ? 'full' : 'partial'}`}>{label}</span>;
}

function CoverageRow({ entry }: { entry: CoverageEntry }) {
  const href = `/edi-notepad/coverage/${entry.standard}/${entry.version}/${entry.code}`;
  const complete = isComplete(entry);
  return (
    <tr className="np-cov-rowlink">
      <td className="np-cov-code"><Link href={href}>{entry.code}</Link></td>
      <td><Link href={href}>{entry.name}</Link></td>
      <td className="np-cov-industry">{entry.industry}</td>
      <td className="np-cov-versions">
        {entry.supportedVersions.length > 1
          ? `${entry.supportedVersions[0]}–${entry.supportedVersions[entry.supportedVersions.length - 1]}`
          : entry.supportedVersions[0]}
      </td>
      <td>
        <StatusPill
          kind={complete ? 'complete' : 'incomplete'}
          label={complete ? 'Complete' : 'Incomplete'}
        />
      </td>
    </tr>
  );
}

function CoverageTable({ title, entries }: { title: string; entries: CoverageEntry[] }) {
  if (entries.length === 0) return null;
  const completeCount = entries.filter(isComplete).length;
  return (
    <section className="np-cov-section">
      <header className="np-cov-section__header">
        <h2 className="np-cov-section__title">{title}</h2>
        <span className="np-cov-section__count">
          {completeCount} of {entries.length} complete
        </span>
      </header>
      <div className="np-cov-table-wrap">
        <table className="np-cov-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Industry</th>
              <th>Versions</th>
              <th>Status</th>
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

interface CoverageViewProps {
  entries: CoverageEntry[];
}

const X12_VERSIONS = ['004010', '005010', '006020', '007010', '008010'];
const EDIFACT_VERSIONS = ['D96A', 'D01B', 'D04A'];

/**
 * CoverageView — client wrapper that filters the coverage table by version.
 * Default filter is "All versions" — shows every entry. Selecting a specific
 * X12 / EDIFACT version filters rows whose `supportedVersions` includes it.
 */
export function CoverageView({ entries }: CoverageViewProps) {
  const [versionFilter, setVersionFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (versionFilter === 'all') return entries;
    return entries.filter((e) => e.supportedVersions.includes(versionFilter));
  }, [entries, versionFilter]);

  const x12 = filtered.filter((e) => e.standard === 'X12');
  const edifact = filtered.filter((e) => e.standard === 'EDIFACT');
  const tradacoms = filtered.filter((e) => e.standard === 'TRADACOMS');
  const totalComplete = filtered.filter(isComplete).length;

  function exportCsv() {
    const header = ['Standard', 'Version', 'Code', 'Name', 'Industry', 'Supported Versions', 'Status'];
    const rows = filtered.map((e) => [
      e.standard,
      e.version,
      e.code,
      e.name,
      e.industry,
      e.supportedVersions.join('|'),
      isComplete(e) ? 'Complete' : 'Incomplete',
    ]);
    const escape = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edi-notepad-coverage-${versionFilter === 'all' ? 'all' : versionFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="np-cov-filter-bar">
        <label className="np-cov-filter-label" htmlFor="np-cov-version">Filter by version:</label>
        <select
          id="np-cov-version"
          className="np-cov-filter-select"
          value={versionFilter}
          onChange={(e) => setVersionFilter(e.target.value)}
        >
          <option value="all">All versions</option>
          <optgroup label="ANSI X12">
            {X12_VERSIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </optgroup>
          <optgroup label="UN/EDIFACT">
            {EDIFACT_VERSIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </optgroup>
          <optgroup label="TRADACOMS">
            <option value="ANA001">ANA001</option>
          </optgroup>
        </select>
        <span className="np-cov-filter-count">
          <strong>{totalComplete}</strong> of <strong>{filtered.length}</strong> complete
          {versionFilter !== 'all' && ` for ${versionFilter}`}
        </span>
        <button
          type="button"
          className="np-cov-export"
          onClick={exportCsv}
          title="Download visible coverage as CSV"
        >
          Export CSV
        </button>
      </div>

      <CoverageTable title="ANSI X12" entries={x12} />
      <CoverageTable title="UN/EDIFACT" entries={edifact} />
      <CoverageTable title="TRADACOMS" entries={tradacoms} />

      {filtered.length === 0 && (
        <div className="np-cov-empty">
          No transactions are tagged with version {versionFilter}. We curate against 005010 / D01B
          today; widely-deployed transactions are tagged broadly. Other versions will be added in
          subsequent dictionary updates.
        </div>
      )}
    </>
  );
}
