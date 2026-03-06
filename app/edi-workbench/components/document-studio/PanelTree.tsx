'use client';

import type React from 'react';
import type { Segment, SegmentNode, ParseError } from '@/src/lib/edi/types';
import { SegmentTree } from './SegmentTree';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PanelTreeProps {
  // ── Panel shell (Task 2) ──
  collapsed: boolean;
  onToggle: () => void;
  // ── Segment tree data (Task 3) ──
  hierarchy: SegmentNode[];
  errors: ParseError[];
  activeSegmentLine: number | null;
  onNodeClick: (line: number) => void;
  /** Task 8 — called with the Segment object when a tree node is clicked. */
  onSegmentSelect: (segment: Segment) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PanelTree — left panel (Segment Tree), 25% width, collapsible.
 *
 * Header row:
 *   [SEGMENT TREE]  [N errors badge?]  [‹ collapse chevron]
 *
 * The error badge is only shown when `errors.length > 0` and the panel
 * is expanded (badge is hidden when the panel collapses to the icon strip).
 *
 * Body: mounts `<SegmentTree>` which shows either an empty state or the
 * full interactive node tree from the current ParseResult.
 */
export function PanelTree({
  collapsed,
  onToggle,
  hierarchy,
  errors,
  activeSegmentLine,
  onNodeClick,
  onSegmentSelect,
}: PanelTreeProps) {
  const errorCount = errors.length;

  return (
    <aside
      className={`ds-panel-tree${collapsed ? ' ds-panel-tree--collapsed' : ''}`}
      aria-label="Segment Tree panel"
    >
      {/* ── Panel header ── */}
      <div className="ds-panel__header">
        {/* Title (hidden via CSS when collapsed) */}
        <span className="ds-panel__title" aria-hidden={collapsed}>
          Segment Tree
        </span>

        {/* Error count badge — only when expanded and there are errors */}
        {!collapsed && errorCount > 0 && (
          <span
            className="ds-panel__error-badge"
            aria-label={`${errorCount} validation ${errorCount === 1 ? 'error' : 'errors'}`}
            title={`${errorCount} parse/validation ${errorCount === 1 ? 'error' : 'errors'}`}
          >
            {errorCount} {errorCount === 1 ? 'error' : 'errors'}
          </span>
        )}

        {/* Collapse / expand chevron */}
        <button
          type="button"
          className="ds-panel__btn"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand segment tree panel' : 'Collapse segment tree panel'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          <span
            className="ds-panel__btn-icon"
            aria-hidden="true"
            style={icon(collapsed ? 'chevron-right' : 'chevron-left')}
          />
        </button>
      </div>

      {/* ── Panel body (hidden via CSS when collapsed) ── */}
      <div
        className="ds-panel__body"
        aria-hidden={collapsed}
      >
        <SegmentTree
          hierarchy={hierarchy}
          errors={errors}
          activeSegmentLine={activeSegmentLine}
          onNodeClick={onNodeClick}
          onSegmentSelect={onSegmentSelect}
        />
      </div>
    </aside>
  );
}
