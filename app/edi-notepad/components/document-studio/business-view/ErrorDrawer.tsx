'use client';

import { useEffect, useRef } from 'react';
import type React from 'react';
import {
  getX12Segment,
  getEdifactSegment,
  getTradacomsSegment,
} from '@/src/lib/edi/dictionaries';
import type { TxnBlock } from './BusinessView';
import { reconstructSegment } from './helpers';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

interface ErrorDrawerProps {
  block: TxnBlock;
  errorIdx: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

function lookupSegmentDef(standard: TxnBlock['standard'], segmentId: string) {
  if (standard === 'X12') return getX12Segment(segmentId);
  if (standard === 'EDIFACT') return getEdifactSegment(segmentId);
  return getTradacomsSegment(segmentId);
}

const TYPE_LABEL: Record<string, string> = {
  AN: 'Alphanumeric', ID: 'Identifier (code)', N0: 'Integer',
  N2: 'Numeric ×10⁻²', R: 'Decimal', DT: 'Date', TM: 'Time',
};

/**
 * ErrorDrawer — slide-in right panel showing one validation error in
 * detail: severity, message, raw segment, error context (envelope / group /
 * ICN / set control), and the curated X12 / EDIFACT / TRADACOMS segment
 * specification. prev / next walk through the block's errors. Closes on
 * Escape or via the close button.
 */
export function ErrorDrawer({ block, errorIdx, onPrev, onNext, onClose }: ErrorDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const total = block.errors.length;
  const error = block.errors[errorIdx];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); onNext(); }
      else if (e.key === 'ArrowUp'   || e.key === 'k') { e.preventDefault(); onPrev(); }
    }
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  if (!error) return null;

  // Find the actual segment object so we can reconstruct its raw form
  const seg = block.segments.find((s) => s.line === error.line && s.id === error.segmentId)
    ?? block.segments.find((s) => s.line === error.line);
  // Use plausible delimiters: X12 default *, ~; EDIFACT default +, '
  const elemSep = block.standard === 'X12' ? '*' : block.standard === 'EDIFACT' ? '+' : '+';
  const segTerm = block.standard === 'X12' ? '~' : block.standard === 'EDIFACT' ? "'" : "'";

  const segDef = lookupSegmentDef(block.standard, error.segmentId);
  const severity = (error.severity ?? 'error') as 'error' | 'warning';

  return (
    <aside className="ds-bv-drawer" role="dialog" aria-label="Error detail">
      <header className="ds-bv-drawer__header">
        <div className="ds-bv-drawer__title-row">
          <span className="ds-bv-drawer__icon" aria-hidden="true">⚠</span>
          <span className="ds-bv-drawer__title">Error Detail</span>
        </div>
        <div className="ds-bv-drawer__nav">
          <button
            type="button"
            className="ds-bv-drawer__nav-btn"
            onClick={onPrev}
            disabled={errorIdx <= 0}
            aria-label="Previous error"
            title="Previous error (↑)"
          >
            <span className="ds-bv-drawer__nav-icon" aria-hidden="true" style={icon('chevron-up')} />
          </button>
          <span className="ds-bv-drawer__nav-count">{errorIdx + 1} of {total}</span>
          <button
            type="button"
            className="ds-bv-drawer__nav-btn"
            onClick={onNext}
            disabled={errorIdx >= total - 1}
            aria-label="Next error"
            title="Next error (↓)"
          >
            <span className="ds-bv-drawer__nav-icon" aria-hidden="true" style={icon('chevron-down')} />
          </button>
          <button
            ref={closeBtnRef}
            type="button"
            className="ds-bv-drawer__nav-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="ds-bv-drawer__nav-icon" aria-hidden="true" style={icon('x')} />
          </button>
        </div>
      </header>

      <div className="ds-bv-drawer__body">
        <div className="ds-bv-drawer__sevrow">
          <span className={`ds-bv-errcard__sev ds-bv-errcard__sev--${severity}`}>
            {severity === 'error' ? 'ERROR' : 'WARNING'}
          </span>
          <span className="ds-bv-drawer__seg">
            {error.segmentId}{segDef ? ` — ${segDef.name}` : ''}
          </span>
        </div>

        <h3 className="ds-bv-drawer__msg">{error.message}</h3>

        {seg && (
          <section className="ds-bv-drawer__section">
            <div className="ds-bv-drawer__section-title">Raw Segment</div>
            <pre className="ds-bv-drawer__raw">{reconstructSegment(seg, elemSep, segTerm)}</pre>
          </section>
        )}

        <section className="ds-bv-drawer__section">
          <div className="ds-bv-drawer__section-title">Error Context</div>
          <dl className="ds-bv-drawer__dl">
            <div><dt>Line</dt><dd>{error.line}</dd></div>
            <div><dt>Segment</dt><dd className="sm-mono">{error.segmentId}</dd></div>
            {block.context.sender && <div><dt>Sender</dt><dd className="sm-mono">{block.context.sender}</dd></div>}
            {block.context.receiver && <div><dt>Receiver</dt><dd className="sm-mono">{block.context.receiver}</dd></div>}
            {block.context.interchangeControl && <div><dt>Interchange Ctrl</dt><dd className="sm-mono">{block.context.interchangeControl}</dd></div>}
            {block.context.groupControl && <div><dt>Group Ctrl</dt><dd className="sm-mono">{block.context.groupControl}</dd></div>}
            {block.context.transactionControl && <div><dt>Set Ctrl</dt><dd className="sm-mono">{block.context.transactionControl}</dd></div>}
          </dl>
        </section>

        {segDef && segDef.elements.length > 0 && (
          <section className="ds-bv-drawer__section ds-bv-drawer__spec">
            <div className="ds-bv-drawer__section-title">
              {block.standard} Specification — {error.segmentId}
            </div>
            <p className="ds-bv-drawer__spec-name">{segDef.name}</p>
            <ul className="ds-bv-drawer__spec-list">
              {segDef.elements.map((el, i) => (
                <li key={i} className="ds-bv-drawer__spec-row">
                  <span className="ds-bv-drawer__spec-pos">
                    {error.segmentId}{(i + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="ds-bv-drawer__spec-info">
                    <strong>{el.name}</strong>
                    <span className="ds-bv-drawer__spec-meta">
                      {el.type} · {TYPE_LABEL[el.type] ?? el.type} ·{' '}
                      {el.minLength === el.maxLength ? el.minLength : `${el.minLength}–${el.maxLength}`} chars
                      {el.required ? ' · required' : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="ds-bv-drawer__aviator-stub" aria-hidden="true">
          ✦ Aviator AI · coming soon
        </div>
      </div>
    </aside>
  );
}
