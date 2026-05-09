import type { TxnBlock } from './BusinessView';
import { ErrorPanel } from './ErrorPanel';

const AK_STATUS: Record<string, string> = {
  A: 'Accepted',
  E: 'Accepted with Errors',
  M: 'Rejected: Message Authentication Failed',
  P: 'Partially Accepted',
  R: 'Rejected',
  W: 'Rejected: Assurance Failed',
  X: 'Rejected: Content Authentication Failed',
};

interface AKEntry {
  setId: string;
  setControl: string;
  status: string;
  notes: string[];
}

export function renderX12_997(block: TxnBlock) {
  const segs = block.segments;
  const ak1 = segs.find((s) => s.id === 'AK1');
  const ak9 = segs.find((s) => s.id === 'AK9');

  const groupId = ak1?.elements[0]?.trim() ?? '';
  const groupControl = ak1?.elements[1]?.trim() ?? '';
  const overall = ak9?.elements[0]?.trim() ?? '';
  const totalSets = ak9?.elements[1]?.trim() ?? '';
  const receivedSets = ak9?.elements[2]?.trim() ?? '';
  const acceptedSets = ak9?.elements[3]?.trim() ?? '';

  const entries: AKEntry[] = [];
  let current: AKEntry | undefined;
  for (const s of segs) {
    if (s.id === 'AK2') {
      current = {
        setId: s.elements[0]?.trim() ?? '',
        setControl: s.elements[1]?.trim() ?? '',
        status: '',
        notes: [],
      };
      entries.push(current);
    } else if (s.id === 'AK5' && current) {
      current.status = s.elements[0]?.trim() ?? '';
    } else if (s.id === 'AK3' && current) {
      const segId = s.elements[0]?.trim();
      const pos = s.elements[1]?.trim();
      current.notes.push(`Segment ${segId} at position ${pos}`);
    } else if (s.id === 'AK4' && current) {
      const elPos = s.elements[0]?.trim();
      const errCode = s.elements[2]?.trim() ?? '';
      current.notes.push(`Element ${elPos} error code ${errCode}`);
    }
  }

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <h1 className="ds-bv-doc__title">Functional Acknowledgment</h1>
          <div className="ds-bv-doc__subtitle">
            X12 997 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">Group ID</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{groupId}</span></div>
          <div><span className="ds-bv-meta-label">Group Ctrl</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{groupControl}</span></div>
          <div>
            <span className="ds-bv-meta-label">Group Status</span>
            <span className={`ds-bv-meta-value ds-bv-pill ds-bv-pill--${overall.toLowerCase()}`}>
              {overall} {AK_STATUS[overall] ? `· ${AK_STATUS[overall]}` : ''}
            </span>
          </div>
        </div>
      </header>

      {block.showErrors !== false && block.errors.length > 0 && (
        <ErrorPanel errors={block.errors} onSelect={block.onErrorClick} />
      )}

      <section className="ds-bv-section">
        <h2 className="ds-bv-section__title">Group Summary</h2>
        <div className="ds-bv-kv-grid">
          <div className="ds-bv-kv"><span className="ds-bv-kv__key">Sets in Group</span><span className="ds-bv-kv__value">{totalSets || '—'}</span></div>
          <div className="ds-bv-kv"><span className="ds-bv-kv__key">Sets Received</span><span className="ds-bv-kv__value">{receivedSets || '—'}</span></div>
          <div className="ds-bv-kv"><span className="ds-bv-kv__key">Sets Accepted</span><span className="ds-bv-kv__value">{acceptedSets || '—'}</span></div>
        </div>
      </section>

      {entries.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Per-Transaction Status</h2>
          <table className="ds-bv-lineitems">
            <thead>
              <tr>
                <th>Set</th>
                <th>Control #</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i}>
                  <td className="ds-bv-mono">{e.setId}</td>
                  <td className="ds-bv-mono">{e.setControl}</td>
                  <td>
                    <span className={`ds-bv-pill ds-bv-pill--${e.status.toLowerCase()}`}>
                      {e.status} {AK_STATUS[e.status] ? `· ${AK_STATUS[e.status]}` : ''}
                    </span>
                  </td>
                  <td>{e.notes.length === 0 ? '—' : e.notes.map((n, j) => <div key={j}>{n}</div>)}</td>
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
