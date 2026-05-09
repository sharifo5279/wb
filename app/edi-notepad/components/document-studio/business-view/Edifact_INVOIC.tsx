import type { TxnBlock } from './BusinessView';
import { formatAmount, statusPillFor } from './helpers';
import {
  splitComposite,
  formatEdifactDtm,
  dtmQualifierLabel,
  collectNADs,
  renderNADParty,
  parseQty,
  parseMoa,
  bgmFunctionLabel,
} from './edifact-helpers';
import { ErrorPanel } from './ErrorPanel';

interface InvoiceLine {
  lineNum: string;
  itemCode: string;
  itemQual: string;
  description: string;
  qty: string;
  uom: string;
  price: string;
  lineAmount: string;
}

const MOA_QUAL_LABEL: Record<string, string> = {
  '9':   'Total Invoice',
  '79':  'Total Line Items',
  '124': 'Tax Amount',
  '125': 'Taxable Amount',
  '128': 'Total Tax',
  '131': 'Total Charges',
  '146': 'Unit Price',
  '203': 'Line Item Amount',
  '204': 'Allowance/Charge',
  '259': 'Total Charges/Allowances',
};

/**
 * EDIFACT INVOIC — Invoice. Counterpart to X12 810.
 * Header: BGM. Top-level MOA segments carry totals (qual 9 = invoice total).
 * Line items from LIN with adjacent MOA(qual 203) for line amount.
 */
export function renderEdifact_INVOIC(block: TxnBlock) {
  const segs = block.segments;
  const bgm = segs.find((s) => s.id === 'BGM');
  const docNumber = bgm?.elements[1]?.trim() ?? '';
  const messageFunction = bgm?.elements[2]?.trim() ?? '';

  const dtms = segs.filter((s) => s.id === 'DTM');
  const rffs = segs.filter((s) => s.id === 'RFF');
  const cux = segs.find((s) => s.id === 'CUX');
  const currency = splitComposite(cux?.elements[0])[1] ?? '';

  const parties = collectNADs(segs);

  // Top-level MOAs (before any LIN) capture totals.
  const totals: { qual: string; value: string }[] = [];
  let inLineSection = false;
  for (const s of segs) {
    if (s.id === 'LIN') { inLineSection = true; continue; }
    if (s.id === 'UNS') { inLineSection = false; continue; } // section separator
    if (s.id === 'MOA' && !inLineSection) {
      const m = parseMoa(s.elements[0]);
      totals.push({ qual: m.qual, value: m.value });
    }
  }

  // Re-walk for line items (parse them in order).
  const items: InvoiceLine[] = [];
  let current: InvoiceLine | undefined;
  let inLines = false;
  for (const s of segs) {
    if (s.id === 'LIN') {
      inLines = true;
      const itemComposite = splitComposite(s.elements[2]);
      current = {
        lineNum: s.elements[0]?.trim() ?? '',
        itemCode: itemComposite[0] ?? '',
        itemQual: itemComposite[1] ?? '',
        description: '',
        qty: '',
        uom: '',
        price: '',
        lineAmount: '',
      };
      items.push(current);
    } else if (s.id === 'UNS') {
      inLines = false;
      current = undefined;
    } else if (current && inLines) {
      if (s.id === 'IMD') {
        const desc = splitComposite(s.elements[2])[3] ?? '';
        const fallback = s.elements[2]?.trim() ?? '';
        current.description = current.description ? `${current.description} ${desc || fallback}` : (desc || fallback);
      } else if (s.id === 'QTY') {
        const q = parseQty(s.elements[0]);
        if (!current.qty || q.qual === '47') {
          current.qty = q.value;
          current.uom = q.uom;
        }
      } else if (s.id === 'PRI') {
        const p = splitComposite(s.elements[0]);
        if (!current.price) current.price = p[1] ?? '';
      } else if (s.id === 'MOA') {
        const m = parseMoa(s.elements[0]);
        if (m.qual === '203') current.lineAmount = m.value;
      }
    }
  }

  const totalAmount = totals.find((t) => t.qual === '9')?.value;
  const status = statusPillFor('INVOIC', segs);

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Invoice</h1>
            {status && (
              <span className={`ds-bv-status ds-bv-status--${status.tone}`}>
                <span className="ds-bv-status__glyph" aria-hidden="true">{status.glyph}</span>
                {status.label}
              </span>
            )}
          </div>
          <div className="ds-bv-doc__subtitle">
            EDIFACT INVOIC · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · UNB ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">Invoice #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{docNumber || '—'}</span></div>
          {messageFunction && <div><span className="ds-bv-meta-label">Function</span><span className="ds-bv-meta-value">{bgmFunctionLabel(messageFunction)}</span></div>}
          {currency && <div><span className="ds-bv-meta-label">Currency</span><span className="ds-bv-meta-value">{currency}</span></div>}
          {totalAmount && <div><span className="ds-bv-meta-label">Total</span><span className="ds-bv-meta-value">{formatAmount(totalAmount)}</span></div>}
        </div>
      </header>

      {block.showErrors !== false && block.errors.length > 0 && (
        <ErrorPanel errors={block.errors} onSelect={block.onErrorClick} />
      )}

      {(rffs.length > 0 || dtms.length > 0) && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">References &amp; Dates</h2>
          <div className="ds-bv-kv-grid">
            {rffs.map((r, i) => {
              const c = splitComposite(r.elements[0]);
              return (
                <div key={`rff-${i}`} className="ds-bv-kv">
                  <span className="ds-bv-kv__key">{c[0]}</span>
                  <span className="ds-bv-kv__value">{c[1]}</span>
                </div>
              );
            })}
            {dtms.map((d, i) => {
              const f = formatEdifactDtm(d.elements[0]);
              return (
                <div key={`dtm-${i}`} className="ds-bv-kv">
                  <span className="ds-bv-kv__key">{dtmQualifierLabel(f.qual)}</span>
                  <span className="ds-bv-kv__value">{f.display}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {parties.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Parties</h2>
          <div className="ds-bv-parties">{parties.map((p, i) => renderNADParty(p, i))}</div>
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
                <th className="ds-bv-num">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.lineNum || (i + 1).toString()}</td>
                  <td className="ds-bv-mono">
                    {it.itemQual && <span className="ds-bv-pill">{it.itemQual}</span>}{' '}
                    {it.itemCode}
                  </td>
                  <td>{it.description || '—'}</td>
                  <td className="ds-bv-num">{it.qty || '—'}</td>
                  <td>{it.uom}</td>
                  <td className="ds-bv-num">{formatAmount(it.price)}</td>
                  <td className="ds-bv-num">{formatAmount(it.lineAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {totals.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Totals</h2>
          <div className="ds-bv-kv-grid">
            {totals.map((t, i) => (
              <div key={i} className={`ds-bv-kv${t.qual === '9' ? ' ds-bv-kv--total' : ''}`}>
                <span className="ds-bv-kv__key">{MOA_QUAL_LABEL[t.qual] ?? `MOA ${t.qual}`}</span>
                <span className="ds-bv-kv__value">{formatAmount(t.value)}{currency ? ` ${currency}` : ''}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="ds-bv-doc__footer">
        <span>Interchange ctrl: <span className="ds-bv-mono">{block.context.interchangeControl ?? '—'}</span></span>
        <span>Message ctrl: <span className="ds-bv-mono">{block.context.transactionControl ?? '—'}</span></span>
      </footer>
    </>
  );
}
