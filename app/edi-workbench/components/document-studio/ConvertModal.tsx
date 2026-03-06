'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type React from 'react';
import type { ParseResult } from '@/src/lib/edi/types';
import { toJSON, toXML } from '@/src/lib/edi/converters';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConvertModalProps {
  open: boolean;
  /** Which tab is selected when the modal opens. */
  initialFormat: 'json' | 'xml';
  /** The current document's parse result — null when no valid document. */
  parseResult: ParseResult | null;
  onClose: () => void;
}

// ─── Syntax highlighters ──────────────────────────────────────────────────────

/**
 * Tokenise a JSON string and wrap token types in span.j-* classes.
 * Non-token characters (whitespace, structural chars already handled) are
 * passed through unchanged.  String values are HTML-escaped inline.
 */
function highlightJSON(raw: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return raw.replace(
    // Groups: (1) key-str (2) colon | (3) str-val | (4) bool | (5) null |
    //         (6) number | (7) brace/bracket | (8) comma
    /("(?:[^"\\]|\\.)*")(\s*:)|("(?:[^"\\]|\\.)*")|(true|false)|(null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\]])|([,])/g,
    (full, keyStr, colon, str, bool, nl, num, brace, comma) => {
      if (keyStr !== undefined)
        return (
          `<span class="j-key">${esc(keyStr)}</span>` +
          `<span class="j-punct">${esc(colon)}</span>`
        );
      if (str   !== undefined) return `<span class="j-str">${esc(str)}</span>`;
      if (bool  !== undefined) return `<span class="j-bool">${bool}</span>`;
      if (nl    !== undefined) return `<span class="j-null">null</span>`;
      if (num   !== undefined) return `<span class="j-num">${num}</span>`;
      if (brace !== undefined) return `<span class="j-brace">${brace}</span>`;
      if (comma !== undefined) return `<span class="j-punct">${comma}</span>`;
      return esc(full);
    },
  );
}

/**
 * Line-by-line XML highlighter.
 *
 * Tag names and structural punctuation are HTML-escaped; text content is
 * passed as-is because our toXML() already ran escXML() on all values
 * (which performs the same &<>" escaping that HTML requires).
 */
