'use client';

import { useState } from 'react';
import type { ParseError, ParseResult, Segment } from '@/src/lib/edi/types';
import { renderX12_850 } from './X12_850';
import { renderX12_855 } from './X12_855';
import { renderX12_856 } from './X12_856';
import { renderX12_810 } from './X12_810';
import { renderX12_820 } from './X12_820';
import { renderX12_860 } from './X12_860';
import { renderX12_940 } from './X12_940';
import { renderX12_945 } from './X12_945';
import { renderX12_214 } from './X12_214';
import { renderX12_846 } from './X12_846';
import { renderX12_832 } from './X12_832';
import { renderX12_997 } from './X12_997';
import { renderEdifact_ORDERS } from './Edifact_ORDERS';
import { renderEdifact_INVOIC } from './Edifact_INVOIC';
import { renderEdifact_DESADV } from './Edifact_DESADV';
import { renderEdifact_CONTRL } from './Edifact_CONTRL';
import { renderGeneric } from './Generic';
import { ErrorDrawer } from './ErrorDrawer';

interface BusinessViewProps {
  parseResult: ParseResult | null;
  /** When false, renderers hide the inline ErrorPanel and the warn-row
   *  treatment on line items. The Error Drawer remains reachable from
   *  any future surface; only the in-document treatment is muted. */
  showErrors?: boolean;
}

/** Slice of segments for one transaction set, plus envelope context. */
export interface TxnBlock {
  /** Transaction set / message code. */
  code: string;
  /** Standard. */
  standard: 'X12' | 'EDIFACT' | 'TRADACOMS';
  /** All segments inside the ST..SE (or UNH..UNT) inclusive. */
  segments: Segment[];
  /** Validation errors that fall inside this block (flattened from segments). */
  errors: ParseError[];
  /** Envelope context — sender, receiver, date from ISA/GS or UNB. */
  context: {
    sender?: string;
    receiver?: string;
    date?: string;
    interchangeControl?: string;
    groupControl?: string;
    transactionControl?: string;
  };
  /** Callback installed by BusinessView so renderers can open the drawer. */
  onErrorClick?: (errorIdx: number) => void;
  /** When false, renderers hide ErrorPanel + warn-row treatment. */
  showErrors?: boolean;
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
          errors: block.flatMap((s) => s.errors),
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
          errors: segs.slice(unhStart, i + 1).flatMap((s) => s.errors),
          context: { ...ctx, transactionControl: segs[unhStart].elements[0]?.trim() },
        });
        unhStart = -1;
      }
    }
  } else if (result.standard === 'TRADACOMS') {
    const stx = segs.find((s) => s.id === 'STX');
    const ctx = {
      // STX02 / STX03 are composite identity:name pairs — show the identity portion.
      sender: stx?.elements[1]?.trim().split(':')[0],
      receiver: stx?.elements[2]?.trim().split(':')[0],
      date: stx?.elements[3]?.trim(),
      interchangeControl: stx?.elements[4]?.trim(),
    };

    let mhdStart = -1;
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].id === 'MHD') mhdStart = i;
      else if (segs[i].id === 'MTR' && mhdStart >= 0) {
        const composite = segs[mhdStart].elements[1] ?? '';
        const code = composite.split(':')[0]?.trim() ?? '';
        blocks.push({
          code,
          standard: 'TRADACOMS',
          segments: segs.slice(mhdStart, i + 1),
          errors: segs.slice(mhdStart, i + 1).flatMap((s) => s.errors),
          context: { ...ctx, transactionControl: segs[mhdStart].elements[0]?.trim() },
        });
        mhdStart = -1;
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
      case '855': return renderX12_855(block);
      case '856': return renderX12_856(block);
      case '810': return renderX12_810(block);
      case '820': return renderX12_820(block);
      case '860': return renderX12_860(block);
      case '940': return renderX12_940(block);
      case '945': return renderX12_945(block);
      case '214': return renderX12_214(block);
      case '846': return renderX12_846(block);
      case '832': return renderX12_832(block);
      case '997':
      case '999':
        return renderX12_997(block);
    }
  }
  if (block.standard === 'EDIFACT') {
    switch (block.code) {
      case 'ORDERS': return renderEdifact_ORDERS(block);
      case 'INVOIC': return renderEdifact_INVOIC(block);
      case 'DESADV': return renderEdifact_DESADV(block);
      case 'CONTRL': return renderEdifact_CONTRL(block);
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
export function BusinessView({ parseResult, showErrors = true }: BusinessViewProps) {
  // Drawer state — { blockIdx, errorIdx } or null when closed.
  const [drawer, setDrawer] = useState<{ blockIdx: number; errorIdx: number } | null>(null);

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

  // Wire onErrorClick for each block so renderers' inline ErrorPanel can open the drawer.
  const annotated = blocks.map((b, idx) => ({
    ...b,
    onErrorClick: (errorIdx: number) => setDrawer({ blockIdx: idx, errorIdx }),
    showErrors,
  }));

  const drawerBlock = drawer ? annotated[drawer.blockIdx] : null;

  return (
    <div className="ds-bv-scroll">
      {annotated.map((block, idx) => (
        <div key={idx} className="ds-bv-doc">
          {renderBlock(block)}
        </div>
      ))}

      {drawer && drawerBlock && (
        <ErrorDrawer
          block={drawerBlock}
          errorIdx={drawer.errorIdx}
          onPrev={() => setDrawer((d) => d ? { ...d, errorIdx: Math.max(0, d.errorIdx - 1) } : d)}
          onNext={() => setDrawer((d) => d && drawerBlock ? { ...d, errorIdx: Math.min(drawerBlock.errors.length - 1, d.errorIdx + 1) } : d)}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
