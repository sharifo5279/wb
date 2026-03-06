import type { ParseResult, Segment, SegmentNode, ParseError } from "./types";
import { getEdifactDescriptor } from "./descriptors";

// ─── EDIFACT tokenizer and hierarchy builder ──────────────────────────────────

/**
 * Default EDIFACT delimiters (used when no UNA service string is present).
 */
const EDIFACT_DEFAULTS = {
  componentSep: ":",
  elementSep: "+",
  decimalMark: ".",
  releaseChar: "?",
  segmentTerm: "'",
} as const;

interface EdifactDelimiters {
  componentSep: string;
  elementSep: string;
  decimalMark: string;
  releaseChar: string;
  segmentTerm: string;
}

/**
 * Parse the optional UNA service string (always exactly 9 chars: "UNA" + 6 delimiter chars).
 *
 * UNA positions:
 *   [3] component element separator
 *   [4] element separator
 *   [5] decimal mark
 *   [6] release character
 *   [7] reserved (space)
 *   [8] segment terminator
 */
function parseUNA(raw: string): { delimiters: EdifactDelimiters; bodyStart: number } {
  if (raw.startsWith("UNA")) {
    return {
      delimiters: {
        componentSep: raw[3],
        elementSep:   raw[4],
        decimalMark:  raw[5],
        releaseChar:  raw[6],
        segmentTerm:  raw[8],
      },
      bodyStart: 9,
    };
  }
  return { delimiters: { ...EDIFACT_DEFAULTS }, bodyStart: 0 };
}

/**
 * Split EDIFACT text into segment strings, respecting the release character
 * (which escapes the segment terminator when it immediately precedes it).
 */
function splitEdifactSegments(body: string, delimiters: EdifactDelimiters): string[] {
  const { segmentTerm, releaseChar } = delimiters;
  const segments: string[] = [];
  let current = "";

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === releaseChar && i + 1 < body.length) {
      // Escape: include the next char literally and skip it
      current += body[++i];
    } else if (ch === segmentTerm) {
      const trimmed = current.trim();
      if (trimmed.length > 0) segments.push(trimmed);
      current = "";
    } else {
      current += ch;
    }
  }
  const trimmed = current.trim();
  if (trimmed.length > 0) segments.push(trimmed);

  return segments;
}

/**
 * Parse the EDIFACT body (after the optional UNA) into typed Segment objects.
 */
export function parseEdifact(raw: string): ParseResult {
  // ── 1. Parse UNA / establish delimiters ───────────────────────────────────
  const { delimiters, bodyStart } = parseUNA(raw);
  const body = raw.slice(bodyStart);

  // ── 2. Split into raw segment strings ────────────────────────────────────
  const rawSegments = splitEdifactSegments(body, delimiters);

  const segments: Segment[] = [];
  const allErrors: ParseError[] = [];

  // If UNA was present, add it as a virtual segment (no elements)
  if (bodyStart === 9) {
    const unaDescriptor = getEdifactDescriptor("UNA");
    segments.push({ id: "UNA", descriptor: unaDescriptor, line: 0, elements: [], errors: [] });
  }

  // ── 3. Parse each segment ─────────────────────────────────────────────────
  for (let i = 0; i < rawSegments.length; i++) {
    const rawSeg = rawSegments[i];
    const parts = rawSeg.split(delimiters.elementSep);
    const id = parts[0].trim();
    const elements = parts.slice(1);

    const descriptor = getEdifactDescriptor(id);
    const segErrors: ParseError[] = [];
    const lineNum = segments.length + 1;

    if (!descriptor.known) {
      segErrors.push({
        line: lineNum,
        segmentId: id,
        message: `Unrecognized segment ID "${id}"`,
      });
    } else {
      if (descriptor.minElements > 0 && elements.length < descriptor.minElements) {
        segErrors.push({
          line: lineNum,
          segmentId: id,
          message: `Segment "${id}" requires at least ${descriptor.minElements} elements but found ${elements.length}`,
        });
      }
      if (descriptor.maxElements > 0 && elements.length > descriptor.maxElements) {
        segErrors.push({
          line: lineNum,
          segmentId: id,
          message: `Segment "${id}" allows at most ${descriptor.maxElements} elements but found ${elements.length}`,
        });
      }
    }

    const segment: Segment = { id, descriptor, line: lineNum, elements, errors: segErrors };
    segments.push(segment);
    allErrors.push(...segErrors);
  }

  // ── 4. Build UNB → UNG → UNH hierarchy ───────────────────────────────────
  const hierarchy: SegmentNode[] = [];
  buildEdifactHierarchy(segments, hierarchy);

  return { standard: "EDIFACT", segments, errors: allErrors, hierarchy };
}

// ─── Hierarchy builder ────────────────────────────────────────────────────────

function buildEdifactHierarchy(segments: Segment[], root: SegmentNode[]): void {
  let i = 0;

  while (i < segments.length) {
    const seg = segments[i];

    if (seg.id === "UNA") {
      root.push({ segment: seg, children: [], isLoop: false });
      i++;
    } else if (seg.id === "UNB") {
      const unbNode: SegmentNode = { segment: seg, children: [], isLoop: true, loopId: "UNB" };
      i++;
      while (i < segments.length && segments[i].id !== "UNZ") {
        if (segments[i].id === "UNG") {
          i = collectUNGGroup(segments, i, unbNode.children);
        } else if (segments[i].id === "UNH") {
          i = collectUNHMessage(segments, i, unbNode.children);
        } else {
          unbNode.children.push({ segment: segments[i], children: [], isLoop: false });
          i++;
        }
      }
      if (i < segments.length && segments[i].id === "UNZ") {
        unbNode.children.push({ segment: segments[i], children: [], isLoop: false });
        i++;
      }
      root.push(unbNode);
    } else {
      root.push({ segment: seg, children: [], isLoop: false });
      i++;
    }
  }
}

function collectUNGGroup(segments: Segment[], start: number, parent: SegmentNode[]): number {
  let i = start;
  const ungNode: SegmentNode = { segment: segments[i], children: [], isLoop: true, loopId: "UNG" };
  i++;

  while (i < segments.length && segments[i].id !== "UNE") {
    if (segments[i].id === "UNH") {
      i = collectUNHMessage(segments, i, ungNode.children);
    } else {
      ungNode.children.push({ segment: segments[i], children: [], isLoop: false });
      i++;
    }
  }
  if (i < segments.length && segments[i].id === "UNE") {
    ungNode.children.push({ segment: segments[i], children: [], isLoop: false });
    i++;
  }
  parent.push(ungNode);
  return i;
}

function collectUNHMessage(segments: Segment[], start: number, parent: SegmentNode[]): number {
  let i = start;
  const unhNode: SegmentNode = { segment: segments[i], children: [], isLoop: true, loopId: "UNH" };
  i++;

  while (i < segments.length && segments[i].id !== "UNT") {
    unhNode.children.push({ segment: segments[i], children: [], isLoop: false });
    i++;
  }
  if (i < segments.length && segments[i].id === "UNT") {
    unhNode.children.push({ segment: segments[i], children: [], isLoop: false });
    i++;
  }
  parent.push(unhNode);
  return i;
}
