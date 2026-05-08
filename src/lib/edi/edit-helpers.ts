// ─── Raw-text edit helpers ──────────────────────────────────────────────────
//
// Pure functions that mutate the raw EDI text by line number. The line index
// matches the 1-based `Segment.line` produced by the parser (n-th non-empty
// segment in the document).
//
// Each helper detects the segment terminator from the document prefix:
//   ISA…       → terminator = raw[105]
//   UNA…       → terminator = raw[8]
//   else       → defaults to "'" (EDIFACT/TRADACOMS)
//
// The element separator is *not* mutated; insertions use the user-provided
// segment text as-is, so callers must compose it with the correct delimiter.

export interface Delimiters {
  elemSep: string;
  segTerm: string;
}

export function detectDelimiters(raw: string): Delimiters {
  if (raw.startsWith('ISA') && raw.length >= 106) {
    return { elemSep: raw[3], segTerm: raw[105] };
  }
  if (raw.startsWith('UNA') && raw.length >= 9) {
    return { elemSep: raw[4], segTerm: raw[8] };
  }
  return { elemSep: '+', segTerm: "'" };
}

/** Find the index in `parts` (split by segTerm) for the n-th non-empty segment. */
function findSegmentPart(parts: string[], line: number): number {
  let n = 0;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].trim().length === 0) continue;
    n++;
    if (n === line) return i;
  }
  return -1;
}

/** Remove the segment at the given 1-based line. Returns the new raw text. */
export function deleteSegment(raw: string, line: number): string {
  const { segTerm } = detectDelimiters(raw);
  const parts = raw.split(segTerm);
  const idx = findSegmentPart(parts, line);
  if (idx < 0) return raw;
  parts.splice(idx, 1);
  return parts.join(segTerm);
}

/** Duplicate the segment at the given 1-based line; the copy is inserted right after. */
export function duplicateSegment(raw: string, line: number): string {
  const { segTerm } = detectDelimiters(raw);
  const parts = raw.split(segTerm);
  const idx = findSegmentPart(parts, line);
  if (idx < 0) return raw;
  parts.splice(idx + 1, 0, parts[idx]);
  return parts.join(segTerm);
}

/**
 * Insert `segmentText` immediately after the segment at the given 1-based line.
 * The segment text should NOT include a trailing terminator — one is added
 * automatically when joined back together.
 */
export function insertSegmentAfter(raw: string, line: number, segmentText: string): string {
  const { segTerm } = detectDelimiters(raw);
  const parts = raw.split(segTerm);
  const idx = findSegmentPart(parts, line);
  if (idx < 0) return raw;

  let cleaned = segmentText.trim();
  // Strip trailing terminator from the user-supplied segment if they included it.
  if (cleaned.endsWith(segTerm)) cleaned = cleaned.slice(0, -1);
  // Prepend a newline so the new segment renders on its own visual line.
  parts.splice(idx + 1, 0, '\n' + cleaned);
  return parts.join(segTerm);
}

/**
 * Insert `segmentText` immediately before the segment at the given 1-based line.
 */
export function insertSegmentBefore(raw: string, line: number, segmentText: string): string {
  const { segTerm } = detectDelimiters(raw);
  const parts = raw.split(segTerm);
  const idx = findSegmentPart(parts, line);
  if (idx < 0) return raw;

  let cleaned = segmentText.trim();
  if (cleaned.endsWith(segTerm)) cleaned = cleaned.slice(0, -1);
  parts.splice(idx, 0, '\n' + cleaned);
  return parts.join(segTerm);
}

/**
 * Replace the value at `elementIdx` (1-based) inside the segment at the given
 * 1-based line. If the segment has fewer elements than `elementIdx`, the
 * element list is padded with empty strings up to that position. The segment
 * ID is at index 0 and is never modified.
 */
export function replaceElement(
  raw: string,
  segmentLine: number,
  elementIdx: number,
  newValue: string,
): string {
  if (elementIdx < 1) return raw;
  const { elemSep, segTerm } = detectDelimiters(raw);
  const parts = raw.split(segTerm);
  const idx = findSegmentPart(parts, segmentLine);
  if (idx < 0) return raw;

  const original = parts[idx];
  const leadingWs = original.length - original.trimStart().length;
  const ws = original.slice(0, leadingWs);
  const trimmed = original.trim();
  const fields = trimmed.split(elemSep);

  while (fields.length <= elementIdx) fields.push('');
  fields[elementIdx] = newValue;

  parts[idx] = ws + fields.join(elemSep);
  return parts.join(segTerm);
}

/**
 * Build a placeholder segment string with N empty data elements separated by
 * the document's element separator. e.g. blankSegment('REF', '*', 2) → 'REF**'.
 * Useful for inserting a stub that the user can fill in.
 */
export function blankSegment(id: string, elemSep: string, elementCount: number): string {
  return id + elemSep.repeat(elementCount);
}
