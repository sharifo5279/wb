import type { TxnBlock } from './BusinessView';
import {
  formatDate,
  collectN1Loops,
  renderParty,
  statusPillFor,
} from './helpers';
import { ErrorPanel } from './ErrorPanel';

interface ShipLine {
  qty: string;
  uom: string;
  status: string;
  productQual: string;
  productId: string;
  description: string;
}

/**
 * X12 940 — Warehouse Shipping Order. Header is W05 (depositor's order
 * number); LX groups bound the line-item zone with W12 carrying ordered
 * quantities. Sister doc to 945 (advice) which adds a "Shipped" qty.
 */
export function renderX12_940(block: TxnBlock) {
  const segs = block.segments;
  const w05 = segs.find((s) => s.id === 'W05');
  const w66 = segs.find((s) => s.id === 'W66');
  const w27 = segs.find((s) => s.id === 'W27');
  const w76 = segs.find((s) => s.id === 'W76');
  const refs = segs.filter((s) => s.id === 'REF');
  const dtms = segs.filter((s) => s.id === 'DTM');
  const reportingCode = w05?.elements[0]?.trim() ?? '';
  const orderNumber = w05?.elements[1]?.trim() ?? '';
  const shipMethod = w66?.elements[0]?.trim() ?? '';
  const carrierMode = w27?.elements[0]?.trim() ?? '';
  const carrierCode = w27?.elements[1]?.trim() ?? '';
  const totalUnits = w76?.elements[0]?.trim();

  const parties = collectN1Loops(segs);

  const items: ShipLine[] = [];
  let lastLin: { qual?: string; id?: string; desc?: string } = {};
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.id === 'LIN' || s.id === 'LIN1' || s.id === 'N9') {
      // We treat the most recent LIN as the product context for upcoming W12s.
      lastLin = {
        qual: s.elements[1]?.trim(),
        id: s.elements[2]?.trim(),
      };
    } else if (s.id === 'PID') {
      lastLin.desc = s.elements[4]?.trim();
    } else if (s.id === 'W12') {
      items.push({
        status: s.elements[0]?.trim() ?? '',
        qty: s.elements[1]?.trim() ?? '',
        uom: s.elements[3]?.trim() ?? '',
        productQual: lastLin.qual ?? '',
        productId: lastLin.id ?? '',
        description: lastLin.desc ?? '',
      });
    }
  }

  const status = statusPillFor('940', segs);

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Warehouse Shipping Order</h1>
            {status && (
              <span className={`ds-bv-status ds-bv-status--${status.tone}`}>
                <span className="ds-bv-status__glyph" aria-hidden="true">{status.glyph}</span>
                {status.label}
              </span>
            )}
          </div>
          <div className="ds-bv-doc__subtitle">
            X12 940 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">Order #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{orderNumber || '—'}</span></div>
          {reportingCode && <div><span className="ds-bv-meta-label">Reporting</span><span className="ds-bv-meta-value">{reportingCode}</span></div>}
          {shipMethod && <div><span className="ds-bv-meta-label">Ship Method</span><span className="ds-bv-meta-value">{shipMethod}</span></div>}
          {(carrierMode || carrierCode) && <div><span className="ds-bv-meta-label">Carrier</span><span className="ds-bv-meta-value">{[carrierMode, carrierCode].filter(Boolean).join(' · ')}</span></div>}
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

      {items.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Line Items</h2>
          <table className="ds-bv-lineitems">
            <thead>
              <tr>
                <th>Status</th>
                <th>Product</th>
                <th>Description</th>
                <th className="ds-bv-num">Qty</th>
                <th>UOM</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.status}</td>
                  <td className="ds-bv-mono">
                    {it.productQual && <span className="ds-bv-pill">{it.productQual}</span>}{' '}
                    {it.productId}
                  </td>
                  <td>{it.description || '—'}</td>
                  <td className="ds-bv-num">{it.qty || '—'}</td>
                  <td>{it.uom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="ds-bv-doc__footer">
        {totalUnits && <span>Total units: <strong>{totalUnits}</strong></span>}
        <span>Interchange ctrl: <span className="ds-bv-mono">{block.context.interchangeControl ?? '—'}</span></span>
        <span>Set ctrl: <span className="ds-bv-mono">{block.context.transactionControl ?? '—'}</span></span>
      </footer>
    </>
  );
}
