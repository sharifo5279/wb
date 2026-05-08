import {
  getX12Transaction,
  getEdifactMessage,
  getTradacomsMessage,
  type Standard,
  type TransactionDef,
  type SegmentRef,
} from './dictionaries';

// ─── Skeleton document builder ───────────────────────────────────────────────
//
// Given a standard, version, and transaction code, build a syntactically
// well-formed EDI envelope wrapping the required body segments. The output
// round-trips through parseEDI() with no envelope-level validation errors;
// element-level placeholders intentionally remain blank for the user to fill in.

export interface BuildOptions {
  /** Sender ID. Default: 'SENDER'. */
  senderId?: string;
  /** Receiver ID. Default: 'RECEIVER'. */
  receiverId?: string;
  /** Interchange / message control number. Default: '000000001' (X12) or '1' (others). */
  controlNumber?: string;
  /** Date as CCYYMMDD. Default: today (UTC). */
  date?: string;
  /** Time as HHMM. Default: now (UTC). */
  time?: string;
}

export interface BuildResult {
  text: string;
  filename: string;
}

export function buildSkeleton(
  standard: Standard,
  version: string,
  code: string,
  opts: BuildOptions = {},
): BuildResult {
  const txn =
    standard === 'X12' ? getX12Transaction(code)
    : standard === 'EDIFACT' ? getEdifactMessage(code)
    : getTradacomsMessage(code);

  if (!txn) throw new Error(`buildSkeleton: ${standard} ${code} not found in dictionary`);
  if (!txn.full || txn.segments.length === 0) {
    throw new Error(`buildSkeleton: ${standard} ${code} has no segment list (stub)`);
  }

  const now = nowParts();
  const date = opts.date ?? now.ccyymmdd;
  const time = opts.time ?? now.hhmm;
  const sender = opts.senderId ?? 'SENDER';
  const receiver = opts.receiverId ?? 'RECEIVER';

  if (standard === 'X12') return buildX12(txn, version, sender, receiver, date, time, opts.controlNumber ?? '000000001', code);
  if (standard === 'EDIFACT') return buildEdifact(txn, sender, receiver, date, time, opts.controlNumber ?? '1', code);
  return buildTradacoms(txn, sender, receiver, date, time, opts.controlNumber ?? '1', code);
}

// ─── X12 ─────────────────────────────────────────────────────────────────────

function buildX12(
  txn: TransactionDef,
  version: string,
  sender: string,
  receiver: string,
  ccyymmdd: string,
  hhmm: string,
  ctrl: string,
  code: string,
): BuildResult {
  const yymmdd = ccyymmdd.length === 8 ? ccyymmdd.slice(2) : ccyymmdd;
  const senderPad = pad(sender, 15);
  const receiverPad = pad(receiver, 15);

  const isa = `ISA*00*          *00*          *ZZ*${senderPad}*ZZ*${receiverPad}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`;
  const gs = `GS*PO*${sender}*${receiver}*${ccyymmdd}*${hhmm}*1*X*${version}`;
  // Body segments — emit one per required SegmentRef (between ST and SE).
  const body: string[] = [];
  for (const ref of txn.segments) {
    if (ref.id === 'ST' || ref.id === 'SE') continue; // we emit ST/SE explicitly
    if (!ref.required) continue;
    body.push(emitX12Placeholder(ref, code));
  }
  const stSegment = `ST*${code}*0001`;
  const segCount = body.length + 2; // ST + body + SE
  const seSegment = `SE*${segCount}*0001`;
  const ge = 'GE*1*1';
  const iea = `IEA*1*${ctrl}`;

  const text = [isa, gs, stSegment, ...body, seSegment, ge, iea].map((s) => s + '~').join('\n');
  return { text, filename: `${code}_skeleton.edi` };
}

