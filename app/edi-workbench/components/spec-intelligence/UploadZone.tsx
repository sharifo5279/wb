'use client';

import { useRef, useState, useCallback } from 'react';
import type React from 'react';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface UploadZoneProps {
  /** Called once the user selects or drops a valid PDF file. */
  onFileAccepted: (file: File) => void;
}

/**
 * UploadZone — empty state for the Spec Intelligence tab.
 *
 * Renders a full-bleed centred card with:
 *  - Drag-and-drop area (highlights on dragover)
 *  - Hidden file input triggered by clicking the card or button
 *  - Client-side validation: PDF only, ≤ 10 MB
 *  - Inline error message for invalid files
 */
export function UploadZone({ onFileAccepted }: UploadZoneProps) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging]   = useState(false);
  const [errorMsg,   setErrorMsg]     = useState<string | null>(null);

  const validateAndAccept = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (file.type !== 'application/pdf') {
        setErrorMsg('Only PDF files are accepted. Please upload an EDI implementation guide in PDF format.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setErrorMsg('File exceeds the 10 MB size limit. Please upload a smaller file.');
        return;
      }
      setErrorMsg(null);
      onFileAccepted(file);
    },
    [onFileAccepted],
  );

  // ── Input change (click-to-open) ────────────────────────────────────────────
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    validateAndAccept(e.target.files?.[0]);
    // Reset so the same file can be picked again if needed
    e.target.value = '';
  }

  // ── Drag-and-drop ───────────────────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    // Only clear when leaving the zone itself, not when entering a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    validateAndAccept(e.dataTransfer.files[0]);
  }

  return (
    <div className="si-upload-outer">
      <div
        className={[
          'si-upload-zone',
          isDragging ? 'si-upload-zone--dragover' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="button"
        tabIndex={0}
        aria-label="Upload implementation guide PDF — click or drag and drop"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          hidden
          aria-hidden="true"
          onChange={handleInputChange}
        />

        {/* Icon */}
        <span
          className="si-upload-zone__icon"
          aria-hidden="true"
          style={icon('book-open')}
        />

        {/* Heading */}
        <p className="si-upload-zone__heading">
          Upload Implementation Guide
        </p>

        {/* Subtext */}
        <p className="si-upload-zone__sub">
          Drag and drop your trading partner's EDI implementation guide PDF here,
          or click to browse. Claude will extract segment requirements, business
          rules, and code lists automatically.
        </p>

        {/* Constraints */}
        <p className="si-upload-zone__constraints">
          PDF format · Max 10 MB
        </p>

        {/* CTA button (non-interactive — parent div handles clicks) */}
        <span className="si-upload-zone__btn" aria-hidden="true">
          <span
            className="si-upload-zone__btn-icon"
            style={icon('upload')}
          />
          Choose PDF
        </span>

        {/* Inline validation error */}
        {errorMsg && (
          <p className="si-upload-zone__error" role="alert">
            <span
              className="si-upload-zone__error-icon"
              aria-hidden="true"
              style={icon('alert-circle')}
            />
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
