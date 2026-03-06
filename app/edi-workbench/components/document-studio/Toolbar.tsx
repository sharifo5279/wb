'use client';

import { useRef, useState } from 'react';
import type React from 'react';
import type { DocumentStandard } from './DocumentStudio';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

/** Maximum accepted file size: 1 MB */
const MAX_FILE_BYTES = 1024 * 1024;

/** Helper to build the mask-image CSS custom property inline. */
function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ToolbarProps {
  standard: DocumentStandard;
  hasValidDocument: boolean;
  aiPanelOpen: boolean;
  /** Task 6 — called with the file's text content once validation passes. */
  onFileLoad: (text: string) => void;
  onConvert: (format: 'json' | 'xml') => void;
  onClear: () => void;
  onToggleAI: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Toolbar — top strip of Document Studio.
 *
 * Left-to-right layout:
 *   [Upload]  [Standard badge?]  |  [Convert ▾]  [Clear]  ···spacer···  [Aviator AI]
 *
 * Task 6 additions:
 *   • Hidden <input type="file"> triggered by the Upload button via a ref.
 *   • Accepted extensions: .edi, .txt, .x12, .dat
 *   • Files > 1 MB are rejected; an error banner appears below the toolbar.
 *   • Valid files are read with FileReader.readAsText and forwarded via onFileLoad.
 *   • Error banner has a dismiss button; clears automatically on the next upload attempt.
 */
export function Toolbar({
  standard,
  hasValidDocument,
  aiPanelOpen,
  onFileLoad,
  onConvert,
  onClear,
  onToggleAI,
}: ToolbarProps) {
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── File upload handlers ────────────────────────────────────────────────────

  function handleUploadClick() {
    setUploadError(null);          // dismiss any previous error on new attempt
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // ── Size validation ─────────────────────────────────────────────────────
    if (file.size > MAX_FILE_BYTES) {
      const mb = (file.size / MAX_FILE_BYTES).toFixed(1);
      setUploadError(`File too large (${mb} MB). Maximum size is 1 MB.`);
      e.target.value = ''; // reset so the same file triggers onChange again
      return;
    }

    // ── Read as text ────────────────────────────────────────────────────────
    setUploadError(null);
    const reader = new FileReader();

    reader.onload = () => {
      onFileLoad(reader.result as string);
      e.target.value = ''; // allow the same file to be re-uploaded later
    };

    reader.onerror = () => {
      setUploadError('Could not read the file. Please try again.');
      e.target.value = '';
    };

    reader.readAsText(file);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="ds-toolbar" role="toolbar" aria-label="Document Studio toolbar">

      {/* Hidden file input — triggered programmatically by Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".edi,.txt,.x12,.dat"
        className="ds-toolbar__file-input"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* ── Left group: Upload · badge · separator · Convert · Clear ── */}
      <div className="ds-toolbar__group">

        {/* Upload */}
        <button
          type="button"
          className="ds-toolbar__btn"
          onClick={handleUploadClick}
          aria-label="Upload EDI file"
        >
          <span className="ds-toolbar__icon" aria-hidden="true" style={icon('upload')} />
          Upload
        </button>

        {/* Standard badge — only visible when a document has been detected */}
        {standard !== null && (
          <span
            className={`ds-toolbar__badge ds-toolbar__badge--${standard.toLowerCase()}`}
            aria-label={`Detected standard: ${standard}`}
            title={`Detected EDI standard: ${standard}`}
          >
            {standard}
          </span>
        )}

        <span className="ds-toolbar__sep" role="separator" aria-orientation="vertical" />

        {/* Convert dropdown */}
        <select
          className="ds-toolbar__select"
          disabled={!hasValidDocument}
          aria-label="Convert document to format"
          title={hasValidDocument ? 'Export as JSON or XML' : 'Load a valid document first'}
          value=""
          onChange={(e) => {
            const val = e.target.value as 'json' | 'xml';
            if (val) onConvert(val);
            e.target.value = '';
          }}
        >
          <option value="" disabled>Convert…</option>
          <option value="json">Export as JSON</option>
          <option value="xml">Export as XML</option>
        </select>

        {/* Clear */}
        <button
          type="button"
          className="ds-toolbar__btn"
          onClick={onClear}
          disabled={!hasValidDocument}
          aria-label="Clear document"
          title={hasValidDocument ? 'Clear current document' : 'No document to clear'}
        >
          <span className="ds-toolbar__icon" aria-hidden="true" style={icon('trash-2')} />
          Clear
        </button>
      </div>

      {/* ── Flex spacer — pushes AI toggle to right edge ── */}
      <div aria-hidden="true" style={{ flex: 1 }} />

      {/* ── Right group: Aviator AI panel toggle ── */}
      <div className="ds-toolbar__group">
        <button
          type="button"
          className={`ds-toolbar__btn${aiPanelOpen ? ' ds-toolbar__btn--active' : ''}`}
          onClick={onToggleAI}
          aria-pressed={aiPanelOpen}
          aria-label={aiPanelOpen ? 'Close Aviator AI panel' : 'Open Aviator AI panel'}
          title="Toggle Aviator AI panel"
        >
          <span className="ds-toolbar__icon" aria-hidden="true" style={icon('bot')} />
          Aviator AI
        </button>
      </div>

      {/* ── Upload error banner ─────────────────────────────────────────────────
          Absolutely positioned just below the toolbar so it doesn't affect layout.
          Uses role="alert" + aria-live="assertive" for screen reader announcement. */}
      {uploadError && (
        <div
          className="ds-toolbar__upload-error"
          role="alert"
          aria-live="assertive"
        >
          <span
            className="ds-toolbar__icon ds-toolbar__icon--sm"
            aria-hidden="true"
            style={icon('alert-circle')}
          />
          <span className="ds-toolbar__upload-error__msg">{uploadError}</span>
          <button
            type="button"
            className="ds-toolbar__error-dismiss"
            onClick={() => setUploadError(null)}
            aria-label="Dismiss upload error"
          >
            <span
              className="ds-toolbar__icon ds-toolbar__icon--sm"
              aria-hidden="true"
              style={icon('x')}
            />
          </button>
        </div>
      )}
    </div>
  );
}
