import { describe, it, expect } from 'vitest';
import { computeMatches, findContainingLine, replaceAll } from './find';

describe('computeMatches', () => {
  it('returns [] for empty query', () => {
    expect(computeMatches('hello', '', false)).toEqual([]);
  });

  it('returns [] when no matches', () => {
    expect(computeMatches('abc', 'z', false)).toEqual([]);
  });

  it('finds all non-overlapping matches', () => {
    expect(computeMatches('ababab', 'ab', false)).toEqual([0, 2, 4]);
  });

  it('case-insensitive by default', () => {
    expect(computeMatches('ISA*ISA', 'isa', false)).toEqual([0, 4]);
  });

  it('case-sensitive when requested', () => {
    expect(computeMatches('ISA*isa', 'ISA', true)).toEqual([0]);
  });

  it('handles overlapping queries by advancing past needle length', () => {
    // "aaaa" with query "aa" → matches at 0 and 2 (non-overlapping)
    expect(computeMatches('aaaa', 'aa', false)).toEqual([0, 2]);
  });
});

describe('findContainingLine', () => {
  const text = 'line1\nline2\nline3';
  it('offset 0 → line 1', () => { expect(findContainingLine(text, 0)).toBe(1); });
  it('offset within line 1 → line 1', () => { expect(findContainingLine(text, 3)).toBe(1); });
  it('offset on first newline → line 2', () => { expect(findContainingLine(text, 6)).toBe(2); });
  it('offset within line 3 → line 3', () => { expect(findContainingLine(text, 14)).toBe(3); });
});

describe('replaceAll', () => {
  it('replaces every occurrence', () => {
    const r = replaceAll('foo bar foo baz', 'foo', 'qux', false);
    expect(r.text).toBe('qux bar qux baz');
    expect(r.count).toBe(2);
  });

  it('returns input unchanged when nothing matches', () => {
    const r = replaceAll('abc', 'z', 'x', false);
    expect(r.text).toBe('abc');
    expect(r.count).toBe(0);
  });

  it('handles different-length replacements', () => {
    const r = replaceAll('aaa', 'a', 'XX', false);
    expect(r.text).toBe('XXXXXX');
    expect(r.count).toBe(3);
  });
});
