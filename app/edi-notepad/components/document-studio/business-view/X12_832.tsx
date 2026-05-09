import type { TxnBlock } from './BusinessView';
import {
  formatDate,
  formatAmount,
  collectN1Loops,
  renderParty,
  statusPillFor,
} from './helpers';
import { ErrorPanel } from './ErrorPanel';

const PURPOSE_LABEL: Record<string, string> = {
  AB: 'Add',
  CO: 'Confirmation',
  DE: 'Delete',
  DI: 'Discontinue',
  PR: 'Price Change',
  RE: 'Replace',
  RS: 'Resend',
  ST: 'Standard',
};

interface CatalogItem {
  productQual: string;
  productId: string;
  description: string;
  uom: string;
  prices: { qual: string; value: string }[];
  effectiveDates: { qual: string; date: string }[];
}

const PRICE_QUAL_LABEL: Record<string, string> = {
  CON: 'Contract',
  CUP: 'Customer Price',
  LST: 'List Price',
  NET: 'Net',
  NTP: 'Net Promotional',
  RTL: 'Retail',
  WHL: 'Wholesale',
  '00': 'Standard',
};

/**
 * X12 832 — Price/Sales Catalog. BCT header carries purpose + catalog
 * number. Each LIN starts an item; CTP rows give one or more prices
 * per item with an optional date range from DTM 007/036/038.
 */
export function renderX12_832(block: TxnBlock) {
  const segs = block.segments;
  const bct = segs.find((s) => s.id === 'BCT');
  const purpose = bct?.elements[0]?.trim() ?? '';
  const catalogNumber = bct?.elements[1]?.trim() ?? '';
  const catalogRevision = bct?.elements[2]?.trim() ?? '';
  const catalogDate = bct?.elements[3]?.trim() ?? '';

  const refs = segs.filter((s) => s.id === 'REF');
  const cur = segs.find((s) => s.id === 'CUR');
  const currency = cur?.elements[1]?.trim() ?? '';

  const parties = collectN1Loops(segs);

  const items: CatalogItem[] = [];
  let current: CatalogItem | undefined;
  for (const s of segs) {
    if (s.id === 'LIN') {
      current = {
        productQual: s.elements[1]?.trim() ?? '',
        productId: s.elements[2]?.trim() ?? '',
        description: '',
        uom: '',
        prices: [],
        effectiveDates: [],
      };
      items.push(current);
    } else if (current) {
      if (s.id === 'PID') {
        const desc = s.elements[4]?.trim() ?? '';
        current.description = current.description ? `${current.description} ${desc}` : desc;
      } else if (s.id === 'CTP') {
        // CTP02 = qualifier, CTP03 = price, CTP04 = qty, CTP05 = uom
        current.prices.push({
          qual: s.elements[1]?.trim() ?? '',
          value: s.elements[2]?.trim() ?? '',
        });
        if (!current.uom) current.uom = s.elements[4]?.trim() ?? '';
      } else if (s.id === 'DTM') {
        current.effectiveDates.push({
          qual: s.elements[0]?.trim() ?? '',
          date: s.elements[1]?.trim() ?? '',
        });
      }
    }
  }

  const status = statusPillFor('832', segs);
  const purposeLabel = PURPOSE_LABEL[purpose] ?? purpose;

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Price / Sales Catalog</h1>
            {status && (
              <span className={`ds-bv-status ds-bv-status--${status.tone}`}>
                <span className="ds-bv-status__glyph" aria-hidden="true">{status.glyph}</span>
                {status.label}
              </span>
            )}
          </div>
          <div className="ds-bv-doc__subtitle">
            X12 832 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">Catalog #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{catalogNumber || '—'}</span></div>
          {catalogRevision && <div><span className="ds-bv-meta-label">Revision</span><span className="ds-bv-meta-value">{catalogRevision}</span></div>}
          <div><span className="ds-bv-meta-label">Date</span><span className="ds-bv-meta-value">{formatDate(catalogDate)}</span></div>
          <div><span className="ds-bv-meta-label">Purpose</span><span className="ds-bv-meta-value">{purposeLabel}</span></div>
          {currency && <div><span className="ds-bv-meta-label">Currency</span><span className="ds-bv-meta-value">{currency}</span></div>}
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

      {items.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Catalog Items</h2>
          <table className="ds-bv-lineitems">
            <thead>
              <tr>
                <th>Product</th>
                <th>Description</th>
                <th>UOM</th>
                <th>Prices</th>
                <th>Effective</th>
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
                  <td>{it.uom || '—'}</td>
                  <td>
                    {it.prices.length === 0 ? '—' : it.prices.map((p, j) => (
                      <div key={j} className="ds-bv-mono" style={{ fontSize: 11 }}>
                        {PRICE_QUAL_LABEL[p.qual] ?? p.qual}: {formatAmount(p.value)}
                      </div>
                    ))}
                  </td>
                  <td>
                    {it.effectiveDates.length === 0 ? '—' : it.effectiveDates.map((d, j) => (
                      <div key={j} style={{ fontSize: 11 }}>
                        {d.qual}: {formatDate(d.date)}
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
