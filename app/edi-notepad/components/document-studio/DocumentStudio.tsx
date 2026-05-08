'use client';

import { useCallback, useMemo, useState } from 'react';
import type { SegmentNode, ParseError, ParseResult, EDIStandard } from '@/src/lib/edi/types';
import { incrementControlNumbers } from '@/src/lib/edi/control-numbers';
import { Toolbar, type ToolAction } from './Toolbar';
import { DocTabs } from './DocTabs';
import { PanelTree } from './PanelTree';
import { PanelEditor } from './PanelEditor';
import { ConvertModal } from './ConvertModal';
import { SummaryModal } from './SummaryModal';
import { AckModal } from './AckModal';
import { SplitModal } from './SplitModal';

/** The detected EDI standard (null = empty editor, no document loaded). */
export type DocumentStandard = 'X12' | 'EDIFACT' | 'TRADACOMS' | 'Unknown' | null;

/** The active view mode in the centre panel. */
export type ViewMode = 'raw' | 'business' | 'hex';

/** Per-document state. One of these per open tab. */
export interface DocState {
  id: string;
  title: string;
  /** The text passed to EDIEditor on next mount. null = show built-in placeholder. */
  initialContent: string | null;
  /** Live raw content kept in sync via onRawChange. Source of truth after first parse. */
  rawContent: string;
  standard: DocumentStandard;
  hasValidDocument: boolean;
  hierarchy: SegmentNode[];
  errors: ParseError[];
  activeSegmentLine: number | null;
  viewMode: ViewMode;
  /** Bumped to force EDIEditor remount on Upload / Clear / Increment. */
  editorKey: number;
}

let docCounter = 0;
function nextDocId(): string { return `doc-${++docCounter}`; }

function createDoc(overrides: Partial<DocState> = {}): DocState {
  return {
    id: nextDocId(),
    title: `Untitled ${docCounter}`,
    initialContent: null,
    rawContent: '',
    standard: null,
    hasValidDocument: false,
    hierarchy: [],
    errors: [],
    activeSegmentLine: null,
    viewMode: 'raw',
    editorKey: 0,
    ...overrides,
  };
}

/** Derive a tab title from the parse result, falling back to the doc's existing title. */
function deriveTitle(fallback: string, standard: DocumentStandard, segments: SegmentNode[]): string {
  if (!standard || standard === 'Unknown') return fallback;
  // First child after the envelope root is typically the "header" segment for the
  // first transaction. We surface a short label like "X12 850" or "EDIFACT ORDERS".
  for (const root of segments) {
    if (root.loopId === 'ISA' || root.loopId === 'UNB' || root.loopId === 'STX') {
      // Find the first ST / UNH / MHD inside
      for (const child of root.children) {
        if (child.loopId === 'GS') {
          for (const gc of child.children) {
            if (gc.loopId === 'ST' && gc.segment.elements[0]) {
              return `X12 ${gc.segment.elements[0].trim()}`;
            }
          }
        }
        if (child.loopId === 'UNH' && child.segment.elements[1]) {
          return `EDIFACT ${child.segment.elements[1].split(':')[0].trim()}`;
        }
        if (child.loopId === 'MHD' && child.segment.elements[1]) {
          return `TRADACOMS ${child.segment.elements[1].split(':')[0].trim()}`;
        }
      }
    }
  }
  return fallback;
}

function flattenHierarchy(nodes: SegmentNode[]): ParseResult['segments'] {
  const out: ParseResult['segments'] = [];
  function walk(node: SegmentNode) {
    out.push(node.segment);
    for (const child of node.children) walk(child);
  }
  for (const node of nodes) walk(node);
  return out;
}

/**
 * DocumentStudio — root layout for EDI Notepad 2026.
 *
 *   ┌─────────────────────────────────────────┐
 *   │  Doc Tabs   (24px, multi-doc)           │
 *   │  Toolbar    (40px)                      │
 *   ├─────────────────┬───────────────────────┤
 *   │  Segment Tree   │   View Tabs           │
 *   │  (25%, toggle)  │   Raw | Business | Hex│
 *   │                 │   [active view body]  │
 *   │                 │   [statusbar 22px]    │
 *   └─────────────────┴───────────────────────┘
 */
