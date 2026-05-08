'use client';

import { useState, useCallback } from 'react';
import type { ParseError, ParseResult, SegmentNode } from '@/src/lib/edi/types';
import type { DocumentStandard, ViewMode } from './DocumentStudio';
import { EDIEditor } from './EDIEditor';
import { HexView } from './HexView';
import { BusinessView } from './business-view/BusinessView';

interface PanelEditorProps {
  standard: DocumentStandard;
  hasValidDocument: boolean;
  errors: ParseError[];
  initialContent: string | null;
  activeSegmentLine: number | null;
  rawContent: string;
  parseResult: ParseResult | null;
  viewMode: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onDocumentLoaded: (
    standard: DocumentStandard,
    hierarchy: SegmentNode[],
    errors: ParseError[],
  ) => void;
  onCursorChange: (line: number) => void;
  onRawChange?: (raw: string) => void;
}

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: 'raw',      label: 'Raw' },
  { id: 'business', label: 'Business' },
  { id: 'hex',      label: 'Hex' },
];

/**
 * PanelEditor — centre panel.
 *
 * Header is a tab strip (Raw / Business / Hex). The active view's body fills
 * the panel body; only Raw is editable. Business and Hex require a loaded
 * document and are disabled until one is parsed.
 */
export function PanelEditor({
  standard,
  hasValidDocument,
  errors,
  initialContent,
  activeSegmentLine,
  rawContent,
  parseResult,
  viewMode,
  onViewChange,
  onDocumentLoaded,
  onCursorChange,
  onRawChange,
}: PanelEditorProps) {
  const errorCount = errors.length;

  const [cursorLine,    setCursorLine]    = useState(1);
  const [segmentCount,  setSegmentCount]  = useState(0);

  const handleCursorChange = useCallback((line: number) => {
    setCursorLine(line);
    onCursorChange(line);
  }, [onCursorChange]);

  const viewDisabled = (id: ViewMode) =>
    (id === 'business' || id === 'hex') && !hasValidDocument && !rawContent;

  return (
    <section
      className="ds-panel-editor"
      aria-label="Document panel"
    >
      <div className="ds-panel__header ds-panel__header--tabs">
        <div className="ds-view-tabs" role="tablist" aria-label="Document view">
          {VIEW_TABS.map((tab) => {
            const active = viewMode === tab.id;
            const disabled = viewDisabled(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`ds-view-${tab.id}`}
                disabled={disabled}
                className={`ds-view-tab${active ? ' ds-view-tab--active' : ''}`}
                onClick={() => !disabled && onViewChange(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="ds-panel__body"
        role="region"
        aria-label="Active document view"
      >
        {viewMode === 'raw' && (
          <EDIEditor
            initialContent={initialContent}
            activeSegmentLine={activeSegmentLine}
            onDocumentLoaded={onDocumentLoaded}
            onCursorChange={handleCursorChange}
            onSegmentCountChange={setSegmentCount}
            onRawChange={onRawChange}
          />
        )}
        {viewMode === 'business' && (
          <BusinessView parseResult={parseResult} />
        )}
        {viewMode === 'hex' && (
          <HexView text={rawContent} parseResult={parseResult} />
        )}
      </div>

      <div
        className="ds-editor-statusbar"
        aria-label="Editor status"
        aria-live="polite"
        role="status"
      >
        <span>
          {viewMode === 'raw' ? `Ln ${cursorLine}, Col 1` : viewMode === 'hex' ? 'Hex view' : 'Business view'}
        </span>
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
