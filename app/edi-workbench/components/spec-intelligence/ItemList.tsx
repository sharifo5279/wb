'use client';

import { useState, useMemo } from 'react';
import type { SpecItem, SpecItemType } from '@/src/lib/edi/spec-types';

// ─── Type colours ─────────────────────────────────────────────────────────────

/** Dot and chip accent colours per item type. */
const TYPE_COLOR: Record<SpecItemType, string> = {
  segment:   '#34c9b0', // teal — matches segment tree
  rule:      '#f5a623', // amber
  code_list: '#4f8ef7', // blue
  note:      '#8b95a8', // slate
};

const TYPE_LABEL: Record<SpecItemType, string> = {
  segment:   'Segment',
  rule:      'Rule',
  code_list: 'Code List',
  note:      'Note',
};

// ─── Filter chip config ───────────────────────────────────────────────────────

type FilterValue = 'all' | SpecItemType;

interface ChipConfig {
  value: FilterValue;
  label: string;
}

const CHIPS: ChipConfig[] = [
  { value: 'all',       label: 'All' },
  { value: 'segment',   label: 'Segments' },
  { value: 'rule',      label: 'Rules' },
  { value: 'code_list', label: 'Code Lists' },
  { value: 'note',      label: 'Notes' },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ItemListProps {
  /** Full list of extracted items. */
  items: SpecItem[];
  /** ID of the currently selected item, or null if none. */
  selectedId: string | null;
  /** Called when the user clicks an item row. */
  onSelect: (item: SpecItem) => void;
}

/**
 * ItemList — left panel of the Spec Intelligence results view.
 *
 * Features:
 *  - Free-text search (matches item id and summary, case-insensitive)
 *  - Filter chips: All | Segments | Rules | Code Lists | Notes
 *  - Scrollable list of item rows with type dot, id, and summary
 */
export function ItemList({ items, selectedId, onSelect }: ItemListProps) {
  const [query,  setQuery]  = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');

  // ── Filtered + searched items ───────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      if (filter !== 'all' && item.type !== filter) return false;
      if (q && !item.id.toLowerCase().includes(q) && !item.summary.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [items, query, filter]);

  return (
    <div className="si-item-list">
      {/* ── Search ── */}
      <div className="si-item-list__search-wrap">
        <input
          className="si-item-list__search"
          type="search"
          placeholder="Search by ID or description…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search spec items"
        />
      </div>

      {/* ── Filter chips ── */}
      <div className="si-item-list__chips" role="group" aria-label="Filter by type">
        {CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            className={['si-chip', filter === chip.value ? 'si-chip--active' : ''].filter(Boolean).join(' ')}
            onClick={() => setFilter(chip.value)}
            aria-pressed={filter === chip.value}
          >
            {chip.label}
            {chip.value !== 'all' && (
              <span className="si-chip__count">
                {items.filter((i) => i.type === chip.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Item rows ── */}
      <ul
        className="si-item-list__body"
        role="listbox"
        aria-label="Extracted specification items"
      >
        {visible.length === 0 ? (
          <li className="si-item-list__empty">
            No items match your search.
          </li>
        ) : (
          visible.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <li
                key={`${item.type}::${item.id}`}
                role="option"
                aria-selected={isSelected}
                className={[
                  'si-item-row',
                  isSelected ? 'si-item-row--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelect(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(item);
                  }
                }}
                tabIndex={0}
                title={`${TYPE_LABEL[item.type]}: ${item.id}`}
              >
                {/* Type colour dot */}
                <span
                  className="si-item-row__dot"
                  aria-hidden="true"
                  style={{ backgroundColor: TYPE_COLOR[item.type] }}
                />
                {/* ID */}
                <span className="si-item-row__id">{item.id}</span>
                {/* Summary */}
                <span className="si-item-row__summary">{item.summary}</span>
              </li>
            );
          })
        )}
      </ul>

      {/* ── Result count ── */}
      <div className="si-item-list__footer" aria-live="polite">
        {visible.length} of {items.length} item{items.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
