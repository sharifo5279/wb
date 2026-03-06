'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type React from 'react';
import type { Segment } from '@/src/lib/edi/types';
import type { DocumentStandard } from './DocumentStudio';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PanelAIProps {
  /** Controls panel open/closed state (drives .ds-panel-ai--closed). */
  open: boolean;
  /** True once a parseable document is loaded — enables AI actions. */
  hasValidDocument: boolean;
  /** Current raw EDI text from the editor (used in AI prompts). */
  rawContent: string;
  /** The segment last clicked in the tree (null if none yet). */
  selectedSegment: Segment | null;
  /**
   * Incremented on every tree node click (even the same node).
   * useEffect([segmentClickCount]) fires the segment AI call on each click.
   */
  segmentClickCount: number;
  /** Detected EDI standard — used to reconstruct segment raw text. */
  standard: DocumentStandard;
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'You are an EDI expert assistant integrated into a professional EDI workbench. ' +
  'Explain EDI documents, segments, and concepts in clear, plain language suitable ' +
  'for both technical and non-technical users. Be concise but thorough. ' +
  'Use bullet points where appropriate.';

/** Reconstruct the raw segment text from its parts for display and AI context. */
function buildSegmentRaw(seg: Segment, standard: DocumentStandard): string {
  const sep  = standard === 'EDIFACT' ? '+' : '*';
  const term = standard === 'EDIFACT' ? "'" : '~';
  return seg.elements.length > 0
    ? `${seg.id}${sep}${seg.elements.join(sep)}${term}`
    : `${seg.id}${term}`;
}

type AIActionType = 'document' | 'segment' | 'prompt';

interface BuildMessagesParams {
  raw: string;
  segment?: Segment | null;
  standard: DocumentStandard;
  query?: string;
}

function buildMessages(
  type: AIActionType,
  { raw, segment, standard, query }: BuildMessagesParams,
): { messages: { role: string; content: string }[]; system: string } {
  const std = standard ?? 'Unknown';
  let content = '';

  if (type === 'document') {
    content =
      `Explain this ${std} EDI document in plain language. ` +
      `Summarize the document type, trading partners, and key data fields.\n\n` +
      `Document:\n${raw}`;
  } else if (type === 'segment' && segment) {
    const segRaw = buildSegmentRaw(segment, standard);
    const desc   = segment.descriptor.known ? ` The segment name is "${segment.descriptor.name}".` : '';
    const elems  = segment.elements
      .map((e, i) => `  Element ${i + 1}: ${e !== '' ? e : '(empty)'}`)
      .join('\n');
    content =
      `Explain this ${std} segment in plain language, including what each element means.` +
      `${desc}\n\n` +
      `Segment raw:\n${segRaw}\n\n` +
      `Elements:\n${elems}`;
  } else if (type === 'prompt') {
    content =
      `Answer the following question about this ${std} EDI document.\n\n` +
      `Question: ${query ?? ''}\n\n` +
      `Document:\n${raw}`;
  }

  return {
    messages: [{ role: 'user', content }],
    system: SYSTEM_PROMPT,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PanelAI — right panel (Aviator AI), 25% width, slides in/out.
 *
 * Layout (flex column, overrides .ds-panel__body with dual-class .ai-panel-body):
 *   ┌──────────────────────────────┐
 *   │  Panel header (32px)         │
 *   ├──────────────────────────────┤
 *   │  .ai-actions  — explain btn  │  flex-shrink: 0
 *   ├──────────────────────────────┤
 *   │  .ai-context  — segment box  │  flex-shrink: 0  (conditional)
 *   ├──────────────────────────────┤
 *   │  .ai-response — stream area  │  flex: 1; overflow-y: auto
 *   ├──────────────────────────────┤
 *   │  .ai-input-form — textarea   │  flex-shrink: 0
 *   └──────────────────────────────┘
 */
export function PanelAI({
  open,
  hasValidDocument,
  rawContent,
  selectedSegment,
  segmentClickCount,
  standard,
}: PanelAIProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [aiContent,    setAiContent]    = useState('');
  const [isStreaming,  setIsStreaming]  = useState(false);
  const [inputValue,   setInputValue]   = useState('');

  // ── Refs ───────────────────────────────────────────────────────────────────
  const abortRef    = useRef<AbortController | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  // ── Auto-scroll response area during streaming ──────────────────────────────
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [aiContent]);

  // ── Core streaming AI caller ────────────────────────────────────────────────

  const triggerAI = useCallback(async (
    type: AIActionType,
    query?: string,
  ) => {
    // Abort any in-flight request before starting a new one.
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setAiContent('');
    setIsStreaming(true);

    const { messages, system } = buildMessages(type, {
      raw: rawContent,
      segment: selectedSegment,
      standard,
      query,
    });

    try {
      const res = await fetch('/api/edi-workbench/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, system }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        setAiContent('[Error: Failed to connect to AI service]');
        setIsStreaming(false);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop()!; // keep last partial line for next chunk

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          try {
            const event = JSON.parse(json) as {
              type: string;
              text?: string;
              message?: string;
            };

            if (event.type === 'delta' && event.text) {
              setAiContent((prev) => prev + event.text);
            } else if (event.type === 'error') {
              setAiContent((prev) =>
                prev
                  ? `${prev}\n\n[Error: ${event.message ?? 'Unknown error'}]`
                  : `[Error: ${event.message ?? 'Unknown error'}]`,
              );
              break outer;
            } else if (event.type === 'done') {
              break outer;
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setAiContent((prev) =>
          prev
            ? `${prev}\n\n[Error: Connection failed]`
            : '[Error: Connection failed]',
        );
      }
    } finally {
      setIsStreaming(false);
    }
  }, [rawContent, selectedSegment, standard]);

  // ── Auto-trigger segment AI on each tree node click ─────────────────────────
  // Uses segmentClickCount as the trigger so the same segment can be re-explained.
  // Only fires when the AI panel is open and a segment is selected.
  useEffect(() => {
    if (segmentClickCount === 0 || !selectedSegment || !open) return;
    void triggerAI('segment');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentClickCount]);

  // ── Free-text form submit ──────────────────────────────────────────────────

  const handleSubmitPrompt = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    if (!q || !hasValidDocument || isStreaming) return;
    setInputValue('');
    void triggerAI('prompt', q);
  }, [inputValue, hasValidDocument, isStreaming, triggerAI]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter without Shift submits the form
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const q = inputValue.trim();
        if (!q || !hasValidDocument || isStreaming) return;
        setInputValue('');
        void triggerAI('prompt', q);
      }
    },
    [inputValue, hasValidDocument, isStreaming, triggerAI],
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const disabledTitle = !hasValidDocument
    ? 'Load an EDI document to use AI features'
    : isStreaming
      ? 'AI is responding…'
      : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <aside
      className={`ds-panel-ai${open ? '' : ' ds-panel-ai--closed'}`}
      aria-label="Aviator AI panel"
      aria-hidden={!open}
    >
      {/* ── Panel header ── */}
      <div className="ds-panel__header">
        <span
          className="ds-panel__btn-icon"
          aria-hidden="true"
          style={{
            ...icon('sparkles'),
            width: '13px',
            height: '13px',
            background: 'var(--wb-accent-text)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span className="ds-panel__title">Aviator AI</span>
      </div>

      {/* ── Panel body — flex column via .ai-panel-body override ── */}
      <div
        className="ds-panel__body ai-panel-body"
        role="region"
        aria-label="AI assistant"
      >
        {/* ── "Explain document" action strip ── */}
        <div className="ai-actions">
          <button
            type="button"
            className="ai-btn"
            disabled={!hasValidDocument || isStreaming}
            title={disabledTitle ?? 'Summarise document type, partners, and key data'}
            onClick={() => void triggerAI('document')}
          >
            <span
              className="ai-btn__icon"
              aria-hidden="true"
              style={icon('file-search')}
            />
            Explain document
          </button>
        </div>

        {/* ── Selected segment context box (conditional) ── */}
        {selectedSegment && (
          <div className="ai-context">
            <span className="ai-context__label">
              Selected:{' '}
              <strong>{selectedSegment.id}</strong>
              {selectedSegment.descriptor.known
                ? ` — ${selectedSegment.descriptor.name}`
                : ''}
            </span>
            <pre className="ai-context__raw">
              {buildSegmentRaw(selectedSegment, standard)}
            </pre>
          </div>
        )}

        {/* ── Streaming response area ── */}
        <div
          ref={responseRef}
          className={`ai-response${!aiContent && !isStreaming ? ' ai-response--empty' : ''}`}
          aria-live="polite"
          aria-label="AI response"
        >
          {aiContent ? (
            <div className="ai-response__content">
              {aiContent}
              {isStreaming && (
                <span className="ai-cursor" aria-hidden="true" />
              )}
            </div>
          ) : isStreaming ? (
            <div className="ai-response__content">
              <span className="ai-cursor" aria-hidden="true" />
            </div>
          ) : (
            <p className="ai-response__placeholder">
              {hasValidDocument
                ? 'Click "Explain document", select a segment in the tree, or ask a question below.'
                : 'Load an EDI document to use AI features.'}
            </p>
          )}
        </div>

        {/* ── Free-text prompt input ── */}
        <form className="ai-input-form" onSubmit={handleSubmitPrompt}>
          <textarea
            className="ai-input"
            placeholder={
              hasValidDocument
                ? 'Ask a question about this document… (Enter to send)'
                : 'Load a document first'
            }
            value={inputValue}
            rows={3}
            disabled={!hasValidDocument || isStreaming}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            aria-label="AI prompt input"
          />
          <button
            type="submit"
            className="ai-send-btn"
            disabled={!hasValidDocument || !inputValue.trim() || isStreaming}
            title={disabledTitle ?? 'Send (Enter)'}
            aria-label="Send prompt"
          >
            <span
              className="ai-btn__icon"
              aria-hidden="true"
              style={icon('send')}
            />
          </button>
        </form>
      </div>
    </aside>
  );
}
