'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { parseEDI, PARSE_DEBOUNCE_MS } from '@/src/lib/edi/parser';
import type { Segment, ParseError, SegmentNode } from '@/src/lib/edi/types';
import { computeMatches } from '@/src/lib/edi/find';
import { replaceElement } from '@/src/lib/edi/edit-helpers';
import {
  getX12Segment,
  getEdifactSegment,
  getTradacomsSegment,
} from '@/src/lib/edi/dictionaries';
import type { DocumentStandard } from './DocumentStudio';
import { EditorLine } from './EditorLine';
import { FindBar } from './FindBar';
import { ElementEditor } from './ElementEditor';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EDIEditorProps {
  /**
   * Task 6 — external content signal (from DocumentStudio via PanelEditor).
   *   null   → show built-in PLACEHOLDER (initial app load; no file uploaded yet)
   *   ''     → empty editor (user confirmed Clear)
   *   'text' → raw EDI from an uploaded file (parsed immediately on mount)
   *
   * EDIEditor is remounted (via key in DocumentStudio) whenever this conceptually
   * changes, so this prop is read once as initial state — not watched after mount.
   */
  initialContent: string | null;
  /** Line the tree panel wants the editor to scroll to (Task 5 sync). */
  activeSegmentLine: number | null;
  /** Called after debounced parse with the full document result. */
  onDocumentLoaded: (
    standard: DocumentStandard,
    hierarchy: SegmentNode[],
    errors: ParseError[],
  ) => void;
  /** Called whenever the user's cursor moves to a new line. */
  onCursorChange: (line: number) => void;
  /** Controlled — segment count to surface to status bar. */
  onSegmentCountChange: (count: number) => void;
  /**
   * Task 8 — called whenever the raw EDI content changes (after debounce).
   * Lets DocumentStudio keep a copy of the raw text for AI prompts.
   */
  onRawChange?: (raw: string) => void;
}

// ─── Delimiter helpers ────────────────────────────────────────────────────────

function extractDelimiters(raw: string): { elemSep: string; segTerm: string } {
  const trimmed = raw.trimStart();
  // X12: ISA[3] = element sep, ISA[105] = segment terminator
  if (trimmed.startsWith('ISA') && trimmed.length >= 106) {
    return { elemSep: trimmed[3], segTerm: trimmed[105] };
  }
  // EDIFACT: UNA service string carries delimiters
  if (trimmed.startsWith('UNA') && trimmed.length >= 9) {
    return { elemSep: trimmed[4], segTerm: trimmed[8] };
  }
  // Fallback for UNB-only EDIFACT or unknown
  return { elemSep: '+', segTerm: "'" };
}

// ─── Build line→segment map ───────────────────────────────────────────────────

/**
 * Given a flat segment array and the raw document split into lines,
 * map each 1-based line number to its Segment (if any).
 */
function buildLineMap(
  rawLines: string[],
  segments: Segment[],
): Map<number, Segment> {
  const map = new Map<number, Segment>();
  segments.forEach((seg) => {
    if (seg.line >= 1 && seg.line <= rawLines.length) {
      map.set(seg.line, seg);
    }
  });
  return map;
}

/**
 * Collect all SegmentNode ids that are loops (for `isLoop` colouring).
 */
function collectLoopIds(nodes: SegmentNode[], acc = new Set<number>()): Set<number> {
  for (const node of nodes) {
    if (node.isLoop) acc.add(node.segment.line);
    if (node.children.length) collectLoopIds(node.children, acc);
  }
  return acc;
}

/**
 * Build a map from line→errors (there may be multiple errors per line).
 */
function buildErrorMap(errors: ParseError[]): Map<number, ParseError[]> {
  const map = new Map<number, ParseError[]>();
  for (const err of errors) {
    const existing = map.get(err.line) ?? [];
    existing.push(err);
    map.set(err.line, existing);
  }
  return map;
}

// ─── Default placeholder ───────────────────────────────────────────────────────

