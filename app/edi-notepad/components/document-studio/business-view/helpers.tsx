import type { Segment } from '@/src/lib/edi/types';

/** Format an X12 date (CCYYMMDD or YYMMDD) as YYYY-MM-DD. */
export function formatDate(raw: string | undefined): string {
  if (!raw) return '—';
  const s = raw.trim();
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (s.length === 6) {
    const yy = parseInt(s.slice(0, 2), 10);
    const cc = yy >= 50 ? '19' : '20';
    return `${cc}${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
  }
  return s;
}

/** Format an X12 time (HHMM, HHMMSS, HHMMSSDD) as HH:MM[:SS]. */
export function formatTime(raw: string | undefined): string {
  if (!raw) return '—';
  const s = raw.trim();
  if (s.length === 4) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  if (s.length >= 6) return `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}`;
  return s;
}

/** Best-effort numeric formatting that preserves the original on parse failure. */
export function formatAmount(raw: string | undefined): string {
  if (!raw) return '—';
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return raw;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Group an N1 contact loop: N1 segment followed by adjacent N2/N3/N4/REF/PER
 * segments belonging to the same party. Returns { n1, n2[], n3[], n4 }.
 */
export interface PartyLoop {
  n1: Segment;
  n2: Segment[];
  n3: Segment[];
  n4: Segment | undefined;
}

export function collectN1Loops(segs: Segment[]): PartyLoop[] {
  const loops: PartyLoop[] = [];
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].id !== 'N1') continue;
    const loop: PartyLoop = { n1: segs[i], n2: [], n3: [], n4: undefined };
    let j = i + 1;
    while (j < segs.length && ['N2', 'N3', 'N4', 'REF', 'PER'].includes(segs[j].id)) {
      if (segs[j].id === 'N2') loop.n2.push(segs[j]);
      else if (segs[j].id === 'N3') loop.n3.push(segs[j]);
      else if (segs[j].id === 'N4') loop.n4 = segs[j];
      j++;
    }
    loops.push(loop);
  }
  return loops;
}

/** Render a party (N1 + N3 + N4) as inline-block content. */
export function renderParty(loop: PartyLoop, key: number) {
  const code = loop.n1.elements[0]?.trim() ?? '';
  const name = loop.n1.elements[1]?.trim() ?? '';
  const idQual = loop.n1.elements[2]?.trim() ?? '';
  const idCode = loop.n1.elements[3]?.trim() ?? '';
  const street = loop.n3.flatMap((n) => n.elements.map((e) => e.trim()).filter(Boolean));
  const city = loop.n4?.elements[0]?.trim() ?? '';
  const state = loop.n4?.elements[1]?.trim() ?? '';
  const zip = loop.n4?.elements[2]?.trim() ?? '';
  const country = loop.n4?.elements[3]?.trim() ?? '';

  return (
    <div className="ds-bv-party" key={key}>
      <div className="ds-bv-party__role">{partyRoleLabel(code)} <span className="ds-bv-party__code">({code})</span></div>
      <div className="ds-bv-party__name">{name || '—'}</div>
      {idCode && <div className="ds-bv-party__id">ID: {idQual} {idCode}</div>}
      {street.map((line, i) => <div className="ds-bv-party__addr" key={i}>{line}</div>)}
      {(city || state || zip) && (
        <div className="ds-bv-party__addr">
          {[city, state, zip].filter(Boolean).join(', ')}
        </div>
      )}
      {country && <div className="ds-bv-party__addr">{country}</div>}
    </div>
  );
}

/** Friendly label for common N101 entity codes. */
export function partyRoleLabel(code: string): string {
  const labels: Record<string, string> = {
    BY: 'Buyer',         SE: 'Seller',         ST: 'Ship To',         BT: 'Bill To',
    SF: 'Ship From',     RI: 'Remit To',       PR: 'Payer',           PE: 'Payee',
    CN: 'Consignee',     SH: 'Shipper',        DE: 'Destination',     OR: 'Origin',
    VN: 'Vendor',        CA: 'Carrier',        '40': 'Receiver',      '41': 'Submitter',
    MA: 'Manufacturer',
  };
  return labels[code] ?? code;
}

/** Friendly label for common BEG02 / BAK02 PO type codes. */
export function poTypeLabel(code: string): string {
  const labels: Record<string, string> = {
    SA: 'Stand-alone Order',  NE: 'New Order',         RO: 'Rush Order',
    BL: 'Blanket Order',      CN: 'Consigned Order',   CR: 'Change Order',
    DR: 'Drop Ship',          KN: 'Demand',            OS: 'Outside-Order',
    PR: 'Priced Replenishment',
  };
  return labels[code] ?? code;
}

/** Friendly label for BEG01 / BAK01 transaction set purpose codes. */
export function purposeLabel(code: string): string {
  const labels: Record<string, string> = {
    '00': 'Original',         '01': 'Cancellation',    '04': 'Change',
    '05': 'Replace',          '06': 'Confirmation',    '07': 'Duplicate',
  };
  return labels[code] ?? code;
}

/** Friendly label for BAK02 acknowledgment type codes. */
export function bakAckLabel(code: string): string {
  const labels: Record<string, string> = {
    AC: 'With Detail and Change', AD: 'With Detail, No Change',
    AE: 'Acknowledge — Exceptions', AH: 'Acknowledge — Hold',
    AK: 'Acknowledged', AP: 'Accepted', NA: 'No Acknowledgment Needed',
    RD: 'Reject with Detail', RF: 'Reject',
  };
  return labels[code] ?? code;
}

export interface StatusPill {
  label: string;
  tone: 'ok' | 'warn' | 'error' | 'neutral';
  /** Glyph alongside the label so colour isn't the only differentiator
   *  (matters for protan/deutan colour-blind users). */
  glyph: '✓' | '⚠' | '✕' | '○';
}

function pill(label: string, tone: StatusPill['tone']): StatusPill {
  const glyph: StatusPill['glyph'] =
    tone === 'ok' ? '✓' :
    tone === 'warn' ? '⚠' :
    tone === 'error' ? '✕' : '○';
  return { label, tone, glyph };
}

/**
 * Derive a status pill for the transaction header. Returns null when no
 * deterministic status is available (we don't fabricate "Original" for
 * transactions that don't carry a purpose / ack / status code).
 */
export function statusPillFor(setCode: string, segments: Array<{ id: string; elements: string[] }>): StatusPill | null {
  if (setCode === '850' || setCode === '860' || setCode === '875') {
    const beg = segments.find((s) => s.id === 'BEG' || s.id === 'BCH' || s.id === 'BIG');
    const purpose = beg?.elements[0]?.trim();
    if (!purpose) return null;
    return pill(purposeLabel(purpose), purpose === '00' ? 'ok' : 'neutral');
  }
  if (setCode === '855' || setCode === '865') {
    const bak = segments.find((s) => s.id === 'BAK' || s.id === 'BCA');
    const type = bak?.elements[1]?.trim();
    if (!type) return null;
    const tone: StatusPill['tone'] = type === 'AC' || type === 'AD' || type === 'AK' || type === 'AP' ? 'ok' : (type === 'RD' || type === 'RF' ? 'error' : 'neutral');
    return pill(bakAckLabel(type), tone);
  }
  if (setCode === '810' || setCode === '880') {
    return pill('Open', 'warn');
  }
  if (setCode === '820') {
    const bpr = segments.find((s) => s.id === 'BPR');
    const handling = bpr?.elements[0]?.trim();
    return pill(handling === 'I' ? 'Information Only' : handling === 'C' ? 'Credit' : handling === 'D' ? 'Debit' : 'Payment', 'ok');
  }
  if (setCode === '940' || setCode === '945' || setCode === '943' || setCode === '944' || setCode === '947') {
    return pill(setCode === '940' ? 'Order' : setCode === '945' ? 'Shipped' : setCode === '944' ? 'Received' : 'Adjustment', 'ok');
  }
  if (setCode === '204' || setCode === '214') {
    return pill(setCode === '204' ? 'Tender' : 'Status', 'neutral');
  }
  if (setCode === '856') {
    const bsn = segments.find((s) => s.id === 'BSN');
    const purpose = bsn?.elements[0]?.trim();
    if (!purpose) return null;
    return pill(purposeLabel(purpose), purpose === '00' ? 'ok' : 'neutral');
  }
  if (setCode === '997' || setCode === '999') {
    const ak9 = segments.find((s) => s.id === 'AK9');
    const ack = ak9?.elements[0]?.trim();
    if (!ack) return null;
    const tone: StatusPill['tone'] = ack === 'A' ? 'ok' : ack === 'E' ? 'warn' : 'error';
    const label = ack === 'A' ? 'Accepted' : ack === 'E' ? 'Accepted with Errors' : ack === 'P' ? 'Partial' : 'Rejected';
    return pill(label, tone);
  }
  // EDIFACT
  if (setCode === 'ORDERS' || setCode === 'ORDRSP' || setCode === 'ORDCHG') {
    return pill('Order', 'ok');
  }
  if (setCode === 'INVOIC') return pill('Open', 'warn');
  if (setCode === 'DESADV') return pill('Shipped', 'ok');
  if (setCode === 'CONTRL') return pill('Acknowledgment', 'ok');
  return null;
}

/**
 * Reconstruct the raw segment string from a parsed Segment, joining the ID
 * and elements with the active element separator. Useful for the Error
 * Detail drawer's "Raw segment" display.
 */
export function reconstructSegment(
  seg: { id: string; elements: string[] },
  elemSep: string,
  segTerm: string,
): string {
  return seg.id + (seg.elements.length ? elemSep + seg.elements.join(elemSep) : '') + segTerm;
}
