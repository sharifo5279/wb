'use client';

import { useMemo } from 'react';
import type { ParseResult } from '@/src/lib/edi/types';

interface HexViewProps {
  text: string;
  parseResult: ParseResult | null;
}

const BYTES_PER_ROW = 16;

/** Detect element separator + segment terminator from a raw EDI buffer. */
function detectDelimiters(text: string): { elemSep: string; segTerm: string } {
  if (text.startsWith('ISA') && text.length >= 106) {
    return { elemSep: text[3], segTerm: text[105] };
  }
  if (text.startsWith('UNA') && text.length >= 9) {
    return { elemSep: text[4], segTerm: text[8] };
  }
  return { elemSep: '+', segTerm: "'" };
}

function toHex(byte: number, width = 2): string {
  return byte.toString(16).padStart(width, '0').toUpperCase();
}

function isPrintable(byte: number): boolean {
  // Printable ASCII range, excluding control characters
  return byte >= 0x20 && byte <= 0x7e;
}

/**
 * HexView — read-only byte dump of the loaded document.
 *
 * Layout (per row):
 *   00000000  49 53 41 2A 30 30 ... ZZ  ISA*00*...
 *   ─offset─  ────hex bytes (16)────    ascii (16)
 *
 * Element separator and segment terminator bytes are highlighted so the
 * delimiters used by the parser are visible at a glance.
 */
export function HexView({ text, parseResult: _parseResult }: HexViewProps) {
  const bytes = useMemo(() => new TextEncoder().encode(text), [text]);
  const { elemSep, segTerm } = useMemo(() => detectDelimiters(text), [text]);
  const elemSepByte = elemSep ? elemSep.charCodeAt(0) : -1;
  const segTermByte = segTerm ? segTerm.charCodeAt(0) : -1;

  if (bytes.length === 0) {
    return (
      <div className="ds-hex-empty" role="status" aria-live="polite">
        Load an EDI document to inspect it byte-by-byte.
      </div>
    );
  }

  const rows: number[][] = [];
  for (let i = 0; i < bytes.length; i += BYTES_PER_ROW) {
    const slice = Array.from(bytes.slice(i, i + BYTES_PER_ROW));
    rows.push(slice);
  }

  function classifyByte(byte: number): string {
    if (byte === elemSepByte) return 'ds-hex-byte--elem';
    if (byte === segTermByte) return 'ds-hex-byte--term';
    if (byte === 0x0a || byte === 0x0d) return 'ds-hex-byte--ws';
    if (!isPrintable(byte)) return 'ds-hex-byte--np';
    return '';
  }

  return (
    <div className="ds-hex-view" role="region" aria-label="Byte view">
      <div className="ds-hex-legend">
        <span><span className="ds-hex-legend__dot ds-hex-legend__dot--elem" /> Element separator</span>
        <span><span className="ds-hex-legend__dot ds-hex-legend__dot--term" /> Segment terminator</span>
        <span><span className="ds-hex-legend__dot ds-hex-legend__dot--ws" /> Whitespace</span>
        <span className="ds-hex-legend__bytes">{bytes.length.toLocaleString()} bytes</span>
      </div>
      <div className="ds-hex-scroll">
        <div className="ds-hex-grid">
          {rows.map((row, ri) => {
            const offset = ri * BYTES_PER_ROW;
            return (
              <div className="ds-hex-row" key={offset}>
                <span className="ds-hex-offset">{toHex(offset, 8)}</span>
                <span className="ds-hex-bytes">
                  {row.map((b, bi) => (
                    <span key={bi} className={`ds-hex-byte ${classifyByte(b)}`}>
                      {toHex(b)}
                    </span>
                  ))}
                  {row.length < BYTES_PER_ROW &&
                    Array.from({ length: BYTES_PER_ROW - row.length }).map((_, i) => (
                      <span key={`pad-${i}`} className="ds-hex-byte ds-hex-byte--pad">
                        &nbsp;&nbsp;
                      </span>
                    ))}
                </span>
                <span className="ds-hex-ascii">
                  {row.map((b, bi) => (
                    <span key={bi} className={`ds-hex-char ${classifyByte(b)}`}>
                      {isPrintable(b) ? String.fromCharCode(b) : '.'}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