const PLACEHOLDER = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *230101*1200*^*00501*000000001*0*P*:~
GS*PO*SENDER*RECEIVER*20230101*1200*1*X*005010~
ST*850*0001~
BEG*00*SA*PO-12345**20230101~
PO1*1*10*EA*25.00**VN*WIDGET-A~
CTT*1~
SE*5*0001~
GE*1*1~
IEA*1*000000001~`;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * EDIEditor — monospace code editor for EDI documents.
 *
 * Architecture:
 *   - A hidden <textarea> captures all keyboard input (CodeMirror technique).
 *   - A visible <div> renders the styled line-by-line output.
 *   - On every keystroke a 300ms debounce fires parseEDI().
 *   - Cursor position is tracked via textarea selectionStart.
 *
 * Active-line highlighting and scroll-to (Task 5) are handled by watching
 * `activeSegmentLine` and scrolling the line into view.
 */
export function EDIEditor({
  initialContent,
  activeSegmentLine,
  onDocumentLoaded,
  onCursorChange,
  onSegmentCountChange,
  onRawChange,
}: EDIEditorProps) {
  // ── Resolve the initial text ───────────────────────────────────────────────
  // null   → first load, show PLACEHOLDER so the editor isn't empty
  // ''     → after Clear, show truly blank editor
  // 'text' → uploaded file content
  const initialText = (initialContent === null || initialContent === undefined)
    ? PLACEHOLDER
    : initialContent;

  const [content, setContent]       = useState(initialText);
  const [cursorLine, setCursorLine] = useState<number>(1);

  // Parse result state
  const [segments,  setSegments]  = useState<Segment[]>([]);
  const [hierarchy, setHierarchy] = useState<SegmentNode[]>([]);
  const [errors,    setErrors]    = useState<ParseError[]>([]);
  const [parsedStandard, setParsedStandard] = useState<DocumentStandard>(null);

  // ── Find / Replace state ───────────────────────────────────────────────────
  const [findOpen,        setFindOpen]        = useState(false);
  const [findShowReplace, setFindShowReplace] = useState(false);
  const [findQuery,       setFindQuery]       = useState('');
  const [findReplace,     setFindReplace]     = useState('');
  const [findCase,        setFindCase]        = useState(false);
  const [findIdx,         setFindIdx]         = useState(0);

  // ── Element-edit popover state ────────────────────────────────────────────
  interface ElementEditState {
    line: number;
    elementIdx: number;
    x: number;
    y: number;
  }
  const [elemEdit, setElemEdit] = useState<ElementEditState | null>(null);

  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const scrollerRef      = useRef<HTMLDivElement>(null);
  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineRefs         = useRef<Map<number, HTMLDivElement>>(new Map());
  /**
   * Task 5 — feedback-loop guard.
   * Set to `true` immediately before calling `onCursorChange` so the scroll
   * useEffect knows the active-line change originated here (not from the tree)
   * and should NOT re-scroll the editor.
   */
  const syncedFromEditor = useRef(false);
  /**
   * Task 8 — always holds the latest `onRawChange` callback.
   * The mount-time useEffect(fn, []) captures this ref (not the prop directly)
   * so it always calls the current version even when the prop reference changes
   * between renders (inline functions in DocumentStudio re-create each render).
   */
  const onRawChangeRef = useRef(onRawChange);
  onRawChangeRef.current = onRawChange;

  // ── Derived values ──────────────────────────────────────────────────────────

  const rawLines = useMemo(() => content.split('\n'), [content]);
  const { elemSep, segTerm } = useMemo(() => extractDelimiters(content), [content]);
  const lineMap   = useMemo(() => buildLineMap(rawLines, segments), [rawLines, segments]);
  const loopLines = useMemo(() => collectLoopIds(hierarchy), [hierarchy]);
  const errorMap  = useMemo(() => buildErrorMap(errors), [errors]);

  // Find — recompute match positions whenever the bar is open and query/case/content change
  const findMatches = useMemo(() => {
    if (!findOpen || !findQuery) return [];
    return computeMatches(content, findQuery, findCase);
  }, [findOpen, findQuery, findCase, content]);

  // ── Mount-time parse ────────────────────────────────────────────────────────
  // Fires once on mount (or remount when editorKey changes in DocumentStudio).
  // Uses `initialText` captured from the closure — no debounce, immediate parse.
  // Empty content (after Clear) skips the parse but resets segment/error counts.

  useEffect(() => {
    if (!initialText.trim()) {
      // Blank editor (after Clear) — reset counts without calling onDocumentLoaded.
      // DocumentStudio already reset standard/hierarchy/errors in handleClear().
      setSegments([]);
      setHierarchy([]);
      setErrors([]);
      onSegmentCountChange(0);
      // Use the ref so we always call the latest onRawChange (avoids stale closure).
      onRawChangeRef.current?.('');
      return;
    }
    // Notify parent of raw content immediately via ref (latest callback guaranteed).
    onRawChangeRef.current?.(initialText);
    runParse(initialText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Parse runner ────────────────────────────────────────────────────────────

  const runParse = useCallback((raw: string) => {
    // Task 8 — notify parent of raw content change for AI prompt context.
    onRawChange?.(raw);

    const result = parseEDI(raw);
    const detectedStandard: DocumentStandard =
      result.standard === 'Unknown'   ? 'Unknown'
      : result.standard === 'X12'     ? 'X12'
      : result.standard === 'TRADACOMS' ? 'TRADACOMS'
      : 'EDIFACT';

    setSegments(result.segments);
    setHierarchy(result.hierarchy);
    setErrors(result.errors);
    setParsedStandard(detectedStandard);
    onSegmentCountChange(result.segments.length);
    onDocumentLoaded(detectedStandard, result.hierarchy, result.errors);
  }, [onDocumentLoaded, onSegmentCountChange, onRawChange]);

  // ── Debounced parse on content change ───────────────────────────────────────

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runParse(newContent);
    }, PARSE_DEBOUNCE_MS);

    // Update cursor line immediately (no debounce needed)
    updateCursorLine(e.target);
  }, [runParse]);

  // ── Cursor tracking ─────────────────────────────────────────────────────────

  const updateCursorLine = useCallback((ta: HTMLTextAreaElement) => {
    const pos  = ta.selectionStart ?? 0;
    const text = ta.value.slice(0, pos);
    const line = text.split('\n').length; // 1-based
    setCursorLine(line);
    // Mark as editor-originated so the scroll effect skips the re-scroll.
    syncedFromEditor.current = true;
    onCursorChange(line);
  }, [onCursorChange]);

  const handleKeyUp  = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    updateCursorLine(e.currentTarget);
  }, [updateCursorLine]);

  const handleClick  = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    updateCursorLine(e.currentTarget);
  }, [updateCursorLine]);

  // ── Line click — focus textarea, move cursor to that line ──────────────────

  const handleLineClick = useCallback((lineNum: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();

    // Compute char offset of the start of lineNum
    const lines = content.split('\n');
    let offset = 0;
    for (let i = 0; i < lineNum - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for '\n'
    }
    ta.setSelectionRange(offset, offset);
    setCursorLine(lineNum);
    // Mark as editor-originated before emitting to parent.
    syncedFromEditor.current = true;
    onCursorChange(lineNum);
  }, [content, onCursorChange]);

  // ── Scroll to activeSegmentLine (Task 5 — tree → editor sync) ──────────────

  useEffect(() => {
    if (activeSegmentLine == null) return;

    // If this change originated from the editor itself (cursor moved), the
    // editor is already at the right place — skip the scroll to avoid a
    // jarring re-scroll and to prevent any feedback loop with the tree.
    if (syncedFromEditor.current) {
      syncedFromEditor.current = false; // consume the flag
      return;
    }

    // Change came from the tree — scroll the target line into view.
    const el = lineRefs.current.get(activeSegmentLine);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setCursorLine(activeSegmentLine);
    }
  }, [activeSegmentLine]);

  // ── Paste — immediate parse when editor is currently empty ─────────────────
  // For paste into a non-empty editor the standard 300ms debounce is fine.
  // For paste into a blank editor (after Clear or on first load) we run the
  // parse immediately so the tree and badge update without perceptible delay.

  const handlePaste = useCallback(() => {
    // The textarea's value hasn't updated yet at the time onPaste fires.
    // Use requestAnimationFrame to read the new value after the DOM update.
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const newValue = ta.value;
      if (!content.trim() && newValue.trim()) {
        // Pasting into a blank editor — immediate parse (cancel any pending debounce)
        if (debounceRef.current) clearTimeout(debounceRef.current);
        runParse(newValue);
      }
      // Non-empty editor: the onChange debounce will fire as normal
    });
  }, [content, runParse]);

  // ── Find / Replace handlers ────────────────────────────────────────────────

  const openFind = useCallback((withReplace: boolean) => {
    setFindOpen(true);
    setFindShowReplace(withReplace);
    // Seed the query with the current textarea selection if non-empty.
    const ta = textareaRef.current;
    if (ta) {
      const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      if (sel && !sel.includes('\n')) setFindQuery(sel);
    }
  }, []);

  const closeFind = useCallback(() => {
    setFindOpen(false);
    setFindShowReplace(false);
    textareaRef.current?.focus();
  }, []);

  const nextMatch = useCallback(() => {
    if (findMatches.length === 0) return;
    setFindIdx((i) => (i + 1) % findMatches.length);
  }, [findMatches.length]);

  const prevMatch = useCallback(() => {
    if (findMatches.length === 0) return;
    setFindIdx((i) => (i - 1 + findMatches.length) % findMatches.length);
  }, [findMatches.length]);

  const replaceCurrent = useCallback(() => {
    if (findMatches.length === 0 || !findQuery) return;
    const start = findMatches[findIdx];
    const newContent = content.slice(0, start) + findReplace + content.slice(start + findQuery.length);
    setContent(newContent);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runParse(newContent);
    // Stay on the next match (current index now points at the next element after splice)
  }, [content, findIdx, findMatches, findQuery, findReplace, runParse]);

  const replaceAllMatches = useCallback(() => {
    if (findMatches.length === 0 || !findQuery) return;
    let out = content;
    for (let i = findMatches.length - 1; i >= 0; i--) {
      const start = findMatches[i];
      out = out.slice(0, start) + findReplace + out.slice(start + findQuery.length);
    }
    setContent(out);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runParse(out);
    setFindIdx(0);
  }, [content, findMatches, findQuery, findReplace, runParse]);

  // Reset findIdx when the match set changes shape
  useEffect(() => {
    if (findMatches.length === 0) {
      setFindIdx(0);
    } else if (findIdx >= findMatches.length) {
      setFindIdx(0);
    }
  }, [findMatches.length, findIdx]);

  // Highlight current match in the textarea + scroll its line into view
  useEffect(() => {
    if (!findOpen || findMatches.length === 0) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const start = findMatches[findIdx];
    const end = start + findQuery.length;
    // Use selection so the browser scrolls the textarea naturally; but also
    // scroll the rendered line into view via lineRefs (since the visible
    // layer is the styled div, not the textarea).
    ta.setSelectionRange(start, end);
    const lineNum = content.slice(0, start).split('\n').length;
    const el = lineRefs.current.get(lineNum);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [findOpen, findIdx, findMatches, findQuery, content]);

  // ── Element edit popover handlers ─────────────────────────────────────────

  const handleElementClick = useCallback((
    line: number,
    elementIdx: number,
    anchor: { x: number; y: number },
  ) => {
    setElemEdit({ line, elementIdx, x: anchor.x, y: anchor.y });
  }, []);

  /** Double-click handler on the textarea — derives (line, elementIdx) from
      the cursor position and opens the element editor at the click coords.
      This works regardless of whether the editor is focused (single-click on
      the rendered span only works pre-focus because the textarea overlay
      captures clicks once focused). */
  const handleTextareaDoubleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const pos = ta.selectionStart ?? 0;

    const beforeCursor = ta.value.slice(0, pos);
    const lineParts = beforeCursor.split('\n');
    const line = lineParts.length; // 1-based
    const lineStart = beforeCursor.length - lineParts[lineParts.length - 1].length;
    const cursorInLine = pos - lineStart;

    // Find the end of the current line in the full text
    const nl = ta.value.indexOf('\n', lineStart);
    const lineEnd = nl < 0 ? ta.value.length : nl;
    const lineText = ta.value.slice(lineStart, lineEnd);

    // Count element separators up to the cursor; idx 0 = segment ID
    let elementIdx = 0;
    for (let i = 0; i < cursorInLine && i < lineText.length; i++) {
      if (lineText[i] === elemSep) elementIdx++;
    }
    if (elementIdx < 1) return; // clicked the segment ID

    setElemEdit({ line, elementIdx, x: e.clientX, y: e.clientY });
  }, [elemSep]);

  const handleElementApply = useCallback((newValue: string) => {
    if (!elemEdit) return;
    const next = replaceElement(content, elemEdit.line, elemEdit.elementIdx, newValue);
    if (next === content) {
      setElemEdit(null);
      return;
    }
    setContent(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runParse(next);
    setElemEdit(null);
  }, [elemEdit, content, runParse]);

  /** Look up the segment definition from the curated dictionary based on the
      detected standard, so the popover can show the element's name + codes. */
  const elemEditDef = useMemo(() => {
    if (!elemEdit) return undefined;
    const seg = segments.find((s) => s.line === elemEdit.line);
    if (!seg) return undefined;
    let segDef;
    if (parsedStandard === 'X12') segDef = getX12Segment(seg.id);
    else if (parsedStandard === 'EDIFACT') segDef = getEdifactSegment(seg.id);
    else if (parsedStandard === 'TRADACOMS') segDef = getTradacomsSegment(seg.id);
    if (!segDef) return undefined;
    return segDef.elements[elemEdit.elementIdx - 1];
  }, [elemEdit, segments, parsedStandard]);

  const elemEditCurrentValue = useMemo(() => {
    if (!elemEdit) return '';
    const seg = segments.find((s) => s.line === elemEdit.line);
    return seg?.elements[elemEdit.elementIdx - 1] ?? '';
  }, [elemEdit, segments]);

  const elemEditSegmentId = useMemo(() => {
    if (!elemEdit) return '';
    return segments.find((s) => s.line === elemEdit.line)?.id ?? '';
  }, [elemEdit, segments]);

  // ── Tab + Ctrl+F / Ctrl+H key support in textarea ─────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      openFind(false);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      openFind(true);
      return;
    }
    if (e.key === 'Escape' && findOpen) {
      e.preventDefault();
      closeFind();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      const newVal = ta.value.slice(0, start) + '  ' + ta.value.slice(end);
      setContent(newVal);
      // restore cursor after the inserted spaces
      requestAnimationFrame(() => {
        ta.setSelectionRange(start + 2, start + 2);
      });
    }
  }, [openFind, closeFind, findOpen]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const isEmpty = content.length === 0;

  return (
    <div className="ds-edi-editor" aria-label="EDI document editor">
      <FindBar
        open={findOpen}
        query={findQuery}
        replaceQuery={findReplace}
        matchCount={findMatches.length}
        currentMatch={findMatches.length === 0 ? 0 : findIdx + 1}
        showReplace={findShowReplace}
        caseSensitive={findCase}
        onQueryChange={setFindQuery}
        onReplaceQueryChange={setFindReplace}
        onPrev={prevMatch}
        onNext={nextMatch}
        onReplace={replaceCurrent}
        onReplaceAll={replaceAllMatches}
        onToggleReplace={() => setFindShowReplace((v) => !v)}
        onToggleCase={() => setFindCase((v) => !v)}
        onClose={closeFind}
      />

      {/* Empty-state hint — shown when the editor has no content. The overlay
          is non-interactive (pointer-events: none); the underlying textarea
          still receives focus and paste events. */}
      {isEmpty && !findOpen && (
        <div className="ds-edi-editor__hint" aria-hidden="true">
          <div className="ds-edi-editor__hint-title">Paste an EDI document here</div>
          <div className="ds-edi-editor__hint-sub">
            Click anywhere then <kbd>Ctrl</kbd> + <kbd>V</kbd> (or <kbd>⌘</kbd> + <kbd>V</kbd>) — or use{' '}
            <strong>Paste</strong> / <strong>Upload</strong> in the toolbar
          </div>
        </div>
      )}

      {/* Scrollable display layer */}
      <div
        ref={scrollerRef}
        className="ds-edi-editor__scroller"
        aria-hidden="true"
        onClick={() => textareaRef.current?.focus()}
      >
        {rawLines.map((rawText, idx) => {
          const lineNum = idx + 1;
          const seg     = lineMap.get(lineNum) ?? null;
          const isLoop  = seg ? loopLines.has(seg.line) : false;
          const lineErr = errorMap.get(lineNum) ?? [];
          const isActive = lineNum === cursorLine || lineNum === activeSegmentLine;

          return (
            <div
              key={lineNum}
              ref={(el) => {
                if (el) lineRefs.current.set(lineNum, el);
                else lineRefs.current.delete(lineNum);
              }}
            >
              <EditorLine
                lineNumber={lineNum}
                rawText={rawText}
                segment={seg}
                isLoop={isLoop}
                isActive={isActive}
                elemSep={elemSep}
                segTerm={segTerm}
                errors={lineErr}
                onClick={handleLineClick}
                onElementClick={handleElementClick}
              />
            </div>
          );
        })}
      </div>

      {/* Hidden textarea overlay — captures all input */}
      <textarea
        ref={textareaRef}
        className="ds-edi-editor__textarea"
        value={content}
        onChange={handleChange}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onDoubleClick={handleTextareaDoubleClick}
        onPaste={handlePaste}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        aria-label="EDI document source"
        aria-multiline="true"
      />

      {elemEdit && (
        <ElementEditor
          x={elemEdit.x}
          y={elemEdit.y}
          segmentId={elemEditSegmentId}
          position={elemEdit.elementIdx}
          currentValue={elemEditCurrentValue}
          def={elemEditDef}
          onApply={handleElementApply}
          onCancel={() => setElemEdit(null)}
        />
      )}
    </div>
  );
}
