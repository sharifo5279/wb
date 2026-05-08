'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { ParseResult } from '@/src/lib/edi/types';
import { buildSummary } from '@/src/lib/edi/summary';

interface SummaryModalProps {
  open: boolean;
  parseResult: ParseResult | null;
  onClose: () => void;
}

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

/**
 * SummaryModal — interchange / group / transaction summary at a glance.
 *
 * Drives off `buildSummary(parseResult)`. Shown as an overlay so it can be
 * opened from the Tools dropdown without disturbing the editor state.
 */
export function SummaryModal({ open, parseResult, onClose }: SummaryModalProps) {
  const summary = useMemo(
    () => (parseResult ? buildSummary(parseResult) : null),
    [parseResult],
  );
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !summary) return null;

  const totalSets = summary.interchanges
    .flatMap((i) => i.groups)
    .reduce((n, g) => n + g.transactions.length, 0);

  return (
    <div
      className="cm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Interchange Summary Report"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cm-modal cm-modal--summary">
        <header className="cm-modal__header">
          <h2 className="cm-modal__title">Summary Report</h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="cm-modal__close"
            onClick={onClose}
            aria-label="Close summary"
          >
            <span className="cm-modal__close-icon" style={{ '--icon-url': `url(${CDN}/x.svg)` } as React.CSSProperties} />
          </button>
        </header>

        <div className="cm-modal__body sm-body">
          <section className="sm-section">
            <h3 className="sm-section__title">Document</h3>
            <div className="sm-kv-grid">
              <Kv k="Standard" v={summary.standard} />
              <Kv k="Total segments" v={summary.totalSegments.toString()} />
              <Kv k="Errors" v={summary.errorCount.toString()} tone={summary.errorCount > 0 ? 'error' : 'ok'} />
              <Kv k="Warnings" v={summary.warningCount.toString()} tone={summary.warningCount > 0 ? 'warn' : 'ok'} />
              <Kv k="Interchanges" v={summary.interchanges.length.toString()} />
              <Kv k="Transactions" v={totalSets.toString()} />
            </div>
          </section>

          {summary.interchanges.map((ich, ii) => (
            <section key={ii} className="sm-section">
              <h3 className="sm-section__title">Interchange {ii + 1}</h3>
              <div className="sm-kv-grid">
                <Kv k="Sender" v={ich.sender || '—'} mono />
                <Kv k="Receiver" v={ich.receiver || '—'} mono />
                <Kv k="Control #" v={ich.controlNumber || '—'} mono />
                <Kv k="Date" v={ich.date || '—'} />
              </div>

              {ich.groups.map((grp, gi) => (
                <div key={gi} className="sm-group">
                  <div className="sm-group__header">
                    <span className="sm-group__label">Group</span>
                    <span className="sm-mono">{grp.functionalCode}</span>
                    <span className="sm-group__sep">·</span>
                    <span className="sm-mono">{grp.sender}</span>
                    <span className="sm-arrow">→</span>
                    <span className="sm-mono">{grp.receiver}</span>
                    <span className="sm-group__sep">·</span>
                    <span className="sm-group__ctrl">Ctrl <span className="sm-mono">{grp.controlNumber}</span></span>
                  </div>
                  <table className="sm-txn-table">
                    <thead>
                      <tr>
                        <th>Set</th>
                        <th>Control #</th>
                        <th className="sm-num">Segments</th>
                        <th className="sm-num">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grp.transactions.map((t, ti) => (
                        <tr key={ti}>
                          <td className="sm-mono">{t.setCode}</td>
                          <td className="sm-mono">{t.controlNumber}</td>
                          <td className="sm-num">{t.segmentCount}</td>
                          <td className={`sm-num ${t.errorCount > 0 ? 'sm-num--error' : ''}`}>{t.errorCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          ))}

          <section className="sm-section">
            <h3 className="sm-section__title">Segment counts</h3>
            <div className="sm-counts">
              {summary.segmentCounts.map((c) => (
                <div key={c.id} className="sm-count-pill">
                  <span className="sm-mono">{c.id}</span>
                  <span className="sm-count-pill__n">{c.count}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Kv({ k, v, tone, mono }: { k: string; v: string; tone?: 'ok' | 'warn' | 'error'; mono?: boolean }) {
  return (
    <div className={`sm-kv${tone ? ' sm-kv--' + tone : ''}`}>
      <span className="sm-kv__k">{k}</span>
      <span className={`sm-kv__v ${mono ? 'sm-mono' : ''}`}>{v}</span>
    </div>
  );
}
