'use client';

import { useState, useMemo } from 'react';
import type { SegmentNode, ParseError, ParseResult, EDIStandard } from '@/src/lib/edi/types';
import { Toolbar } from './Toolbar';
import { PanelTree } from './PanelTree';
import { PanelEditor } from './PanelEditor';
import { ConvertModal } from './ConvertModal';

/** The detected EDI standard (null = empty editor, no document loaded). */
export type DocumentStandard = 'X12' | 'EDIFACT' | 'Unknown' | null;

/** The active view mode in the centre panel. */
export type ViewMode = 'raw' | 'business' | 'hex';

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
 *   │  Toolbar  (40px)                        │
 *   ├─────────────────┬───────────────────────┤
 *   │  Segment Tree   │   View Tabs           │
 *   │  (25%, toggle)  │   Raw | Business | Hex│
 *   │                 │   [active view body]  │
 *   │                 │   [statusbar 22px]    │
 *   └─────────────────┴───────────────────────┘
 */
export function DocumentStudio() {
  const [standard,          setStandard]          = useState<DocumentStandard>(null);
  const [hasValidDocument,  setHasValidDocument]  = useState(false);
  const [hierarchy,         setHierarchy]         = useState<SegmentNode[]>([]);
  const [errors,            setErrors]            = useState<ParseError[]>([]);
  const [activeSegmentLine, setActiveSegmentLine] = useState<number | null>(null);
  const [rawContent,        setRawContent]        = useState('');
  const [viewMode,          setViewMode]          = useState<ViewMode>('raw');

  const [editorInitialContent, setEditorInitialContent] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const [convertOpen,   setConvertOpen]   = useState(false);
  const [convertFormat, setConvertFormat] = useState<'json' | 'xml'>('json');

  const [treePanelCollapsed, setTreePanelCollapsed] = useState(false);

  const parseResult = useMemo((): ParseResult | null => {
    if (!hasValidDocument || !standard || standard === 'Unknown') return null;
    return {
      standard: standard as EDIStandard,
      segments: flattenHierarchy(hierarchy),
      errors,
      hierarchy,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidDocument, standard, hierarchy, errors]);

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

  function handleFileLoad(text: string) {
    setConvertOpen(false);
    setEditorInitialContent(text);
    setActiveSegmentLine(null);
    setViewMode('raw'); // jump back to raw on a fresh document
    setEditorKey((k) => k + 1);
  }

  function handleClear() {
    const confirmed = window.confirm('Clear document? This cannot be undone.');
    if (!confirmed) return;

    setConvertOpen(false);
    setStandard(null);
    setHasValidDocument(false);
    setHierarchy([]);
    setErrors([]);
    setActiveSegmentLine(null);
    setRawContent('');
    setViewMode('raw');
    setEditorInitialContent('');
    setEditorKey((k) => k + 1);
  }

  function handleConvert(format: 'json' | 'xml') {
    setConvertFormat(format);
    setConvertOpen(true);
  }

  function handleViewChange(next: ViewMode) {
    // Business and Hex require a parsed/loaded document; ignore the request
    // when there's nothing to show.
    if ((next === 'business' || next === 'hex') && !rawContent) return;
    setViewMode(next);
  }

  return (
    <div className="ds-layout">
      <Toolbar
        standard={standard}
        hasValidDocument={hasValidDocument}
        onFileLoad={handleFileLoad}
        onConvert={handleConvert}
        onClear={handleClear}
      />

      <div className="ds-panels">
        <PanelTree
          collapsed={treePanelCollapsed}
          onToggle={() => setTreePanelCollapsed((prev) => !prev)}
          hierarchy={hierarchy}
          errors={errors}
          activeSegmentLine={activeSegmentLine}
          onNodeClick={setActiveSegmentLine}
        />

        <PanelEditor
          key={editorKey}
          standard={standard}
          hasValidDocument={hasValidDocument}
          errors={errors}
          initialContent={editorInitialContent}
          activeSegmentLine={activeSegmentLine}
          rawContent={rawContent}
          parseResult={parseResult}
          viewMode={viewMode}
          onViewChange={handleViewChange}
          onDocumentLoaded={handleDocumentLoaded}
          onCursorChange={setActiveSegmentLine}
          onRawChange={setRawContent}
        />
      </div>

      <ConvertModal
        open={convertOpen}
        initialFormat={convertFormat}
        parseResult={parseResult}
        onClose={() => setConvertOpen(false)}
      />
    </div>
  );
}
