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
  parsePia,
  bgmFunctionLabel,
} from './edifact-helpers';
import { ErrorPanel } from './ErrorPanel';

interface OrderLine {
  lineNum: string;
  itemCode: string;
  itemQual: string;
  description: string;
  qty: string;
  uom: string;
  price: string;
  altCodes: { qual: string; code: string }[];
}

/**
 * EDIFACT ORDERS — Purchase Order. EDIFACT counterpart to X12 850.
 * Header: BGM (doc name + number + function). Reference info from RFF +
 * DTM at the top level. Parties from NAD. Line items from LIN with
 * trailing IMD/QTY/PRI/PIA segments grouped to the most recent LIN.
 */
export function renderEdifact_ORDERS(block: TxnBlock) {
  const segs = block.segments;
  const bgm = segs.find((s) => s.id === 'BGM');
  const docNumber = bgm?.elements[1]?.trim() ?? '';
  const docName = splitComposite(bgm?.elements[0])[0] ?? '';
  const messageFunction = bgm?.elements[2]?.trim() ?? '';

  const dtms = segs.filter((s) => s.id === 'DTM');
  const rffs = segs.filter((s) => s.id === 'RFF');
  const cux = segs.find((s) => s.id === 'CUX');
  const currency = splitComposite(cux?.elements[0])[1] ?? '';

  const parties = collectNADs(segs);

  const items: OrderLine[] = [];
  let current: OrderLine | undefined;
  for (const s of segs) {
    if (s.id === 'LIN') {
      const itemComposite = splitComposite(s.elements[2]);
      current = {
        lineNum: s.elements[0]?.trim() ?? '',
        itemCode: itemComposite[0] ?? '',
        itemQual: itemComposite[1] ?? '',
        description: '',
        qty: '',
        uom: '',
        price: '',
        altCodes: [],
      };
      items.push(current);
    } else if (current) {
      if (s.id === 'IMD') {
        // IMD element 3 is the description text; element 4 is also possible.
        const desc = splitComposite(s.elements[2])[3] ?? s.elements[2]?.split(':').slice(3).join(' ').trim() ?? '';
        const fallback = s.elements[2]?.trim() ?? '';
        current.description = current.description
          ? `${current.description} ${desc || fallback}`
          : (desc || fallback);
      } else if (s.id === 'QTY') {
        const q = parseQty(s.elements[0]);
        // Default qty is qualifier 21 (ordered) or 47 (invoiced)
        if (!current.qty || q.qual === '21') {
          current.qty = q.value;
          current.uom = q.uom;
        }
      } else if (s.id === 'PRI') {
        const p = splitComposite(s.elements[0]);
        // PRI element 1 = "qual:value:price-type:..."
        if (!current.price) current.price = p[1] ?? '';
      } else if (s.id === 'PIA') {
        const p = parsePia(s.elements[1]);
        if (p.code) current.altCodes.push({ qual: p.qual, code: p.code });
      }
    }
  }

  const status = statusPillFor('ORDERS', segs);

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Purchase Order</h1>
            {status && (
              <span className={`ds-bv-status ds-bv-status--${status.tone}`}>
                <span className="ds-bv-status__glyph" aria-hidden="true">{status.glyph}</span>
                {status.label}
              </span>
            )}
          </div>
          <div className="ds-bv-doc__subtitle">
            EDIFACT ORDERS · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · UNB ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">Order #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{docNumber || '—'}</span></div>
          {docName && <div><span className="ds-bv-meta-label">Doc Name</span><span className="ds-bv-meta-value">{docName}</span></div>}
          {messageFunction && <div><span className="ds-bv-meta-label">Function</span><span className="ds-bv-meta-value">{bgmFunctionLabel(messageFunction)}</span></div>}
          {currency && <div><span className="ds-bv-meta-label">Currency</span><span className="ds-bv-meta-value">{currency}</span></div>}
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
                <th className="ds-bv-num">Price</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="ds-bv-doc__footer">
        <span>Interchange ctrl: <span className="ds-bv-mono">{block.context.interchangeControl ?? '—'}</span></span>
        <span>Message ctrl: <span className="ds-bv-mono">{block.context.transactionControl ?? '—'}</span></span>
      </footer>
    </>
  );
}
