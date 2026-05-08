import type { ParseResult, Segment } from './types';

// ─── Functional acknowledgment generation ────────────────────────────────────
//
// Builds an X12 997 (or EDIFACT CONTRL) document in response to an inbound
// transaction. The acknowledgment status per transaction set is derived from
// the parse errors attached to that ST..SE block:
//
//   no errors                      → 'A' Accepted
//   error severity, parser-only    → 'R' Rejected
//   warning severity only          → 'E' Accepted with Errors
//
// Output is a complete EDI envelope (ISA…IEA for 997, UNB…UNZ for CONTRL)
// that round-trips through `parseEDI()` with no mismatches.

export interface AckOptions {
  /** Override sender ID. Defaults to swap of incoming receiver. */
  senderId?: string;
  /** Override receiver ID. Defaults to swap of incoming sender. */
  receiverId?: string;
  /** Override interchange control number. Default: '000000001'. */
  controlNumber?: string;
  /** Date for headers as CCYYMMDD. Default: today (UTC). */
  date?: string;
  /** Time for headers as HHMM. Default: now (UTC). */
  time?: string;
}

export interface AckSetStatus {
  set: string;
  control: string;
  status: 'A' | 'E' | 'R';
  errorCount: number;
}

export interface AckResult {
  text: string;
  filename: string;
  overallStatus: 'A' | 'E' | 'R' | 'P';
  setStatuses: AckSetStatus[];
}

export function generateAck(result: ParseResult, options: AckOptions = {}): AckResult {
  if (result.standard === 'X12') return generate997(result, options);
  if (result.standard === 'EDIFACT') return generateContrl(result, options);
  throw new Error(`generateAck: unsupported standard "${result.standard}"`);
}

// ─── X12 997 ─────────────────────────────────────────────────────────────────

function generate997(result: ParseResult, opts: AckOptions): AckResult {
  const isa = result.segments.find((s) => s.id === 'ISA');
  const gs = result.segments.find((s) => s.id === 'GS');
  if (!isa || !gs) {
    throw new Error('generateAck: incoming X12 document missing ISA/GS envelope');
  }

  const incomingSender = (isa.elements[5] ?? '').trim();
  const incomingReceiver = (isa.elements[7] ?? '').trim();
  const sender = opts.senderId ?? (incomingReceiver || 'ACK_SENDER');
  const receiver = opts.receiverId ?? (incomingSender || 'ACK_RECEIVER');

  const stBlocks = collectBlocks(result.segments, 'ST', 'SE');
  const setStatuses: AckSetStatus[] = stBlocks.map((b) => {
    const errs = b.segments.flatMap((s) => s.errors).filter(severityIsError);
    const warns = b.segments.flatMap((s) => s.errors).filter(severityIsWarning);
    const status: 'A' | 'E' | 'R' = errs.length > 0 ? 'R' : warns.length > 0 ? 'E' : 'A';
    return {
      set: (b.start.elements[0] ?? '').trim(),
      control: (b.start.elements[1] ?? '').trim(),
      status,
      errorCount: errs.length,
    };
  });

  const accepted = setStatuses.filter((s) => s.status === 'A').length;
  const overallStatus: AckResult['overallStatus'] =
    setStatuses.every((s) => s.status === 'A') ? 'A'
    : setStatuses.every((s) => s.status === 'R') ? 'R'
    : accepted === 0 ? 'R' : 'P';

  const ctrl = opts.controlNumber ?? '000000001';
  const now = nowParts();
  const ccyymmdd = opts.date ?? now.ccyymmdd;
  const yymmdd = ccyymmdd.length === 8 ? ccyymmdd.slice(2) : ccyymmdd;
  const hhmm = opts.time ?? now.hhmm;

  const senderPad = pad(sender, 15);
  const receiverPad = pad(receiver, 15);

  // Inside the envelope: ST .. AK1 .. AK2/AK5 .. AK9 .. SE
  const inner: string[] = [];
  inner.push('ST*997*0001');
  inner.push(`AK1*${(gs.elements[0] ?? '').trim()}*${(gs.elements[5] ?? '').trim()}`);
  for (const ss of setStatuses) {
    inner.push(`AK2*${ss.set}*${ss.control}`);
    inner.push(`AK5*${ss.status}`);
  }
  inner.push(`AK9*${overallStatus}*${setStatuses.length}*${setStatuses.length}*${accepted}`);
  // SE01 = number of segments from ST to SE inclusive (current count + the SE line itself)
  inner.push(`SE*${inner.length + 1}*0001`);

  const isaSeg =
    `ISA*00*          *00*          *ZZ*${senderPad}*ZZ*${receiverPad}` +
    `*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`;
  const gsSeg = `GS*FA*${sender}*${receiver}*${ccyymmdd}*${hhmm}*1*X*005010`;
  const geSeg = `GE*1*1`;
  const ieaSeg = `IEA*1*${ctrl}`;

  const text = [isaSeg, gsSeg, ...inner, geSeg, ieaSeg].map((s) => s + '~').join('\n');

  return {
    text,
    filename: `997_${trimLeadingZeros(ctrl) || '1'}.edi`,
    overallStatus,
    setStatuses,
  };
}

