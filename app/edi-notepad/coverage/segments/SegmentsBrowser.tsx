'use client';

import { useMemo, useState } from 'react';
import type { SegmentDef } from '@/src/lib/edi/dictionaries';
import { SegmentDetail } from '../components/SegmentDetail';

type Tab = 'X12' | 'EDIFACT' | 'TRADACOMS';

interface SegmentsBrowserProps {
  x12: SegmentDef[];
  edifact: SegmentDef[];
  tradacoms: SegmentDef[];
}

/**
 * SegmentsBrowser — client-side tabbed browser over the segment dictionary.
 *
 * Tabs across the three standards; case-insensitive substring filter applied
 * to id and name simultaneously. Each row collapses into a SegmentDetail row
 * that exposes the full element-level table when expanded.
 */
export function SegmentsBrowser({ x12, edifact, tradacoms }: SegmentsBrowserProps) {
  const [tab, setTab] = useState<Tab>('X12');
  const [filter, setFilter] = useState('');

  const list = tab === 'X12' ? x12 : tab === 'EDIFACT' ? edifact : tradacoms;
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
  }, [list, filter]);

  const counts = {
    X12: x12.length,
    EDIFACT: edifact.length,
    TRADACOMS: tradacoms.length,
  } as const;

  return (
    <>
      <div className="np-cov-segbrowser__controls">
        <div className="np-cov-segbrowser__tabs" role="tablist">
          {(['X12', 'EDIFACT', 'TRADACOMS'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`np-cov-segbrowser__tab${tab === t ? ' np-cov-segbrowser__tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t} <span className="np-cov-segbrowser__tab-count">{counts[t]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Filter by ID or name…"
          className="np-cov-segbrowser__filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter segments"
        />
      </div>

      <section className="np-cov-section">
        <h2 className="np-cov-section__title">
          {tab} segments <span className="np-cov-section__count">({visible.length} shown)</span>
        </h2>
        <div className="np-cov-seglist">
          {visible.length === 0 ? (
            <div className="np-cov-empty">No segments match &quot;{filter}&quot;.</div>
          ) : (
            visible.map((def) => <SegmentDetail key={def.id} def={def} />)
          )}
        </div>
      </section>
    </>
  );
}
