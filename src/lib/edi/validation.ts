import type { ParseResult, ParseError, Segment } from './types';
import { getX12Transaction, getEdifactMessage } from './dictionaries';

// ─── Cross-segment validation ────────────────────────────────────────────────
//
// These checks run after the per-segment parse. They catch the kinds of errors
// classic EDI Notepad surfaced as "control mismatches" — trailer counts,
// envelope/group/transaction control number agreement, and presence of
// mandatory segments per transaction set.

/**
 * Validate X12 trailer counts and control numbers, plus mandatory segments
 * for transactions where we have a curated structure.
 *
 * Mutates `result.errors` and per-segment `errors[]` to add the new findings.
 */
export function validateX12(result: ParseResult): void {
  const segments = result.segments;
  const idToIdx: Map<string, number[]> = new Map();
  for (let i = 0; i < segments.length; i++) {
    const arr = idToIdx.get(segments[i].id);
    if (arr) arr.push(i);
    else idToIdx.set(segments[i].id, [i]);
  }

  // ── ISA / IEA control-number agreement ───────────────────────────────────
  const isaIdxs = idToIdx.get('ISA') ?? [];
  const ieaIdxs = idToIdx.get('IEA') ?? [];
  if (isaIdxs.length === 1 && ieaIdxs.length === 1) {
    const isa = segments[isaIdxs[0]];
    const iea = segments[ieaIdxs[0]];
    const isaCtrl = (isa.elements[12] ?? '').trim();
    const ieaCtrl = (iea.elements[1] ?? '').trim();
    if (isaCtrl && ieaCtrl && isaCtrl !== ieaCtrl) {
      pushError(result, iea, {
        line: iea.line, segmentId: 'IEA', severity: 'error',
        message: `Control number mismatch: ISA13 (${isaCtrl}) ≠ IEA02 (${ieaCtrl})`,
      });
    }
    // IEA01 must equal the count of GS segments
    const gsCount = (idToIdx.get('GS') ?? []).length;
    const declared = parseInt((iea.elements[0] ?? '').trim(), 10);
    if (!Number.isNaN(declared) && declared !== gsCount) {
      pushError(result, iea, {
        line: iea.line, segmentId: 'IEA', severity: 'error',
        message: `Functional group count mismatch: IEA01 declares ${declared}, found ${gsCount} GS segment(s)`,
      });
    }
  }

  // ── GS / GE pairs ────────────────────────────────────────────────────────
  const gsList = (idToIdx.get('GS') ?? []).map((i) => ({ idx: i, seg: segments[i] }));
  const geList = (idToIdx.get('GE') ?? []).map((i) => ({ idx: i, seg: segments[i] }));
  // Pair them in order; a missing GE for a GS is a different kind of error
  // (handled by hierarchy correctness later) but a mismatched control # is here.
  for (let p = 0; p < Math.min(gsList.length, geList.length); p++) {
    const gs = gsList[p].seg, ge = geList[p].seg;
    const gsCtrl = (gs.elements[5] ?? '').trim();
    const geCtrl = (ge.elements[1] ?? '').trim();
    if (gsCtrl && geCtrl && gsCtrl !== geCtrl) {
      pushError(result, ge, {
        line: ge.line, segmentId: 'GE', severity: 'error',
        message: `Control number mismatch: GS06 (${gsCtrl}) ≠ GE02 (${geCtrl})`,
      });
    }
    // GE01 must equal count of ST segments inside this GS..GE block
    const stCountInGroup = countBetween(segments, gsList[p].idx, geList[p].idx, 'ST');
    const declared = parseInt((ge.elements[0] ?? '').trim(), 10);
    if (!Number.isNaN(declared) && declared !== stCountInGroup) {
      pushError(result, ge, {
        line: ge.line, segmentId: 'GE', severity: 'error',
        message: `Transaction set count mismatch: GE01 declares ${declared}, found ${stCountInGroup} ST segment(s)`,
      });
    }
  }

  // ── ST / SE pairs ────────────────────────────────────────────────────────
  const stList = (idToIdx.get('ST') ?? []).map((i) => ({ idx: i, seg: segments[i] }));
  const seList = (idToIdx.get('SE') ?? []).map((i) => ({ idx: i, seg: segments[i] }));
  for (let p = 0; p < Math.min(stList.length, seList.length); p++) {
    const st = stList[p].seg, se = seList[p].seg;
    const stCtrl = (st.elements[1] ?? '').trim();
    const seCtrl = (se.elements[1] ?? '').trim();
    if (stCtrl && seCtrl && stCtrl !== seCtrl) {
      pushError(result, se, {
        line: se.line, segmentId: 'SE', severity: 'error',
        message: `Control number mismatch: ST02 (${stCtrl}) ≠ SE02 (${seCtrl})`,
      });
    }
    // SE01 must equal segment count from ST..SE inclusive
    const expected = seList[p].idx - stList[p].idx + 1;
    const declared = parseInt((se.elements[0] ?? '').trim(), 10);
    if (!Number.isNaN(declared) && declared !== expected) {
      pushError(result, se, {
        line: se.line, segmentId: 'SE', severity: 'error',
        message: `Segment count mismatch: SE01 declares ${declared}, found ${expected} segments from ST to SE`,
      });
    }

    // ── Mandatory segments per transaction set ────────────────────────────
    const setCode = (st.elements[0] ?? '').trim();
    const txn = setCode ? getX12Transaction(setCode) : undefined;
    if (txn && txn.full && txn.segments.length > 0) {
      const presentInBlock = collectIdsBetween(segments, stList[p].idx, seList[p].idx);
      const seen = new Set<string>();
      for (const ref of txn.segments) {
        if (!ref.required || seen.has(ref.id)) continue;
        seen.add(ref.id);
        if (!presentInBlock.has(ref.id)) {
          pushError(result, st, {
            line: st.line, segmentId: ref.id, severity: 'error',
            message: `Transaction set ${setCode}: required segment "${ref.id}" is missing`,
          });
        }
      }
    }
  }
}

