// ─── Shared EDI types ────────────────────────────────────────────────────────

export type EDIStandard = "X12" | "EDIFACT" | "Unknown";

/** Human-readable metadata for a segment type. */
export interface SegmentDescriptor {
  name: string;
  /** Minimum number of elements (excluding the segment ID itself). */
  minElements: number;
  /** Maximum number of elements (excluding the segment ID itself). 0 = unlimited. */
  maxElements: number;
  /** Whether this segment is recognised at all. */
  known: boolean;
}

/** One validation error attached to a segment or document. */
export interface ParseError {
  /** 1-based line (or approximate segment index) in the source document. */
  line: number;
  segmentId: string;
  message: string;
}

/** A fully-parsed segment with its elements and any validation errors. */
export interface Segment {
  /** The segment identifier, e.g. "ISA", "ST", "UNH". */
  id: string;
  descriptor: SegmentDescriptor;
  /** 1-based position (segment index) in the source document. */
  line: number;
  /** All data elements AFTER the segment ID, split by the element separator. */
  elements: string[];
  errors: ParseError[];
}

/** A node in the hierarchical loop/envelope tree. */
export interface SegmentNode {
  segment: Segment;
  children: SegmentNode[];
  isLoop: boolean;
  loopId?: string;
}

/** The full result returned by `parseEDI()`. */
export interface ParseResult {
  standard: EDIStandard;
  segments: Segment[];
  errors: ParseError[];
  hierarchy: SegmentNode[];
}

/** Debounce delay (ms) that editor consumers should wait before calling parseEDI(). */
export const PARSE_DEBOUNCE_MS = 300;
