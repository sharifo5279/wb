'use client';

import { useMemo } from 'react';
import type { SegmentNode } from '@/src/lib/edi/types';

interface EditorBreadcrumbProps {
  hierarchy: SegmentNode[];
  /** 1-based line of the segment under the cursor (or null). */
  activeSegmentLine: number | null;
}

interface Crumb {
  id: string;
  label: string;
  loop: boolean;
}

/** Find the chain of nodes from root → leaf where leaf.segment.line === target. */
function pathToLine(nodes: SegmentNode[], target: number): SegmentNode[] | null {
  for (const node of nodes) {
    if (node.segment.line === target) return [node];
    if (node.children.length > 0) {
      const inner = pathToLine(node.children, target);
      if (inner) return [node, ...inner];
    }
  }
  return null;
}

/**
 * EditorBreadcrumb — thin band above the editor showing the current
 * segment's loop path: `ISA › GS › ST 850 › PO1 line 12`.
 *
 * Hidden when no segment is active; collapses gracefully on narrow widths.
 */
export function EditorBreadcrumb({ hierarchy, activeSegmentLine }: EditorBreadcrumbProps) {
  const crumbs = useMemo<Crumb[]>(() => {
    if (activeSegmentLine == null) return [];
    const path = pathToLine(hierarchy, activeSegmentLine);
    if (!path) return [];
    return path.map((n) => {
      const seg = n.segment;
      // Loop nodes: show the loop ID + its key first element when it's a transaction set
      let label = seg.id;
      if (n.isLoop && seg.id === 'ST' && seg.elements[0]) label = `ST ${seg.elements[0]}`;
      else if (n.isLoop && seg.id === 'UNH' && seg.elements[1]) label = `UNH ${seg.elements[1].split(':')[0]}`;
      else if (n.isLoop && seg.id === 'MHD' && seg.elements[1]) label = `MHD ${seg.elements[1].split(':')[0]}`;
      return { id: seg.id, label, loop: n.isLoop };
    });
  }, [hierarchy, activeSegmentLine]);

  if (crumbs.length === 0) return null;

  return (
    <nav className="ds-breadcrumb" aria-label="Segment path">
      {crumbs.map((c, i) => (
        <span key={i} className={`ds-breadcrumb__crumb${c.loop ? ' ds-breadcrumb__crumb--loop' : ''}`}>
          {c.label}
          {i < crumbs.length - 1 && <span className="ds-breadcrumb__sep" aria-hidden="true">›</span>}
        </span>
      ))}
      {activeSegmentLine != null && (
        <span className="ds-breadcrumb__line">line {activeSegmentLine}</span>
      )}
    </nav>
  );
}
