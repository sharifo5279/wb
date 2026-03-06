'use client';

import type React from 'react';
import type { Segment, SegmentNode, ParseError } from '@/src/lib/edi/types';
import { SegmentTreeNode } from './SegmentTreeNode';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SegmentTreeProps {
  /** Root nodes from ParseResult.hierarchy — pass [] when no document is loaded. */
  hierarchy: SegmentNode[];
  /** Flat error list from ParseResult.errors — used for the header badge count. */
  errors: ParseError[];
  /** Line number of the segment currently active in the editor (or null). */
  activeSegmentLine: number | null;
  /** Called when the user clicks a tree node — editor should scroll to this line. */
  onNodeClick: (line: number) => void;
  /** Task 8 — called with the Segment object on each node click (for AI explanation). */
  onSegmentSelect: (segment: Segment) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * SegmentTree — renders the full EDI loop/segment hierarchy.
 *
 * Empty state: shown when `hierarchy` is empty (no document loaded).
 * Populated state: maps root nodes → recursive `SegmentTreeNode` components.
 *
 * Performance: each node is its own component with local `expanded` state, so
 * React only re-renders the subtrees that change.  Handles 100+ nodes without
 * noticeable lag.
 */
export function SegmentTree({
  hierarchy,
  errors: _errors,
  activeSegmentLine,
  onNodeClick,
  onSegmentSelect,
}: SegmentTreeProps) {
  // ── Empty state ────────────────────────────────────────────────────────────
  if (hierarchy.length === 0) {
    return (
      <div className="ds-tree-empty" role="status" aria-live="polite">
        <span
          className="ds-tree-empty__icon"
          aria-hidden="true"
          style={
            { '--icon-url': `url(${CDN}/git-fork.svg)` } as React.CSSProperties
          }
        />
        <p className="ds-tree-empty__text">
          Load an EDI document to see the segment tree
        </p>
      </div>
    );
  }

  // ── Populated tree ─────────────────────────────────────────────────────────
  return (
    <div
      className="ds-tree"
      role="tree"
      aria-label="EDI segment hierarchy"
    >
      {hierarchy.map((node, idx) => (
        <SegmentTreeNode
          key={`${node.segment.id}-${node.segment.line}-${idx}`}
          node={node}
          depth={0}
          activeSegmentLine={activeSegmentLine}
          onNodeClick={onNodeClick}
          onSegmentSelect={onSegmentSelect}
        />
      ))}
    </div>
  );
}
