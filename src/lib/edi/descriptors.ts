import type { SegmentDescriptor } from './types';
import type { SegmentDef } from './dictionaries/types';
import { getX12Segment, getEdifactSegment, getTradacomsSegment } from './dictionaries';

// ─── Descriptor lookup (parser-facing) ───────────────────────────────────────
//
// Thin compatibility layer over src/lib/edi/dictionaries. The parser calls
// getX12Descriptor / getEdifactDescriptor to drive its element-count and
// known-segment checks; those checks haven't changed, but the underlying
// data now comes from the curated dictionary so descriptions stay in sync
// with everything else (Coverage page, validation rules, etc.).

const UNKNOWN_DESCRIPTOR: SegmentDescriptor = {
  name: 'Unknown Segment',
  minElements: 0,
  maxElements: 0,
  known: false,
};

/**
 * Derive a runtime SegmentDescriptor from a curated SegmentDef.
 *
 *   minElements = highest 1-based position of any required element (0 if none)
 *   maxElements = total declared element count
 */
function toDescriptor(def: SegmentDef): SegmentDescriptor {
  let lastRequired = 0;
  for (let i = 0; i < def.elements.length; i++) {
    if (def.elements[i].required) lastRequired = i + 1;
  }
  return {
    name: def.name,
    minElements: lastRequired,
    maxElements: def.elements.length,
    known: true,
  };
}

export function getX12Descriptor(id: string): SegmentDescriptor {
  const def = getX12Segment(id);
  if (def) return toDescriptor(def);
  return { ...UNKNOWN_DESCRIPTOR, name: `Unknown X12 Segment (${id})` };
}

export function getEdifactDescriptor(id: string): SegmentDescriptor {
  const def = getEdifactSegment(id);
  if (def) return toDescriptor(def);
  return { ...UNKNOWN_DESCRIPTOR, name: `Unknown EDIFACT Segment (${id})` };
}

export function getTradacomsDescriptor(id: string): SegmentDescriptor {
  const def = getTradacomsSegment(id);
  if (def) return toDescriptor(def);
  return { ...UNKNOWN_DESCRIPTOR, name: `Unknown TRADACOMS Segment (${id})` };
}