/**
 * Validate EDIFACT trailer counts, control-number agreement, and mandatory
 * segments for messages with curated structure.
 */
export function validateEdifact(result: ParseResult): void {
  const segments = result.segments;
  const idToIdx: Map<string, number[]> = new Map();
  for (let i = 0; i < segments.length; i++) {
    const arr = idToIdx.get(segments[i].id);
    if (arr) arr.push(i);
    else idToIdx.set(segments[i].id, [i]);
  }

  // ── UNB / UNZ control number ─────────────────────────────────────────────
  const unbIdxs = idToIdx.get('UNB') ?? [];
  const unzIdxs = idToIdx.get('UNZ') ?? [];
  if (unbIdxs.length === 1 && unzIdxs.length === 1) {
    const unb = segments[unbIdxs[0]];
    const unz = segments[unzIdxs[0]];
    // UNB05 = control reference (composite-stripped). UNZ02 = same value.
    const unbCtrl = (unb.elements[4] ?? '').trim();
    const unzCtrl = (unz.elements[1] ?? '').trim();
    if (unbCtrl && unzCtrl && unbCtrl !== unzCtrl) {
      pushError(result, unz, {
        line: unz.line, segmentId: 'UNZ', severity: 'error',
        message: `Control number mismatch: UNB05 (${unbCtrl}) ≠ UNZ02 (${unzCtrl})`,
      });
    }
    // UNZ01 = count of messages
    const msgCount = (idToIdx.get('UNH') ?? []).length;
    const declared = parseInt((unz.elements[0] ?? '').trim(), 10);
    if (!Number.isNaN(declared) && declared !== msgCount) {
      pushError(result, unz, {
        line: unz.line, segmentId: 'UNZ', severity: 'error',
        message: `Message count mismatch: UNZ01 declares ${declared}, found ${msgCount} UNH segment(s)`,
      });
    }
  }

  // ── UNH / UNT pairs ──────────────────────────────────────────────────────
  const unhList = (idToIdx.get('UNH') ?? []).map((i) => ({ idx: i, seg: segments[i] }));
  const untList = (idToIdx.get('UNT') ?? []).map((i) => ({ idx: i, seg: segments[i] }));
  for (let p = 0; p < Math.min(unhList.length, untList.length); p++) {
    const unh = unhList[p].seg, unt = untList[p].seg;
    const unhRef = (unh.elements[0] ?? '').trim();
    const untRef = (unt.elements[1] ?? '').trim();
    if (unhRef && untRef && unhRef !== untRef) {
      pushError(result, unt, {
        line: unt.line, segmentId: 'UNT', severity: 'error',
        message: `Reference mismatch: UNH01 (${unhRef}) ≠ UNT02 (${untRef})`,
      });
    }
    const expected = untList[p].idx - unhList[p].idx + 1;
    const declared = parseInt((unt.elements[0] ?? '').trim(), 10);
    if (!Number.isNaN(declared) && declared !== expected) {
      pushError(result, unt, {
        line: unt.line, segmentId: 'UNT', severity: 'error',
        message: `Segment count mismatch: UNT01 declares ${declared}, found ${expected} segments from UNH to UNT`,
      });
    }

    // ── Mandatory segments per message ────────────────────────────────────
    // UNH01 is the message ref. UNH02 is the message identifier composite,
    // and the first sub-component (split by ':') is the message type code.
    const messageIdComposite = (unh.elements[1] ?? '');
    const messageCode = messageIdComposite.split(':')[0]?.trim() ?? '';
    const msg = messageCode ? getEdifactMessage(messageCode) : undefined;
    if (msg && msg.full && msg.segments.length > 0) {
      const presentInBlock = collectIdsBetween(segments, unhList[p].idx, untList[p].idx);
      const seen = new Set<string>();
      for (const ref of msg.segments) {
        if (!ref.required || seen.has(ref.id)) continue;
        seen.add(ref.id);
        if (!presentInBlock.has(ref.id)) {
          pushError(result, unh, {
            line: unh.line, segmentId: ref.id, severity: 'error',
            message: `Message ${messageCode}: required segment "${ref.id}" is missing`,
          });
        }
      }
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pushError(result: ParseResult, seg: Segment, err: ParseError) {
  seg.errors.push(err);
  result.errors.push(err);
}

function countBetween(segs: Segment[], lo: number, hi: number, id: string): number {
  let n = 0;
  for (let i = lo + 1; i < hi; i++) if (segs[i].id === id) n++;
  return n;
}

function collectIdsBetween(segs: Segment[], lo: number, hi: number): Set<string> {
  const s = new Set<string>();
  for (let i = lo; i <= hi; i++) s.add(segs[i].id);
  return s;
}
