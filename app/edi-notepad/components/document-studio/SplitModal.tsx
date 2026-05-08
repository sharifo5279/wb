'use client';

import { useEffect, useMemo, useRef } from 'react';
import { splitInterchanges, type SplitInterchange } from '@/src/lib/edi/split-interchanges';

interface SplitModalProps {
  open: boolean;
  rawContent: string;
  onClose: () => void;
}

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

/**
 * SplitModal — preview and download single-interchange documents from a
 * batched EDI file. One row per ISA…IEA (or UNB…UNZ) found in the input.
 */
export function SplitModal({ open, rawContent, onClose }: SplitModalProps) {
  const interchanges: SplitInterchange[] = useMemo(
    () => (rawContent ? splitInterchanges(rawContent) : []),
    [rawContent],
  );
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function downloadOne(ich: SplitInterchange) {
    const blob = new Blob([ich.text], { type: 'application/edi-x12' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ich.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAll() {
    for (const ich of interchanges) downloadOne(ich);
  }

  return (
    <div
      className="cm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Split Interchanges"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cm-modal cm-modal--split">
        <header className="cm-modal__header">
          <h2 className="cm-modal__title">Split Interchanges</h2>
          <span className="am-overall">{interchanges.length} found</span>
          <button
            ref={closeBtnRef}
            type="button"
            className="cm-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="cm-modal__close-icon" style={{ '--icon-url': `url(${CDN}/x.svg)` } as React.CSSProperties} />
          </button>
        </header>

        <div className="cm-modal__body">
          {interchanges.length === 0 ? (
            <p className="am-error">No interchanges detected in the document.</p>
          ) : (
            <table className="am-statuses">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Control #</th>
                  <th>Filename</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {interchanges.map((ich) => (
                  <tr key={ich.index}>
                    <td>{ich.index}</td>
                    <td className="sm-mono">{ich.sender ?? '—'}</td>
                    <td className="sm-mono">{ich.receiver ?? '—'}</td>
                    <td className="sm-mono">{ich.controlNumber ?? '—'}</td>
                    <td className="sm-mono">{ich.filename}</td>
                    <td>
                      <button
                        type="button"
                        className="cm-btn cm-btn--ghost"
                        onClick={() => downloadOne(ich)}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {interchanges.length > 1 && (
          <footer className="cm-modal__footer">
            <button
              type="button"
              className="cm-btn cm-btn--primary"
              onClick={downloadAll}
            >
              Download all ({interchanges.length})
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
