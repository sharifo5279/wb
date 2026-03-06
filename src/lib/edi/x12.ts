import type { ParseResult, Segment, SegmentNode, ParseError } from "./types";
import { getX12Descriptor } from "./descriptors";

// ─── X12 tokenizer and hierarchy builder ─────────────────────────────────────

/**
 * Splits raw X12 text into segments, builds a Segment[] with validation, and
 * assembles the ISA → GS → ST loop hierarchy.
 *
 * Delimiter extraction:
 *   element separator  = raw[3]   (character immediately after "ISA")
 *   segment terminator = raw[105] (last character of the ISA segment)
 *
 * Any whitespace between the terminator and the next segment ID is skipped.
 */
export function parseX12(raw: string): ParseResult {
  // ── 1. Extract delimiters ──────────────────────────────────────────────────
  const elementSep = raw[3];
  // ISA has 16 elements → 16 separators + "ISA" prefix = positions 0..104
  // Position 105 is the segment terminator (may be followed by \n or \r\n)
  const segmentTerm = raw[105];
  // Component element separator is ISA element 16 (index 104 before term char)
  // — not needed for basic parsing but stored for reference

  // ── 2. Split into raw segment strings ────────────────────────────────────
  // Split on the terminator; trim surrounding whitespace from each token.
  const rawSegments = raw
    .split(segmentTerm)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const segments: Segment[] = [];
  const allErrors: ParseError[] = [];

  // ── 3. Parse each segment ─────────────────────────────────────────────────
  for (let i = 0; i < rawSegments.length; i++) {
    const raw = rawSegments[i];
    const parts = raw.split(elementSep);
    const id = parts[0].trim();
    // Elements are everything after the segment ID
    const elements = parts.slice(1);

    const descriptor = getX12Descriptor(id);
    const segErrors: ParseError[] = [];
    const lineNum = i + 1;

    // Unknown segment
    if (!descriptor.known) {
      segErrors.push({
        line: lineNum,
        segmentId: id,
        message: `Unrecognized segment ID "${id}"`,
      });
    } else {
      // Validate element count
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

      // Specific: N1 must have at least element 1 (name) — rule from spec
      if (id === "N1" && (elements.length < 1 || elements[0].trim() === "")) {
        segErrors.push({
          line: lineNum,
          segmentId: "N1",
          message: `Segment "N1" is missing required element 01 (Entity Identifier Code)`,
        });
      }

      // ISA-specific: must have exactly 16 elements
      if (id === "ISA" && elements.length !== 16) {
        segErrors.push({
          line: lineNum,
          segmentId: "ISA",
          message: `Segment "ISA" must have exactly 16 elements but found ${elements.length}`,
        });
      }
    }

    const segment: Segment = { id, descriptor, line: lineNum, elements, errors: segErrors };
    segments.push(segment);
    allErrors.push(...segErrors);
  }

  // ── 4. Build ISA → GS → ST hierarchy ─────────────────────────────────────
  const hierarchy: SegmentNode[] = [];
  buildX12Hierarchy(segments, hierarchy);

  return { standard: "X12", segments, errors: allErrors, hierarchy };
}

// ─── Hierarchy builder ────────────────────────────────────────────────────────

function buildX12Hierarchy(segments: Segment[], root: SegmentNode[]): void {
  let i = 0;

  while (i < segments.length) {
    const seg = segments[i];

    if (seg.id === "ISA") {
      const isaNode: SegmentNode = { segment: seg, children: [], isLoop: true, loopId: "ISA" };
      i++;
      // Collect GS groups until IEA
      while (i < segments.length && segments[i].id !== "IEA") {
        if (segments[i].id === "GS") {
          i = collectGSGroup(segments, i, isaNode.children);
        } else {
          isaNode.children.push({ segment: segments[i], children: [], isLoop: false });
          i++;
        }
      }
      // Consume IEA if present
      if (i < segments.length && segments[i].id === "IEA") {
        isaNode.children.push({ segment: segments[i], children: [], isLoop: false });
        i++;
      }
      root.push(isaNode);
    } else {
      root.push({ segment: seg, children: [], isLoop: false });
      i++;
    }
  }
}

function collectGSGroup(segments: Segment[], start: number, parent: SegmentNode[]): number {
  let i = start;
  const gsNode: SegmentNode = { segment: segments[i], children: [], isLoop: true, loopId: "GS" };
  i++;

  while (i < segments.length && segments[i].id !== "GE") {
    if (segments[i].id === "ST") {
      i = collectSTTransaction(segments, i, gsNode.children);
    } else {
      gsNode.children.push({ segment: segments[i], children: [], isLoop: false });
      i++;
    }
  }
  // Consume GE
  if (i < segments.length && segments[i].id === "GE") {
    gsNode.children.push({ segment: segments[i], children: [], isLoop: false });
    i++;
  }

  parent.push(gsNode);
  return i;
}

function collectSTTransaction(segments: Segment[], start: number, parent: SegmentNode[]): number {
  let i = start;
  const stNode: SegmentNode = { segment: segments[i], children: [], isLoop: true, loopId: "ST" };
  i++;

  while (i < segments.length && segments[i].id !== "SE") {
    stNode.children.push({ segment: segments[i], children: [], isLoop: false });
    i++;
  }
  // Consume SE
  if (i < segments.length && segments[i].id === "SE") {
    stNode.children.push({ segment: segments[i], children: [], isLoop: false });
    i++;
  }

  parent.push(stNode);
  return i;
}
