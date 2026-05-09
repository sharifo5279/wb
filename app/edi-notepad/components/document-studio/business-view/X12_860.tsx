import type { TxnBlock } from './BusinessView';
import {
  formatDate,
  formatAmount,
  collectN1Loops,
  renderParty,
  poTypeLabel,
  purposeLabel,
  statusPillFor,
} from './helpers';
import { ErrorPanel } from './ErrorPanel';

interface ChangeLine {
  line: string;
  qty: string;
  uom: string;
  unitPrice: string;
  productQual: string;
  productId: string;
  description: string;
  changeReason?: string;
}

const POC_REASON_LABEL: Record<string, string> = {
  AI: 'Item Added',
  CA: 'Cancelled',
  CH: 'Changed',
  IA: 'Item Added',
  NC: 'No Change',
  PC: 'Price Changed',
  QC: 'Quantity Changed',
  SC: 'Schedule Changed',
};

/**
 * X12 860 — Purchase Order Change Request.
 *
 * Mirrors the 850 layout with a Change-Order header (BCH) and a per-line
 * Change column populated from POC segments. Renderer is intentionally
 * close to X12_850 so the two read identically when comparing originals.
 */
export function renderX12_860(block: TxnBlock) {
  const segs = block.segments;
  const bch = segs.find((s) => s.id === 'BCH');
  const ctt = segs.find((s) => s.id === 'CTT');
  const cur = segs.find((s) => s.id === 'CUR');
  const dtm = segs.filter((s) => s.id === 'DTM');
  const ref = segs.filter((s) => s.id === 'REF');

  const purpose = bch?.elements[0]?.trim() ?? '';
  const poType = bch?.elements[1]?.trim() ?? '';
  const poNumber = bch?.elements[2]?.trim() ?? '';
  const changeSeq = bch?.elements[4]?.trim() ?? '';
  const changeDate = bch?.elements[5]?.trim() ?? '';

  const parties = collectN1Loops(segs);

  const items: ChangeLine[] = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.id === 'PO1') {
      items.push({
        line: s.elements[0]?.trim() ?? '',
        qty: s.elements[1]?.trim() ?? '',
        uom: s.elements[2]?.trim() ?? '',
        unitPrice: s.elements[3]?.trim() ?? '',
        productQual: s.elements[5]?.trim() ?? '',
        productId: s.elements[6]?.trim() ?? '',
        description: '',
      });
    } else if (s.id === 'POC' && items.length > 0) {
      // POC04 = Change Reason. Some IGs put it at index 3 (POC04 = position 4).
      items[items.length - 1].changeReason = s.elements[3]?.trim();
    } else if (s.id === 'PID' && items.length > 0) {
      const desc = s.elements[4]?.trim() ?? '';
      const last = items[items.length - 1];
      last.description = last.description ? `${last.description} ${desc}` : desc;
    }
  }

  const totalLines = ctt?.elements[0]?.trim();
  const status = statusPillFor('860', segs);

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Purchase Order Change</h1>
            {status && (
              <span className={`ds-bv-status ds-bv-status--${status.tone}`}>
                <span className="ds-bv-status__glyph" aria-hidden="true">{status.glyph}</span>
                {status.label}
              </span>
            )}
          </div>
          <div className="ds-bv-doc__subtitle">
            X12 860 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">PO #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{poNumber || '—'}</span></div>
          <div><span className="ds-bv-meta-label">Change Seq</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{changeSeq || '—'}</span></div>
          <div><span className="ds-bv-meta-label">Change Date</span><span className="ds-bv-meta-value">{formatDate(changeDate)}</span></div>
          <div><span className="ds-bv-meta-label">Type</span><span className="ds-bv-meta-value">{poTypeLabel(poType)}</span></div>
          <div><span className="ds-bv-meta-label">Purpose</span><span className="ds-bv-meta-value">{purposeLabel(purpose)}</span></div>
          {cur && <div><span className="ds-bv-meta-label">Currency</span><span className="ds-bv-meta-value">{cur.elements[1]?.trim()}</span></div>}
        </div>
      </header>

      {block.showErrors !== false && block.errors.length > 0 && (
        <ErrorPanel errors={block.errors} onSelect={block.onErrorClick} />
      )}

      {parties.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Parties</h2>
          <div className="ds-bv-parties">{parties.map((p, i) => renderParty(p, i))}</div>
        </section>
      )}

      {(ref.length > 0 || dtm.length > 0) && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">References &amp; Dates</h2>
          <div className="ds-bv-kv-grid">
            {ref.map((r, i) => (
              <div key={`ref-${i}`} className="ds-bv-kv">
                <span className="ds-bv-kv__key">{r.elements[0]?.trim()}</span>
                <span className="ds-bv-kv__value">{r.elements[1]?.trim()}</span>
              </div>
            ))}
            {dtm.map((d, i) => (
              <div key={`dtm-${i}`} className="ds-bv-kv">
                <span className="ds-bv-kv__key">{d.elements[0]?.trim()}</span>
                <span className="ds-bv-kv__value">{formatDate(d.elements[1]?.trim())}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Line Items</h2>
          <table className="ds-bv-lineitems">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Description</th>
                <th className="ds-bv-num">Qty</th>
                <th>UOM</th>
                <th className="ds-bv-num">Unit Price</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.line || (i + 1).toString()}</td>
                  <td className="ds-bv-mono">
                    {it.productQual && <span className="ds-bv-pill">{it.productQual}</span>}{' '}
                    {it.productId}
                  </td>
                  <td>{it.description || '—'}</td>
                  <td className="ds-bv-num">{it.qty || '—'}</td>
                  <td>{it.uom}</td>
                  <td className="ds-bv-num">{formatAmount(it.unitPrice)}</td>
                  <td>{it.changeReason ? `${it.changeReason} · ${POC_REASON_LABEL[it.changeReason] ?? ''}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="ds-bv-doc__footer">
        {totalLines && <span>Total line items: <strong>{totalLines}</strong></span>}
        <span>Interchange ctrl: <span className="ds-bv-mono">{block.context.interchangeControl ?? '—'}</span></span>
        <span>Set ctrl: <span className="ds-bv-mono">{block.context.transactionControl ?? '—'}</span></span>
      </footer>
    </>
  );
}
