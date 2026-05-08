import type { ParseResult, Segment, SegmentNode, ParseError } from './types';
import { getTradacomsDescriptor } from './descriptors';

// ─── TRADACOMS tokenizer and hierarchy builder ───────────────────────────────
//
// TRADACOMS is the UK retail EDI standard. Syntax:
//   TAG=ELEM1+ELEM2+ELEM3'
// where:
//   '='  separates the segment tag from its data area
//   '+'  separates elements
//   ':'  separates components within a composite
//   '?'  is the release character (escapes the next char)
//   "'"  terminates the segment
//
// Hierarchy:
//   STX (envelope start)
//     [BAT]                — optional batch wrapper
//       MHD … MTR          — message
//     [EOB]
//   END (envelope end)

const ELEMENT_SEP = '+';
const SEGMENT_TERM = "'";
const TAG_SEP = '=';
const RELEASE = '?';

/** Split TRADACOMS body into segment strings, honouring the release character. */
function splitSegments(body: string): string[] {
  const out: string[] = [];
  let current = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === RELEASE && i + 1 < body.length) {
      current += body[++i];
    } else if (ch === SEGMENT_TERM) {
      const t = current.trim();
      if (t.length > 0) out.push(t);
      current = '';
    } else {
      current += ch;
    }
  }
  const t = current.trim();
  if (t.length > 0) out.push(t);
  return out;
}

export function parseTradacoms(raw: string): ParseResult {
  const rawSegments = splitSegments(raw);
  const segments: Segment[] = [];
  const allErrors: ParseError[] = [];

  for (let i = 0; i < rawSegments.length; i++) {
    const rawSeg = rawSegments[i];
    const eq = rawSeg.indexOf(TAG_SEP);
    let id: string;
    let elements: string[];
    if (eq < 0) {
      // No '=' → treat the whole token as the segment ID with no elements.
      id = rawSeg.trim();
      elements = [];
    } else {
      id = rawSeg.slice(0, eq).trim();
      const data = rawSeg.slice(eq + 1);
      elements = data.length === 0 ? [] : data.split(ELEMENT_SEP);
    }

    const descriptor = getTradacomsDescriptor(id);
    const lineNum = i + 1;
    const segErrors: ParseError[] = [];

    if (!descriptor.known) {
      segErrors.push({
        line: lineNum, segmentId: id, severity: 'error',
        message: `Unrecognized segment ID "${id}"`,
      });
    } else {
      if (descriptor.minElements > 0 && elements.length < descriptor.minElements) {
        segErrors.push({
          line: lineNum, segmentId: id, severity: 'error',
          message: `Segment "${id}" requires at least ${descriptor.minElements} elements but found ${elements.length}`,
        });
      }
      if (descriptor.maxElements > 0 && elements.length > descriptor.maxElements) {
        segErrors.push({
          line: lineNum, segmentId: id, severity: 'error',
          message: `Segment "${id}" allows at most ${descriptor.maxElements} elements but found ${elements.length}`,
        });
      }
    }

    const segment: Segment = { id, descriptor, line: lineNum, elements, errors: segErrors };
    segments.push(segment);
    allErrors.push(...segErrors);
  }

  // ── Cross-segment validation: trailer counts ───────────────────────────────
  validateTrailers(segments, allErrors);

  // ── Hierarchy: STX → [BAT → [MHD…MTR]+ EOB?]+ END ──────────────────────────
  const hierarchy: SegmentNode[] = [];
  buildHierarchy(segments, hierarchy);

  return { standard: 'TRADACOMS', segments, errors: allErrors, hierarchy };
}

function validateTrailers(segs: Segment[], errors: ParseError[]) {
  // MTR01 = number of segments in the message (MHD..MTR inclusive).
  let mhdStart = -1;
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].id === 'MHD') mhdStart = i;
    else if (segs[i].id === 'MTR' && mhdStart >= 0) {
      const declared = parseInt((segs[i].elements[0] ?? '').trim(), 10);
      const expected = i - mhdStart + 1;
      if (!Number.isNaN(declared) && declared !== expected) {
        const err: ParseError = {
          line: segs[i].line, segmentId: 'MTR', severity: 'error',
          message: `Segment count mismatch: MTR01 declares ${declared}, found ${expected} segments from MHD to MTR`,
        };
        segs[i].errors.push(err);
        errors.push(err);
      }
      mhdStart = -1;
    }
  }

  // END01 = number of messages in the transmission.
  const endSeg = segs.find((s) => s.id === 'END');
  if (endSeg) {
    const declared = parseInt((endSeg.elements[0] ?? '').trim(), 10);
    const messageCount = segs.filter((s) => s.id === 'MHD').length;
    if (!Number.isNaN(declared) && declared !== messageCount) {
      const err: ParseError = {
        line: endSeg.line, segmentId: 'END', severity: 'error',
        message: `Message count mismatch: END01 declares ${declared}, found ${messageCount} MHD segment(s)`,
      };
      endSeg.errors.push(err);
      errors.push(err);
    }
  }
}

function buildHierarchy(segments: Segment[], root: SegmentNode[]): void {
  let i = 0;
  while (i < segments.length) {
    const seg = segments[i];

    if (seg.id === 'STX') {
      const stxNode: SegmentNode = { segment: seg, children: [], isLoop: true, loopId: 'STX' };
      i++;
      while (i < segments.length && segments[i].id !== 'END') {
        if (segments[i].id === 'BAT') {
          i = collectBatch(segments, i, stxNode.children);
        } else if (segments[i].id === 'MHD') {
          i = collectMessage(segments, i, stxNode.children);
        } else {
          stxNode.children.push({ segment: segments[i], children: [], isLoop: false });
          i++;
        }
      }
      if (i < segments.length && segments[i].id === 'END') {
        stxNode.children.push({ segment: segments[i], children: [], isLoop: false });
        i++;
      }
      root.push(stxNode);
    } else {
      root.push({ segment: seg, children: [], isLoop: false });
      i++;
    }
  }
}

function collectBatch(segments: Segment[], start: number, parent: SegmentNode[]): number {
  let i = start;
  const batNode: SegmentNode = { segment: segments[i], children: [], isLoop: true, loopId: 'BAT' };
  i++;
  while (i < segments.length && segments[i].id !== 'EOB' && segments[i].id !== 'END') {
    if (segments[i].id === 'MHD') {
      i = collectMessage(segments, i, batNode.children);
    } else {
      batNode.children.push({ segment: segments[i], children: [], isLoop: false });
      i++;
    }
  }
  if (i < segments.length && segments[i].id === 'EOB') {
    batNode.children.push({ segment: segments[i], children: [], isLoop: false });
    i++;
  }
  parent.push(batNode);
  return i;
}

function collectMessage(segments: Segment[], start: number, parent: SegmentNode[]): number {
  let i = start;
  const mhdNode: SegmentNode = { segment: segments[i], children: [], isLoop: true, loopId: 'MHD' };
  i++;
  while (i < segments.length && segments[i].id !== 'MTR') {
    mhdNode.children.push({ segment: segments[i], children: [], isLoop: false });
    i++;
  }
  if (i < segments.length && segments[i].id === 'MTR') {
    mhdNode.children.push({ segment: segments[i], children: [], isLoop: false });
    i++;
  }
  parent.push(mhdNode);
  return i;
}
