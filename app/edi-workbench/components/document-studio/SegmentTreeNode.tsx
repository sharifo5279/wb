'use client';

import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import type { Segment, SegmentNode } from '@/src/lib/edi/types';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

// ─── Segment type colour mapping ──────────────────────────────────────────────
// Spec colours by segment family:
//   ISA/UNB envelope  → #7c6af7  (indigo-violet)
//   GS/UNG group      → #4f8ef7  (blue)
//   ST/UNH transaction → #34c9b0  (teal)
//   other loop nodes  → #f5a623  (amber)
//   data segments     → #8b95a8  (slate)

function segmentColor(id: string, isLoop: boolean): string {
  switch (id) {
    case 'ISA': case 'IEA': case 'UNB': case 'UNZ': return '#7c6af7';
    case 'GS':  case 'GE':  case 'UNG': case 'UNE': return '#4f8ef7';
    case 'ST':  case 'SE':  case 'UNH': case 'UNT': case 'BGM': return '#34c9b0';
    default: return isLoop ? '#f5a623' : '#8b95a8';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface SegmentTreeNodeProps {
  node: SegmentNode;
  /** 0-based nesting depth; drives padding-left indent. */
  depth: number;
  /** The segment line currently highlighted in the editor (or null). */
  activeSegmentLine: number | null;
  /** Called when the user clicks this row (for editor scroll/highlight). */
  onNodeClick: (line: number) => void;
  /**
   * Task 8 — called with the full Segment object when the user clicks a row.
   * Lets DocumentStudio pass the selected segment to PanelAI for AI explanation.
   */
  onSegmentSelect: (segment: Segment) => void;
}

/**
 * SegmentTreeNode — one row in the EDI hierarchy tree.
 *
 * Row layout (left → right):
 *   [chevron | placeholder]  [colour dot]  [ID]  [— Descriptor]  [● error?]
 *
 * Behaviour:
 *   • Clicking the row calls `onNodeClick` with the segment's line number.
 *   • For loop nodes, clicking also toggles expand/collapse.
 *   • Loop nodes start expanded for ISA/GS/ST/UNB/UNG/UNH (envelope hierarchy).
 *     All other loop types (data loops like N1, PO1) start collapsed.
 *   • Children are rendered recursively with depth + 1.
 */
export function SegmentTreeNode({
  node,
  depth,
  activeSegmentLine,
  onNodeClick,
  onSegmentSelect,
}: SegmentTreeNodeProps) {
  const { segment, isLoop, loopId, children } = node;

  // Envelope/transaction loops open by default; data loops start collapsed.
  const isEnvelopeLoop = ['ISA', 'GS', 'ST', 'UNB', 'UNG', 'UNH'].includes(loopId ?? segment.id);
  const [expanded, setExpanded] = useState<boolean>(isLoop ? isEnvelopeLoop : false);

  const isActive  = segment.line === activeSegmentLine;
  const hasErrors = segment.errors.length > 0;
  const color     = segmentColor(segment.id, isLoop);
  const shortName = segment.descriptor.known ? segment.descriptor.name : '';
  const indent    = depth * 18 + 8; // 18px per level + 8px base

  // ── Task 5: scroll this node into view when it becomes the active one ──────
  // Fires when `isActive` transitions false → true (editor cursor moved here).
  // Uses `block: 'nearest'` so it's a no-op if the node is already visible
  // (e.g. when the user clicked the node directly in the tree).
  const nodeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isActive && nodeRef.current) {
      nodeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* ── Node row ── */}
      <button
        ref={nodeRef}
        type="button"
        className={`ds-tree-node${isActive ? ' ds-tree-node--active' : ''}`}
        style={{ paddingLeft: indent }}
        onClick={() => {
          onNodeClick(segment.line);
          onSegmentSelect(segment);
          if (isLoop) setExpanded((v) => !v);
        }}
        aria-expanded={isLoop ? expanded : undefined}
        title={shortName ? `${segment.id} — ${shortName}` : segment.id}
      >
        {/* Chevron — loop nodes get a real icon; data nodes get a spacer */}
        {isLoop ? (
          <span
            className="ds-tree-chevron"
            aria-hidden="true"
            style={{
              '--icon-url': `url(${CDN}/${expanded ? 'chevron-down' : 'chevron-right'}.svg)`,
            } as React.CSSProperties}
          />
        ) : (
          <span className="ds-tree-chevron-placeholder" aria-hidden="true" />
        )}

        {/* Segment-type colour dot */}
        <span
          className="ds-tree-dot"
          aria-hidden="true"
          style={{ background: color, boxShadow: `0 0 3px ${color}66` }}
        />

        {/* Segment ID */}
        <span className="ds-tree-id">{segment.id}</span>

        {/* Descriptor name (omitted for unknown segments) */}
        {shortName && (
          <span className="ds-tree-desc">— {shortName}</span>
        )}

        {/* Error indicator */}
        {hasErrors && (
          <span
            className="ds-tree-error-dot"
            aria-label={`${segment.errors.length} validation error${segment.errors.length > 1 ? 's' : ''}`}
          />
        )}
      </button>

      {/* ── Children (rendered when loop is expanded) ── */}
      {isLoop && expanded && children.map((child, idx) => (
        <SegmentTreeNode
          key={`${child.segment.id}-${child.segment.line}-${idx}`}
          node={child}
          depth={depth + 1}
          activeSegmentLine={activeSegmentLine}
          onNodeClick={onNodeClick}
          onSegmentSelect={onSegmentSelect}
        />
      ))}
    </div>
  );
}
