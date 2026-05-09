import type { TxnBlock } from './BusinessView';
import {
  formatDate,
  formatAmount,
  collectN1Loops,
  renderParty,
  statusPillFor,
} from './helpers';
import { ErrorPanel } from './ErrorPanel';

const HANDLING_LABEL: Record<string, string> = {
  C: 'Credit',
  D: 'Debit',
  I: 'Information Only',
  P: 'Prenotification',
  X: 'Cancel',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  ACH: 'ACH (Automated Clearing House)',
  BOP: 'Financial Institution Option',
  CHK: 'Check',
  FWT: 'Federal Wire',
  NON: 'Non-Payment',
  ZZZ: 'Mutually Defined',
};

/**
 * X12 820 — Payment Order / Remittance Advice.
 *
 * BPR is the header (handling, amount, credit/debit, method, dates, account).
 * TRN is the trace (TRN02 is the bank/originator trace number).
 * RMR are remittance advice line items (one row per invoice paid).
 * ADX rows are adjustments against an RMR.
 */
export function renderX12_820(block: TxnBlock) {
  const segs = block.segments;
  const bpr = segs.find((s) => s.id === 'BPR');
  const trn = segs.find((s) => s.id === 'TRN');
  const cur = segs.find((s) => s.id === 'CUR');
  const dtms = segs.filter((s) => s.id === 'DTM');
  const refs = segs.filter((s) => s.id === 'REF');

  const handling = bpr?.elements[0]?.trim() ?? '';
  const totalAmount = bpr?.elements[1]?.trim() ?? '';
  const creditDebit = bpr?.elements[2]?.trim() ?? '';
  const paymentMethod = bpr?.elements[3]?.trim() ?? '';
  // BPR16 = effective entry date
  const effectiveDate = bpr?.elements[15]?.trim() ?? '';

  const traceNum = trn?.elements[1]?.trim() ?? '';

  const parties = collectN1Loops(segs);

  // RMR + adjacent ADXs
  interface Remittance {
    refQual: string;
    refId: string;
    paymentAction?: string;
    amount: string;
    adjustments: { amount: string; reason: string }[];
  }
  const remittances: Remittance[] = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.id === 'RMR') {
      remittances.push({
        refQual: s.elements[0]?.trim() ?? '',
        refId: s.elements[1]?.trim() ?? '',
        paymentAction: s.elements[2]?.trim(),
        amount: s.elements[3]?.trim() ?? '',
        adjustments: [],
      });
    } else if (s.id === 'ADX' && remittances.length > 0) {
      remittances[remittances.length - 1].adjustments.push({
        amount: s.elements[0]?.trim() ?? '',
        reason: s.elements[1]?.trim() ?? '',
      });
    }
  }

  const status = statusPillFor('820', segs);
  const handlingLabel = HANDLING_LABEL[handling] ?? handling;
  const methodLabel = PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod;

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Payment / Remittance</h1>
            {status && (
              <span className={`ds-bv-status ds-bv-status--${status.tone}`}>
                <span className="ds-bv-status__glyph" aria-hidden="true">{status.glyph}</span>
                {status.label}
              </span>
            )}
          </div>
          <div className="ds-bv-doc__subtitle">
            X12 820 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">Total</span><span className="ds-bv-meta-value">{formatAmount(totalAmount)}{cur ? ` ${cur.elements[1]?.trim()}` : ''}</span></div>
          <div><span className="ds-bv-meta-label">Method</span><span className="ds-bv-meta-value">{methodLabel || '—'}</span></div>
          <div><span className="ds-bv-meta-label">Handling</span><span className="ds-bv-meta-value">{handlingLabel || '—'}</span></div>
          {creditDebit && <div><span className="ds-bv-meta-label">Direction</span><span className="ds-bv-meta-value">{creditDebit === 'C' ? 'Credit' : creditDebit === 'D' ? 'Debit' : creditDebit}</span></div>}
          {effectiveDate && <div><span className="ds-bv-meta-label">Effective</span><span className="ds-bv-meta-value">{formatDate(effectiveDate)}</span></div>}
          {traceNum && <div><span className="ds-bv-meta-label">Trace #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{traceNum}</span></div>}
        </div>
      </header>

      {block.showErrors !== false && block.errors.length > 0 && (
        <ErrorPanel errors={block.errors} onSelect={block.onErrorClick} />
      )}

      {parties.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Trading Partners</h2>
          <div className="ds-bv-parties">{parties.map((p, i) => renderParty(p, i))}</div>
        </section>
      )}

      {(refs.length > 0 || dtms.length > 0) && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">References &amp; Dates</h2>
          <div className="ds-bv-kv-grid">
            {refs.map((r, i) => (
              <div key={`ref-${i}`} className="ds-bv-kv">
                <span className="ds-bv-kv__key">{r.elements[0]?.trim()}</span>
                <span className="ds-bv-kv__value">{r.elements[1]?.trim()}</span>
              </div>
            ))}
            {dtms.map((d, i) => (
              <div key={`dtm-${i}`} className="ds-bv-kv">
                <span className="ds-bv-kv__key">{d.elements[0]?.trim()}</span>
                <span className="ds-bv-kv__value">{formatDate(d.elements[1]?.trim())}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {remittances.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Remittance Detail</h2>
          <table className="ds-bv-lineitems">
            <thead>
              <tr>
                <th>Invoice / Ref</th>
                <th>Action</th>
                <th className="ds-bv-num">Paid</th>
                <th>Adjustments</th>
              </tr>
            </thead>
            <tbody>
              {remittances.map((r, i) => (
                <tr key={i}>
                  <td className="ds-bv-mono">
                    {r.refQual && <span className="ds-bv-pill">{r.refQual}</span>}{' '}
                    {r.refId}
                  </td>
                  <td>{r.paymentAction || '—'}</td>
                  <td className="ds-bv-num">{formatAmount(r.amount)}</td>
                  <td>
                    {r.adjustments.length === 0 ? '—' : r.adjustments.map((a, j) => (
                      <div key={j} className="ds-bv-mono" style={{ fontSize: 11 }}>
                        {a.reason}: {formatAmount(a.amount)}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="ds-bv-doc__footer">
        <span>Interchange ctrl: <span className="ds-bv-mono">{block.context.interchangeControl ?? '—'}</span></span>
        <span>Set ctrl: <span className="ds-bv-mono">{block.context.transactionControl ?? '—'}</span></span>
      </footer>
    </>
  );
}
