import { describe, it, expect } from 'vitest';
import { incrementControlNumbers } from './control-numbers';
import { parseEDI } from './parser';

const ISA =
  'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210101*1200*^*00501*000000001*0*P*:~';

const X12_DOC = [
  ISA,
  'GS*PO*SENDER*RECEIVER*20210101*1200*1*X*005010~',
  'ST*850*0001~',
  'BEG*00*NE*PO1**20210101~',
  'CTT*1~',
  'SE*4*0001~',
  'GE*1*1~',
  'IEA*1*000000001~',
].join('\n');

describe('incrementControlNumbers — X12', () => {
  it('bumps every control number by 1', () => {
    const { text, changes } = incrementControlNumbers(X12_DOC);
    const ids = changes.map((c) => `${c.segmentId}${c.element}:${c.fromValue}→${c.toValue}`);
    expect(ids).toContain('ISA13:000000001→000000002');
    expect(ids).toContain('IEA2:000000001→000000002');
    expect(ids).toContain('GS6:1→2');
    expect(ids).toContain('GE2:1→2');
    expect(ids).toContain('ST2:0001→0002');
    expect(ids).toContain('SE2:0001→0002');
    expect(text).toContain('000000002');
  });

  it('preserves leading-zero padding', () => {
    const { changes } = incrementControlNumbers(X12_DOC);
    const isa = changes.find((c) => c.segmentId === 'ISA');
    expect(isa?.toValue).toHaveLength(9);
    const st = changes.find((c) => c.segmentId === 'ST');
    expect(st?.toValue).toHaveLength(4);
  });

  it('round-trips: incremented document parses cleanly', () => {
    const { text } = incrementControlNumbers(X12_DOC);
    const result = parseEDI(text);
    const ctrlMismatches = result.errors.filter((e) =>
      /Control number mismatch/.test(e.message),
    );
    expect(ctrlMismatches).toHaveLength(0);
  });

  it('two increments raise the value by 2', () => {
    const once = incrementControlNumbers(X12_DOC);
    const twice = incrementControlNumbers(once.text);
    expect(twice.text).toContain('000000003');
  });
});

describe('incrementControlNumbers — EDIFACT', () => {
  const ORDERS =
    `UNB+UNOB:1+SENDER:1+RECEIVER:1+210101:1200+1'` +
    `UNH+1+ORDERS:D:96A:UN:EAN008'` +
    `BGM+220+PO1+9'` +
    `UNT+3+1'` +
    `UNZ+1+1'`;

  it('bumps UNB05, UNZ02, UNH01, UNT02', () => {
    const { changes } = incrementControlNumbers(ORDERS);
    const summary = changes.map((c) => `${c.segmentId}${c.element}`);
    expect(summary).toContain('UNB5');
    expect(summary).toContain('UNZ2');
    expect(summary).toContain('UNH1');
    expect(summary).toContain('UNT2');
  });

  it('round-trips: incremented EDIFACT parses cleanly', () => {
    const { text } = incrementControlNumbers(ORDERS);
    const result = parseEDI(text);
    const ctrlMismatches = result.errors.filter((e) =>
      /mismatch/.test(e.message),
    );
    expect(ctrlMismatches).toHaveLength(0);
  });
});

describe('incrementControlNumbers — edge cases', () => {
  it('empty input returns unchanged', () => {
    expect(incrementControlNumbers('').text).toBe('');
  });

  it('non-EDI input returns unchanged', () => {
    const r = incrementControlNumbers('Hello world');
    expect(r.changes).toHaveLength(0);
    expect(r.text).toBe('Hello world');
  });

  it('skips non-numeric control values', () => {
    const doc = ISA.replace('*000000001*', '*ABC*') + '~IEA*1*ABC~';
    const r = incrementControlNumbers(doc);
    expect(r.changes.find((c) => c.segmentId === 'ISA')).toBeUndefined();
  });
});
