import type { TxnBlock } from './BusinessView';
import { formatDate, formatAmount, collectN1Loops, renderParty } from './helpers';

interface InvoiceLine {
  line: string;
  qty: string;
  uom: string;
  unitPrice: string;
  productQual: string;
  productId: string;
  description: string;
}

export function renderX12_810(block: TxnBlock) {
  const segs = block.segments;
  const big = segs.find((s) => s.id === 'BIG');
  const tds = segs.find((s) => s.id === 'TDS');
  const txi = segs.filter((s) => s.id === 'TXI');
  const cur = segs.find((s) => s.id === 'CUR');

  const invoiceDate = big?.elements[0]?.trim() ?? '';
  const invoiceNumber = big?.elements[1]?.trim() ?? '';
  const poDate = big?.elements[2]?.trim() ?? '';
  const poNumber = big?.elements[3]?.trim() ?? '';

  const parties = collectN1Loops(segs);
  const items: InvoiceLine[] = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.id === 'IT1') {
      items.push({
        line: s.elements[0]?.trim() ?? '',
        qty: s.elements[1]?.trim() ?? '',
        uom: s.elements[2]?.trim() ?? '',
        unitPrice: s.elements[3]?.trim() ?? '',
        productQual: s.elements[5]?.trim() ?? '',
        productId: s.elements[6]?.trim() ?? '',
        description: '',
      });
    } else if (s.id === 'PID' && items.length > 0) {
      const desc = s.elements[4]?.trim() ?? '';
      const last = items[items.length - 1];
      last.description = last.description ? `${last.description} ${desc}` : desc;
    }
  }

  // TDS01 is a 2-decimal implied amount: divide by 100 to display.
  function tdsAmount(): string {
    const raw = tds?.elements[0]?.trim();
    if (!raw) return '—';
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return raw;
    return formatAmount((n / 100).toString());
  }

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <h1 className="ds-bv-doc__title">Invoice</h1>
          <div className="ds-bv-doc__subtitle">
            X12 810 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">Invoice #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{invoiceNumber || '—'}</span></div>
          <div><span className="ds-bv-meta-label">Date</span><span className="ds-bv-meta-value">{formatDate(invoiceDate)}</span></div>
          {poNumber && <div><span className="ds-bv-meta-label">PO #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{poNumber}</span></div>}
          {poDate && <div><span className="ds-bv-meta-label">PO Date</span><span className="ds-bv-meta-value">{formatDate(poDate)}</span></div>}
          {cur && <div><span className="ds-bv-meta-label">Currency</span><span className="ds-bv-meta-value">{cur.elements[1]?.trim()}</span></div>}
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
                  <td className="ds-bv-mono">{it.productQual && <span className="ds-bv-pill">{it.productQual}</span>} {it.productId}</td>
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

      {(tds || txi.length > 0) && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Totals</h2>
          <div className="ds-bv-kv-grid">
            {tds && (
              <div className="ds-bv-kv ds-bv-kv--total">
                <span className="ds-bv-kv__key">Invoice Total</span>
                <span className="ds-bv-kv__value">{tdsAmount()}</span>
              </div>
            )}
            {txi.map((t, i) => (
              <div key={i} className="ds-bv-kv">
                <span className="ds-bv-kv__key">Tax {t.elements[0]?.trim()}</span>
                <span className="ds-bv-kv__value">{formatAmount(t.elements[1]?.trim())}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="ds-bv-doc__footer">
        <span>Interchange ctrl: <span className="ds-bv-mono">{block.context.interchangeControl ?? '—'}</span></span>
        <span>Set ctrl: <span className="ds-bv-mono">{block.context.transactionControl ?? '—'}</span></span>
      </footer>
    </>
  );
}
