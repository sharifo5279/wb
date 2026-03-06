import type { ParseResult, EDIStandard } from "./types";
import { parseX12 } from "./x12";
import { parseEdifact } from "./edifact";

export { PARSE_DEBOUNCE_MS } from "./types";
export type { ParseResult, Segment, SegmentNode, ParseError, EDIStandard } from "./types";

// ─── Standard detection ───────────────────────────────────────────────────────

/**
 * Inspect the first 3 characters to determine the EDI standard.
 *
 * Rules:
 *   "ISA"       → "X12"
 *   "UNB"|"UNH" → "EDIFACT"
 *   (also "UNA" followed by UNB is EDIFACT)
 *   anything else → "Unknown"
 */
export function detectStandard(raw: string): EDIStandard {
  const trimmed = raw.trimStart();
  const prefix = trimmed.slice(0, 3).toUpperCase();

  if (prefix === "ISA") return "X12";
  if (prefix === "UNB" || prefix === "UNH") return "EDIFACT";
  // UNA service string is optional preamble for EDIFACT
  if (prefix === "UNA") return "EDIFACT";

  return "Unknown";
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Parse raw EDI text and return a fully-typed `ParseResult`.
 *
 * - Detection is client-side only — zero API calls.
 * - For unknown standards the result has empty segments, errors, and hierarchy.
 * - Designed to handle documents up to 1 MB within 500 ms.
 */
export function parseEDI(raw: string): ParseResult {
  const standard = detectStandard(raw);

  if (standard === "Unknown") {
    return { standard: "Unknown", segments: [], errors: [], hierarchy: [] };
  }

  if (standard === "X12") {
    return parseX12(raw.trimStart());
  }

  // EDIFACT
  return parseEdifact(raw.trimStart());
}
