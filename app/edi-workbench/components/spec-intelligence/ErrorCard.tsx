'use client';

import type React from 'react';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

interface ErrorCardProps {
  /** Human-readable error message from the API or client. */
  message: string;
  /** Called to reset to the empty state so the user can try a new file. */
  onReupload: () => void;
}

/**
 * ErrorCard — shown when spec extraction fails.
 *
 * Provides:
 *  - Alert icon + "Extraction failed" heading
 *  - Specific error message
 *  - "Upload different file" button to restart
 */
export function ErrorCard({ message, onReupload }: ErrorCardProps) {
  return (
    <div className="si-error-outer">
      <div className="si-error-card">
        {/* Alert icon */}
        <span
          className="si-error-card__icon"
          aria-hidden="true"
          style={icon('alert-triangle')}
        />

        {/* Heading */}
        <h2 className="si-error-card__heading">Extraction failed</h2>

        {/* Error message */}
        <p className="si-error-card__message">{message}</p>

        {/* Actions */}
        <div className="si-error-card__actions">
          <button
            type="button"
            className="si-error-card__btn si-error-card__btn--primary"
            onClick={onReupload}
            aria-label="Upload a different PDF file"
          >
            <span
              className="si-error-card__btn-icon"
              aria-hidden="true"
              style={icon('upload')}
            />
            Upload different file
          </button>
        </div>
      </div>
    </div>
  );
}
