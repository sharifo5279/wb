'use client';

import { useState, useMemo } from 'react';
import type { Segment, SegmentNode, ParseError, ParseResult, EDIStandard } from '@/src/lib/edi/types';
import { Toolbar } from './Toolbar';
import { PanelTree } from './PanelTree';
import { PanelEditor } from './PanelEditor';
import { PanelAI } from './PanelAI';
import { ConvertModal } from './ConvertModal';

/** The detected EDI standard (null = empty editor, no document loaded). */
export type DocumentStandard = 'X12' | 'EDIFACT' | 'Unknown' | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pre-order depth-first flattening of the segment hierarchy.
 * Produces the same document-order flat array as ParseResult.segments
 * without requiring a separate segments prop on onDocumentLoaded.
 */
function flattenHierarchy(nodes: SegmentNode[]): ParseResult['segments'] {
  const out: ParseResult['segments'] = [];
  function walk(node: SegmentNode) {
    out.push(node.segment);
    for (const child of node.children) walk(child);
  }
  for (const node of nodes) walk(node);
  return out;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DocumentStudio — root layout component for the Document Studio tab.
 *
 * Owns all shared state consumed by child panels:
 *
 *   standard              — detected EDI standard (null when empty)
 *   hasValidDocument      — true once a parseable document is loaded
 *   hierarchy             — SegmentNode[] from ParseResult (Task 1)
 *   errors                — ParseError[]  from ParseResult (Task 1)
 *   activeSegmentLine     — line the editor cursor is on (bidirectional sync Task 5)
 *   editorInitialContent  — null = PLACEHOLDER, '' = empty, 'text' = uploaded file
 *   editorKey             — incremented to remount PanelEditor on upload / clear
 *   aiPanelOpen           — right AI panel visibility
 *   treePanelCollapsed    — left tree panel collapse state
 *   convertOpen           — Task 7 modal visibility
 *   convertFormat         — Task 7 active output format ('json' | 'xml')
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Toolbar  (40px)                                         │
 *   ├─────────────────┬─────────────────────┬──────────────────┤
 *   │  Segment Tree   │   Document Editor   │   Aviator AI     │
 *   │  (25%, toggle)  │   (flex-1)          │   (25%, toggle)  │
 *   │                 │                     │                  │
 *   │                 │   [statusbar 22px]  │                  │
 *   └─────────────────┴─────────────────────┴──────────────────┘
 */
export function DocumentStudio() {
  // ── Document state ─────────────────────────────────────────────────────────
  const [standard,          setStandard]          = useState<DocumentStandard>(null);
  const [hasValidDocument,  setHasValidDocument]  = useState(false);
  const [hierarchy,         setHierarchy]         = useState<SegmentNode[]>([]);
  const [errors,            setErrors]            = useState<ParseError[]>([]);
  const [activeSegmentLine, setActiveSegmentLine] = useState<number | null>(null);

  // ── Editor external content control (Task 6) ───────────────────────────────
  //   null   → EDIEditor shows its built-in placeholder (initial app load)
  //   ''     → empty editor (user confirmed Clear)
  //   'text' → raw EDI from an uploaded file
  const [editorInitialContent, setEditorInitialContent] = useState<string | null>(null);
  /**
   * Incrementing this value causes `<PanelEditor key={editorKey}>` to remount,
   * which resets the editor's internal state and triggers a fresh initial parse
   * with the new `initialContent`.  Used for both upload and Clear.
   */
  const [editorKey, setEditorKey] = useState(0);

  // ── Conversion modal (Task 7) ──────────────────────────────────────────────
  const [convertOpen,   setConvertOpen]   = useState(false);
  const [convertFormat, setConvertFormat] = useState<'json' | 'xml'>('json');

  // ── Panel visibility state ─────────────────────────────────────────────────
  const [aiPanelOpen,        setAiPanelOpen]        = useState(false);
  const [treePanelCollapsed, setTreePanelCollapsed] = useState(false);

  // ── Task 8 — AI panel state ────────────────────────────────────────────────
  /** Current raw EDI content; updated after every debounced parse via onRawChange. */
  const [rawContent,        setRawContent]        = useState('');
  /** The segment most recently clicked in the tree (passed to PanelAI). */
  const [selectedSegment,   setSelectedSegment]   = useState<Segment | null>(null);
  /**
   * Counter incremented on every tree node click — even for the same segment.
   * PanelAI watches this value to re-trigger the segment AI call when the user
   * clicks the same node again.
   */
  const [segmentClickCount, setSegmentClickCount] = useState(0);

  // ── ParseResult for ConvertModal ───────────────────────────────────────────
  // Assembled from state so ConvertModal gets a complete ParseResult without
  // changing the onDocumentLoaded signature.
  const parseResultForModal = useMemo((): ParseResult | null => {
    if (!hasValidDocument || !standard || standard === 'Unknown') return null;
    return {
      standard: standard as EDIStandard,
      segments: flattenHierarchy(hierarchy),
      errors,
      hierarchy,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidDocument, standard, hierarchy, errors]);

  // ── Callbacks ──────────────────────────────────────────────────────────────

  /** Called by EDIEditor after every parse (typing, paste, or mount-time parse). */
  function handleDocumentLoaded(
    detectedStandard: DocumentStandard,
    parsedHierarchy: SegmentNode[],
    parseErrors: ParseError[],
  ) {
    setStandard(detectedStandard);
    setHasValidDocument(detectedStandard !== null && detectedStandard !== 'Unknown');
    setHierarchy(parsedHierarchy);
    setErrors(parseErrors);
    setActiveSegmentLine(null);
  }

  /**
   * Task 6 — called by Toolbar once a valid file has been read into memory.
   * Sets `editorInitialContent` to the file text and bumps `editorKey` to
   * remount the editor, which triggers an immediate (no-debounce) parse.
   */
  function handleFileLoad(text: string) {
    setConvertOpen(false);          // close any open modal for the previous document
    setEditorInitialContent(text);
    setActiveSegmentLine(null);
    setSelectedSegment(null);       // Task 8: clear stale segment context
    setEditorKey((k) => k + 1);
    // handleDocumentLoaded is called by EDIEditor's mount-time parse effect.
    // onRawChange will be called by EDIEditor with the new content.
  }

  /**
   * Task 6 — Clear button handler.
   * The Toolbar disables Clear when !hasValidDocument, so we can unconditionally
   * prompt the confirmation dialog here.
   * On confirm: resets all document state and remounts the editor with empty content.
   */
  function handleClear() {
    const confirmed = window.confirm('Clear document? This cannot be undone.');
    if (!confirmed) return;

    setConvertOpen(false);
    setStandard(null);
    setHasValidDocument(false);
    setHierarchy([]);
    setErrors([]);
    setActiveSegmentLine(null);
    setSelectedSegment(null);       // Task 8: clear stale segment context
    setRawContent('');              // Task 8: clear raw content for AI
    setEditorInitialContent('');    // '' → EDIEditor renders blank (not PLACEHOLDER)
    setEditorKey((k) => k + 1);
  }

  /**
   * Task 8 — called by EDIEditor after every debounced parse with the new raw text.
   * Keeps rawContent in sync for AI prompt building.
   */
  function handleRawChange(raw: string) {
    setRawContent(raw);
  }

  /**
   * Task 8 — called when the user clicks a segment node in the tree.
   * Stores the selected segment and increments the click counter so PanelAI
   * can detect re-clicks on the same node.
   */
  function handleSegmentSelect(segment: Segment) {
    setSelectedSegment(segment);
    setSegmentClickCount((c) => c + 1);
  }

  /**
   * Task 7 — called by Toolbar when the user picks a format from the Convert dropdown.
   * Opens the ConvertModal with the selected format pre-selected.
   */
  function handleConvert(format: 'json' | 'xml') {
    setConvertFormat(format);
    setConvertOpen(true);
  }

  return (
    <div className="ds-layout">
      {/* ── Toolbar ── */}
      <Toolbar
        standard={standard}
        hasValidDocument={hasValidDocument}
        aiPanelOpen={aiPanelOpen}
        onFileLoad={handleFileLoad}
        onConvert={handleConvert}
        onClear={handleClear}
        onToggleAI={() => setAiPanelOpen((prev) => !prev)}
      />

      {/* ── Three-panel row ── */}
      <div className="ds-panels">
        {/* Left: Segment Tree */}
        <PanelTree
          collapsed={treePanelCollapsed}
          onToggle={() => setTreePanelCollapsed((prev) => !prev)}
          hierarchy={hierarchy}
          errors={errors}
          activeSegmentLine={activeSegmentLine}
          onNodeClick={setActiveSegmentLine}
          onSegmentSelect={handleSegmentSelect}
        />

        {/* Centre: Document Editor
            key={editorKey} remounts PanelEditor (and EDIEditor inside it) on each
            file upload or Clear, resetting internal editor state and triggering
            an immediate parse with the new initialContent. */}
        <PanelEditor
          key={editorKey}
          standard={standard}
          hasValidDocument={hasValidDocument}
          errors={errors}
          initialContent={editorInitialContent}
          activeSegmentLine={activeSegmentLine}
          onDocumentLoaded={handleDocumentLoaded}
          onCursorChange={setActiveSegmentLine}
          onRawChange={handleRawChange}
        />

        {/* Right: Aviator AI */}
        <PanelAI
          open={aiPanelOpen}
          hasValidDocument={hasValidDocument}
          rawContent={rawContent}
          selectedSegment={selectedSegment}
          segmentClickCount={segmentClickCount}
          standard={standard}
        />
      </div>

      {/* ── Task 7: Conversion modal ──
          position:fixed so it sits above the layout without affecting flex flow. */}
      <ConvertModal
        open={convertOpen}
        initialFormat={convertFormat}
        parseResult={parseResultForModal}
        onClose={() => setConvertOpen(false)}
      />
    </div>
  );
}
