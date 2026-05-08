'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ParseResult } from '@/src/lib/edi/types';
import { generateAck, type AckResult } from '@/src/lib/edi/ack-generator';

interface AckModalProps {
  open: boolean;
  parseResult: ParseResult | null;
  onClose: () => void;
}

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

const STATUS_LABEL: Record<string, string> = {
  A: 'Accepted',
  E: 'Accepted with Errors',
  R: 'Rejected',
  P: 'Partially Accepted',
};

/**
 * AckModal — preview a generated 997 / CONTRL before downloading.
 *
 * Shows the per-set status pills, the overall status, and the raw ACK text.
 * Copy button puts the ACK on the clipboard; Download button saves it as a
 * file using the generator's suggested filename.
 */
export function AckModal({ open, parseResult, onClose }: AckModalProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const ack: AckResult | null = useMemo(() => {
    if (!parseResult) return null;
    try {
      setError(null);
      return generateAck(parseResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate ACK');
      return null;
    }
  }, [parseResult]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!open) return null;

  function handleCopy() {
    if (!ack) return;
    void navigator.clipboard.writeText(ack.text).then(() => setCopied(true));
  }

  function handleDownload() {
    if (!ack) return;
    const blob = new Blob([ack.text], { type: 'application/edi-x12' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ack.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="cm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Functional Acknowledgment Preview"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cm-modal cm-modal--ack">
        <header className="cm-modal__header">
          <h2 className="cm-modal__title">Generate Acknowledgment</h2>
          {ack && (
            <span className={`am-overall am-overall--${ack.overallStatus.toLowerCase()}`}>
              {ack.overallStatus} · {STATUS_LABEL[ack.overallStatus] ?? ack.overallStatus}
            </span>
          )}
          <button
            ref={closeBtnRef}
            type="button"
            className="cm-modal__close"
            onClick={onClose}
            aria-label="Close ACK preview"
          >
            <span className="cm-modal__close-icon" style={{ '--icon-url': `url(${CDN}/x.svg)` } as React.CSSProperties} />
          </button>
        </header>

        <div className="cm-modal__body am-body">
          {error && <div className="am-error">{error}</div>}

          {ack && (
            <>
              {ack.setStatuses.length > 0 && (
                <section className="am-section">
                  <h3 className="am-section__title">Per-set status</h3>
                  <table className="am-statuses">
                    <thead>
                      <tr>
                        <th>Set</th>
                        <th>Control #</th>
                        <th>Status</th>
                        <th className="sm-num">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ack.setStatuses.map((s, i) => (
                        <tr key={i}>
                          <td className="sm-mono">{s.set}</td>
                          <td className="sm-mono">{s.control}</td>
                          <td>
                            <span className={`am-pill am-pill--${s.status.toLowerCase()}`}>
                              {s.status} · {STATUS_LABEL[s.status]}
                            </span>
                          </td>
                          <td className={`sm-num ${s.errorCount > 0 ? 'sm-num--error' : ''}`}>
                            {s.errorCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              <section className="am-section">
                <h3 className="am-section__title">ACK preview <span className="am-filename">{ack.filename}</span></h3>
                <pre className="am-pre">{ack.text}</pre>
              </section>
            </>
          )}
        </div>

        {ack && (
          <footer className="cm-modal__footer">
            <button
              type="button"
              className="cm-btn cm-btn--ghost"
              onClick={handleCopy}
              aria-label="Copy ACK"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              className="cm-btn cm-btn--primary"
              onClick={handleDownload}
              aria-label="Download ACK"
            >
              Download
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
