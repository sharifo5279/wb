import { describe, it, expect } from 'vitest';
import { deleteSegment, duplicateSegment, insertSegmentAfter, insertSegmentBefore, blankSegment } from './edit-helpers';
import { parseEDI } from './parser';

const ISA =
  'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210101*1200*^*00501*000000001*0*P*:~';

const X12_DOC = [
  ISA,
  'GS*PO*SENDER*RECEIVER*20210101*1200*1*X*005010~',
  'ST*850*0001~',
  'BEG*00*NE*PO1**20210101~',
  'REF*DP*001~',
  'CTT*1~',
  'SE*5*0001~',
  'GE*1*1~',
  'IEA*1*000000001~',
].join('\n');

describe('deleteSegment', () => {
  it('removes the REF segment at line 5', () => {
    const out = deleteSegment(X12_DOC, 5);
    expect(out).not.toMatch(/REF\*DP/);
    // Should still contain everything else
    expect(out).toMatch(/BEG\*00/);
    expect(out).toMatch(/CTT\*1/);
  });

  it('returns input unchanged for invalid line', () => {
    expect(deleteSegment(X12_DOC, 999)).toBe(X12_DOC);
  });

  it('roundtrips with parser (count goes down by 1)', () => {
    const before = parseEDI(X12_DOC).segments.length;
    const out = deleteSegment(X12_DOC, 5);
    const after = parseEDI(out).segments.length;
    expect(after).toBe(before - 1);
  });
});

describe('duplicateSegment', () => {
  it('duplicates the REF segment', () => {
    const out = duplicateSegment(X12_DOC, 5);
    const refMatches = out.match(/REF\*DP\*001/g) ?? [];
    expect(refMatches.length).toBe(2);
  });

  it('parses cleanly after duplication', () => {
    const out = duplicateSegment(X12_DOC, 5);
    const result = parseEDI(out);
    expect(result.standard).toBe('X12');
  });
});

describe('insertSegmentAfter', () => {
  it('inserts a new REF after BEG', () => {
    const out = insertSegmentAfter(X12_DOC, 4, 'REF*XX*test');
    const result = parseEDI(out);
    const segs = result.segments.map((s) => s.id);
    // Original had: ISA GS ST BEG REF CTT SE GE IEA  → indexes 0..8
    // After inserting REF after BEG (line 4), expect REF inserted at position 5
    expect(segs.indexOf('BEG')).toBe(3);
    expect(segs[4]).toBe('REF'); // the new one
    expect(segs[5]).toBe('REF'); // the original one
    expect(segs[6]).toBe('CTT');
  });

  it('strips trailing terminator if user included one', () => {
    const out = insertSegmentAfter(X12_DOC, 4, "REF*XX*test~");
    // Should not produce double-terminator
    expect(out).not.toMatch(/REF\*XX\*test~~/);
  });
});

describe('insertSegmentBefore', () => {
  it('inserts a new DTM before BEG', () => {
    const out = insertSegmentBefore(X12_DOC, 4, 'DTM*002*20210101');
    const result = parseEDI(out);
    const segs = result.segments.map((s) => s.id);
    expect(segs[3]).toBe('DTM');
    expect(segs[4]).toBe('BEG');
  });
});

describe('blankSegment', () => {
  it('produces a placeholder with N empty elements', () => {
    expect(blankSegment('REF', '*', 2)).toBe('REF**');
    expect(blankSegment('DTM', '*', 3)).toBe('DTM***');
  });
});
