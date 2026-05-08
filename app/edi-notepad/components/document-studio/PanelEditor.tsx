'use client';

import { useState, useCallback } from 'react';
import type { ParseError, SegmentNode } from '@/src/lib/edi/types';
import type { DocumentStandard } from './DocumentStudio';
import { EDIEditor } from './EDIEditor';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PanelEditorProps {
  standard: DocumentStandard;
  hasValidDocument: boolean;
  errors: ParseError[];
  /**
   * Task 6 — initial text for the editor.
   *   null   → show built-in PLACEHOLDER (fresh load)
   *   ''     → empty editor (after Clear)
   *   'text' → uploaded file content (parsed immediately on mount)
   * PanelEditor is remounted (via key) when this changes from the parent.
   */
  initialContent: string | null;
  /** Line the user has clicked in the tree — editor should scroll to it (Task 5). */
  activeSegmentLine: number | null;
  /** Called by Task 4/6 when a document is successfully parsed. */
  onDocumentLoaded: (
    standard: DocumentStandard,
    hierarchy: SegmentNode[],
    errors: ParseError[],
  ) => void;
  /** Called by Task 4 whenever the editor cursor moves (Task 5 bidirectional sync). */
  onCursorChange: (line: number) => void;
  /** Task 8 — called after each debounced parse with the current raw EDI text. */
  onRawChange?: (raw: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PanelEditor — centre panel (Document Editor), fills the remaining flex space.
 *
 * Layout (flex column):
 *   ┌───────────────────────────────────────┐
 *   │  .ds-panel__header  "Document Editor" │  32px
 *   ├───────────────────────────────────────┤
 *   │  .ds-panel__body                      │  flex-1
 *   │    <EDIEditor />                      │
 *   ├───────────────────────────────────────┤
 *   │  .ds-editor-statusbar                 │  22px
 *   │    Ln N, Col 1 · standard · N seg · E err
 *   └───────────────────────────────────────┘
 */
export function PanelEditor({
  standard,
  hasValidDocument,
  errors,
  initialContent,
  activeSegmentLine,
  onDocumentLoaded,
  onCursorChange,
  onRawChange,
}: PanelEditorProps) {
  const errorCount = errors.length;

  // Live cursor line tracked here for the status bar
  const [cursorLine,    setCursorLine]    = useState(1);
  const [segmentCount,  setSegmentCount]  = useState(0);

  const handleCursorChange = useCallback((line: number) => {
    setCursorLine(line);
    onCursorChange(line);
  }, [onCursorChange]);

  return (
    <section
      className="ds-panel-editor"
      aria-label="Document Editor panel"
    >
      {/* ── Panel header ── */}
      <div className="ds-panel__header">
        <span className="ds-panel__title">Document Editor</span>
      </div>

      {/* ── Editor body ── */}
      <div
        className="ds-panel__body"
        role="region"
        aria-label="EDI document editor"
      >
        <EDIEditor
          initialContent={initialContent}
          activeSegmentLine={activeSegmentLine}
          onDocumentLoaded={onDocumentLoaded}
          onCursorChange={handleCursorChange}
          onSegmentCountChange={setSegmentCount}
          onRawChange={onRawChange}
        />
      </div>

      {/* ── Editor-level status bar ── */}
      <div
        className="ds-editor-statusbar"
        aria-label="Editor status"
        aria-live="polite"
        role="status"
      >
        <span>Ln {cursorLine}, Col 1</span>
        <span className="ds-editor-statusbar__sep">·</span>
        <span>{hasValidDocument ? (standard ?? '—') : '—'}</span>
        <span className="ds-editor-statusbar__sep">·</span>
        <span>{segmentCount} {segmentCount === 1 ? 'segment' : 'segments'}</span>
        <span className="ds-editor-statusbar__sep">·</span>
        <span>{errorCount} {errorCount === 1 ? 'error' : 'errors'}</span>
      </div>
    </section>
  );
}
