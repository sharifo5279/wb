'use client';

import type { ParseResult, Segment } from '@/src/lib/edi/types';
import { renderX12_850 } from './X12_850';
import { renderX12_856 } from './X12_856';
import { renderX12_810 } from './X12_810';
import { renderX12_997 } from './X12_997';
import { renderGeneric } from './Generic';

interface BusinessViewProps {
  parseResult: ParseResult | null;
}

/** Slice of segments for one transaction set, plus envelope context. */
export interface TxnBlock {
  /** Transaction set / message code. */
  code: string;
  /** Standard. */
  standard: 'X12' | 'EDIFACT';
  /** All segments inside the ST..SE (or UNH..UNT) inclusive. */
  segments: Segment[];
  /** Envelope context — sender, receiver, date from ISA/GS or UNB. */
  context: {
    sender?: string;
    receiver?: string;
    date?: string;
    interchangeControl?: string;
    groupControl?: string;
    transactionControl?: string;
  };
}

/** Walk the parse result and extract one TxnBlock per ST..SE / UNH..UNT pair. */
function extractTransactions(result: ParseResult): TxnBlock[] {
  const blocks: TxnBlock[] = [];
  const segs = result.segments;

  if (result.standard === 'X12') {
    const isa = segs.find((s) => s.id === 'ISA');
    const gs = segs.find((s) => s.id === 'GS');
    const ctx = {
      sender: isa?.elements[5]?.trim(),
      receiver: isa?.elements[7]?.trim(),
      date: isa?.elements[8]?.trim(),
      interchangeControl: isa?.elements[12]?.trim(),
      groupControl: gs?.elements[5]?.trim(),
    };

    let stStart = -1;
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].id === 'ST') stStart = i;
      else if (segs[i].id === 'SE' && stStart >= 0) {
        const code = segs[stStart].elements[0]?.trim() ?? '';
        const block = segs.slice(stStart, i + 1);
        blocks.push({
          code,
          standard: 'X12',
          segments: block,
          context: { ...ctx, transactionControl: segs[stStart].elements[1]?.trim() },
        });
        stStart = -1;
      }
    }
  } else if (result.standard === 'EDIFACT') {
    const unb = segs.find((s) => s.id === 'UNB');
    const ctx = {
      // UNB elements are composites; we surface raw values for now.
      sender: unb?.elements[1]?.trim(),
      receiver: unb?.elements[2]?.trim(),
      date: unb?.elements[3]?.trim(),
      interchangeControl: unb?.elements[4]?.trim(),
    };

    let unhStart = -1;
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].id === 'UNH') unhStart = i;
      else if (segs[i].id === 'UNT' && unhStart >= 0) {
        const composite = segs[unhStart].elements[1] ?? '';
        const code = composite.split(':')[0]?.trim() ?? '';
        blocks.push({
          code,
          standard: 'EDIFACT',
          segments: segs.slice(unhStart, i + 1),
          context: { ...ctx, transactionControl: segs[unhStart].elements[0]?.trim() },
        });
        unhStart = -1;
      }
    }
  }

  return blocks;
}

/** Dispatch a transaction block to the appropriate renderer. */
function renderBlock(block: TxnBlock) {
  if (block.standard === 'X12') {
    switch (block.code) {
      case '850': return renderX12_850(block);
      case '856': return renderX12_856(block);
      case '810': return renderX12_810(block);
      case '997': return renderX12_997(block);
    }
  }
  return renderGeneric(block);
}

/**
 * BusinessView — rendered when the user picks the "Business" view tab.
 *
 * Uses the same parse result that drives the segment tree and validation;
 * extracts one or more transaction blocks and dispatches each to the
 * transaction-specific renderer (or a generic fallback).
 */
export function BusinessView({ parseResult }: BusinessViewProps) {
  if (!parseResult || parseResult.segments.length === 0) {
    return (
      <div className="ds-bv-empty" role="status" aria-live="polite">
        Load an EDI document to see its business-document layout.
      </div>
    );
  }

  const blocks = extractTransactions(parseResult);
  if (blocks.length === 0) {
    return (
      <div className="ds-bv-empty" role="status" aria-live="polite">
        No transaction sets found in this document.
      </div>
    );
  }

  return (
    <div className="ds-bv-scroll">
      {blocks.map((block, idx) => (
        <div key={idx} className="ds-bv-doc">
          {renderBlock(block)}
        </div>
      ))}
    </div>
  );
}
