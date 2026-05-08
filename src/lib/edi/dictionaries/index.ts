import type { SegmentDef, TransactionDef, CoverageEntry } from './types';
import { X12_SEGMENTS } from './x12-segments';
import { X12_TRANSACTIONS } from './x12-transactions';
import { EDIFACT_SEGMENTS } from './edifact-segments';
import { EDIFACT_MESSAGES } from './edifact-messages';
import { TRADACOMS_SEGMENTS } from './tradacoms-segments';
import { TRADACOMS_MESSAGES } from './tradacoms-messages';

// ─── Public dictionary API ───────────────────────────────────────────────────

export function getX12Segment(id: string): SegmentDef | undefined {
  return X12_SEGMENTS[id];
}

export function getEdifactSegment(id: string): SegmentDef | undefined {
  return EDIFACT_SEGMENTS[id];
}

export function getTradacomsSegment(id: string): SegmentDef | undefined {
  return TRADACOMS_SEGMENTS[id];
}

export function getX12Transaction(setCode: string): TransactionDef | undefined {
  return X12_TRANSACTIONS[setCode];
}

export function getEdifactMessage(messageCode: string): TransactionDef | undefined {
  return EDIFACT_MESSAGES[messageCode];
}

export function getTradacomsMessage(messageCode: string): TransactionDef | undefined {
  return TRADACOMS_MESSAGES[messageCode];
}

/** All segments defined for a given standard, sorted by ID. Used by the segments browser. */
export function listSegments(standard: 'X12' | 'EDIFACT' | 'TRADACOMS'): SegmentDef[] {
  const dict =
    standard === 'X12'      ? X12_SEGMENTS
    : standard === 'EDIFACT' ? EDIFACT_SEGMENTS
    : TRADACOMS_SEGMENTS;
  return Object.values(dict).sort((a, b) => a.id.localeCompare(b.id));
}

/** All transactions defined for a given standard, sorted by code. */
export function listTransactions(standard: 'X12' | 'EDIFACT' | 'TRADACOMS'): TransactionDef[] {
  const dict =
    standard === 'X12'      ? X12_TRANSACTIONS
    : standard === 'EDIFACT' ? EDIFACT_MESSAGES
    : TRADACOMS_MESSAGES;
  return Object.values(dict).sort((a, b) => {
    const an = Number(a.code), bn = Number(b.code);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
    return a.code.localeCompare(b.code);
  });
}

/** Lookup a segment by standard + id (used by the dynamic detail route). */
export function getSegmentByStandard(
  standard: 'X12' | 'EDIFACT' | 'TRADACOMS',
  id: string,
): SegmentDef | undefined {
  if (standard === 'X12') return X12_SEGMENTS[id];
  if (standard === 'EDIFACT') return EDIFACT_SEGMENTS[id];
  return TRADACOMS_SEGMENTS[id];
}

/** Lookup a transaction by standard + code (used by the dynamic detail route). */
export function getTransactionByStandard(
  standard: 'X12' | 'EDIFACT' | 'TRADACOMS',
  code: string,
): TransactionDef | undefined {
  if (standard === 'X12') return X12_TRANSACTIONS[code];
  if (standard === 'EDIFACT') return EDIFACT_MESSAGES[code];
  return TRADACOMS_MESSAGES[code];
}

/**
 * Determine element coverage classification:
 *   'full'    → every element of every defined segment has type/length info
 *   'partial' → at least one segment defined with element info
 *   'none'    → transaction is a stub
 */
function classifyElementCoverage(
  txn: TransactionDef,
  segmentLookup: (id: string) => SegmentDef | undefined,
): 'full' | 'partial' | 'none' {
  if (!txn.full || txn.segments.length === 0) return 'none';
  let definedAny = false;
  let allFull = true;
  for (const ref of txn.segments) {
    const def = segmentLookup(ref.id);
    if (!def) {
      allFull = false;
      continue;
    }
    if (def.elements.length > 0) definedAny = true;
    else allFull = false;
  }
  if (allFull && definedAny) return 'full';
  if (definedAny) return 'partial';
  return 'none';
}

/** Build the coverage table for the /edi-notepad/coverage page. */
export function listCoverage(): CoverageEntry[] {
  const entries: CoverageEntry[] = [];

  for (const txn of Object.values(X12_TRANSACTIONS)) {
    entries.push({
      standard: txn.standard,
      version: txn.version,
      code: txn.code,
      name: txn.name,
      industry: txn.industry,
      segmentCoverage: txn.full ? 'full' : 'stub',
      elementCoverage: classifyElementCoverage(txn, getX12Segment),
    });
  }
  for (const txn of Object.values(EDIFACT_MESSAGES)) {
    entries.push({
      standard: txn.standard,
      version: txn.version,
      code: txn.code,
      name: txn.name,
      industry: txn.industry,
      segmentCoverage: txn.full ? 'full' : 'stub',
      elementCoverage: classifyElementCoverage(txn, getEdifactSegment),
    });
  }
  for (const txn of Object.values(TRADACOMS_MESSAGES)) {
    entries.push({
      standard: txn.standard,
      version: txn.version,
      code: txn.code,
      name: txn.name,
      industry: txn.industry,
      segmentCoverage: txn.full ? 'full' : 'stub',
      elementCoverage: classifyElementCoverage(txn, getTradacomsSegment),
    });
  }

  // Stable order: standard → version → code (numeric where possible, then alpha)
  return entries.sort((a, b) => {
    if (a.standard !== b.standard) return a.standard.localeCompare(b.standard);
    if (a.version !== b.version) return a.version.localeCompare(b.version);
    const an = Number(a.code), bn = Number(b.code);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
    return a.code.localeCompare(b.code);
  });
}

export type { SegmentDef, TransactionDef, CoverageEntry, ElementDef, ElementDataType, SegmentRef, Standard } from './types';
