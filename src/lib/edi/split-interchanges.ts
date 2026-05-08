// ─── Split a batch into single-interchange documents ────────────────────────
//
// Given raw EDI text containing one or more interchanges (X12 ISA…IEA or
// EDIFACT UNB…UNZ), return a list of standalone single-interchange documents
// that can be saved or transmitted individually.

export interface SplitInterchange {
  index: number;          // 1-based
  filename: string;
  text: string;
  /** Sender ID extracted from the envelope, if available. */
  sender?: string;
  /** Receiver ID. */
  receiver?: string;
  /** Interchange control number. */
  controlNumber?: string;
}

export function splitInterchanges(raw: string): SplitInterchange[] {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('ISA') && trimmed.length >= 106) {
    return splitX12(raw, trimmed[3], trimmed[105]);
  }
  if (trimmed.startsWith('UNA') || trimmed.startsWith('UNB')) {
    const elemSep = trimmed.startsWith('UNA') ? trimmed[4] : '+';
    const segTerm = trimmed.startsWith('UNA') ? trimmed[8] : "'";
    return splitEdifact(raw, elemSep, segTerm);
  }
  return [];
}

function splitX12(raw: string, elemSep: string, segTerm: string): SplitInterchange[] {
  const out: SplitInterchange[] = [];
  const parts = raw.split(segTerm).map((p) => p.trim()).filter(Boolean);

  let current: string[] | null = null;
  let isaFields: string[] | null = null;

  for (const p of parts) {
    const fields = p.split(elemSep);
    const id = fields[0];

    if (id === 'ISA') {
      if (current) flush(out, current, isaFields, segTerm, elemSep);
      current = [p];
      isaFields = fields;
    } else if (id === 'IEA' && current) {
      current.push(p);
      flush(out, current, isaFields, segTerm, elemSep);
      current = null;
      isaFields = null;
    } else if (current) {
      current.push(p);
    }
  }
  if (current) flush(out, current, isaFields, segTerm, elemSep);

  return out;
}

function flush(
  out: SplitInterchange[],
  segments: string[],
  isaFields: string[] | null,
  segTerm: string,
  _elemSep: string,
): void {
  const text = segments.map((s) => s + segTerm).join('\n');
  const idx = out.length + 1;
  const sender = isaFields?.[6]?.trim();
  const receiver = isaFields?.[8]?.trim();
  const ctrl = isaFields?.[13]?.trim();
  out.push({
    index: idx,
    filename: `interchange_${ctrl ? ctrl.replace(/^0+/, '') || '0' : idx}.edi`,
    text,
    sender,
    receiver,
    controlNumber: ctrl,
  });
}

function splitEdifact(raw: string, elemSep: string, segTerm: string): SplitInterchange[] {
  const out: SplitInterchange[] = [];
  const stripped = raw.startsWith('UNA') ? raw.slice(9) : raw;
  const una = raw.startsWith('UNA') ? raw.slice(0, 9) : '';

  const parts = stripped.split(segTerm).map((p) => p.trim()).filter(Boolean);
  let current: string[] | null = null;
  let unbFields: string[] | null = null;

  for (const p of parts) {
    const fields = p.split(elemSep);
    const id = fields[0];

    if (id === 'UNB') {
      if (current) flushEdifact(out, current, unbFields, una, segTerm);
      current = [p];
      unbFields = fields;
    } else if (id === 'UNZ' && current) {
      current.push(p);
      flushEdifact(out, current, unbFields, una, segTerm);
      current = null;
      unbFields = null;
    } else if (current) {
      current.push(p);
    }
  }
  if (current) flushEdifact(out, current, unbFields, una, segTerm);
  return out;
}

function flushEdifact(
  out: SplitInterchange[],
  segments: string[],
  unbFields: string[] | null,
  una: string,
  segTerm: string,
): void {
  const text = (una ? una + '\n' : '') + segments.map((s) => s + segTerm).join('\n');
  const idx = out.length + 1;
  const sender = (unbFields?.[2] ?? '').split(':')[0]?.trim();
  const receiver = (unbFields?.[3] ?? '').split(':')[0]?.trim();
  const ctrl = unbFields?.[5]?.trim();
  out.push({
    index: idx,
    filename: `interchange_${ctrl || idx}.edi`,
    text,
    sender,
    receiver,
    controlNumber: ctrl,
  });
}
