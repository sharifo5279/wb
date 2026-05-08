import { describe, it, expect } from 'vitest';
import { buildSkeleton } from './builder';
import { parseEDI } from './parser';

describe('buildSkeleton — X12', () => {
  it('produces a parseable 850 skeleton', () => {
    const { text, filename } = buildSkeleton('X12', '005010', '850', {
      controlNumber: '000000042',
      date: '20210101',
      time: '1200',
    });
    expect(filename).toBe('850_skeleton.edi');
    const result = parseEDI(text);
    expect(result.standard).toBe('X12');
    // No envelope-level mismatches (trailer counts, control numbers)
    const envelopeErrors = result.errors.filter((e) =>
      /Control number mismatch|count mismatch/.test(e.message),
    );
    expect(envelopeErrors).toHaveLength(0);
  });

  it('produces a parseable 856 skeleton', () => {
    const { text } = buildSkeleton('X12', '005010', '856');
    const result = parseEDI(text);
    expect(result.standard).toBe('X12');
    const envelopeErrors = result.errors.filter((e) =>
      /Control number mismatch|count mismatch/.test(e.message),
    );
    expect(envelopeErrors).toHaveLength(0);
  });

  it('produces a parseable 997 skeleton', () => {
    const { text } = buildSkeleton('X12', '005010', '997');
    const result = parseEDI(text);
    const envelopeErrors = result.errors.filter((e) =>
      /Control number mismatch|count mismatch/.test(e.message),
    );
    expect(envelopeErrors).toHaveLength(0);
  });

  it('throws for stub or unknown transaction codes', () => {
    expect(() => buildSkeleton('X12', '005010', 'XXXX')).toThrow();
  });
});

describe('buildSkeleton — EDIFACT', () => {
  it('produces a parseable ORDERS skeleton', () => {
    const { text } = buildSkeleton('EDIFACT', 'D01B', 'ORDERS', { controlNumber: '7' });
    const result = parseEDI(text);
    expect(result.standard).toBe('EDIFACT');
    const envelopeErrors = result.errors.filter((e) =>
      /mismatch/.test(e.message),
    );
    expect(envelopeErrors).toHaveLength(0);
  });
});

describe('buildSkeleton — TRADACOMS', () => {
  it('produces a parseable ORDHDR skeleton', () => {
    const { text } = buildSkeleton('TRADACOMS', 'ANA001', 'ORDHDR');
    const result = parseEDI(text);
    expect(result.standard).toBe('TRADACOMS');
    const envelopeErrors = result.errors.filter((e) =>
      /mismatch/.test(e.message),
    );
    expect(envelopeErrors).toHaveLength(0);
  });
});
