import type { TxnBlock } from './BusinessView';
import {
  formatDate,
  collectN1Loops,
  renderParty,
  statusPillFor,
} from './helpers';
import { ErrorPanel } from './ErrorPanel';

const REPORT_TYPE_LABEL: Record<string, string> = {
  AC: 'Active',
  AS: 'Stock Status',
  IN: 'Inventory',
  IO: 'Inventory On Order',
  OH: 'On Hand',
  PA: 'Promised Available',
  QA: 'Quantity Available',
  TI: 'Transferred In',
  TO: 'Transferred Out',
  UN: 'Unavailable',
};

const QTY_QUAL_LABEL: Record<string, string> = {
  '17': 'Quantity On Hand',
  '33': 'Quantity Available',
  '37': 'Quantity Allocated',
  '38': 'Quantity Backordered',
  '39': 'Quantity Damaged',
  '70': 'Quantity Inspected',
  '76': 'Quantity Pending',
  '83': 'Quantity Received',
  '90': 'Quantity Returned',
  '99': 'Quantity Reserved',
  CB: 'Cumulative Quantity Begin',
  CL: 'Closing Inventory',
  KO: 'Quantity OK',
  OO: 'Quantity On Order',
  QA: 'Quantity Available',
  QC: 'Quantity Committed',
  QP: 'Quantity Promised',
  QR: 'Quantity Required',
};

interface InventoryItem {
  productQual: string;
  productId: string;
  description: string;
  quantities: { qual: string; value: string }[];
}

/**
 * X12 846 — Inventory Inquiry / Advice. BIA header carries purpose +
 * report type + as-of date. Each LIN starts an item; QTY segments
 * carry one or more inventory positions per item.
 */
export function renderX12_846(block: TxnBlock) {
  const segs = block.segments;
  const bia = segs.find((s) => s.id === 'BIA');
  const reportType = bia?.elements[1]?.trim() ?? '';
  const reference = bia?.elements[2]?.trim() ?? '';
  const asOfDate = bia?.elements[3]?.trim() ?? '';
  const dtms = segs.filter((s) => s.id === 'DTM');
  const refs = segs.filter((s) => s.id === 'REF');

  const parties = collectN1Loops(segs);

  const items: InventoryItem[] = [];
  let current: InventoryItem | undefined;
  for (const s of segs) {
    if (s.id === 'LIN') {
      current = {
        productQual: s.elements[1]?.trim() ?? '',
        productId: s.elements[2]?.trim() ?? '',
        description: '',
        quantities: [],
      };
      items.push(current);
    } else if (current) {
      if (s.id === 'PID') {
        const desc = s.elements[4]?.trim() ?? '';
        current.description = current.description ? `${current.description} ${desc}` : desc;
      } else if (s.id === 'QTY') {
        current.quantities.push({
          qual: s.elements[0]?.trim() ?? '',
          value: s.elements[1]?.trim() ?? '',
        });
      }
    }
  }

  // Collect every distinct qty qualifier across items so the header maps to columns.
  const qualOrder: string[] = [];
  for (const it of items) {
    for (const q of it.quantities) {
      if (!qualOrder.includes(q.qual)) qualOrder.push(q.qual);
    }
  }

  const status = statusPillFor('846', segs);

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Inventory Inquiry / Advice</h1>
            {status && (
              <span className={`ds-bv-status ds-bv-status--${status.tone}`}>
                <span className="ds-bv-status__glyph" aria-hidden="true">{status.glyph}</span>
                {status.label}
              </span>
            )}
          </div>
          <div className="ds-bv-doc__subtitle">
            X12 846 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">Report Type</span><span className="ds-bv-meta-value">{REPORT_TYPE_LABEL[reportType] ?? reportType ?? '—'}</span></div>
          <div><span className="ds-bv-meta-label">As Of</span><span className="ds-bv-meta-value">{formatDate(asOfDate)}</span></div>
          {reference && <div><span className="ds-bv-meta-label">Reference</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{reference}</span></div>}
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
          <h2 className="ds-bv-section__title">Inventory Positions</h2>
          <table className="ds-bv-lineitems">
            <thead>
              <tr>
                <th>Product</th>
                <th>Description</th>
                {qualOrder.map((q) => (
                  <th key={q} className="ds-bv-num" title={QTY_QUAL_LABEL[q] ?? q}>
                    {QTY_QUAL_LABEL[q] ?? q}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="ds-bv-mono">
                    {it.productQual && <span className="ds-bv-pill">{it.productQual}</span>}{' '}
                    {it.productId}
                  </td>
                  <td>{it.description || '—'}</td>
                  {qualOrder.map((q) => {
                    const found = it.quantities.find((qq) => qq.qual === q);
                    return <td key={q} className="ds-bv-num">{found ? found.value : '—'}</td>;
                  })}
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
