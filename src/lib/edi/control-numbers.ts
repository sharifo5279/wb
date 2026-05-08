// ─── Control number incrementing ────────────────────────────────────────────
//
// Bumps the control number element in every header/trailer pair by +1, in
// place on the raw EDI text. Each pair (ISA13/IEA02, GS06/GE02, ST02/SE02
// for X12; UNB05/UNZ02, UNG05/UNE02, UNH01/UNT02 for EDIFACT) is incremented
// independently. If header and trailer were aligned to start, they stay
// aligned after bumping.
//
// Original padding is preserved: "0001" → "0002", "000000001" → "000000002".

export interface IncrementChange {
  segmentId: string;
  /** 1-based element position within the segment. */
  element: number;
  fromValue: string;
  toValue: string;
}

export interface IncrementResult {
  text: string;
  changes: IncrementChange[];
}

interface IncrementRule {
  segmentId: string;
  /** 1-based element position. element=1 is the first data element after the segment ID. */
  element: number;
}

const X12_RULES: IncrementRule[] = [
  { segmentId: 'ISA', element: 13 },
  { segmentId: 'IEA', element: 2 },
  { segmentId: 'GS',  element: 6 },
  { segmentId: 'GE',  element: 2 },
  { segmentId: 'ST',  element: 2 },
  { segmentId: 'SE',  element: 2 },
];

const EDIFACT_RULES: IncrementRule[] = [
  { segmentId: 'UNB', element: 5 },
  { segmentId: 'UNZ', element: 2 },
  { segmentId: 'UNG', element: 5 },
  { segmentId: 'UNE', element: 2 },
  { segmentId: 'UNH', element: 1 },
  { segmentId: 'UNT', element: 2 },
];

export function incrementControlNumbers(raw: string): IncrementResult {
  if (raw.startsWith('ISA') && raw.length >= 106) {
    return bump(raw, raw[3], raw[105], X12_RULES, '');
  }
  if (raw.startsWith('UNA') && raw.length >= 9) {
    return bump(raw.slice(9), raw[4], raw[8], EDIFACT_RULES, raw.slice(0, 9));
  }
  if (raw.startsWith('UNB')) {
    return bump(raw, '+', "'", EDIFACT_RULES, '');
  }
  return { text: raw, changes: [] };
}

function bump(
  body: string,
  elemSep: string,
  segTerm: string,
  rules: IncrementRule[],
  prefix: string,
): IncrementResult {
  const ruleByid = new Map(rules.map((r) => [r.segmentId, r.element]));
  const parts = body.split(segTerm);
  const changes: IncrementChange[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const trimmed = part.trim();
    if (!trimmed) continue;

    const leadingWs = part.length - part.trimStart().length;
    const trailingWs = part.length - part.trimEnd().length;
    const ws = part.slice(0, leadingWs);
    const tail = trailingWs > 0 ? part.slice(part.length - trailingWs) : '';

    const fields = trimmed.split(elemSep);
    const id = fields[0];
    const elPos = ruleByid.get(id);
    if (elPos === undefined) continue;
    if (fields.length <= elPos) continue;

    const orig = fields[elPos];
    const next = bumpNumeric(orig);
    if (next === orig) continue;

    fields[elPos] = next;
    parts[i] = ws + fields.join(elemSep) + tail;
    changes.push({ segmentId: id, element: elPos, fromValue: orig, toValue: next });
  }

  return { text: prefix + parts.join(segTerm), changes };
}

/** Increment a numeric string by 1, preserving leading-zero padding. Non-numeric input passes through. */
function bumpNumeric(s: string): string {
  const trimmed = s.trim();
  if (trimmed.length === 0) return s;
  const n = parseInt(trimmed, 10);
  if (Number.isNaN(n)) return s;
  return String(n + 1).padStart(trimmed.length, '0');
}
