import type { ParseResult, Segment } from './types';

// ─── Functional acknowledgment generation ────────────────────────────────────
//
// Builds an X12 997 / 999, EDIFACT CONTRL, or TRADACOMS ACKHDR document in
// response to an inbound transaction.
//
// Per-set status is derived from parse errors by default (any error → R,
// warning-only → E, clean → A) but every status — per-set and overall — can
// be overridden by the caller. Sender / receiver / control number / date /
// time are all overridable too. The output round-trips through parseEDI()
// with no envelope-level mismatches.

export type AckStatus = 'A' | 'E' | 'R' | 'P';
/** Which acknowledgment "variant" to emit. */
export type AckVariant = '997' | '999' | 'CONTRL' | 'ACKHDR';

export interface AckOptions {
  /** Variant to emit. Defaults: X12 → '997', EDIFACT → 'CONTRL', TRADACOMS → 'ACKHDR'. */
  variant?: AckVariant;
  /** Override sender ID. Defaults to swap of incoming receiver. */
  senderId?: string;
  /** Override receiver ID. Defaults to swap of incoming sender. */
  receiverId?: string;
  /** Override interchange control number. */
  controlNumber?: string;
  /** Date as CCYYMMDD. Default: today (UTC). */
  date?: string;
  /** Time as HHMM. Default: now (UTC). */
  time?: string;
  /**
   * Per-set status override, keyed by transaction-set control number.
   * Lets the caller force `A` even when the parser found errors, or `R`
   * even when the parser thought everything was clean. Missing keys fall
   * back to the validation-derived status.
   */
  setStatusOverrides?: Record<string, AckStatus>;
  /** Override the overall envelope-level status. */
  overallStatusOverride?: AckStatus;
}

export interface AckSetStatus {
  set: string;
  control: string;
  status: AckStatus;
  errorCount: number;
  /** Status that would have been assigned by error count alone. */
  derivedStatus: AckStatus;
}

export interface AckResult {
  text: string;
  filename: string;
  overallStatus: AckStatus;
  setStatuses: AckSetStatus[];
}

export function generateAck(result: ParseResult, options: AckOptions = {}): AckResult {
  const variant = options.variant ?? (
    result.standard === 'X12' ? '997' :
    result.standard === 'EDIFACT' ? 'CONTRL' :
    result.standard === 'TRADACOMS' ? 'ACKHDR' :
    null
  );

  if (!variant) {
    throw new Error(`generateAck: unsupported standard "${result.standard}"`);
  }

  if (variant === '997' || variant === '999') {
    if (result.standard !== 'X12') throw new Error(`generateAck: ${variant} requires an X12 source document`);
    return generateX12Ack(result, options, variant);
  }
  if (variant === 'CONTRL') {
    if (result.standard !== 'EDIFACT') throw new Error('generateAck: CONTRL requires an EDIFACT source document');
    return generateContrl(result, options);
  }
  if (variant === 'ACKHDR') {
    if (result.standard !== 'TRADACOMS') throw new Error('generateAck: ACKHDR requires a TRADACOMS source document');
    return generateAckhdr(result, options);
  }
  throw new Error(`generateAck: unsupported variant "${variant}"`);
}

// ─── X12 997 / 999 ───────────────────────────────────────────────────────────