export function DocumentStudio() {
  const [docs, setDocs] = useState<DocState[]>(() => [createDoc()]);
  const [activeDocId, setActiveDocId] = useState<string>(() => docs[0].id);

  // Modal state — UI scope, not per-doc
  const [convertOpen,   setConvertOpen]   = useState(false);
  const [convertFormat, setConvertFormat] = useState<'json' | 'xml'>('json');
  const [summaryOpen,   setSummaryOpen]   = useState(false);
  const [ackOpen,       setAckOpen]       = useState(false);
  const [splitOpen,     setSplitOpen]     = useState(false);
  const [treePanelCollapsed, setTreePanelCollapsed] = useState(false);

  const activeDoc = useMemo(
    () => docs.find((d) => d.id === activeDocId) ?? docs[0],
    [docs, activeDocId],
  );

  /** Apply a partial update to the active doc immutably. */
  const patchActiveDoc = useCallback((patch: Partial<DocState>) => {
    setDocs((prev) => prev.map((d) => (d.id === activeDocId ? { ...d, ...patch } : d)));
  }, [activeDocId]);

  const parseResult = useMemo((): ParseResult | null => {
    if (!activeDoc.hasValidDocument || !activeDoc.standard || activeDoc.standard === 'Unknown') return null;
    return {
      standard: activeDoc.standard as EDIStandard,
      segments: flattenHierarchy(activeDoc.hierarchy),
      errors: activeDoc.errors,
      hierarchy: activeDoc.hierarchy,
    };
  }, [activeDoc]);

  // ── EDIEditor callbacks (operate on active doc) ───────────────────────────

  function handleDocumentLoaded(
    detectedStandard: DocumentStandard,
    parsedHierarchy: SegmentNode[],
    parseErrors: ParseError[],
  ) {
    patchActiveDoc({
      standard: detectedStandard,
      hasValidDocument: detectedStandard !== null && detectedStandard !== 'Unknown',
      hierarchy: parsedHierarchy,
      errors: parseErrors,
      activeSegmentLine: null,
      title: deriveTitle(activeDoc.title, detectedStandard, parsedHierarchy),
    });
  }

  function handleRawChange(raw: string) {
    // Keep rawContent live so tab switches restore the latest text on remount.
    patchActiveDoc({ rawContent: raw, initialContent: raw });
  }

  // ── Toolbar callbacks ─────────────────────────────────────────────────────

  function handleFileLoad(text: string) {
    setConvertOpen(false);
    patchActiveDoc({
      initialContent: text,
      rawContent: text,
      activeSegmentLine: null,
      viewMode: 'raw',
      editorKey: activeDoc.editorKey + 1,
    });
  }

  function handleClear() {
    if (!window.confirm('Clear document? This cannot be undone.')) return;
    setConvertOpen(false);
    patchActiveDoc({
      standard: null,
      hasValidDocument: false,
      hierarchy: [],
      errors: [],
      activeSegmentLine: null,
      rawContent: '',
      viewMode: 'raw',
      initialContent: '',
      editorKey: activeDoc.editorKey + 1,
      title: 'Untitled',
    });
  }

  function handleConvert(format: 'json' | 'xml') {
    setConvertFormat(format);
    setConvertOpen(true);
  }

  function handleTool(action: ToolAction) {
    switch (action) {
      case 'increment': {
        if (!activeDoc.rawContent) return;
        const { text, changes } = incrementControlNumbers(activeDoc.rawContent);
        if (changes.length === 0) {
          window.alert('No control numbers found to increment.');
          return;
        }
        patchActiveDoc({
          initialContent: text,
          rawContent: text,
          editorKey: activeDoc.editorKey + 1,
        });
        window.alert(
          `Incremented ${changes.length} control number${changes.length === 1 ? '' : 's'}:\n` +
          changes.map((c) => `  ${c.segmentId}${c.element}: ${c.fromValue} → ${c.toValue}`).join('\n'),
        );
        return;
      }
      case 'summary': setSummaryOpen(true); return;
      case 'ack': setAckOpen(true); return;
      case 'split': setSplitOpen(true); return;
      case 'print': {
        if (activeDoc.viewMode !== 'business') patchActiveDoc({ viewMode: 'business' });
        requestAnimationFrame(() => window.print());
        return;
      }
    }
  }

  function handleViewChange(next: ViewMode) {
    if ((next === 'business' || next === 'hex') && !activeDoc.rawContent) return;
    patchActiveDoc({ viewMode: next });
  }

  // ── Tab management ────────────────────────────────────────────────────────

  function handleNewDoc() {
    // New tabs after the very first one open blank (with the paste hint),
    // not the demo placeholder — the user already saw the placeholder once.
    const fresh = createDoc({ initialContent: '' });
    setDocs((prev) => [...prev, fresh]);
    setActiveDocId(fresh.id);
  }

  function handleSwitchDoc(id: string) {
    setActiveDocId(id);
  }

  function handleCloseDoc(id: string) {
    setDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      if (idx < 0) return prev;
      const next = prev.filter((d) => d.id !== id);
      // If we just closed the last tab, replace it with a fresh empty doc.
      if (next.length === 0) {
        const fresh = createDoc();
        setActiveDocId(fresh.id);
        return [fresh];
      }
      // If we closed the active tab, focus the neighbour to its left (or right).
      if (id === activeDocId) {
        const neighbour = next[Math.max(0, idx - 1)];
        setActiveDocId(neighbour.id);
      }
      return next;
    });
  }

  return (
    <div className="ds-layout">
      <DocTabs
        docs={docs}
        activeDocId={activeDoc.id}
        onSwitch={handleSwitchDoc}
        onClose={handleCloseDoc}
        onNew={handleNewDoc}
      />

      <Toolbar
        standard={activeDoc.standard}
        hasValidDocument={activeDoc.hasValidDocument}
        onFileLoad={handleFileLoad}
        onConvert={handleConvert}
        onClear={handleClear}
        onTool={handleTool}
      />

      <div className="ds-panels">
        <PanelTree
          collapsed={treePanelCollapsed}
          onToggle={() => setTreePanelCollapsed((prev) => !prev)}
          hierarchy={activeDoc.hierarchy}
          errors={activeDoc.errors}
          activeSegmentLine={activeDoc.activeSegmentLine}
          onNodeClick={(line) => patchActiveDoc({ activeSegmentLine: line })}
        />

        <PanelEditor
          key={`${activeDoc.id}-${activeDoc.editorKey}`}
          standard={activeDoc.standard}
          hasValidDocument={activeDoc.hasValidDocument}
          errors={activeDoc.errors}
          initialContent={activeDoc.initialContent}
          activeSegmentLine={activeDoc.activeSegmentLine}
          rawContent={activeDoc.rawContent}
          parseResult={parseResult}
          viewMode={activeDoc.viewMode}
          onViewChange={handleViewChange}
          onDocumentLoaded={handleDocumentLoaded}
          onCursorChange={(line) => patchActiveDoc({ activeSegmentLine: line })}
          onRawChange={handleRawChange}
        />
      </div>

      <ConvertModal
        open={convertOpen}
        initialFormat={convertFormat}
        parseResult={parseResult}
        onClose={() => setConvertOpen(false)}
      />

      <SummaryModal
        open={summaryOpen}
        parseResult={parseResult}
        onClose={() => setSummaryOpen(false)}
      />

      <AckModal
        open={ackOpen}
        parseResult={parseResult}
        onClose={() => setAckOpen(false)}
      />

      <SplitModal
        open={splitOpen}
        rawContent={activeDoc.rawContent}
        onClose={() => setSplitOpen(false)}
      />
    </div>
  );
}
