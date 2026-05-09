import type { TxnBlock } from './BusinessView';
import {
  formatDate,
  formatTime,
  collectN1Loops,
  renderParty,
  statusPillFor,
} from './helpers';
import { ErrorPanel } from './ErrorPanel';

const STATUS_LABEL: Record<string, string> = {
  A3: 'Shipment Returned to Shipper',
  A7: 'Refused by Consignee',
  A9: 'Shipment Damaged',
  AF: 'Carrier Departed Pickup Location',
  AG: 'Estimated Delivery',
  AH: 'Attempted Delivery',
  AI: 'Shipment has been Reconsigned',
  AJ: 'Tendered for Delivery',
  AM: 'Loaded on Equipment',
  AN: 'Diverted to Air Carrier',
  AP: 'Delivery Not Completed',
  AR: 'Rail Arrival at Destination',
  AV: 'Available for Delivery',
  CA: 'Shipment Cancelled',
  CD: 'Carrier Departed Terminal',
  CP: 'Completed Loading at Pickup',
  D1: 'Completed Unloading',
  I1: 'In-Gate',
  J1: 'Delivered to Connecting Line',
  K1: 'Arrived at Customs',
  L1: 'Loading',
  OA: 'Out for Delivery',
  PR: 'U.S. Customs Hold at In-Bond Location',
  R1: 'Received from Prior Carrier',
  RL: 'Released',
  SD: 'Shipment Delayed',
  X1: 'Arrived at Delivery Location',
  X2: 'Estimated Date and/or Time of Arrival',
  X3: 'Arrived at Pier',
  X6: 'En Route to Delivery Location',
  X8: 'Arrived at Terminal Location',
};

interface StopEvent {
  statusCode: string;
  statusReason: string;
  date: string;
  time: string;
  location: string;
}

/**
 * X12 214 — Transportation Carrier Shipment Status. B10 carries the
 * shipment ID + carrier SCAC; AT7 segments are status events with
 * date/time/location from MS1. Renders as a vertical event timeline.
 */
export function renderX12_214(block: TxnBlock) {
  const segs = block.segments;
  const b10 = segs.find((s) => s.id === 'B10');
  const referenceId = b10?.elements[0]?.trim() ?? '';
  const shipmentId = b10?.elements[1]?.trim() ?? '';
  const carrier = b10?.elements[2]?.trim() ?? '';

  const refs = segs.filter((s) => s.id === 'REF');
  const parties = collectN1Loops(segs);

  // Each AT7 may be preceded by an MS1 (location) and a DTM (date/time).
  // We walk the segments in order and group AT7s with their nearest
  // preceding MS1/DTM context.
  const events: StopEvent[] = [];
  let lastLocation = '';
  let lastDate = '';
  let lastTime = '';
  for (const s of segs) {
    if (s.id === 'MS1') {
      lastLocation = [s.elements[0]?.trim(), s.elements[1]?.trim(), s.elements[2]?.trim()].filter(Boolean).join(', ');
    } else if (s.id === 'DTM' || s.id === 'AT8') {
      // 214 sometimes uses AT8 for date/time directly.
      const d = s.elements[1]?.trim() ?? '';
      const t = s.elements[2]?.trim() ?? '';
      if (d) lastDate = d;
      if (t) lastTime = t;
    } else if (s.id === 'AT7') {
      events.push({
        statusCode: s.elements[0]?.trim() ?? '',
        statusReason: s.elements[1]?.trim() ?? '',
        date: lastDate,
        time: lastTime,
        location: lastLocation,
      });
    }
  }

  // Latest status drives the header pill.
  const latest = events[events.length - 1];
  const status = latest
    ? { label: STATUS_LABEL[latest.statusCode] ?? latest.statusCode, tone: 'neutral' as const, glyph: '○' as const }
    : statusPillFor('214', segs);

  return (
    <>
      <header className="ds-bv-doc__header">
        <div>
          <div className="ds-bv-doc__titlerow">
            <h1 className="ds-bv-doc__title">Shipment Status</h1>
            {status && (
              <span className={`ds-bv-status ds-bv-status--${status.tone}`}>
                <span className="ds-bv-status__glyph" aria-hidden="true">{status.glyph}</span>
                {status.label}
              </span>
            )}
          </div>
          <div className="ds-bv-doc__subtitle">
            X12 214 · {block.context.sender ?? '—'} → {block.context.receiver ?? '—'}
            {block.context.interchangeControl && <> · ICN <span className="ds-bv-mono">{block.context.interchangeControl}</span></>}
          </div>
        </div>
        <div className="ds-bv-doc__meta">
          <div><span className="ds-bv-meta-label">Shipment</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{shipmentId || '—'}</span></div>
          <div><span className="ds-bv-meta-label">Reference</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{referenceId || '—'}</span></div>
          <div><span className="ds-bv-meta-label">Carrier</span><span className="ds-bv-meta-value ds-bv-meta-value--mono">{carrier || '—'}</span></div>
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

      {events.length > 0 && (
        <section className="ds-bv-section">
          <h2 className="ds-bv-section__title">Status Timeline</h2>
          <ol className="ds-bv-timeline">
            {events.map((e, i) => (
              <li key={i} className="ds-bv-timeline__item">
                <div className="ds-bv-timeline__dot" aria-hidden="true" />
                <div className="ds-bv-timeline__head">
                  <span className="ds-bv-timeline__code">{e.statusCode}</span>
                  <span className="ds-bv-timeline__label">{STATUS_LABEL[e.statusCode] ?? e.statusCode}</span>
                </div>
                <div className="ds-bv-timeline__meta">
                  {e.date && <>{formatDate(e.date)}</>}
                  {e.time && <> · {formatTime(e.time)}</>}
                  {e.location && <> · {e.location}</>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer className="ds-bv-doc__footer">
        <span>Interchange ctrl: <span className="ds-bv-mono">{block.context.interchangeControl ?? '—'}</span></span>
        <span>Set ctrl: <span className="ds-bv-mono">{block.context.transactionControl ?? '—'}</span></span>
      </footer>
    </>
  );
}
