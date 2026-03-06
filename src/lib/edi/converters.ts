/**
 * EDI Format Converters — Task 7
 *
 * Pure functions that convert a ParseResult into JSON or XML strings.
 * No side effects, no API calls.  Both converters:
 *   1. Extract envelope metadata (ISA/GS for X12; UNB/UNG for EDIFACT).
 *   2. Extract transaction-type-specific fields for known document types
 *      (850 PO, 856 ASN, 810 Invoice; EDIFACT ORDERS / DESADV / INVOIC).
 *   3. Include the full flat segment list for complete data access.
 */

import type { ParseResult, Segment } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safe element accessor — returns '' when the element is absent. */
const el = (seg: Segment, idx: number): string => seg.elements[idx] ?? '';

/** Convert a digit-string to a number when parseable, otherwise return as-is. */
const num = (val: string): number | string =>
  val && !Number.isNaN(Number(val)) ? Number(val) : val;

const find    = (segs: Segment[], id: string)  => segs.find(s => s.id === id);
const findAll = (segs: Segment[], id: string)  => segs.filter(s => s.id === id);

// ─── JSON Converter ───────────────────────────────────────────────────────────

/**
 * Convert a ParseResult to a formatted JSON string.
 * Output schema:
 *   { standard, ?errors, ?interchange, ?group, transaction, segments }
 */
export function toJSON(result: ParseResult): string {
  return JSON.stringify(buildObject(result), null, 2);
}

/** Shared structured extraction used by both toJSON and toXML. */
function buildObject(result: ParseResult): unknown {
  const { standard, segments, errors } = result;
  const errMsgs = errors.map(e => `${e.segmentId} L${e.line}: ${e.message}`);

  if (standard === 'X12')     return buildX12(segments, errMsgs);
  if (standard === 'EDIFACT') return buildEDIFACT(segments, errMsgs);

  return {
    standard: 'Unknown',
    ...(errMsgs.length && { errors: errMsgs }),
    segments: segments.map(s => ({ id: s.id, elements: s.elements })),
  };
}

// ── X12 ────────────────────────────────────────────────────────────────────────

function buildX12(segs: Segment[], errors: string[]): unknown {
  const isa = find(segs, 'ISA');
  const gs  = find(segs, 'GS');
  const st  = find(segs, 'ST');

  const interchange = isa && {
    senderId:       el(isa, 5).trim(),
    receiverId:     el(isa, 7).trim(),
    date:           el(isa, 8),
    time:           el(isa, 9),
    controlNumber:  el(isa, 12),
    version:        el(isa, 11),
  };

  const group = gs && {
    functionalCode: el(gs, 0),
    senderId:       el(gs, 1),
    receiverId:     el(gs, 2),
    date:           el(gs, 3),
    controlNumber:  el(gs, 5),
    version:        el(gs, 7),
  };

  const txType = st ? el(st, 0) : 'Unknown';
  const txCtrl = st ? el(st, 1) : '';
  const transaction = buildX12Transaction(txType, txCtrl, segs);

  const allSegments = segs.map(s => ({
    id:       s.id,
    line:     s.line,
    elements: s.elements,
    ...(s.errors.length && { errors: s.errors.map(e => e.message) }),
  }));

  return {
    standard: 'X12',
    ...(errors.length && { errors }),
    ...(interchange && { interchange }),
    ...(group && { group }),
    transaction,
    segments: allSegments,
  };
}

function buildX12Transaction(
  type: string,
  controlNumber: string,
  segs: Segment[],
): Record<string, unknown> {
  const base: Record<string, unknown> = { set: type || 'Unknown', controlNumber };

  switch (type) {
    case '850': return build850(base, segs);
    case '856': return build856(base, segs);
    case '810': return build810(base, segs);
    default:    return base;
  }
}

function build850(base: Record<string, unknown>, segs: Segment[]): Record<string, unknown> {
  const beg = find(segs, 'BEG');
  const ctt = find(segs, 'CTT');

  if (beg) {
    base.purpose  = el(beg, 0);
    base.poNumber = el(beg, 2);
    base.poDate   = el(beg, 4);
  }

  // Party N1 loops (ship-to, bill-to, etc.)
  const n1s = findAll(segs, 'N1');
  if (n1s.length) {
    base.parties = n1s.map(n1 => {
      const after = n1.line;
      const n3 = segs.find(s => s.id === 'N3' && s.line > after);
      const n4 = segs.find(s => s.id === 'N4' && s.line > after);
      return {
        qualifier: el(n1, 0),
        name:      el(n1, 1),
        ...(n3 && { addressLine1: el(n3, 0), ...(el(n3, 1) && { addressLine2: el(n3, 1) }) }),
        ...(n4 && { city: el(n4, 0), state: el(n4, 1), zip: el(n4, 2), ...(el(n4, 3) && { country: el(n4, 3) }) }),
      };
    });
  }

  // PO1 line items
  const po1s = findAll(segs, 'PO1');
  if (po1s.length) {
    base.lineItems = po1s.map(po1 => ({
      line:      el(po1, 0),
      quantity:  num(el(po1, 1)),
      uom:       el(po1, 2),
      unitPrice: num(el(po1, 3)),
      ...(el(po1, 6) && { productId: el(po1, 6) }),
    }));
  }

  if (ctt) base.totalLineItems = num(el(ctt, 0));

  return base;
}

