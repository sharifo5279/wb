'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ParseResult } from '@/src/lib/edi/types';
import {
  generateAck,
  type AckOptions,
  type AckResult,
  type AckStatus,
  type AckVariant,
} from '@/src/lib/edi/ack-generator';

interface AckModalProps {
  open: boolean;
  parseResult: ParseResult | null;
  onClose: () => void;
}

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

const STATUS_LABEL: Record<AckStatus, string> = {
  A: 'Accepted',
  E: 'Accepted with Errors',
  R: 'Rejected',
  P: 'Partially Accepted',
};

function variantsFor(standard: ParseResult['standard'] | null | undefined): AckVariant[] {
  if (standard === 'X12') return ['997', '999'];
  if (standard === 'EDIFACT') return ['CONTRL'];
  if (standard === 'TRADACOMS') return ['ACKHDR'];
  return [];
}

function todayCcyymmdd(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}
function nowHhmm(): string {
  const d = new Date();
  return `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/**
 * AckModal — preview a generated 997 / 999 / CONTRL / ACKHDR with full
 * manual control over variant, sender / receiver, control number, date /
 * time, per-set status, and overall status. Live-updates the preview as
 * the user changes any field. Reset returns to the parser-derived defaults.
 */
export function AckModal({ open, parseResult, onClose }: AckModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const variants = useMemo(() => variantsFor(parseResult?.standard), [parseResult]);
  const defaultVariant = variants[0];

  // ── Override state — null = use parser-derived default ─────────────────
  const [variant,    setVariant]    = useState<AckVariant | null>(null);
  const [sender,     setSender]     = useState<string>('');
  const [receiver,   setReceiver]   = useState<string>('');
  const [controlNum, setControlNum] = useState<string>('');
  const [date,       setDate]       = useState<string>('');
  const [time,       setTime]       = useState<string>('');
  const [setOverrides, setSetOverrides] = useState<Record<string, AckStatus>>({});
  const [overallOverride, setOverallOverride] = useState<AckStatus | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset whenever the source document changes
  useEffect(() => {
    setVariant(null);
    setSender(''); setReceiver(''); setControlNum(''); setDate(''); setTime('');
    setSetOverrides({});
    setOverallOverride(null);
  }, [parseResult]);

  const opts: AckOptions = useMemo(() => ({
    variant: variant ?? undefined,
    senderId: sender || undefined,
    receiverId: receiver || undefined,
    controlNumber: controlNum || undefined,
    date: date || undefined,
    time: time || undefined,
    setStatusOverrides: Object.keys(setOverrides).length > 0 ? setOverrides : undefined,
    overallStatusOverride: overallOverride ?? undefined,
  }), [variant, sender, receiver, controlNum, date, time, setOverrides, overallOverride]);

  const ack: AckResult | null = useMemo(() => {
    if (!parseResult) return null;
    try { return generateAck(parseResult, opts); } catch { return null; }
  }, [parseResult, opts]);

  const error: string | null = useMemo(() => {
    if (!parseResult) return 'Load a document first.';
    if (variants.length === 0) return `Standard "${parseResult.standard}" doesn't have an acknowledgment generator.`;
    if (!ack) {
      try { generateAck(parseResult, opts); return null; } catch (e) {
        return e instanceof Error ? e.message : 'Could not generate ACK';
      }
    }
    return null;
  }, [parseResult, variants, ack, opts]);

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
  function handleReset() {
    setVariant(null); setSender(''); setReceiver('');
    setControlNum(''); setDate(''); setTime('');
    setSetOverrides({}); setOverallOverride(null);
  }
  function handleSetStatusChange(control: string, value: string) {
    setSetOverrides((prev) => {
      const next = { ...prev };
      if (value === '_default') delete next[control];
      else next[control] = value as AckStatus;
      return next;
    });
  }

  const effectiveVariant = variant ?? defaultVariant;
  const effectiveSender = sender || (parseResult?.segments.find((s) => s.id === 'ISA')?.elements[7]?.trim()
    || parseResult?.segments.find((s) => s.id === 'UNB')?.elements[2]?.trim()
    || parseResult?.segments.find((s) => s.id === 'STX')?.elements[2]?.split(':')[0]?.trim()
    || '');
  const effectiveReceiver = receiver || (parseResult?.segments.find((s) => s.id === 'ISA')?.elements[5]?.trim()
    || parseResult?.segments.find((s) => s.id === 'UNB')?.elements[1]?.trim()
    || parseResult?.segments.find((s) => s.id === 'STX')?.elements[1]?.split(':')[0]?.trim()
    || '');

  return (
    <div
      className="cm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Functional Acknowledgment"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cm-modal cm-modal--ack">
        <header className="cm-modal__header">
          <h2 className="cm-modal__title">Generate Acknowledgment</h2>
          {ack && (
            <span className={`am-overall am-overall--${ack.overallStatus.toLowerCase()}`}>
              {ack.overallStatus} · {STATUS_LABEL[ack.overallStatus]}
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

          {variants.length > 0 && (
            <section className="am-section">
              <div className="am-section__head">
                <h3 className="am-section__title">Envelope</h3>
                <button type="button" className="am-reset" onClick={handleReset} title="Reset all overrides">
                  Reset
                </button>
              </div>
              <div className="am-grid">
                <label className="am-field">
                  <span>Variant</span>
                  <select
                    value={effectiveVariant ?? ''}
                    onChange={(e) => setVariant(e.target.value as AckVariant)}
                  >
                    {variants.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
                <label className="am-field">
                  <span>Sender</span>
                  <input
                    value={sender}
                    placeholder={effectiveSender || 'sender'}
                    onChange={(e) => setSender(e.target.value)}
                  />
                </label>
                <label className="am-field">
                  <span>Receiver</span>
                  <input
                    value={receiver}
                    placeholder={effectiveReceiver || 'receiver'}
                    onChange={(e) => setReceiver(e.target.value)}
                  />
                </label>
                <label className="am-field">
                  <span>Control #</span>
                  <input
                    value={controlNum}
                    placeholder={effectiveVariant === 'CONTRL' || effectiveVariant === 'ACKHDR' ? '1' : '000000001'}
                    onChange={(e) => setControlNum(e.target.value)}
                  />
                </label>
                <label className="am-field">
                  <span>Date (CCYYMMDD)</span>
                  <input
                    value={date}
                    placeholder={todayCcyymmdd()}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label className="am-field">
                  <span>Time (HHMM)</span>
                  <input
                    value={time}
                    placeholder={nowHhmm()}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
              </div>
            </section>
          )}

          {ack && ack.setStatuses.length > 0 && (
            <section className="am-section">
              <h3 className="am-section__title">Per-set status</h3>
              <table className="am-statuses">
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Control #</th>
                    <th>Default</th>
                    <th>Override</th>
                    <th className="sm-num">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {ack.setStatuses.map((s, i) => {
                    const overrideVal = setOverrides[s.control] ?? '_default';
                    return (
                      <tr key={i}>
                        <td className="sm-mono">{s.set}</td>
                        <td className="sm-mono">{s.control}</td>
                        <td>
                          <span className={`am-pill am-pill--${s.derivedStatus.toLowerCase()}`}>
                            {s.derivedStatus} · {STATUS_LABEL[s.derivedStatus]}
                          </span>
                        </td>
                        <td>
                          <select
                            value={overrideVal}
                            onChange={(e) => handleSetStatusChange(s.control, e.target.value)}
                            className="am-status-select"
                          >
                            <option value="_default">— derived —</option>
                            <option value="A">A · Accepted</option>
                            <option value="E">E · Accepted with Errors</option>
                            <option value="R">R · Rejected</option>
                            <option value="P">P · Partially Accepted</option>
                          </select>
                        </td>
                        <td className={`sm-num ${s.errorCount > 0 ? 'sm-num--error' : ''}`}>
                          {s.errorCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <label className="am-field am-field--inline">
                <span>Overall status override</span>
                <select
                  value={overallOverride ?? '_default'}
                  onChange={(e) => setOverallOverride(e.target.value === '_default' ? null : e.target.value as AckStatus)}
                >
                  <option value="_default">— derived —</option>
                  <option value="A">A · Accepted</option>
                  <option value="E">E · Accepted with Errors</option>
                  <option value="R">R · Rejected</option>
                  <option value="P">P · Partially Accepted</option>
                </select>
              </label>
            </section>
          )}

          {ack && (
            <section className="am-section">
              <h3 className="am-section__title">
                ACK preview <span className="am-filename">{ack.filename}</span>
              </h3>
              <pre className="am-pre">{ack.text}</pre>
            </section>
          )}
        </div>

        {ack && (
          <footer className="cm-modal__footer">
            <button type="button" className="cm-btn cm-btn--ghost" onClick={handleCopy} aria-label="Copy ACK">
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button type="button" className="cm-btn cm-btn--primary" onClick={handleDownload} aria-label="Download ACK">
              Download
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
