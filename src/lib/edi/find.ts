// ─── Find helpers (UI-agnostic) ──────────────────────────────────────────────
//
// computeMatches scans `text` for every occurrence of `query` (literal or
// regex; case-sensitive or not) and returns `{start, length}` pairs so
// regex matches with variable length work consistently.
//
// Regex mode swallows invalid patterns (returns []) so an in-progress
// regex (e.g. user is still typing) doesn't crash the editor.
//
// findContainingLine resolves a 0-based char offset to the 1-based editor
// line number, matching the cursor-line model used in EDIEditor.

export interface FindMatch {
  start: number;
  length: number;
}

export function computeMatches(
  text: string,
  query: string,
  caseSensitive: boolean,
  regex = false,
): FindMatch[] {
  if (!query) return [];

  if (regex) {
    let re: RegExp;
    try {
      re = new RegExp(query, caseSensitive ? 'g' : 'gi');
    } catch {
      // Invalid regex — return empty rather than throw, so the FindBar
      // simply shows "No results" while the user finishes typing.
      return [];
    }
    const out: FindMatch[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      // Zero-length matches (e.g. `^`) would loop forever; advance lastIndex.
      const len = m[0].length;
      out.push({ start: m.index, length: len });
      if (len === 0) re.lastIndex = m.index + 1;
    }
    return out;
  }

  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const out: FindMatch[] = [];
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx < 0) break;
    out.push({ start: idx, length: needle.length });
    from = idx + Math.max(1, needle.length);
  }
  return out;
}

/** Resolve a 0-based char offset in `text` to the 1-based line number it lives on. */
export function findContainingLine(text: string, offset: number): number {
  if (offset <= 0) return 1;
  const slice = text.slice(0, offset);
  return slice.split('\n').length;
}

/**
 * Replace every match of `query` in `text` with `replacement`. Walks end →
 * start so successive splices don't shift positions. Pure function; the
 * caller is responsible for triggering a re-parse afterwards.
 */
export function replaceAll(
  text: string,
  query: string,
  replacement: string,
  caseSensitive: boolean,
  regex = false,
): { text: string; count: number } {
  const matches = computeMatches(text, query, caseSensitive, regex);
  if (matches.length === 0) return { text, count: 0 };
  let out = text;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { start, length } = matches[i];
    out = out.slice(0, start) + replacement + out.slice(start + length);
  }
  return { text: out, count: matches.length };
}
