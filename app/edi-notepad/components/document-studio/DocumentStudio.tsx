'use client';

import { useState, useMemo } from 'react';
import type { SegmentNode, ParseError, ParseResult, EDIStandard } from '@/src/lib/edi/types';
import { incrementControlNumbers } from '@/src/lib/edi/control-numbers';
import { Toolbar, type ToolAction } from './Toolbar';
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
  const [summaryOpen,   setSummaryOpen]   = useState(false);
  const [ackOpen,       setAckOpen]       = useState(false);
  const [splitOpen,     setSplitOpen]     = useState(false);

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

  function handleTool(action: ToolAction) {
    switch (action) {
      case 'increment': {
        if (!rawContent) return;
        const { text, changes } = incrementControlNumbers(rawContent);
        if (changes.length === 0) {
          window.alert('No control numbers found to increment.');
          return;
        }
        setEditorInitialContent(text);
        setEditorKey((k) => k + 1);
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
        if (viewMode !== 'business') setViewMode('business');
        // Defer print until the Business view has rendered.
        requestAnimationFrame(() => window.print());
        return;
      }
    }
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
        onTool={handleTool}
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
        rawContent={rawContent}
        onClose={() => setSplitOpen(false)}
      />
    </div>
  );
}
