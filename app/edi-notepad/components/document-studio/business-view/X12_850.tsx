import type { TxnBlock } from './BusinessView';
import {
  formatDate,
  formatAmount,
  collectN1Loops,
  renderParty,
  poTypeLabel,
  purposeLabel,
} from './helpers';

interface LineItem {
  line: string;
  qty: string;
  uom: string;
  unitPrice: string;
  productQual: string;
  productId: string;
  description: string;
}

export function renderX12_850(block: TxnBlock) {
  const segs = block.segments;
  const beg = segs.find((s) => s.id === 'BEG');
  const ctt = segs.find((s) => s.id === 'CTT');
  const cur = segs.find((s) => s.id === 'CUR');
  const dtm = segs.filter((s) => s.id === 'DTM');
  const ref = segs.filter((s) => s.id === 'REF');

  const purpose = beg?.elements[0]?.trim() ?? '';
  const poType = beg?.elements[1]?.trim() ?? '';
  const poNumber = beg?.elements[2]?.trim() ?? '';
  const poDate = beg?.elements[4]?.trim() ?? '';

  const parties = collectN1Loops(segs);

  const items: LineItem[] = [];
  let currentDescription = '';
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
      currentDescription = '';
    } else if (s.id === 'PID' && items.length > 0) {
      const desc = s.elements[4]?.trim() ?? '';
      currentDescription = currentDescription ? `${currentDescription} ${desc}` : desc;
      items[items.length - 1].description = currentDescription;
    }
  }

  const totalLines = ctt?.elements[0]?.trim();
  const currency = cur?.elements[1]?.trim();

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <h1 className="ds-bv-doc__title">Purchase Order</h1>
          <div className="ds-bv-doc__subtitle">
            X12 850 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">PO #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{poNumber || '—'}</span></div>
          <div><span className="ds-bv-meta-label">Date</span><span className="ds-bv-meta-value">{formatDate(poDate)}</span></div>
          <div><span className="ds-bv-meta-label">Type</span><span className="ds-bv-meta-value">{poTypeLabel(poType)}</span></div>
          <div><span className="ds-bv-meta-label">Purpose</span><span className="ds-bv-meta-value">{purposeLabel(purpose)}</span></div>
          {currency && <div><span className="ds-bv-meta-label">Currency</span><span className="ds-bv-meta-value">{currency}</span></div>}
        </div>
      </header>

      {parties.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Parties</h2>
          <div className="ds-bv-parties">
            {parties.map((p, i) => renderParty(p, i))}
          </div>
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
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="ds-bv-doc__footer">
        {totalLines && <span>Total line items: <strong>{totalLines}</strong></span>}
        <span>Interchange ctrl: <span className="ds-bv-mono">{block.context.interchangeControl ?? '—'}</span></span>
        <span>Group ctrl: <span className="ds-bv-mono">{block.context.groupControl ?? '—'}</span></span>
        <span>Set ctrl: <span className="ds-bv-mono">{block.context.transactionControl ?? '—'}</span></span>
      </footer>
    </>
  );
}
