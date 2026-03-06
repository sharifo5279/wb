'use client';

import { useEffect, useRef } from 'react';
import type React from 'react';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

interface LoadingCardProps {
  /** Name of the PDF file being processed. */
  filename: string;
  /**
   * Ordered list of completed status log lines.
   * Lines still being streamed appear as the last item if not yet newline-terminated.
   * All earlier items are treated as completed (show a check icon).
   */
  statusLog: string[];
  /** Called when the user clicks Cancel. */
  onCancel: () => void;
}

/**
 * LoadingCard — shown while Claude streams the spec extraction.
 *
 * Layout:
 *  - Header: filename chip
 *  - Scrollable status log with check (done) / animated dot (pending) icons
 *  - Cancel button
 */
export function LoadingCard({ filename, statusLog, onCancel }: LoadingCardProps) {
  const logEndRef = useRef<HTMLLIElement>(null);

  // Auto-scroll to the bottom of the log as new lines arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [statusLog]);

  return (
    <div className="si-loading-outer">
      <div className="si-loading-card">
        {/* ── Header ── */}
        <div className="si-loading-card__header">
          <span
            className="si-loading-card__header-icon"
            aria-hidden="true"
            style={icon('file-text')}
          />
          <span className="si-loading-card__filename">{filename}</span>
        </div>

        {/* ── Progress label ── */}
        <p className="si-loading-card__label">
          Analyzing implementation guide with Claude AI…
        </p>

        {/* ── Status log ── */}
        <ul
          className="si-loading-card__log"
          aria-label="Extraction progress"
          aria-live="polite"
          aria-atomic="false"
        >
          {statusLog.length === 0 ? (
            <li className="si-log-item">
              <span className="si-log-item__icon si-log-item__icon--pending" aria-hidden="true" />
              <span>Connecting to Claude…</span>
            </li>
          ) : (
            statusLog.map((line, idx) => {
              const isLast = idx === statusLog.length - 1;
              return (
                <li
                  key={idx}
                  className={['si-log-item', isLast ? '' : 'si-log-item--done'].filter(Boolean).join(' ')}
                  ref={isLast ? logEndRef : null}
                >
                  <span
                    className={[
                      'si-log-item__icon',
                      isLast ? 'si-log-item__icon--pending' : 'si-log-item__icon--check',
                    ].join(' ')}
                    aria-hidden="true"
                    style={isLast ? undefined : icon('check')}
                  />
                  <span>{line}</span>
                </li>
              );
            })
          )}
        </ul>

        {/* ── Cancel ── */}
        <button
          className="si-loading-card__cancel"
          type="button"
          onClick={onCancel}
          aria-label="Cancel extraction"
        >
          <span
            className="si-loading-card__cancel-icon"
            aria-hidden="true"
            style={icon('x')}
          />
          Cancel
        </button>
      </div>
    </div>
  );
}
