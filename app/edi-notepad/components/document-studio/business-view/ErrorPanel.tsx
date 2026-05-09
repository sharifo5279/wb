'use client';

import type { ParseError } from '@/src/lib/edi/types';

interface ErrorPanelProps {
  errors: ParseError[];
  /** Envelope context shown in the panel header. */
  envelopeLabel?: string;
  /** Callback when a card is clicked — opens the drawer. */
  onSelect?: (errorIdx: number) => void;
}

function severityKind(e: ParseError): 'error' | 'warning' {
  return (e.severity ?? 'error') === 'warning' ? 'warning' : 'error';
}

/**
 * ErrorPanel — inline list of validation errors, rendered at the top of
 * the Business View when the active transaction has issues. Each card is
 * clickable; clicking opens the Error Detail drawer with prev/next nav.
 */
export function ErrorPanel({ errors, envelopeLabel, onSelect }: ErrorPanelProps) {
  if (errors.length === 0) return null;

  const errorCount = errors.filter((e) => severityKind(e) === 'error').length;
  const warnCount = errors.length - errorCount;

  return (
    <section className="ds-bv-errors" aria-label="Validation issues">
      <header className="ds-bv-errors__header">
        <span className="ds-bv-errors__icon" aria-hidden="true">⚠</span>
        <span className="ds-bv-errors__title">
          {errorCount > 0 && <>{errorCount} {errorCount === 1 ? 'Error' : 'Errors'}</>}
          {errorCount > 0 && warnCount > 0 && <> · </>}
          {warnCount > 0 && <>{warnCount} {warnCount === 1 ? 'Warning' : 'Warnings'}</>}
        </span>
        {envelopeLabel && (
          <span className="ds-bv-errors__envelope">{envelopeLabel}</span>
        )}
      </header>

      <div className="ds-bv-errors__list">
        {errors.map((err, i) => {
          const kind = severityKind(err);
          return (
            <button
              key={i}
              type="button"
              className={`ds-bv-errcard ds-bv-errcard--${kind}`}
              onClick={() => onSelect?.(i)}
              aria-label={`${kind} on ${err.segmentId}: ${err.message}`}
            >
              <div className="ds-bv-errcard__head">
                <span className={`ds-bv-errcard__sev ds-bv-errcard__sev--${kind}`}>
                  {kind === 'error' ? 'ERROR' : 'WARNING'}
                </span>
                <span className="ds-bv-errcard__seg">{err.segmentId}</span>
              </div>
              <div className="ds-bv-errcard__msg">{err.message}</div>
              <div className="ds-bv-errcard__pos">Line {err.line}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
