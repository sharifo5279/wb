import type { TxnBlock } from './BusinessView';
import { formatDate, formatAmount, collectN1Loops, renderParty, statusPillFor } from './helpers';
import { ErrorPanel } from './ErrorPanel';

/** Parse a YYMMDD or CCYYMMDD into a Date, or null. */
function parseEdiDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  let yyyy: number, mm: number, dd: number;
  if (s.length === 8) {
    yyyy = parseInt(s.slice(0, 4), 10);
    mm = parseInt(s.slice(4, 6), 10);
    dd = parseInt(s.slice(6, 8), 10);
  } else if (s.length === 6) {
    const yy = parseInt(s.slice(0, 2), 10);
    yyyy = yy >= 50 ? 1900 + yy : 2000 + yy;
    mm = parseInt(s.slice(2, 4), 10);
    dd = parseInt(s.slice(4, 6), 10);
  } else return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

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
  const itd = segs.find((s) => s.id === 'ITD');
  const sac = segs.filter((s) => s.id === 'SAC');
  const refs = segs.filter((s) => s.id === 'REF');
  const dtms = segs.filter((s) => s.id === 'DTM');

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

  // ITD: payment terms. ITD03 = discount %, ITD05 = days for discount,
  // ITD07 = net days from invoice date, ITD13 = description.
  const itdDiscountPct = itd?.elements[2]?.trim() ?? '';
  const itdDiscountDays = itd?.elements[4]?.trim() ?? '';
  const itdNetDays = itd?.elements[6]?.trim() ?? '';
  const itdDesc = itd?.elements[12]?.trim() ?? '';

  // Find a DTM with qualifier 091 (Report Period End) or 003 (Invoice Due) for due date.
  const dueDtm = dtms.find((d) => ['091', '003', '009'].includes(d.elements[0]?.trim() ?? ''));
  const dueDate = dueDtm?.elements[1]?.trim();
  let pastDue = false;
  let daysToDue: number | null = null;
  const dueParsed = parseEdiDate(dueDate);
  if (dueParsed) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    daysToDue = Math.round((dueParsed.getTime() - today.getTime()) / 86_400_000);
    pastDue = daysToDue < 0;
  }

  // Compute early-pay amount if discount info + invoice total present.
  let earlyPayAmount: string | null = null;
  let earlyPayBy: string | null = null;
  if (itdDiscountPct && tds?.elements[0] && itdDiscountDays) {
    const total = parseFloat(tds.elements[0]);
    const pct = parseFloat(itdDiscountPct);
    const invDate = parseEdiDate(invoiceDate);
    if (!Number.isNaN(total) && !Number.isNaN(pct) && invDate) {
      const discounted = (total / 100) * (1 - pct / 100);
      earlyPayAmount = formatAmount(discounted.toString());
      const cutoff = new Date(invDate.getTime() + parseInt(itdDiscountDays, 10) * 86_400_000);
      earlyPayBy = `${cutoff.getUTCFullYear()}-${String(cutoff.getUTCMonth() + 1).padStart(2, '0')}-${String(cutoff.getUTCDate()).padStart(2, '0')}`;
    }
  }

  // Compute total allowance/charge from SAC segments.
  // SAC02 indicator code: A=Allowance, C=Charge. SAC05 = amount (cents implied).
  const sacRows = sac.map((s) => ({
    indicator: s.elements[0]?.trim() ?? '',
    code: s.elements[1]?.trim() ?? '',
    amountRaw: s.elements[4]?.trim() ?? '',
    description: s.elements[14]?.trim() ?? '',
  })).filter((r) => r.indicator || r.amountRaw);

  const baseStatus = statusPillFor('810', segs);
  const status = pastDue
    ? { label: 'Past Due', tone: 'error' as const, glyph: '✕' as const }
    : baseStatus;

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
            X12 810 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
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

      {block.showErrors !== false && block.errors.length > 0 && (
        <ErrorPanel errors={block.errors} onSelect={block.onErrorClick} />
      )}

      {(itd || dueDate) && (
        <section className="ds-bv-band ds-bv-band--terms" aria-label="Payment terms">
          <div className="ds-bv-band__row">
            <div className="ds-bv-band__label">Payment Terms</div>
            <div className="ds-bv-band__value">
              {itdDesc || (itdNetDays ? `Net ${itdNetDays}` : '—')}
              {itdDiscountPct && itdDiscountDays && (
                <span className="ds-bv-band__chip">{itdDiscountPct}% / {itdDiscountDays} days</span>
              )}
            </div>
            {dueDate && (
              <div className={`ds-bv-band__due${pastDue ? ' ds-bv-band__due--late' : ''}`}>
                Due {formatDate(dueDate)}
                {daysToDue !== null && (
                  <span className="ds-bv-band__days">{pastDue ? `${-daysToDue} days late` : `${daysToDue} days`}</span>
                )}
              </div>
            )}
          </div>
          {earlyPayAmount && earlyPayBy && (
            <div className="ds-bv-band__sub">
              If paid by <strong>{earlyPayBy}</strong>: {earlyPayAmount}
            </div>
          )}
        </section>
      )}

      {refs.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">References</h2>
          <div className="ds-bv-chiprow">
            {refs.map((r, i) => (
              <span key={i} className="ds-bv-chip">
                <span className="ds-bv-chip__key">{r.elements[0]?.trim()}</span>
                <span className="ds-bv-chip__val">{r.elements[1]?.trim()}</span>
              </span>
            ))}
          </div>
        </section>
      )}

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

      {(tds || txi.length > 0 || sacRows.length > 0) && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Totals</h2>
          <div className="ds-bv-kv-grid">
            {sacRows.map((r, i) => (
              <div key={`sac-${i}`} className="ds-bv-kv">
                <span className="ds-bv-kv__key">
                  {r.indicator === 'A' ? 'Allowance' : r.indicator === 'C' ? 'Charge' : 'Adjustment'}
                  {r.code ? ` · ${r.code}` : ''}
                  {r.description ? ` · ${r.description}` : ''}
                </span>
                <span className="ds-bv-kv__value">
                  {r.amountRaw ? (() => {
                    const n = parseFloat(r.amountRaw);
                    return Number.isNaN(n) ? r.amountRaw : formatAmount((n / 100).toString());
                  })() : '—'}
                </span>
              </div>
            ))}
            {txi.map((t, i) => (
              <div key={`txi-${i}`} className="ds-bv-kv">
                <span className="ds-bv-kv__key">Tax {t.elements[0]?.trim()}</span>
                <span className="ds-bv-kv__value">{formatAmount(t.elements[1]?.trim())}</span>
              </div>
            ))}
            {tds && (
              <div className="ds-bv-kv ds-bv-kv--total">
                <span className="ds-bv-kv__key">Invoice Total{cur ? ` (${cur.elements[1]?.trim()})` : ''}</span>
                <span className="ds-bv-kv__value">{tdsAmount()}</span>
              </div>
            )}
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
