// ─── Dictionary types ────────────────────────────────────────────────────────
//
// These types describe the curated EDI reference dictionary used by the
// validator and the Coverage page. They are intentionally tighter than the
// runtime `SegmentDescriptor` in ../types.ts: they include element-level
// metadata (data type, length, optional code lists) and per-transaction
// structure (which segments are required, max use).

export type Standard = 'X12' | 'EDIFACT';

/**
 * Element data types follow the X12/EDIFACT representation codes.
 *   AN – alphanumeric (any printable)
 *   ID – identifier (value must come from a defined code list)
 *   N0 – numeric, no implicit decimals (integer)
 *   N2 – numeric with 2 implicit decimals (e.g. amount in cents)
 *   R  – decimal/real number with explicit decimal point
 *   DT – date (CCYYMMDD or YYMMDD)
 *   TM – time (HHMM, HHMMSS, or HHMMSSDD)
 */
export type ElementDataType = 'AN' | 'ID' | 'N0' | 'N2' | 'R' | 'DT' | 'TM';

export interface ElementDef {
  name: string;
  required: boolean;
  type: ElementDataType;
  minLength: number;
  /** 0 = no defined upper bound. */
  maxLength: number;
  /** Optional code → description map for ID-type elements. */
  codes?: Record<string, string>;
}

export interface SegmentDef {
  id: string;
  name: string;
  /** Position-ordered elements (excluding the segment ID itself). */
  elements: ElementDef[];
  /** True when this entry has been hand-verified. False = generated/stub. */
  verified?: boolean;
}

export interface SegmentRef {
  id: string;
  required: boolean;
  /** Maximum allowed repetitions; -1 = unlimited. */
  maxUse: number;
}

export interface TransactionDef {
  /** Standard-specific code: X12 set ("850") or EDIFACT message ("ORDERS"). */
  code: string;
  standard: Standard;
  version: string;
  name: string;
  industry: string;
  purpose?: string;
  /** All segments expected in document order (heading + detail + summary). */
  segments: SegmentRef[];
  /** True when the segment list is hand-curated. False = stub placeholder. */
  full?: boolean;
}

export interface CoverageEntry {
  standard: Standard;
  version: string;
  code: string;
  name: string;
  industry: string;
  /** 'full' = segments defined, 'stub' = transaction listed without segments. */
  segmentCoverage: 'full' | 'stub';
  /** Element-level depth: 'full' all elements detailed, 'partial' some, 'none'. */
  elementCoverage: 'full' | 'partial' | 'none';
}
