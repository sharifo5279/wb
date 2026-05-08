import { describe, it, expect } from 'vitest';
import { parseEDI } from './parser';
import { generateAck } from './ack-generator';

const ISA =
  'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210101*1200*^*00501*000000001*0*P*:~';

const VALID_X12_850 = [
  ISA,
  'GS*PO*SENDER*RECEIVER*20210101*1200*1*X*005010~',
  'ST*850*0001~',
  'BEG*00*NE*PO1**20210101~',
  'CTT*1~',
  'SE*4*0001~',
  'GE*1*1~',
  'IEA*1*000000001~',
].join('\n');

const BROKEN_X12_850 = [
  ISA,
  'GS*PO*SENDER*RECEIVER*20210101*1200*1*X*005010~',
  'ST*850*0001~',
  'BEG*00*NE*PO1**20210101~',
  // missing CTT (mandatory) → triggers an error from the validator
  'SE*3*0001~',
  'GE*1*1~',
  'IEA*1*000000001~',
].join('\n');

describe('generateAck — X12 997', () => {
  it('produces ACCEPTED status for a clean 850', () => {
    const result = parseEDI(VALID_X12_850);
    const ack = generateAck(result, { date: '20210202', time: '1500', controlNumber: '000000042' });
    expect(ack.overallStatus).toBe('A');
    expect(ack.setStatuses).toHaveLength(1);
    expect(ack.setStatuses[0]).toMatchObject({ set: '850', control: '0001', status: 'A' });
  });

  it('produces REJECTED status when validation finds errors', () => {
    const result = parseEDI(BROKEN_X12_850);
    const ack = generateAck(result, { date: '20210202', time: '1500' });
    expect(ack.overallStatus).toBe('R');
    expect(ack.setStatuses[0].status).toBe('R');
  });

  it('swaps sender/receiver in the envelope by default', () => {
    const result = parseEDI(VALID_X12_850);
    const ack = generateAck(result, { date: '20210202', time: '1500' });
    // Original was SENDER → RECEIVER; ACK should be RECEIVER → SENDER
    expect(ack.text).toMatch(/ZZ\*RECEIVER\s+\*ZZ\*SENDER/);
  });

  it('round-trips: generated 997 parses cleanly', () => {
    const result = parseEDI(VALID_X12_850);
    const ack = generateAck(result, { date: '20210202', time: '1500' });
    const re = parseEDI(ack.text);
    expect(re.standard).toBe('X12');
    const errors = re.errors.filter((e) => /mismatch/.test(e.message));
    expect(errors).toHaveLength(0);
  });

  it('SE01 segment count is correct for the generated 997', () => {
    const result = parseEDI(VALID_X12_850);
    const ack = generateAck(result, { date: '20210202', time: '1500' });
    const re = parseEDI(ack.text);
    const seSegment = re.segments.find((s) => s.id === 'SE');
    expect(seSegment).toBeDefined();
    // From ST to SE inclusive: ST, AK1, AK2, AK5, AK9, SE = 6
    expect(seSegment?.elements[0]).toBe('6');
  });

  it('produces a sensible filename', () => {
    const result = parseEDI(VALID_X12_850);
    const ack = generateAck(result, { controlNumber: '000000042' });
    expect(ack.filename).toBe('997_42.edi');
  });

  it('throws when the incoming document has no ISA/GS', () => {
    const result = parseEDI('PLAINTEXT');
    expect(() => generateAck(result)).toThrow();
  });
});

describe('generateAck — EDIFACT CONTRL', () => {
  const EDIFACT_OK =
    `UNB+UNOB:1+SENDER:1+RECEIVER:1+210101:1200+1'` +
    `UNH+1+ORDERS:D:96A:UN:EAN008'` +
    `BGM+220+PO1+9'` +
    `UNT+3+1'` +
    `UNZ+1+1'`;

  it('produces ACCEPTED status for a clean ORDERS message', () => {
    const result = parseEDI(EDIFACT_OK);
    const ack = generateAck(result, { date: '20210202', time: '1500', controlNumber: '99' });
    expect(ack.overallStatus).toBe('A');
    expect(ack.setStatuses[0]).toMatchObject({ set: 'ORDERS', status: 'A' });
  });

  it('round-trips: generated CONTRL parses cleanly', () => {
    const result = parseEDI(EDIFACT_OK);
    const ack = generateAck(result, { date: '20210202', time: '1500', controlNumber: '99' });
    const re = parseEDI(ack.text);
    expect(re.standard).toBe('EDIFACT');
    const errors = re.errors.filter((e) => /mismatch/.test(e.message));
    expect(errors).toHaveLength(0);
  });

  it('CONTRL filename is sensible', () => {
    const result = parseEDI(EDIFACT_OK);
    const ack = generateAck(result, { controlNumber: '7' });
    expect(ack.filename).toBe('CONTRL_7.edi');
  });
});
