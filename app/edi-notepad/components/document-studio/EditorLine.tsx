'use client';

import type { Segment, ParseError } from '@/src/lib/edi/types';
import { ErrorTooltip } from './ErrorTooltip';

// ─── Token types ──────────────────────────────────────────────────────────────

type TokenType = 'segId' | 'delimiter' | 'value' | 'date' | 'qualifier';

interface Token {
  text: string;
  type: TokenType;
}

// ─── Token classifier ─────────────────────────────────────────────────────────

/** Simple date pattern: 6 or 8 consecutive digits (YYMMDD / YYYYMMDD). */
const DATE_RE = /^\d{6}$|^\d{8}$/;

/**
 * Tokenise one EDI element value.
 * Elements that look like dates get the "date" token type.
 * Single-char or 2-char all-uppercase elements are treated as qualifiers.
 * Everything else is a plain value.
 */
function classifyValue(val: string): TokenType {
  if (DATE_RE.test(val)) return 'date';
  if (/^[A-Z0-9]{1,3}$/.test(val) && val !== val.toLowerCase()) return 'qualifier';
  return 'value';
}

/**
 * Tokenise a raw EDI segment string into an array of Tokens.
 *
 * @param raw     The full segment string, e.g. "ISA*00*          *00*..."
 * @param elemSep Element separator character (default '*')
 * @param segTerm Segment terminator (stripped before tokenising)
 */
function tokeniseLine(raw: string, elemSep: string, segTerm: string): Token[] {
  // Strip trailing segment terminator and whitespace
  let src = raw.trimEnd();
  if (src.endsWith(segTerm)) src = src.slice(0, -1);

  const tokens: Token[] = [];
  const parts = src.split(elemSep);

  parts.forEach((part, idx) => {
    if (idx === 0) {
      // First part is always the segment ID
      tokens.push({ text: part, type: 'segId' });
    } else {
      // Separator before each element
      tokens.push({ text: elemSep, type: 'delimiter' });
      if (part.length > 0) {
        tokens.push({ text: part, type: classifyValue(part) });
      }
    }
  });

  // Append the segment terminator as a delimiter token
  if (segTerm) {
    tokens.push({ text: segTerm, type: 'delimiter' });
  }

  return tokens;
}

// ─── Segment-ID colour mapping ────────────────────────────────────────────────

function segIdColor(id: string, isLoop: boolean): string {
  switch (id) {
    case 'ISA': case 'IEA': case 'UNB': case 'UNZ': return '#7c6af7';
    case 'GS':  case 'GE':  case 'UNG': case 'UNE': return '#4f8ef7';
    case 'ST':  case 'SE':  case 'UNH': case 'UNT': case 'BGM': return '#34c9b0';
    default: return isLoop ? '#f5a623' : '#8b95a8';
  }
}

// ─── Token colour resolver ────────────────────────────────────────────────────

function tokenStyle(
  tok: Token,
  segment: Segment,
  isLoop: boolean,
): React.CSSProperties {
  switch (tok.type) {
    case 'segId':      return { color: segIdColor(segment.id, isLoop), fontWeight: 700 };
    case 'delimiter':  return { color: '#5a6478' };
    case 'date':       return { color: '#34c97a' };
    case 'qualifier':  return { color: '#f5a623' };
    case 'value':
    default:           return { color: '#8b95a8' };
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EditorLineProps {
  /** 1-based line number shown in the gutter. */
  lineNumber: number;
  /** Raw text of this line (may be empty / a comment line). */
  rawText: string;
  /** Parsed segment for this line (null if the line couldn't be matched). */
  segment: Segment | null;
  /** Whether this segment is part of a loop in the hierarchy. */
  isLoop: boolean;
  /** Whether the editor cursor is on this line. */
  isActive: boolean;
  /** Element separator inferred from the document (default '*'). */
  elemSep: string;
  /** Segment terminator inferred from the document (default '~'). */
  segTerm: string;
  /** Errors that should be shown as underlines on this line. */
  errors: ParseError[];
  /** Called when the user clicks this line. */
  onClick: (line: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * EditorLine — renders one line of the EDI editor.
 *
 * Layout:
 *   [gutter: line number]  [tokenised segment content]
 *
 * Active line gets `.ds-editor-line--active` (accent-dim background).
 * Error lines get `.ds-editor-line--error` (red tint background).
 * Error tokens are wrapped in `<ErrorTooltip>` with a red underline.
 */
export function EditorLine({
  lineNumber,
  rawText,
  segment,
  isLoop,
  isActive,
  elemSep,
  segTerm,
  errors,
  onClick,
}: EditorLineProps) {
  const hasErrors = errors.length > 0;

  const lineClass = [
    'ds-editor-line',
    isActive  ? 'ds-editor-line--active' : '',
    hasErrors ? 'ds-editor-line--error'  : '',
  ].filter(Boolean).join(' ');

  // ── Render ────────────────────────────────────────────────────────────────

  // If we have a parsed segment, render tokenised content; otherwise raw text.
  const content = segment
    ? renderTokenised(segment, isLoop, errors, elemSep, segTerm)
    : <span className="ds-editor-token ds-editor-token--raw">{rawText || '\u00a0'}</span>;

  return (
    <div
      className={lineClass}
      onClick={() => onClick(lineNumber)}
      data-line={lineNumber}
    >
      {/* Gutter */}
      <span className="ds-editor-gutter" aria-hidden="true">
        {lineNumber}
      </span>

      {/* Line content */}
      <span className="ds-editor-content">
        {content}
      </span>
    </div>
  );
}

// ─── Tokenised renderer ───────────────────────────────────────────────────────

function renderTokenised(
  segment: Segment,
  isLoop: boolean,
  errors: ParseError[],
  elemSep: string,
  segTerm: string,
) {
  const tokens = tokeniseLine(
    [segment.id, ...segment.elements].join(elemSep) + segTerm,
    elemSep,
    segTerm,
  );

  const hasErrors = errors.length > 0;

  const spans = tokens.map((tok, i) => (
    <span
      key={i}
      className={`ds-editor-token ds-editor-token--${tok.type}${hasErrors && tok.type === 'segId' ? ' ds-editor-token--error-underline' : ''}`}
      style={tokenStyle(tok, segment, isLoop)}
    >
      {tok.text}
    </span>
  ));

  if (hasErrors) {
    return (
      <ErrorTooltip errors={errors}>
        {spans}
      </ErrorTooltip>
    );
  }

  return <>{spans}</>;
}