function emitX12Placeholder(ref: SegmentRef, transactionCode: string): string {
  // Prefer beginning segments to come pre-populated with the transaction code where appropriate.
  switch (ref.id) {
    case 'BEG': return `BEG*00*NE*PO_NUMBER**${todayCcyymmdd()}`;
    case 'BAK': return `BAK*00*AC*PO_NUMBER*${todayCcyymmdd()}`;
    case 'BSN': return `BSN*00*SHIP_ID*${todayCcyymmdd()}*${nowHhmm()}`;
    case 'BIG': return `BIG*${todayCcyymmdd()}*INVOICE_NUMBER`;
    case 'BPR': return 'BPR*C*0.00*C*ACH';
    case 'BCT': return 'BCT*RE*CATALOG_NUMBER';
    case 'BIA': return `BIA*00*MA*INV_REF*${todayCcyymmdd()}`;
    case 'BCH': return `BCH*04*NE*PO_NUMBER**1*${todayCcyymmdd()}`;
    case 'BCA': return `BCA*04*AC**PO_NUMBER*${todayCcyymmdd()}`;
    case 'BRA': return `BRA*${todayCcyymmdd()}*RA_REF*00`;
    case 'BSR': return '*BSR*00*REF_ID';
    case 'BFI': return `BFI*00*RD*BB*${todayCcyymmdd()}`;
    case 'BFR': return '*BFR*00';
    case 'BDA': return `BDA*00*02*REF*${todayCcyymmdd()}`;
    case 'BCD': return `BCD*${todayCcyymmdd()}*${todayCcyymmdd()}`;
    case 'BGN': return `BGN*00*REF_ID*${todayCcyymmdd()}`;
    case 'B3':  return `B3**INVOICE_NUM*SHIP_ID*PP*L*${todayCcyymmdd()}*0.00*SCAC`;
    case 'BOL': return 'BOL*SCAC*BL_NUMBER';
    case 'B1':  return `B1*SCAC*SHIP_ID*${todayCcyymmdd()}`;
    case 'M10': return 'M10*SCAC*M';
    case 'B2':  return 'B2**SCAC**REF_ID';
    case 'B2A': return 'B2A*00';
    case 'B10': return 'B10*REF*SHIP_ID*SCAC';
    case 'W05': return 'W05*N*ORDER_NUM';
    case 'W06': return `W06*N*ORDER_NUM*${todayCcyymmdd()}`;
    case 'W17': return `W17*F*${todayCcyymmdd()}*RECEIPT_NUM`;
    case 'W15': return `W15*${todayCcyymmdd()}`;
    case 'AK1': return 'AK1*PO*1';
    case 'AK9': return 'AK9*A*1*1*1';
    case 'CTT': return 'CTT*1';
    default:
      // For loops with no specific template, emit just the segment ID with no data.
      // The user can fill in the elements; the parser will flag missing required elements
      // until they do.
      return ref.id;
  }
}

// ─── EDIFACT ────────────────────────────────────────────────────────────────

function buildEdifact(
  txn: TransactionDef,
  sender: string,
  receiver: string,
  ccyymmdd: string,
  hhmm: string,
  ctrl: string,
  code: string,
): BuildResult {
  const date = ccyymmdd.length === 8 ? ccyymmdd.slice(2) : ccyymmdd;
  const unb = `UNB+UNOB:1+${sender}+${receiver}+${date}:${hhmm}+${ctrl}`;
  const unh = `UNH+1+${code}:D:01B:UN`;

  const body: string[] = [];
  for (const ref of txn.segments) {
    if (ref.id === 'UNH' || ref.id === 'UNT') continue;
    if (!ref.required) continue;
    body.push(emitEdifactPlaceholder(ref, code));
  }
  const segCount = body.length + 2; // UNH + body + UNT
  const unt = `UNT+${segCount}+1`;
  const unz = `UNZ+1+${ctrl}`;

  const text = [unb, unh, ...body, unt, unz].map((s) => s + "'").join('\n');
  return { text, filename: `${code}_skeleton.edi` };
}

function emitEdifactPlaceholder(ref: SegmentRef, _code: string): string {
  switch (ref.id) {
    case 'BGM': return 'BGM+220+REF_NUMBER+9';
    case 'UCI': return 'UCI+1+SENDER+RECEIVER+7';
    default: return ref.id;
  }
}

// ─── TRADACOMS ──────────────────────────────────────────────────────────────

function buildTradacoms(
  txn: TransactionDef,
  sender: string,
  receiver: string,
  ccyymmdd: string,
  _hhmm: string,
  ctrl: string,
  code: string,
): BuildResult {
  const yymmdd = ccyymmdd.length === 8 ? ccyymmdd.slice(2) : ccyymmdd;
  const stx = `STX=ANA:1+${sender}:${sender}+${receiver}:${receiver}+${yymmdd}:${ctrl}+${ctrl}`;
  const mhd = `MHD=1+${code}:9`;

  const body: string[] = [];
  for (const ref of txn.segments) {
    if (ref.id === 'MHD' || ref.id === 'MTR') continue;
    if (!ref.required) continue;
    body.push(emitTradacomsPlaceholder(ref));
  }
  const mtr = `MTR=${body.length + 2}`; // MHD + body + MTR
  const end = 'END=1';

  const text = [stx, mhd, ...body, mtr, end].map((s) => s + "'").join('\n');
  return { text, filename: `${code}_skeleton.edi` };
}

function emitTradacomsPlaceholder(ref: SegmentRef): string {
  switch (ref.id) {
    case 'TYP': return 'TYP=0430+ORDERS';
    case 'FIL': return `FIL=1+1+${todayYymmdd()}`;
    default: return `${ref.id}=`;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pad(s: string, len: number): string {
  return s.padEnd(len, ' ').slice(0, len);
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

function todayCcyymmdd(): string { return nowParts().ccyymmdd; }
function todayYymmdd(): string { return nowParts().ccyymmdd.slice(2); }
function nowHhmm(): string { return nowParts().hhmm; }
