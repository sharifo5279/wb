import type { TxnBlock } from './BusinessView';
import {
  formatDate,
  formatAmount,
  collectN1Loops,
  renderParty,
  bakAckLabel,
  purposeLabel,
  statusPillFor,
} from './helpers';
import { ErrorPanel } from './ErrorPanel';

interface AckLine {
  line: string;
  qty: string;
  uom: string;
  unitPrice: string;
  productQual: string;
  productId: string;
  description: string;
  ackStatus?: string;
  ackQty?: string;
}

const ACK_STATUS_LABEL: Record<string, string> = {
  IA: 'Item Accepted',
  IB: 'Item Backordered',
  IC: 'Item Accepted with Changes',
  IR: 'Item Rejected',
  IP: 'Item Partially Accepted',
  IS: 'Item Substituted',
  IQ: 'Item Quantity Acknowledged',
};

export function renderX12_855(block: TxnBlock) {
  const segs = block.segments;
  const bak = segs.find((s) => s.id === 'BAK');
  const purpose = bak?.elements[0]?.trim() ?? '';
  const ackType = bak?.elements[1]?.trim() ?? '';
  const poNumber = bak?.elements[2]?.trim() ?? '';
  const ackDate = bak?.elements[3]?.trim() ?? '';

  const refs = segs.filter((s) => s.id === 'REF');
  const dtms = segs.filter((s) => s.id === 'DTM');
  const cur = segs.find((s) => s.id === 'CUR');
  const ctt = segs.find((s) => s.id === 'CTT');

  const parties = collectN1Loops(segs);

  const items: AckLine[] = [];
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
    } else if (s.id === 'ACK' && items.length > 0) {
      const last = items[items.length - 1];
      last.ackStatus = s.elements[0]?.trim();
      last.ackQty = s.elements[1]?.trim();
    } else if (s.id === 'PID' && items.length > 0) {
      const desc = s.elements[4]?.trim() ?? '';
      const last = items[items.length - 1];
      last.description = last.description ? `${last.description} ${desc}` : desc;
    }
  }

  const totalLines = ctt?.elements[0]?.trim();
  const status = statusPillFor('855', segs);

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Purchase Order Acknowledgment</h1>
            {status && (
              <span className={`ds-bv-status ds-bv-status--${status.tone}`}>
                <span className="ds-bv-status__glyph" aria-hidden="true">{status.glyph}</span>
                {status.label}
              </span>
            )}
          </div>
          <div className="ds-bv-doc__subtitle">
            X12 855 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">PO #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{poNumber || '—'}</span></div>
          <div><span className="ds-bv-meta-label">Ack Date</span><span className="ds-bv-meta-value">{formatDate(ackDate)}</span></div>
          <div><span className="ds-bv-meta-label">Ack Type</span><span className="ds-bv-meta-value">{bakAckLabel(ackType)}</span></div>
          <div><span className="ds-bv-meta-label">Purpose</span><span className="ds-bv-meta-value">{purposeLabel(purpose)}</span></div>
          {cur && <div><span className="ds-bv-meta-label">Currency</span><span className="ds-bv-meta-value">{cur.elements[1]?.trim()}</span></div>}
        </div>
      </header>

      {block.errors.length > 0 && (
        <ErrorPanel errors={block.errors} onSelect={block.onErrorClick} />
      )}

      {refs.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Reference Identification</h2>
          <div className="ds-bv-kv-grid">
            {refs.map((r, i) => (
              <div key={i} className="ds-bv-kv">
                <span className="ds-bv-kv__key">{r.elements[0]?.trim()}</span>
                <span className="ds-bv-kv__value">{r.elements[1]?.trim()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {dtms.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Date / Time References</h2>
          <div className="ds-bv-kv-grid">
            {dtms.map((d, i) => (
              <div key={i} className="ds-bv-kv">
                <span className="ds-bv-kv__key">{d.elements[0]?.trim()}</span>
                <span className="ds-bv-kv__value">{formatDate(d.elements[1]?.trim())}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {parties.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Trading Partners</h2>
          <div className="ds-bv-parties">
            {parties.map((p, i) => renderParty(p, i))}
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
                <th>Ack</th>
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
                  <td>{it.ackStatus ? `${it.ackStatus} · ${ACK_STATUS_LABEL[it.ackStatus] ?? ''}` : '—'}</td>
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
