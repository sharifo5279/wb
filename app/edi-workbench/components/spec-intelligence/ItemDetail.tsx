'use client';

import type React from 'react';
import type { SpecItem, SpecItemType } from '@/src/lib/edi/spec-types';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

// ─── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<SpecItemType, string> = {
  segment:   '#34c9b0',
  rule:      '#f5a623',
  code_list: '#4f8ef7',
  note:      '#8b95a8',
};

const TYPE_BG: Record<SpecItemType, string> = {
  segment:   'rgba(52, 201, 176, 0.12)',
  rule:      'rgba(245, 166, 35, 0.12)',
  code_list: 'rgba(79, 142, 247, 0.12)',
  note:      'rgba(139, 149, 168, 0.12)',
};

const TYPE_LABEL: Record<SpecItemType, string> = {
  segment:   'Segment',
  rule:      'Business Rule',
  code_list: 'Code List',
  note:      'Note',
};

const TYPE_ICON: Record<SpecItemType, string> = {
  segment:   'layers',
  rule:      'shield-check',
  code_list: 'list',
  note:      'info',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ItemDetailProps {
  /** The item to display, or null when nothing is selected. */
  item: SpecItem | null;
}

/**
 * ItemDetail — right panel of the Spec Intelligence results view.
 *
 * Shows the full detail of a selected SpecItem:
 *  - Type chip + icon
 *  - ID heading
 *  - Summary subtitle
 *  - Full detail body (preserves newlines)
 *
 * When no item is selected, shows a friendly empty state.
 */
export function ItemDetail({ item }: ItemDetailProps) {
  if (!item) {
    return (
      <div className="si-item-detail si-item-detail--empty">
        <span
          className="si-item-detail__empty-icon"
          aria-hidden="true"
          style={icon('mouse-pointer-click')}
        />
        <p className="si-item-detail__empty-text">
          Select an item from the list to view its details.
        </p>
      </div>
    );
  }

  const color  = TYPE_COLOR[item.type];
  const bg     = TYPE_BG[item.type];
  const label  = TYPE_LABEL[item.type];
  const typeIcon = TYPE_ICON[item.type];

  return (
    <div className="si-item-detail" key={`${item.type}::${item.id}`}>
      {/* ── Header ── */}
      <div className="si-item-detail__header">
        {/* Type chip */}
        <span
          className="si-item-detail__type-chip"
          style={{ color, backgroundColor: bg }}
        >
          <span
            className="si-item-detail__type-icon"
            aria-hidden="true"
            style={icon(typeIcon)}
          />
          {label}
        </span>

        {/* ID */}
        <h2 className="si-item-detail__id">{item.id}</h2>

        {/* Summary */}
        <p className="si-item-detail__summary">{item.summary}</p>
      </div>

      {/* ── Detail body ── */}
      <div className="si-item-detail__body">
        <pre className="si-item-detail__pre">{item.detail}</pre>
      </div>
    </div>
  );
}
