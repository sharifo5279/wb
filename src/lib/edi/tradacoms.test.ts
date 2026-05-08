import { describe, it, expect } from 'vitest';
import { parseEDI, detectStandard } from './parser';

const ORDERS_DOC =
  `STX=ANA:1+5012345678901:KEEN+5012345678902:NEW+901123:0123+1234'` +
  `BAT=001+ORDHDR'` +
  `MHD=1+ORDHDR:9'` +
  `TYP=0430+NEW-ORDERS'` +
  `SDT=5012345678901+KEEN'` +
  `CDT=5012345678902+NEW'` +
  `FIL=1+1+901123'` +
  `MTR=6'` +
  `MHD=2+ORDERS:9'` +
  `CLO=5012345678902:NEW'` +
  `ORD=KEEN/0001+ORD123'` +
  `DLD=901130+5012345678902'` +
  `ITM=001+5012345678903:9+10:CASE+5.50'` +
  `ITM=002+5012345678904:9+5:EACH+10.00'` +
  `OTR=2'` +
  `MTR=8'` +
  `EOB=2'` +
  `END=2'`;

describe('detectStandard — TRADACOMS', () => {
  it('detects STX prefix', () => {
    expect(detectStandard("STX=ANA:1+...'")).toBe('TRADACOMS');
  });
});

describe('parseEDI — TRADACOMS', () => {
  const result = parseEDI(ORDERS_DOC);

  it('standard is TRADACOMS', () => {
    expect(result.standard).toBe('TRADACOMS');
  });

  it('parses all segments', () => {
    expect(result.segments.length).toBe(18);
  });

  it('hierarchy root is STX', () => {
    expect(result.hierarchy[0]?.loopId).toBe('STX');
  });

  it('STX contains a BAT loop', () => {
    const stx = result.hierarchy[0];
    const bat = stx?.children.find((n) => n.loopId === 'BAT');
    expect(bat).toBeDefined();
  });

  it('BAT contains two MHD messages', () => {
    const stx = result.hierarchy[0];
    const bat = stx?.children.find((n) => n.loopId === 'BAT');
    const mhds = bat?.children.filter((n) => n.loopId === 'MHD') ?? [];
    expect(mhds).toHaveLength(2);
  });

  it('parses STX elements (sender / receiver / date)', () => {
    const stx = result.segments.find((s) => s.id === 'STX');
    expect(stx?.elements).toContain('5012345678901:KEEN');
    expect(stx?.elements).toContain('5012345678902:NEW');
  });

  it('flags MTR count mismatch', () => {
    const broken = ORDERS_DOC.replace("MTR=6'MHD=2", "MTR=999'MHD=2");
    const r = parseEDI(broken);
    const err = r.errors.find((e) => e.segmentId === 'MTR' && /Segment count mismatch/.test(e.message));
    expect(err).toBeDefined();
  });

  it('flags END count mismatch', () => {
    const broken = ORDERS_DOC.replace("END=2'", "END=99'");
    const r = parseEDI(broken);
    const err = r.errors.find((e) => e.segmentId === 'END' && /Message count mismatch/.test(e.message));
    expect(err).toBeDefined();
  });

  it('clean document has no validation errors', () => {
    const errs = result.errors.filter((e) => /mismatch|missing/.test(e.message));
    expect(errs).toHaveLength(0);
  });
});