function highlightXML(raw: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return raw
    .split('\n')
    .map(line => {
      const trimmed = line.trimStart();
      const indent  = line.slice(0, line.length - trimmed.length);

      if (!trimmed) return '';

      // XML / processing instruction declaration: <?...?>
      if (trimmed.startsWith('<?')) {
        return `${indent}<span class="x-decl">${esc(trimmed)}</span>`;
      }

      // Inline element:  <tag>content</tag>
      const inline = trimmed.match(/^(<)([^/>\s]+)(>)([^<]+?)(<\/)([^>]+)(>)$/);
      if (inline) {
        const [, op, name, cl, content, cop, cname, ccl] = inline;
        return (
          `${indent}` +
          `<span class="x-punct">${esc(op)}</span>` +
          `<span class="x-tag">${name}</span>` +
          `<span class="x-punct">${esc(cl)}</span>` +
          `<span class="x-text">${content}</span>` +   // already safe via escXML
          `<span class="x-punct">${esc(cop)}</span>` +
          `<span class="x-tag">${cname}</span>` +
          `<span class="x-punct">${esc(ccl)}</span>`
        );
      }

      // Self-closing:  <tag/>
      const self = trimmed.match(/^(<)([^/>\s]+)(\/?>)$/);
      if (self && self[3] === '/>') {
        const [, op, name, cl] = self;
        return (
          `${indent}` +
          `<span class="x-punct">${esc(op)}</span>` +
          `<span class="x-tag">${name}</span>` +
          `<span class="x-punct">${esc(cl)}</span>`
        );
      }

      // Closing tag:  </tag>
      const closing = trimmed.match(/^(<\/)([^>]+)(>)$/);
      if (closing) {
        const [, op, name, cl] = closing;
        return (
          `${indent}` +
          `<span class="x-punct">${esc(op)}</span>` +
          `<span class="x-tag">${name}</span>` +
          `<span class="x-punct">${esc(cl)}</span>`
        );
      }

      // Opening tag:  <tag>
      const open = trimmed.match(/^(<)([^/>\s]+)(>)$/);
      if (open) {
        const [, op, name, cl] = open;
        return (
          `${indent}` +
          `<span class="x-punct">${esc(op)}</span>` +
          `<span class="x-tag">${name}</span>` +
          `<span class="x-punct">${esc(cl)}</span>`
        );
      }

      return esc(line);
    })
    .join('\n');
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ConvertModal — full-screen modal overlay presenting the converted document.
 *
 * Layout (flex column):
 *   ┌─────────────────────────────────────────────┐
 *   │  header  [title]  [JSON|XML tabs]  [close]  │  44px
 *   ├─────────────────────────────────────────────┤
 *   │  body    <pre> syntax-highlighted code      │  flex-1, scrollable
 *   ├─────────────────────────────────────────────┤
 *   │  footer  N lines · N chars  [Copy] [↓ .fmt] │  44px
 *   └─────────────────────────────────────────────┘
 */
export function ConvertModal({
  open,
  initialFormat,
  parseResult,
  onClose,
}: ConvertModalProps) {
  const [format, setFormat] = useState<'json' | 'xml'>(initialFormat);
  const [copied, setCopied] = useState(false);

  // Re-sync the selected tab whenever the modal is (re-)opened.
  useEffect(() => {
    if (open) setFormat(initialFormat);
  }, [open, initialFormat]);

  // Close on Escape key.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // ── Derived output ─────────────────────────────────────────────────────────

  const output = useMemo(() => {
    if (!parseResult) return '';
    try {
      return format === 'json' ? toJSON(parseResult) : toXML(parseResult);
    } catch {
      return '/* Error generating output */';
    }
  }, [format, parseResult]);

  const highlighted = useMemo(
    () => (format === 'json' ? highlightJSON(output) : highlightXML(output)),
    [format, output],
  );

  const lineCount = useMemo(() => output.split('\n').length, [output]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore — clipboard may be unavailable */
    }
  }, [output]);

  const handleDownload = useCallback(() => {
    const ext  = format === 'json' ? 'json' : 'xml';
    const mime = format === 'json' ? 'application/json' : 'application/xml';
    const blob = new Blob([output], { type: `${mime};charset=utf-8` });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `document.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [format, output]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div
      className="cm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Convert to ${format.toUpperCase()}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cm-modal">

        {/* ── Header ── */}
        <div className="cm-modal__header">
          <span className="cm-modal__title">Convert Document</span>

          {/* Format tabs */}
          <div className="cm-tabs" role="tablist" aria-label="Output format">
            <button
              role="tab"
              aria-selected={format === 'json'}
              className={`cm-tab${format === 'json' ? ' cm-tab--active' : ''}`}
              onClick={() => setFormat('json')}
            >
              JSON
            </button>
            <button
              role="tab"
              aria-selected={format === 'xml'}
              className={`cm-tab${format === 'xml' ? ' cm-tab--active' : ''}`}
              onClick={() => setFormat('xml')}
            >
              XML
            </button>
          </div>

          {/* Close */}
          <button
            type="button"
            className="cm-modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <span
              className="cm-modal__close-icon"
              aria-hidden="true"
              style={icon('x')}
            />
          </button>
        </div>

        {/* ── Code body ── */}
        <div className="cm-modal__body">
          {/* eslint-disable-next-line react/no-danger */}
          <pre
            className="cm-code-block"
            aria-label={`${format.toUpperCase()} output`}
            // Safe: content generated by our own pure converters + regex highlighter.
            // String values are escaped by esc() / escXML(); no user input reaches the HTML.
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </div>

        {/* ── Footer ── */}
        <div className="cm-modal__footer">
          <span className="cm-modal__line-count" aria-live="polite">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'} ·{' '}
            {output.length.toLocaleString()} chars
          </span>

          <div className="cm-modal__actions">
            <button
              type="button"
              className={`cm-btn ${copied ? 'cm-btn--success' : 'cm-btn--ghost'}`}
              onClick={handleCopy}
              aria-label="Copy to clipboard"
            >
              <span
                className="cm-btn__icon"
                aria-hidden="true"
                style={icon(copied ? 'check' : 'copy')}
              />
              {copied ? 'Copied!' : 'Copy'}
            </button>

            <button
              type="button"
              className="cm-btn cm-btn--primary"
              onClick={handleDownload}
              aria-label={`Download as ${format.toUpperCase()}`}
            >
              <span
                className="cm-btn__icon"
                aria-hidden="true"
                style={icon('download')}
              />
              Download .{format}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