// ─── EDIFACT CONTRL ──────────────────────────────────────────────────────────

function generateContrl(result: ParseResult, opts: AckOptions): AckResult {
  const unb = result.segments.find((s) => s.id === 'UNB');
  if (!unb) {
    throw new Error('generateAck: incoming EDIFACT document missing UNB envelope');
  }

  const incomingSender = (unb.elements[1] ?? '').trim();
  const incomingReceiver = (unb.elements[2] ?? '').trim();
  const sender = opts.senderId ?? (incomingReceiver || 'ACK_SENDER');
  const receiver = opts.receiverId ?? (incomingSender || 'ACK_RECEIVER');
  const incomingRef = (unb.elements[4] ?? '').trim();

  const unhBlocks = collectBlocks(result.segments, 'UNH', 'UNT');
  const setStatuses: AckSetStatus[] = unhBlocks.map((b) => {
    const errs = b.segments.flatMap((s) => s.errors).filter(severityIsError);
    const warns = b.segments.flatMap((s) => s.errors).filter(severityIsWarning);
    const status: 'A' | 'E' | 'R' = errs.length > 0 ? 'R' : warns.length > 0 ? 'E' : 'A';
    const composite = b.start.elements[1] ?? '';
    return {
      set: composite.split(':')[0]?.trim() ?? '',
      control: (b.start.elements[0] ?? '').trim(),
      status,
      errorCount: errs.length,
    };
  });

  const accepted = setStatuses.filter((s) => s.status === 'A').length;
  const overallStatus: AckResult['overallStatus'] =
    setStatuses.every((s) => s.status === 'A') ? 'A'
    : setStatuses.every((s) => s.status === 'R') ? 'R'
    : accepted === 0 ? 'R' : 'P';
  const overallEdiCode = overallStatus === 'A' ? '7' : overallStatus === 'R' ? '4' : '8';

  const ctrl = opts.controlNumber ?? '1';
  const now = nowParts();
  const date = (opts.date ?? now.ccyymmdd).slice(2); // EDIFACT typically YYMMDD
  const hhmm = opts.time ?? now.hhmm;

  const inner: string[] = [];
  inner.push(`UNH+1+CONTRL:D:96A:UN`);
  inner.push(`UCI+${incomingRef}+${incomingSender}+${incomingReceiver}+${overallEdiCode}`);
  for (const ss of setStatuses) {
    const ediCode = ss.status === 'A' ? '7' : ss.status === 'R' ? '4' : '8';
    inner.push(`UCM+${ss.control}+${ss.set}:D:96A:UN+${ediCode}`);
  }
  inner.push(`UNT+${inner.length + 1}+1`);

  const unbSeg = `UNB+UNOB:1+${sender}+${receiver}+${date}:${hhmm}+${ctrl}`;
  const unzSeg = `UNZ+1+${ctrl}`;

  const text = [unbSeg, ...inner, unzSeg].map((s) => s + "'").join('\n');

  return {
    text,
    filename: `CONTRL_${ctrl}.edi`,
    overallStatus,
    setStatuses,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface Block {
  start: Segment;
  end: Segment;
  segments: Segment[];
}

function collectBlocks(segs: Segment[], startId: string, endId: string): Block[] {
  const blocks: Block[] = [];
  let lo = -1;
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].id === startId) lo = i;
    else if (segs[i].id === endId && lo >= 0) {
      blocks.push({ start: segs[lo], end: segs[i], segments: segs.slice(lo, i + 1) });
      lo = -1;
    }
  }
  return blocks;
}

function severityIsError(e: { severity?: 'error' | 'warning' }): boolean {
  return (e.severity ?? 'error') === 'error';
}
function severityIsWarning(e: { severity?: 'error' | 'warning' }): boolean {
  return e.severity === 'warning';
}

function pad(s: string, len: number): string {
  return s.padEnd(len, ' ').slice(0, len);
}

function trimLeadingZeros(s: string): string {
  return s.replace(/^0+/, '');
}

function nowParts(): { ccyymmdd: string; hhmm: string } {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return { ccyymmdd: `${yyyy}${mm}${dd}`, hhmm: `${hh}${min}` };
}
