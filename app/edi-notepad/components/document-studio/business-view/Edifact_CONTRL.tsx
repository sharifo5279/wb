import type { TxnBlock } from './BusinessView';
import { statusPillFor } from './helpers';
import { splitComposite, formatEdifactDtm, dtmQualifierLabel } from './edifact-helpers';
import { ErrorPanel } from './ErrorPanel';

const ACTION_LABEL: Record<string, string> = {
  '4':  'No action',
  '7':  'Acknowledged',
  '8':  'Interchange/message received',
  '9':  'Message rejected',
  '12': 'Group rejected',
  '13': 'Interchange rejected',
  '14': 'Acknowledged with errors',
  '17': 'Functional error',
  '18': 'Syntax error',
};

interface MsgRow {
  ref: string;
  identifier: string;
  action: string;
  details: string[];
}

/**
 * EDIFACT CONTRL — Syntax & Service Report. Counterpart to X12 997/999.
 * Top-level UCI carries the interchange-level action code; UCM rows are
 * one per acknowledged message; UCS/UCD rows attach error detail.
 */
export function renderEdifact_CONTRL(block: TxnBlock) {
  const segs = block.segments;
  const bgm = segs.find((s) => s.id === 'BGM');
  const docNumber = bgm?.elements[1]?.trim() ?? '';

  const uci = segs.find((s) => s.id === 'UCI');
  const interchangeRef = uci?.elements[0]?.trim() ?? '';
  const interchangeAction = uci?.elements[3]?.trim() ?? '';

  const dtms = segs.filter((s) => s.id === 'DTM');

  // Walk UCMs and attach trailing UCS/UCD error detail rows.
  const messages: MsgRow[] = [];
  let currentMsg: MsgRow | undefined;
  for (const s of segs) {
    if (s.id === 'UCM') {
      currentMsg = {
        ref: s.elements[0]?.trim() ?? '',
        identifier: splitComposite(s.elements[1])[0] ?? '',
        action: s.elements[2]?.trim() ?? '',
        details: [],
      };
      messages.push(currentMsg);
    } else if (currentMsg && (s.id === 'UCS' || s.id === 'UCD' || s.id === 'UCF')) {
      const code = s.elements[0]?.trim() ?? '';
      const action = s.elements[1]?.trim() ?? '';
      currentMsg.details.push(`${s.id} ${code}${action ? ` · ${ACTION_LABEL[action] ?? action}` : ''}`);
    }
  }

  const status = statusPillFor('CONTRL', segs);
  const interchangeOk = interchangeAction === '4' || interchangeAction === '7' || interchangeAction === '8';

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Service Report (CONTRL)</h1>
            {status && (
              <span className={`ds-bv-status ds-bv-status--${interchangeOk ? 'ok' : 'error'}`}>
                <span className="ds-bv-status__glyph" aria-hidden="true">{interchangeOk ? '✓' : '✕'}</span>
                {ACTION_LABEL[interchangeAction] ?? status.label}
              </span>
            )}
          </div>
          <div className="ds-bv-doc__subtitle">
            EDIFACT CONTRL · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · UNB ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">CONTRL #</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{docNumber || '—'}</span></div>
          <div><span className="ds-bv-meta-label">Acknowledging</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{interchangeRef || '—'}</span></div>
          <div><span className="ds-bv-meta-label">Action</span><span className="ds-bv-meta-value">{ACTION_LABEL[interchangeAction] ?? interchangeAction}</span></div>
        </div>
      </header>

      {block.showErrors !== false && block.errors.length > 0 && (
        <ErrorPanel errors={block.errors} onSelect={block.onErrorClick} />
      )}

      {dtms.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Dates</h2>
          <div className="ds-bv-kv-grid">
            {dtms.map((d, i) => {
              const f = formatEdifactDtm(d.elements[0]);
              return (
                <div key={i} className="ds-bv-kv">
                  <span className="ds-bv-kv__key">{dtmQualifierLabel(f.qual)}</span>
                  <span className="ds-bv-kv__value">{f.display}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {messages.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Acknowledged Messages</h2>
          <table className="ds-bv-lineitems">
            <thead>
              <tr>
                <th>Msg Ref</th>
                <th>Identifier</th>
                <th>Action</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m, i) => {
                const ok = m.action === '4' || m.action === '7' || m.action === '8';
                return (
                  <tr key={i} className={!ok && block.showErrors !== false ? 'ds-bv-row--warn' : undefined}>
                    <td className="ds-bv-mono">{m.ref}</td>
                    <td className="ds-bv-mono">{m.identifier}</td>
                    <td>{ACTION_LABEL[m.action] ?? m.action}</td>
                    <td className="ds-bv-mono" style={{ fontSize: 11 }}>
                      {m.details.length === 0 ? '—' : m.details.join(' · ')}
                    </td>
                  </tr>
                );
              })}
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
