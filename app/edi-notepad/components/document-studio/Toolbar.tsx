'use client';

import { useRef, useState } from 'react';
import type React from 'react';
import type { DocumentStandard } from './DocumentStudio';
import { ThemeToggle } from './ThemeToggle';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

/** Maximum accepted file size: 1 MB */
const MAX_FILE_BYTES = 1024 * 1024;

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

export type ToolAction =
  | 'new' | 'increment' | 'summary' | 'ack' | 'split' | 'print'
  | 'copy' | 'download' | 'back-to-editor';

interface ToolbarProps {
  standard: DocumentStandard;
  hasValidDocument: boolean;
  hasContent: boolean;
  inBusinessOrHexView: boolean;
  onFileLoad: (text: string) => void;
  onConvert: (format: 'json' | 'xml') => void;
  onClear: () => void;
  onTool: (action: ToolAction) => void;
}

/** Read the system clipboard. Resolves to the text content or null on permission/empty. */
async function readClipboard(): Promise<string | null> {
  try {
    if (!navigator.clipboard?.readText) return null;
    const text = await navigator.clipboard.readText();
    return text || null;
  } catch {
    return null;
  }
}

/**
 * Toolbar — top strip of EDI Notepad 2026.
 *
 *   [Upload]  [Standard badge?]  |  [Convert ▾]  [Clear]
 */
export function Toolbar({
  standard,
  hasValidDocument,
  hasContent,
  inBusinessOrHexView,
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

  async function handlePasteClick() {
    setUploadError(null);
    const text = await readClipboard();
    if (text === null) {
      setUploadError(
        'Clipboard is empty or your browser blocked the read. Tip: click in the editor and press Ctrl+V (or ⌘V) instead.',
      );
      return;
    }
    if (text.length > MAX_FILE_BYTES) {
      const mb = (text.length / MAX_FILE_BYTES).toFixed(1);
      setUploadError(`Clipboard content too large (${mb} MB). Maximum size is 1 MB.`);
      return;
    }
    onFileLoad(text);
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

      <div className="ds-toolbar__group">

        <button
          type="button"
          className="ds-toolbar__btn"
          onClick={handlePasteClick}
          aria-label="Paste EDI from clipboard"
          title="Paste EDI from clipboard (or use Ctrl+V in the editor)"
        >
          <span className="ds-toolbar__icon" aria-hidden="true" style={icon('clipboard')} />
          Paste
        </button>

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
          onClick={() => onTool('copy')}
          disabled={!hasContent}
          aria-label="Copy raw EDI to clipboard"
          title="Copy raw EDI to clipboard"
        >
          <span className="ds-toolbar__icon" aria-hidden="true" style={icon('copy')} />
          Copy
        </button>

        <button
          type="button"
          className="ds-toolbar__btn"
          onClick={() => onTool('download')}
          disabled={!hasContent}
          aria-label="Download as .edi"
          title="Download raw EDI as a file"
        >
          <span className="ds-toolbar__icon" aria-hidden="true" style={icon('download')} />
          Download
        </button>

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

        {inBusinessOrHexView && (
          <button
            type="button"
            className="ds-toolbar__btn"
            onClick={() => onTool('back-to-editor')}
            aria-label="Back to raw editor"
            title="Switch back to the Raw editor view"
          >
            <span className="ds-toolbar__icon" aria-hidden="true" style={icon('arrow-left')} />
            Back to Editor
          </button>
        )}

        <span className="ds-toolbar__sep" role="separator" aria-orientation="vertical" />

        {/* Classic utilities — surfaced as a single dropdown to keep the toolbar compact */}
        <button
          type="button"
          className="ds-toolbar__btn"
          onClick={() => onTool('new')}
          aria-label="New EDI Document"
          title="Build a new EDI skeleton from the dictionary"
        >
          <span className="ds-toolbar__icon" aria-hidden="true" style={icon('file-plus')} />
          New
        </button>

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

      <div aria-hidden="true" style={{ flex: 1 }} />

      <div className="ds-toolbar__group">
        <ThemeToggle />
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
