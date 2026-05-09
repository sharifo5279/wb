import type { Segment } from '@/src/lib/edi/types';

// EDIFACT default composite separator. The parser does not currently surface
// the active UNA composite delimiter, so we hard-code ':' which is the syntax
// default per ISO 9735 (UNB1.0001 = "UNOA"/"UNOB" service string).
const COMP = ':';

/** Split an element on the composite separator and return trimmed parts. */
export function splitComposite(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(COMP).map((s) => s.trim());
}

/** EDIFACT DTM element 1 is "qual:value:format". Format 102 = CCYYMMDD,
 *  203 = CCYYMMDDHHMM, 204 = CCYYMMDDHHMMSS, 101 = YYMMDD, 201 = YYMMDDHHMM. */
export function formatEdifactDtm(raw: string | undefined): { qual: string; display: string } {
  const parts = splitComposite(raw);
  const qual = parts[0] ?? '';
  const value = parts[1] ?? '';
  const format = parts[2] ?? '';
  let display = value;
  if (format === '102' && value.length === 8) {
    display = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  } else if (format === '203' && value.length === 12) {
    display = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}`;
  } else if (format === '101' && value.length === 6) {
    const yy = parseInt(value.slice(0, 2), 10);
    const cc = yy >= 50 ? '19' : '20';
    display = `${cc}${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4, 6)}`;
  }
  return { qual, display };
}

/** Friendly label for common DTM qualifiers. */
export function dtmQualifierLabel(q: string): string {
  const labels: Record<string, string> = {
    '137': 'Document/Message',
    '2':   'Delivery Date Requested',
    '64':  'Delivery Date Earliest',
    '4':   'Order Date',
    '7':   'Effective Date',
    '11':  'Despatch Date',
    '17':  'Delivery Date Estimated',
    '35':  'Delivery Date Actual',
    '171': 'Reference Date',
    '263': 'Invoicing Period',
    '203': 'Execution Date',
  };
  return labels[q] ?? q;
}

/** Friendly label for common NAD party qualifiers. */
export function nadPartyLabel(q: string): string {
  const labels: Record<string, string> = {
    BY: 'Buyer',          SU: 'Supplier',       DP: 'Delivery Party',
    IV: 'Invoicee',       PE: 'Payee',          PR: 'Payer',
    CN: 'Consignee',      CZ: 'Consignor',      MS: 'Document/Message Sender',
    MR: 'Document/Message Receiver',            DC: 'Despatch Contact',
    CA: 'Carrier',        SF: 'Ship From',      ST: 'Ship To',
    SE: 'Seller',         OB: 'Ordered By',     IC: 'Intermediate Consignee',
    UC: 'Ultimate Consignee',
  };
  return labels[q] ?? q;
}

export interface NADParty {
  qualifier: string;
  partyId: string;
  partyName: string;
  street: string[];
  city: string;
  postalCode: string;
  country: string;
}

/** Extract every NAD segment as a structured party. */
export function collectNADs(segs: Segment[]): NADParty[] {
  const out: NADParty[] = [];
  for (const s of segs) {
    if (s.id !== 'NAD') continue;
    const qualifier = s.elements[0]?.trim() ?? '';
    const partyId = splitComposite(s.elements[1])[0] ?? '';
    const partyNameParts = splitComposite(s.elements[3]);
    const streetParts = splitComposite(s.elements[4]);
    out.push({
      qualifier,
      partyId,
      partyName: partyNameParts.filter(Boolean).join(' '),
      street: streetParts.filter(Boolean),
      city: s.elements[5]?.trim() ?? '',
      postalCode: s.elements[7]?.trim() ?? '',
      country: s.elements[8]?.trim() ?? '',
    });
  }
  return out;
}

/** Render an NAD party as a card matching the X12 N1 layout. */
export function renderNADParty(p: NADParty, key: number) {
  return (
    <div className="ds-bv-party" key={key}>
      <div className="ds-bv-party__role">
        {nadPartyLabel(p.qualifier)} <span className="ds-bv-party__code">({p.qualifier})</span>
      </div>
      <div className="ds-bv-party__name">{p.partyName || '—'}</div>
      {p.partyId && <div className="ds-bv-party__id">ID: {p.partyId}</div>}
      {p.street.map((line, i) => <div className="ds-bv-party__addr" key={i}>{line}</div>)}
      {(p.city || p.postalCode) && (
        <div className="ds-bv-party__addr">
          {[p.city, p.postalCode].filter(Boolean).join(', ')}
        </div>
      )}
      {p.country && <div className="ds-bv-party__addr">{p.country}</div>}
    </div>
  );
}

/** EDIFACT QTY element 1 is "qual:value:uom". Returns parsed parts. */
export function parseQty(raw: string | undefined): { qual: string; value: string; uom: string } {
  const parts = splitComposite(raw);
  return { qual: parts[0] ?? '', value: parts[1] ?? '', uom: parts[2] ?? '' };
}

/** EDIFACT MOA element 1 is "qual:value:cur:basis:ind". Returns parsed parts. */
export function parseMoa(raw: string | undefined): { qual: string; value: string; currency: string } {
  const parts = splitComposite(raw);
  return { qual: parts[0] ?? '', value: parts[1] ?? '', currency: parts[2] ?? '' };
}

/** EDIFACT PIA element 2 is "code:qual". Returns parsed parts. */
export function parsePia(raw: string | undefined): { code: string; qual: string } {
  const parts = splitComposite(raw);
  return { code: parts[0] ?? '', qual: parts[1] ?? '' };
}

/** EDIFACT BGM element 1 is just the doc number. element 2 is message function code.
 *  Common function codes: 9 = Original, 1 = Cancel, 4 = Change, 5 = Replace,
 *  31 = Copy, 31 = Duplicate. */
export function bgmFunctionLabel(code: string): string {
  const labels: Record<string, string> = {
    '9':  'Original',
    '1':  'Cancellation',
    '4':  'Change',
    '5':  'Replace',
    '7':  'Duplicate',
    '31': 'Copy',
    '43': 'Additional Transmission',
  };
  return labels[code] ?? code;
}
