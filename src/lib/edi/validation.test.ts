import { describe, it, expect } from 'vitest';
import { parseEDI } from './parser';

// ─── Cross-segment validation tests ──────────────────────────────────────────

const ISA =
  'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210101*1200*^*00501*000000001*0*P*:~';

function build(stBlock: string[], opts: { ieaCtrl?: string; geCtrl?: string } = {}): string {
  return [
    ISA,
    'GS*PO*SENDER*RECEIVER*20210101*1200*1*X*005010~',
    ...stBlock,
    `GE*1*${opts.geCtrl ?? '1'}~`,
    `IEA*1*${opts.ieaCtrl ?? '000000001'}~`,
  ].join('\n');
}

describe('validateX12 — trailer counts', () => {
  it('flags SE01 mismatch', () => {
    const doc = build([
      'ST*850*0001~',
      'BEG*00*NE*PO1**20210101~',
      'CTT*1~',
      'SE*99*0001~', // wrong count
    ]);
    const result = parseEDI(doc);
    const seErr = result.errors.find(
      (e) => e.segmentId === 'SE' && /Segment count mismatch/.test(e.message),
    );
    expect(seErr).toBeDefined();
  });

  it('flags ST/SE control number mismatch', () => {
    const doc = build([
      'ST*850*0001~',
      'BEG*00*NE*PO1**20210101~',
      'CTT*1~',
      'SE*4*9999~', // wrong control number
    ]);
    const result = parseEDI(doc);
    const err = result.errors.find(
      (e) => e.segmentId === 'SE' && /Control number mismatch/.test(e.message),
    );
    expect(err).toBeDefined();
  });
});

describe('validateX12 — control numbers', () => {
  it('flags ISA/IEA control number mismatch', () => {
    const doc = build(
      [
        'ST*850*0001~',
        'BEG*00*NE*PO1**20210101~',
        'CTT*1~',
        'SE*4*0001~',
      ],
      { ieaCtrl: '000000999' }, // wrong
    );
    const result = parseEDI(doc);
    const err = result.errors.find(
      (e) => e.segmentId === 'IEA' && /Control number mismatch/.test(e.message),
    );
    expect(err).toBeDefined();
  });

  it('flags GS/GE control number mismatch', () => {
    const doc = build(
      [
        'ST*850*0001~',
        'BEG*00*NE*PO1**20210101~',
        'CTT*1~',
        'SE*4*0001~',
      ],
      { geCtrl: '999' },
    );
    const result = parseEDI(doc);
    const err = result.errors.find(
      (e) => e.segmentId === 'GE' && /Control number mismatch/.test(e.message),
    );
    expect(err).toBeDefined();
  });
});

describe('validateX12 — mandatory segments', () => {
  it('flags missing CTT in 850', () => {
    const doc = build([
      'ST*850*0001~',
      'BEG*00*NE*PO1**20210101~',
      'SE*3*0001~',
    ]);
    const result = parseEDI(doc);
    const err = result.errors.find(
      (e) => e.segmentId === 'CTT' && /required segment/.test(e.message),
    );
    expect(err).toBeDefined();
  });

  it('does not flag mandatory segments for unknown transaction sets', () => {
    // 999999 isn't in the dictionary — no mandatory checks should fire
    const doc = build([
      'ST*999999*0001~',
      'SE*2*0001~',
    ]);
    const result = parseEDI(doc);
    const mandatoryErrors = result.errors.filter((e) =>
      /required segment/.test(e.message),
    );
    expect(mandatoryErrors).toHaveLength(0);
  });
});

describe('ParseError severity', () => {
  it('cross-validation errors carry severity="error"', () => {
    const doc = build([
      'ST*850*0001~',
      'BEG*00*NE*PO1**20210101~',
      'CTT*1~',
      'SE*99*0001~',
    ]);
    const result = parseEDI(doc);
    const seErr = result.errors.find(
      (e) => e.segmentId === 'SE' && /Segment count mismatch/.test(e.message),
    );
    expect(seErr?.severity).toBe('error');
  });
});

describe('validateEdifact — trailer counts', () => {
  const EDIFACT = (untCount: string, untRef = '1', unzCount = '1', unzRef = '1') =>
    `UNB+UNOB:1+SENDER:1+RECEIVER:1+210101:1200+1'` +
    `UNH+1+ORDERS:D:96A:UN:EAN008'` +
    `BGM+220+PO1+9'` +
    `UNT+${untCount}+${untRef}'` +
    `UNZ+${unzCount}+${unzRef}'`;

  it('flags UNT01 segment count mismatch', () => {
    const result = parseEDI(EDIFACT('99'));
    const err = result.errors.find(
      (e) => e.segmentId === 'UNT' && /Segment count mismatch/.test(e.message),
    );
    expect(err).toBeDefined();
  });

  it('flags UNH/UNT reference mismatch', () => {
    const result = parseEDI(EDIFACT('3', '999'));
    const err = result.errors.find(
      (e) => e.segmentId === 'UNT' && /Reference mismatch/.test(e.message),
    );
    expect(err).toBeDefined();
  });

  it('flags UNB/UNZ control number mismatch', () => {
    const result = parseEDI(EDIFACT('3', '1', '1', '999'));
    const err = result.errors.find(
      (e) => e.segmentId === 'UNZ' && /Control number mismatch/.test(e.message),
    );
    expect(err).toBeDefined();
  });
});
