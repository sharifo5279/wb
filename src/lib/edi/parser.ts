import type { ParseResult, EDIStandard } from "./types";
import { parseX12 } from "./x12";
import { parseEdifact } from "./edifact";
import { parseTradacoms } from "./tradacoms";

export { PARSE_DEBOUNCE_MS } from "./types";
export type { ParseResult, Segment, SegmentNode, ParseError, EDIStandard } from "./types";

// ─── Standard detection ───────────────────────────────────────────────────────

/**
 * Inspect the first 3 characters to determine the EDI standard.
 *
 *   "ISA"       → "X12"
 *   "UNA"|"UNB"|"UNH" → "EDIFACT"
 *   "STX"       → "TRADACOMS"
 *   anything else → "Unknown"
 */
export function detectStandard(raw: string): EDIStandard {
  const trimmed = raw.trimStart();
  const prefix = trimmed.slice(0, 3).toUpperCase();

  if (prefix === "ISA") return "X12";
  if (prefix === "UNB" || prefix === "UNH" || prefix === "UNA") return "EDIFACT";
  if (prefix === "STX") return "TRADACOMS";

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
  if (standard === "X12") return parseX12(raw.trimStart());
  if (standard === "TRADACOMS") return parseTradacoms(raw.trimStart());
  return parseEdifact(raw.trimStart());
}
