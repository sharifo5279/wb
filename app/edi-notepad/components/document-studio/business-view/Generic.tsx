import type { TxnBlock } from './BusinessView';

/**
 * Fallback renderer for transaction sets without a dedicated business view.
 * Shows envelope context and a compact segment table — enough for the user
 * to verify what's in the document until a transaction-specific renderer
 * is added.
 */
export function renderGeneric(block: TxnBlock) {
  const titleByStandard = block.standard === 'X12'
    ? `X12 ${block.code}`
    : `EDIFACT ${block.code}`;

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <h1 className="ds-bv-doc__title">{titleByStandard}</h1>
          <div className="ds-bv-doc__subtitle">
            {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div>
            <span className="ds-bv-meta-label">Set Ctrl</span>
            <span className="ds-bv-meta-value ds-bv-meta-value--mono">
              {block.context.transactionControl ?? '—'}
            </span>
          </div>
        </div>
      </header>

      <section className="ds-bv-section">
        <h2 className="ds-bv-section__title">
          Segments <span className="ds-bv-section__count">({block.segments.length})</span>
        </h2>
        <p className="ds-bv-fallback-hint">
          A dedicated business view for {block.code} hasn&apos;t been built yet — showing the
          raw segment list. Switch to the Raw view to edit, or to the Hex view to inspect
          bytes.
        </p>
        <table className="ds-bv-lineitems ds-bv-lineitems--dense">
          <thead>
            <tr>
              <th>#</th>
              <th>Segment</th>
              <th>Description</th>
              <th>Elements</th>
            </tr>
          </thead>
          <tbody>
            {block.segments.map((s, i) => (
              <tr key={i}>
                <td className="ds-bv-mono">{s.line}</td>
                <td className="ds-bv-mono"><strong>{s.id}</strong></td>
                <td>{s.descriptor.known ? s.descriptor.name : '—'}</td>
                <td className="ds-bv-mono ds-bv-elements">
                  {s.elements.map((e, j) => (
                    <span key={j} className="ds-bv-element">
                      <span className="ds-bv-element__pos">{(j + 1).toString().padStart(2, '0')}</span>
                      <span className="ds-bv-element__val">{e || '—'}</span>
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
