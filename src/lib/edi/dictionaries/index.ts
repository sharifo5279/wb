import type { SegmentDef, TransactionDef, CoverageEntry } from './types';
import { X12_SEGMENTS } from './x12-segments';
import { X12_TRANSACTIONS } from './x12-transactions';
import { EDIFACT_SEGMENTS } from './edifact-segments';
import { EDIFACT_MESSAGES } from './edifact-messages';

// ─── Public dictionary API ───────────────────────────────────────────────────

export function getX12Segment(id: string): SegmentDef | undefined {
  return X12_SEGMENTS[id];
}

export function getEdifactSegment(id: string): SegmentDef | undefined {
  return EDIFACT_SEGMENTS[id];
}

export function getX12Transaction(setCode: string): TransactionDef | undefined {
  return X12_TRANSACTIONS[setCode];
}

export function getEdifactMessage(messageCode: string): TransactionDef | undefined {
  return EDIFACT_MESSAGES[messageCode];
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
