'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSkeleton } from '@/src/lib/edi/builder';
import { listTransactions, type Standard } from '@/src/lib/edi/dictionaries';

interface NewDocumentModalProps {
  open: boolean;
  /** Called with the generated skeleton text. The caller decides whether to replace
      the active doc or open a new tab; this modal only produces text. */
  onCreate: (text: string, title: string) => void;
  onClose: () => void;
}

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

const STANDARDS: { code: Standard; label: string; defaultVersion: string }[] = [
  { code: 'X12',       label: 'ANSI X12',       defaultVersion: '005010' },
  { code: 'EDIFACT',   label: 'UN/EDIFACT',     defaultVersion: 'D01B'   },
  { code: 'TRADACOMS', label: 'TRADACOMS',      defaultVersion: 'ANA001' },
];

/**
 * NewDocumentModal — wizard for "New Document". Pick a standard / version /
 * transaction, optionally override the sender + receiver, and generate a
 * parseable skeleton. The caller is responsible for loading the result into
 * the active tab (or a new one).
 */
export function NewDocumentModal({ open, onCreate, onClose }: NewDocumentModalProps) {
  const [standard, setStandard] = useState<Standard>('X12');
  const [version,  setVersion]  = useState<string>('005010');
  const [code,     setCode]     = useState<string>('');
  const [sender,   setSender]   = useState<string>('SENDER');
  const [receiver, setReceiver] = useState<string>('RECEIVER');
  const [error,    setError]    = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Refresh available transactions when the standard changes
  const transactions = useMemo(
    () => listTransactions(standard).filter((t) => t.full),
    [standard],
  );

  useEffect(() => {
    // Pick the first available code when the standard changes
    if (transactions.length > 0 && !transactions.some((t) => t.code === code)) {
      setCode(transactions[0].code);
    }
    // Reset version to the standard's default
    const def = STANDARDS.find((s) => s.code === standard);
    if (def) setVersion(def.defaultVersion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standard]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleCreate() {
    setError(null);
    if (!code) {
      setError('Pick a transaction set');
      return;
    }
    try {
      const result = buildSkeleton(standard, version, code, {
        senderId: sender,
        receiverId: receiver,
      });
      onCreate(result.text, `${standard} ${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build skeleton');
    }
  }

  return (
    <div
      className="cm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="New EDI Document"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cm-modal cm-modal--new">
        <header className="cm-modal__header">
          <h2 className="cm-modal__title">New EDI Document</h2>
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

        <div className="cm-modal__body nd-body">
          <p className="nd-intro">
            Generate a parseable skeleton from the curated dictionary. The required
            envelope is filled in for you; element values inside the body remain
            blank for you to populate.
          </p>

          <div className="nd-row">
            <label className="nd-label" htmlFor="nd-std">Standard</label>
            <select
              id="nd-std"
              className="nd-select"
              value={standard}
              onChange={(e) => setStandard(e.target.value as Standard)}
            >
              {STANDARDS.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="nd-row">
            <label className="nd-label" htmlFor="nd-ver">Version</label>
            <input
              id="nd-ver"
              className="nd-input"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="nd-row">
            <label className="nd-label" htmlFor="nd-code">Transaction</label>
            <select
              id="nd-code"
              className="nd-select"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            >
              {transactions.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="nd-row">
            <label className="nd-label" htmlFor="nd-sender">Sender ID</label>
            <input
              id="nd-sender"
              className="nd-input"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="nd-row">
            <label className="nd-label" htmlFor="nd-recv">Receiver ID</label>
            <input
              id="nd-recv"
              className="nd-input"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              spellCheck={false}
            />
          </div>

          {error && <div className="nd-error">{error}</div>}
        </div>

        <footer className="cm-modal__footer">
          <button type="button" className="cm-btn cm-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="cm-btn cm-btn--primary" onClick={handleCreate}>
            Create skeleton
          </button>
        </footer>
      </div>
    </div>
  );
}
