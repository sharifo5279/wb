import type { TxnBlock } from './BusinessView';
import { statusPillFor } from './helpers';
import {
  splitComposite,
  formatEdifactDtm,
  dtmQualifierLabel,
  collectNADs,
  renderNADParty,
  parseQty,
  bgmFunctionLabel,
} from './edifact-helpers';
import { ErrorPanel } from './ErrorPanel';

interface DespatchLine {
  lineNum: string;
  itemCode: string;
  itemQual: string;
  description: string;
  qty: string;
  uom: string;
}

/**
 * EDIFACT DESADV — Despatch Advice. Counterpart to X12 856.
 * Header: BGM. CPS segments may bound packing hierarchy (HL-equivalent in
 * X12); we render line items flat for now (a future polish PR can add
 * the CPS hierarchy display similar to X12 856's HL tree).
 */
export function renderEdifact_DESADV(block: TxnBlock) {
  const segs = block.segments;
  const bgm = segs.find((s) => s.id === 'BGM');
  const docNumber = bgm?.elements[1]?.trim() ?? '';
  const messageFunction = bgm?.elements[2]?.trim() ?? '';

  const dtms = segs.filter((s) => s.id === 'DTM');
  const rffs = segs.filter((s) => s.id === 'RFF');

  const parties = collectNADs(segs);

  const items: DespatchLine[] = [];
  let current: DespatchLine | undefined;
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
      };
      items.push(current);
    } else if (current) {
      if (s.id === 'IMD') {
        const desc = splitComposite(s.elements[2])[3] ?? s.elements[2]?.trim() ?? '';
        current.description = current.description ? `${current.description} ${desc}` : desc;
      } else if (s.id === 'QTY') {
        const q = parseQty(s.elements[0]);
        // Despatch qty qualifier 12 = Despatch quantity, 21 = Ordered.
        if (!current.qty || q.qual === '12') {
          current.qty = q.value;
          current.uom = q.uom;
        }
      }
    }
  }

  const status = statusPillFor('DESADV', segs);

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Despatch Advice</h1>
            {status && (
              <span className={`ds-bv-status ds-bv-status--${status.tone}`}>
                <span className="ds-bv-status__glyph" aria-hidden="true">{status.glyph}</span>
                {status.label}
              </span>
            )}
          </div>
          <div className="ds-bv-doc__subtitle">
            EDIFACT DESADV · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · UNB ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">Despatch #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{docNumber || '—'}</span></div>
          {messageFunction && <div><span className="ds-bv-meta-label">Function</span><span className="ds-bv-meta-value">{bgmFunctionLabel(messageFunction)}</span></div>}
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
