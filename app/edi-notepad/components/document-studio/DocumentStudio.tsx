'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SegmentNode, ParseError, ParseResult, EDIStandard } from '@/src/lib/edi/types';
import { incrementControlNumbers } from '@/src/lib/edi/control-numbers';
import {
  deleteSegment,
  duplicateSegment,
  insertSegmentAfter,
  blankSegment,
  detectDelimiters,
} from '@/src/lib/edi/edit-helpers';
import { Toolbar, type ToolAction } from './Toolbar';
import type { SegmentAction } from './SegmentContextMenu';
import { DocTabs } from './DocTabs';
import { PanelTree } from './PanelTree';
import { PanelEditor } from './PanelEditor';
import { ConvertModal } from './ConvertModal';
import { SummaryModal } from './SummaryModal';
import { AckModal } from './AckModal';
import { SplitModal } from './SplitModal';
import { NewDocumentModal } from './NewDocumentModal';
import { CommandPalette, type Command } from './CommandPalette';
import { ShortcutsModal } from './ShortcutsModal';
import { loadSession, saveSession } from './session';
import { toggleTheme } from './theme';

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
  const [newDocOpen,    setNewDocOpen]    = useState(false);
  const [paletteOpen,   setPaletteOpen]   = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [treePanelCollapsed, setTreePanelCollapsed] = useState(false);
  const [dropping, setDropping] = useState(false);
  const sessionLoaded = useRef(false);

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
      case 'new': setNewDocOpen(true); return;
      case 'summary': setSummaryOpen(true); return;
      case 'ack': setAckOpen(true); return;
      case 'split': setSplitOpen(true); return;
      case 'copy': {
        if (!activeDoc.rawContent) return;
        void navigator.clipboard.writeText(activeDoc.rawContent).catch(() => {
          window.alert('Clipboard write was blocked by the browser.');
        });
        return;
      }
      case 'download': {
        if (!activeDoc.rawContent) return;
        const blob = new Blob([activeDoc.rawContent], { type: 'application/edi-x12' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeTitle = (activeDoc.title || 'document').replace(/[^A-Za-z0-9_.-]/g, '_');
        a.href = url;
        a.download = `${safeTitle}.edi`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
      case 'back-to-editor': {
        patchActiveDoc({ viewMode: 'raw' });
        return;
      }
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

  // ── Session persistence ────────────────────────────────────────────────────

  // Restore session on mount, exactly once.
  useEffect(() => {
    if (sessionLoaded.current) return;
    sessionLoaded.current = true;

    const snap = loadSession();
    if (!snap || snap.docs.length === 0) return;

    const restored: DocState[] = snap.docs.map((d) => ({
      id: d.id,
      title: d.title,
      // Pass rawContent as initialContent so the editor parses it on mount.
      initialContent: d.rawContent === '' ? '' : d.rawContent,
      rawContent: d.rawContent,
      standard: null,
      hasValidDocument: false,
      hierarchy: [],
      errors: [],
      activeSegmentLine: null,
      viewMode: 'raw',
      editorKey: 0,
    }));
    setDocs(restored);
    setActiveDocId(
      restored.find((d) => d.id === snap.activeDocId) ? snap.activeDocId : restored[0].id,
    );
    setTreePanelCollapsed(snap.treePanelCollapsed);
  }, []);

  // Save session whenever docs / active id / tree collapsed changes.
  useEffect(() => {
    if (!sessionLoaded.current) return;
    saveSession({
      docs: docs.map((d) => ({ id: d.id, title: d.title, rawContent: d.rawContent })),
      activeDocId,
      treePanelCollapsed,
    });
  }, [docs, activeDocId, treePanelCollapsed]);

  // ── Command palette + Shortcuts modal global listener ─────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const inInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (meta && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (meta && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      // ? or F1 → keyboard shortcut help. Skip when typing in an input.
      if (!inInput && !meta && (e.key === '?' || e.key === 'F1')) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Drag-and-drop file upload ─────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropping(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    // Only clear if leaving the layout entirely (not entering a child).
    if (e.currentTarget === e.target) setDropping(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDropping(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      window.alert(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 1 MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      handleFileLoad(text);
    };
    reader.readAsText(file);
  }

  // ── Command palette commands ──────────────────────────────────────────────

  const fileInputRefForPalette = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(() => {
    const hasDoc = activeDoc.hasValidDocument;
    const hasContent = activeDoc.rawContent.length > 0;

    return [
      // File
      { id: 'new', category: 'File', label: 'New EDI Document…', shortcut: '', action: () => setNewDocOpen(true) },
      { id: 'paste', category: 'File', label: 'Paste from Clipboard', shortcut: 'Ctrl+V', action: async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) handleFileLoad(text);
        } catch { window.alert('Clipboard read blocked. Click in the editor and press Ctrl+V instead.'); }
      }},
      { id: 'upload', category: 'File', label: 'Upload File…', action: () => fileInputRefForPalette.current?.click() },
      { id: 'clear', category: 'File', label: 'Clear Active Document', action: handleClear, enabled: () => hasDoc },
      { id: 'newtab', category: 'File', label: 'New Tab', action: handleNewDoc },
      { id: 'closetab', category: 'File', label: 'Close Active Tab', action: () => handleCloseDoc(activeDocId) },

      // View
      { id: 'view-raw',      category: 'View', label: 'Switch to Raw View',      action: () => handleViewChange('raw') },
      { id: 'view-business', category: 'View', label: 'Switch to Business View', action: () => handleViewChange('business'), enabled: () => hasContent },
      { id: 'view-hex',      category: 'View', label: 'Switch to Hex View',      action: () => handleViewChange('hex'),      enabled: () => hasContent },
      { id: 'theme',         category: 'View', label: 'Toggle Light / Dark Theme', action: () => { toggleTheme(); } },
      { id: 'tree-collapse', category: 'View', label: treePanelCollapsed ? 'Expand Segment Tree' : 'Collapse Segment Tree', action: () => setTreePanelCollapsed((v) => !v) },

      // Tools
      { id: 'convert-json', category: 'Tools', label: 'Convert to JSON', action: () => handleConvert('json'), enabled: () => hasDoc },
      { id: 'convert-xml',  category: 'Tools', label: 'Convert to XML',  action: () => handleConvert('xml'),  enabled: () => hasDoc },
      { id: 'increment',    category: 'Tools', label: 'Increment Control Numbers', action: () => handleTool('increment'), enabled: () => hasContent },
      { id: 'summary',      category: 'Tools', label: 'Show Summary Report',       action: () => handleTool('summary'),   enabled: () => hasDoc },
      { id: 'ack',          category: 'Tools', label: 'Generate Acknowledgment',   action: () => handleTool('ack'),       enabled: () => hasDoc },
      { id: 'split',        category: 'Tools', label: 'Split Interchanges',        action: () => handleTool('split'),     enabled: () => hasContent },
      { id: 'print',        category: 'Tools', label: 'Print Business View',       action: () => handleTool('print'),     enabled: () => hasDoc },

      // Navigate
      { id: 'goto-coverage', category: 'Navigate', label: 'Open Standards Coverage', action: () => { window.location.href = '/edi-notepad/coverage'; } },
      { id: 'goto-segments', category: 'Navigate', label: 'Open Segment Dictionary', action: () => { window.location.href = '/edi-notepad/coverage/segments'; } },
      { id: 'shortcuts',     category: 'Navigate', label: 'Keyboard Shortcuts',      action: () => setShortcutsOpen(true), shortcut: '?' },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc.hasValidDocument, activeDoc.rawContent, treePanelCollapsed, activeDocId]);

  function handleSegmentAction(action: SegmentAction, line: number, segmentId: string) {
    if (!activeDoc.rawContent) return;
    const { elemSep } = detectDelimiters(activeDoc.rawContent);
    let next = activeDoc.rawContent;

    switch (action) {
      case 'delete':
        if (!window.confirm(`Delete the ${segmentId} segment?`)) return;
        next = deleteSegment(next, line);
        break;
      case 'duplicate':
        next = duplicateSegment(next, line);
        break;
      case 'insertRefAfter':
        next = insertSegmentAfter(next, line, blankSegment('REF', elemSep, 2));
        break;
      case 'insertDtmAfter':
        next = insertSegmentAfter(next, line, blankSegment('DTM', elemSep, 2));
        break;
      case 'insertNteAfter':
        next = insertSegmentAfter(next, line, blankSegment('NTE', elemSep, 2));
        break;
    }
    if (next === activeDoc.rawContent) return;
    patchActiveDoc({
      initialContent: next,
      rawContent: next,
      editorKey: activeDoc.editorKey + 1,
    });
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
    <div
      className="ds-layout"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dropping && (
        <div className="ds-drop-overlay" aria-hidden="true">
          <div className="ds-drop-overlay__inner">
            <div className="ds-drop-overlay__title">Drop EDI file to load</div>
            <div className="ds-drop-overlay__sub">.edi · .txt · .x12 · .dat</div>
          </div>
        </div>
      )}

      {/* Hidden input used by the command palette's "Upload File…" command. */}
      <input
        ref={fileInputRefForPalette}
        type="file"
        accept=".edi,.txt,.x12,.dat"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 1024 * 1024) {
            window.alert(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 1 MB.`);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => handleFileLoad(reader.result as string);
          reader.readAsText(file);
          e.target.value = '';
        }}
      />

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
        hasContent={activeDoc.rawContent.length > 0}
        inBusinessOrHexView={activeDoc.viewMode !== 'raw'}
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
          onSegmentAction={handleSegmentAction}
        />

        <PanelEditor
          key={`${activeDoc.id}-${activeDoc.editorKey}`}
          standard={activeDoc.standard}
          hasValidDocument={activeDoc.hasValidDocument}
          errors={activeDoc.errors}
          initialContent={activeDoc.initialContent}
          activeSegmentLine={activeDoc.activeSegmentLine}
          hierarchy={activeDoc.hierarchy}
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

      <CommandPalette
        open={paletteOpen}
        commands={commands}
        onClose={() => setPaletteOpen(false)}
      />

      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <NewDocumentModal
        open={newDocOpen}
        onClose={() => setNewDocOpen(false)}
        onCreate={(text, title) => {
          // Open the skeleton in a fresh tab so the user doesn't lose what they had
          const fresh = createDoc({ initialContent: text, rawContent: text, title });
          setDocs((prev) => [...prev, fresh]);
          setActiveDocId(fresh.id);
          setNewDocOpen(false);
        }}
      />
    </div>
  );
}
