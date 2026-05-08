'use client';

import { useRef, useState } from 'react';
import type React from 'react';
import type { DocumentStandard } from './DocumentStudio';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

/** Maximum accepted file size: 1 MB */
const MAX_FILE_BYTES = 1024 * 1024;

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

export type ToolAction = 'increment' | 'summary' | 'ack' | 'split' | 'print';

interface ToolbarProps {
  standard: DocumentStandard;
  hasValidDocument: boolean;
  onFileLoad: (text: string) => void;
  onConvert: (format: 'json' | 'xml') => void;
  onClear: () => void;
  onTool: (action: ToolAction) => void;
}

/**
 * Toolbar — top strip of EDI Notepad 2026.
 *
 *   [Upload]  [Standard badge?]  |  [Convert ▾]  [Clear]
 */
export function Toolbar({
  standard,
  hasValidDocument,
  onFileLoad,
  onConvert,
  onClear,
  onTool,
}: ToolbarProps) {
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleUploadClick() {
    setUploadError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      const mb = (file.size / MAX_FILE_BYTES).toFixed(1);
      setUploadError(`File too large (${mb} MB). Maximum size is 1 MB.`);
      e.target.value = '';
      return;
    }

    setUploadError(null);
    const reader = new FileReader();

    reader.onload = () => {
      onFileLoad(reader.result as string);
      e.target.value = '';
    };

    reader.onerror = () => {
      setUploadError('Could not read the file. Please try again.');
      e.target.value = '';
    };

    reader.readAsText(file);
  }

  return (
    <div className="ds-toolbar" role="toolbar" aria-label="Notepad toolbar">

      <input
        ref={fileInputRef}
        type="file"
        accept=".edi,.txt,.x12,.dat"
        className="ds-toolbar__file-input"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      <span className="ds-toolbar__brand" aria-label="EDI Notepad 2026">
        <span className="ds-toolbar__brand-mark">EDI Notepad</span>
        <span className="ds-toolbar__brand-year">2026</span>
      </span>

      <span className="ds-toolbar__sep" role="separator" aria-orientation="vertical" />

      <div className="ds-toolbar__group">

        <button
          type="button"
          className="ds-toolbar__btn"
          onClick={handleUploadClick}
          aria-label="Upload EDI file"
        >
          <span className="ds-toolbar__icon" aria-hidden="true" style={icon('upload')} />
          Upload
        </button>

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

        <span className="ds-toolbar__sep" role="separator" aria-orientation="vertical" />

        {/* Classic utilities — surfaced as a single dropdown to keep the toolbar compact */}
        <select
          className="ds-toolbar__select"
          disabled={!hasValidDocument}
          aria-label="Tools"
          title={hasValidDocument ? 'Classic Notepad utilities' : 'Load a valid document first'}
          value=""
          onChange={(e) => {
            const v = e.target.value as ToolAction | '';
            if (v) onTool(v);
            e.target.value = '';
          }}
        >
          <option value="" disabled>Tools…</option>
          <option value="increment">Increment Control Numbers</option>
          <option value="summary">Summary Report</option>
          <option value="ack">Generate ACK</option>
          <option value="split">Split Interchanges</option>
          <option value="print">Print Business View</option>
        </select>
      </div>

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
