'use client';

import { useState, useCallback, useRef } from 'react';
import type React from 'react';
import type { SpecExtraction, SpecItem } from '@/src/lib/edi/spec-types';
import { ItemList } from './ItemList';
import { ItemDetail } from './ItemDetail';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

interface ResultsViewProps {
  /** The fully extracted specification. */
  extraction: SpecExtraction;
  /** Original PDF filename (shown in the toolbar chip). */
  filename: string;
  /** Called when the user clicks "Re-upload" to start over. */
  onReupload: () => void;
}

/**
 * ResultsView — shown after a successful spec extraction.
 *
 * Layout:
 *  ┌─────────────────────────────────────────────────┐
 *  │ Toolbar: [filename chip] [Re-upload] · [Copy] [Download] │
 *  ├──────────────────┬──────────────────────────────┤
 *  │   ItemList (30%) │   ItemDetail (70%)           │
 *  └──────────────────┴──────────────────────────────┘
 */
export function ResultsView({ extraction, filename, onReupload }: ResultsViewProps) {
  // Select the first item by default
  const [selectedItem, setSelectedItem] = useState<SpecItem | null>(
    extraction.items[0] ?? null,
  );
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Copy JSON ──────────────────────────────────────────────────────────────
  const handleCopyJSON = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(extraction, null, 2));
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }, [extraction]);

  // ── Download JSON ──────────────────────────────────────────────────────────
  const handleDownloadJSON = useCallback(() => {
    const json   = JSON.stringify(extraction, null, 2);
    const blob   = new Blob([json], { type: 'application/json' });
    const url    = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href     = url;
    anchor.download  = filename.replace(/\.pdf$/i, '') + '-extraction.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [extraction, filename]);

  return (
    <div className="si-results">
      {/* ── Toolbar ── */}
      <div className="si-results-toolbar" role="toolbar" aria-label="Spec Intelligence toolbar">
        {/* Filename chip */}
        <span className="si-results-toolbar__chip">
          <span
            className="si-results-toolbar__chip-icon"
            aria-hidden="true"
            style={icon('file-text')}
          />
          {filename}
        </span>

        {/* Standard badge */}
        {extraction.standard && extraction.standard !== 'Unknown' && (
          <span className="si-results-toolbar__badge">
            {extraction.standard}
          </span>
        )}

        {/* Item count */}
        <span className="si-results-toolbar__count">
          {extraction.items.length} item{extraction.items.length !== 1 ? 's' : ''} extracted
        </span>

        {/* Spacer */}
        <span className="si-results-toolbar__spacer" />

        {/* Re-upload */}
        <button
          type="button"
          className="si-results-toolbar__btn"
          onClick={onReupload}
          aria-label="Upload a different implementation guide"
          title="Upload different file"
        >
          <span
            className="si-results-toolbar__btn-icon"
            aria-hidden="true"
            style={icon('upload')}
          />
          Re-upload
        </button>

        {/* Copy JSON */}
        <button
          type="button"
          className={['si-results-toolbar__btn', copied ? 'si-results-toolbar__btn--success' : ''].filter(Boolean).join(' ')}
          onClick={handleCopyJSON}
          aria-label={copied ? 'Copied to clipboard' : 'Copy extraction as JSON'}
          title="Copy JSON"
        >
          <span
            className="si-results-toolbar__btn-icon"
            aria-hidden="true"
            style={icon(copied ? 'check' : 'copy')}
          />
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>

        {/* Download JSON */}
        <button
          type="button"
          className="si-results-toolbar__btn"
          onClick={handleDownloadJSON}
          aria-label="Download extraction as JSON file"
          title="Download JSON"
        >
          <span
            className="si-results-toolbar__btn-icon"
            aria-hidden="true"
            style={icon('download')}
          />
          Download
        </button>
      </div>

      {/* ── Two-panel body ── */}
      <div className="si-results-body">
        {/* Left: Item list (30%) */}
        <ItemList
          items={extraction.items}
          selectedId={selectedItem?.id ?? null}
          onSelect={setSelectedItem}
        />

        {/* Right: Item detail (70%) */}
        <ItemDetail item={selectedItem} />
      </div>
    </div>
  );
}
