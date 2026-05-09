import type { Segment } from '@/src/lib/edi/types';
import type { TxnBlock } from './BusinessView';
import { formatDate, formatTime, collectN1Loops, renderParty, statusPillFor } from './helpers';
import { ErrorPanel } from './ErrorPanel';

const HL_LEVEL_LABEL: Record<string, string> = {
  S: 'Shipment', O: 'Order', T: 'Tare', P: 'Pack', I: 'Item', F: 'Feature',
};

interface HLNode {
  hl: Segment;
  attached: Segment[];
  children: HLNode[];
}

/** Walk segments and reassemble HL parent/child hierarchy. */
function buildHLTree(segs: Segment[]): HLNode[] {
  const nodesById = new Map<string, HLNode>();
  const roots: HLNode[] = [];
  let current: HLNode | undefined;

  for (const s of segs) {
    if (s.id === 'HL') {
      const node: HLNode = { hl: s, attached: [], children: [] };
      const id = s.elements[0]?.trim() ?? '';
      const parent = s.elements[1]?.trim() ?? '';
      nodesById.set(id, node);
      if (parent && nodesById.has(parent)) nodesById.get(parent)!.children.push(node);
      else roots.push(node);
      current = node;
    } else if (current && !['ST', 'BSN', 'CTT', 'SE'].includes(s.id)) {
      current.attached.push(s);
    }
  }
  return roots;
}

function renderHLNode(node: HLNode, depth: number): React.ReactElement {
  const id = node.hl.elements[0]?.trim() ?? '';
  const level = node.hl.elements[2]?.trim() ?? '';
  const label = HL_LEVEL_LABEL[level] ?? level;
  const lin = node.attached.find((s) => s.id === 'LIN');
  const sn1 = node.attached.find((s) => s.id === 'SN1');
  const prf = node.attached.find((s) => s.id === 'PRF');
  const man = node.attached.find((s) => s.id === 'MAN');

  let detail = '';
  if (level === 'I' && lin) {
    const qual = lin.elements[1]?.trim() ?? '';
    const code = lin.elements[2]?.trim() ?? '';
    const qty = sn1?.elements[1]?.trim() ?? '';
    const uom = sn1?.elements[2]?.trim() ?? '';
    detail = `${qual} ${code}${qty ? ` · ${qty} ${uom}` : ''}`;
  } else if (level === 'O' && prf) {
    detail = `PO ${prf.elements[0]?.trim() ?? ''}`;
  } else if ((level === 'T' || level === 'P') && man) {
    detail = `${man.elements[0]?.trim()} ${man.elements[1]?.trim()}`;
  }

  return (
    <div key={id} className="ds-bv-hl-row" style={{ paddingLeft: depth * 18 + 8 }}>
      <span className="ds-bv-hl-marker" />
      <span className="ds-bv-hl-id">HL{id}</span>
      <span className="ds-bv-hl-label">{label}</span>
      {detail && <span className="ds-bv-hl-detail">{detail}</span>}
      {node.children.length > 0 && (
        <div className="ds-bv-hl-children">
          {node.children.map((child) => renderHLNode(child, depth + 1))}
        </div>
      )}
    </div>
  );
}

export function renderX12_856(block: TxnBlock) {
  const segs = block.segments;
  const bsn = segs.find((s) => s.id === 'BSN');
  const purpose = bsn?.elements[0]?.trim() ?? '';
  const shipId = bsn?.elements[1]?.trim() ?? '';
  const date = bsn?.elements[2]?.trim() ?? '';
  const time = bsn?.elements[3]?.trim() ?? '';
  const ctt = segs.find((s) => s.id === 'CTT');
  const totalUnits = ctt?.elements[0]?.trim();
  const parties = collectN1Loops(segs);
  const tree = buildHLTree(segs);

  const status = statusPillFor('856', segs);

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Advance Ship Notice</h1>
            {status && <span className={`ds-bv-status ds-bv-status--${status.tone}`}>{status.label}</span>}
          </div>
          <div className="ds-bv-doc__subtitle">
            X12 856 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">Shipment ID</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{shipId || '—'}</span></div>
          <div><span className="ds-bv-meta-label">Date</span><span className="ds-bv-meta-value">{formatDate(date)}</span></div>
          <div><span className="ds-bv-meta-label">Time</span><span className="ds-bv-meta-value">{formatTime(time)}</span></div>
          <div><span className="ds-bv-meta-label">Purpose</span><span className="ds-bv-meta-value">{purpose}</span></div>
        </div>
      </header>

      {block.errors.length > 0 && (
        <ErrorPanel errors={block.errors} onSelect={block.onErrorClick} />
      )}

      {parties.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Parties</h2>
          <div className="ds-bv-parties">
            {parties.map((p, i) => renderParty(p, i))}
          </div>
        </section>
      )}

      {tree.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Hierarchy</h2>
          <div className="ds-bv-hl-tree">
            {tree.map((root) => renderHLNode(root, 0))}
          </div>
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