function generateX12Ack(result: ParseResult, opts: AckOptions, variant: '997' | '999'): AckResult {
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
    const derived: AckStatus = errs.length > 0 ? 'R' : warns.length > 0 ? 'E' : 'A';
    const control = (b.start.elements[1] ?? '').trim();
    const overridden = opts.setStatusOverrides?.[control];
    return {
      set: (b.start.elements[0] ?? '').trim(),
      control,
      status: overridden ?? derived,
      derivedStatus: derived,
      errorCount: errs.length,
    };
  });

  const accepted = setStatuses.filter((s) => s.status === 'A').length;
  const overallStatus: AckStatus =
    opts.overallStatusOverride ??
    (setStatuses.every((s) => s.status === 'A') ? 'A'
     : setStatuses.every((s) => s.status === 'R') ? 'R'
     : accepted === 0 ? 'R' : 'P');

  const ctrl = opts.controlNumber ?? '000000001';
  const now = nowParts();
  const ccyymmdd = opts.date ?? now.ccyymmdd;
  const yymmdd = ccyymmdd.length === 8 ? ccyymmdd.slice(2) : ccyymmdd;
  const hhmm = opts.time ?? now.hhmm;

  const senderPad = pad(sender, 15);
  const receiverPad = pad(receiver, 15);

  const inner: string[] = [];
  inner.push(`ST*${variant}*0001`);
  inner.push(`AK1*${(gs.elements[0] ?? '').trim()}*${(gs.elements[5] ?? '').trim()}`);
  for (const ss of setStatuses) {
    if (variant === '997') {
      inner.push(`AK2*${ss.set}*${ss.control}`);
      inner.push(`AK5*${ss.status}`);
    } else {
      // 999 — same shape but allowed to carry IK3/IK4 detail (we don't generate those here)
      inner.push(`AK2*${ss.set}*${ss.control}`);
      inner.push(`IK5*${ss.status}`);
    }
  }
  inner.push(`AK9*${overallStatus}*${setStatuses.length}*${setStatuses.length}*${accepted}`);
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
    filename: `${variant}_${trimLeadingZeros(ctrl) || '1'}.edi`,
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
    const derived: AckStatus = errs.length > 0 ? 'R' : warns.length > 0 ? 'E' : 'A';
    const composite = b.start.elements[1] ?? '';
    const control = (b.start.elements[0] ?? '').trim();
    const overridden = opts.setStatusOverrides?.[control];
    return {
      set: composite.split(':')[0]?.trim() ?? '',
      control,
      status: overridden ?? derived,
      derivedStatus: derived,
      errorCount: errs.length,
    };
  });

  const accepted = setStatuses.filter((s) => s.status === 'A').length;
  const overallStatus: AckStatus =
    opts.overallStatusOverride ??
    (setStatuses.every((s) => s.status === 'A') ? 'A'
     : setStatuses.every((s) => s.status === 'R') ? 'R'
     : accepted === 0 ? 'R' : 'P');
  const overallEdiCode = overallStatus === 'A' ? '7' : overallStatus === 'R' ? '4' : '8';

  const ctrl = opts.controlNumber ?? '1';
  const now = nowParts();
  const date = (opts.date ?? now.ccyymmdd).slice(2);
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

// ─── TRADACOMS ACKHDR ────────────────────────────────────────────────────────

function generateAckhdr(result: ParseResult, opts: AckOptions): AckResult {
  const stx = result.segments.find((s) => s.id === 'STX');
  if (!stx) {
    throw new Error('generateAck: incoming TRADACOMS document missing STX envelope');
  }

  const incomingSender = (stx.elements[1] ?? '').split(':')[0]?.trim() ?? '';
  const incomingReceiver = (stx.elements[2] ?? '').split(':')[0]?.trim() ?? '';
  const sender = opts.senderId ?? (incomingReceiver || 'ACKSND');
  const receiver = opts.receiverId ?? (incomingSender || 'ACKRCV');

  // Each MHD..MTR is a "message" we acknowledge.
  const mhdBlocks = collectBlocks(result.segments, 'MHD', 'MTR');
  const setStatuses: AckSetStatus[] = mhdBlocks.map((b) => {
    const errs = b.segments.flatMap((s) => s.errors).filter(severityIsError);
    const composite = b.start.elements[1] ?? '';
    const control = (b.start.elements[0] ?? '').trim();
    const derived: AckStatus = errs.length > 0 ? 'R' : 'A';
    const overridden = opts.setStatusOverrides?.[control];
    return {
      set: composite.split(':')[0]?.trim() ?? '',
      control,
      status: overridden ?? derived,
      derivedStatus: derived,
      errorCount: errs.length,
    };
  });

  const overallStatus: AckStatus =
    opts.overallStatusOverride ??
    (setStatuses.every((s) => s.status === 'A') ? 'A'
     : setStatuses.every((s) => s.status === 'R') ? 'R'
     : 'P');

  const ctrl = opts.controlNumber ?? '1';
  const now = nowParts();
  const yymmdd = (opts.date ?? now.ccyymmdd).slice(2);

  const stxLine = `STX=ANA:1+${sender}:${sender}+${receiver}:${receiver}+${yymmdd}:${ctrl}+${ctrl}`;
  const ackLines = setStatuses.map((s) => `ACK=${s.control || '0'}+${s.status === 'A' ? 'AC' : 'RJ'}`);
  const messageInner = ['MHD=1+ACKHDR:9', ...ackLines];
  messageInner.push(`MTR=${messageInner.length + 1}`);
  const endLine = 'END=1';

  const text = [stxLine, ...messageInner, endLine].map((s) => s + "'").join('\n');

  return {
    text,
    filename: `ACKHDR_${ctrl}.edi`,
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
