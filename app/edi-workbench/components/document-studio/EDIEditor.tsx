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
import type { DocumentStandard } from './DocumentStudio';
import { EditorLine } from './EditorLine';

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
SE*4*0001~
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
      result.standard === 'Unknown' ? 'Unknown'
      : result.standard === 'X12'   ? 'X12'
      : 'EDIFACT';

    setSegments(result.segments);
    setHierarchy(result.hierarchy);
    setErrors(result.errors);
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

  // ── Tab key support in textarea ────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="ds-edi-editor" aria-label="EDI document editor">
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
        onPaste={handlePaste}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        aria-label="EDI document source"
        aria-multiline="true"
      />
    </div>
  );
}