function build856(base: Record<string, unknown>, segs: Segment[]): Record<string, unknown> {
  const bsn = find(segs, 'BSN');
  if (bsn) { base.shipmentId = el(bsn, 1); base.shipmentDate = el(bsn, 2); }
  return base;
}

function build810(base: Record<string, unknown>, segs: Segment[]): Record<string, unknown> {
  const big = find(segs, 'BIG');
  const tds = find(segs, 'TDS');
  if (big) { base.invoiceDate = el(big, 0); base.invoiceNumber = el(big, 1); base.poNumber = el(big, 3); }
  if (tds) base.totalAmount = num(el(tds, 0));
  return base;
}

// ── EDIFACT ───────────────────────────────────────────────────────────────────

function buildEDIFACT(segs: Segment[], errors: string[]): unknown {
  const unb = find(segs, 'UNB');
  const unh = find(segs, 'UNH');
  const bgm = find(segs, 'BGM');
  const dtm = find(segs, 'DTM');

  const interchange = unb && {
    senderId:      el(unb, 1),
    receiverId:    el(unb, 3),
    date:          el(unb, 4),
    controlNumber: el(unb, 5),
  };

  const msgType = unh ? el(unh, 1).split(':')[0] : undefined;
  const tx: Record<string, unknown> = {
    messageType:   msgType,
    controlNumber: unh ? el(unh, 0) : undefined,
  };

  if (bgm) {
    tx.documentCode   = el(bgm, 0);
    tx.documentNumber = el(bgm, 1);
    tx.messagePurpose = el(bgm, 2);
  }
  if (dtm) tx.date = el(dtm, 1);

  // Line items from LIN (ORDERS)
  const lins = findAll(segs, 'LIN');
  if (lins.length) {
    tx.lineItems = lins.map(lin => ({
      line:       el(lin, 0),
      productId:  el(lin, 2),
    }));
  }

  const allSegments = segs.map(s => ({
    id:       s.id,
    line:     s.line,
    elements: s.elements,
    ...(s.errors.length && { errors: s.errors.map(e => e.message) }),
  }));

  return {
    standard: 'EDIFACT',
    ...(errors.length && { errors }),
    ...(interchange && { interchange }),
    transaction: tx,
    segments: allSegments,
  };
}

// ─── XML Converter ────────────────────────────────────────────────────────────

/**
 * Convert a ParseResult to a formatted XML string.
 * Mirrors the JSON structure using element tags.
 */
export function toXML(result: ParseResult): string {
  const obj = buildObject(result) as Record<string, unknown>;
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push(objectToXML(obj, 'ediDocument', 0));
  return lines.join('\n');
}

/** Escape XML special characters. */
function escXML(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function ind(level: number): string {
  return '  '.repeat(level);
}

/**
 * Recursively convert a JSON value to XML.
 * Arrays are rendered as repeated sibling elements.
 */
function objectToXML(value: unknown, tag: string, level: number): string {
  const i = ind(level);

  if (value === null || value === undefined || value === '') {
    return `${i}<${tag}/>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return `${i}<${tag}/>`;
    // Singularise the tag for array items: "segments" → "segment", "lineItems" → "lineItem"
    const itemTag = tag.endsWith('Items') ? tag.slice(0, -1)
      : tag.endsWith('s') ? tag.slice(0, -1)
      : tag;
    return value.map(item => objectToXML(item, itemTag, level)).join('\n');
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== '' && v !== null);
    if (entries.length === 0) return `${i}<${tag}/>`;
    const children = entries.map(([k, v]) => {
      const childTag = Array.isArray(v)
        ? (k.endsWith('Items') ? k.slice(0, -1) : k.endsWith('s') ? k.slice(0, -1) : k)
        : k;
      return Array.isArray(v)
        ? `${ind(level + 1)}<${k}>\n${v.map(item => objectToXML(item, childTag, level + 2)).join('\n')}\n${ind(level + 1)}</${k}>`
        : objectToXML(v, childTag, level + 1);
    });
    return `${i}<${tag}>\n${children.join('\n')}\n${i}</${tag}>`;
  }

  // Primitive
  return `${i}<${tag}>${escXML(value)}</${tag}>`;
}
