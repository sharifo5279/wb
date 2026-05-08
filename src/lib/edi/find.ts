// ─── Find helpers (UI-agnostic) ──────────────────────────────────────────────
//
// computeMatches scans `text` for every occurrence of `query` (case-sensitive
// or not) and returns the 0-based start positions. Returns an empty array
// when the query is empty so the consumer can short-circuit cheaply.
//
// findContainingLine resolves a 0-based char offset to the 1-based editor
// line number, matching the cursor-line model used in EDIEditor.

export function computeMatches(text: string, query: string, caseSensitive: boolean): number[] {
  if (!query) return [];
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const out: number[] = [];
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx < 0) break;
    out.push(idx);
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
): { text: string; count: number } {
  const matches = computeMatches(text, query, caseSensitive);
  if (matches.length === 0) return { text, count: 0 };
  let out = text;
  for (let i = matches.length - 1; i >= 0; i--) {
    const start = matches[i];
    out = out.slice(0, start) + replacement + out.slice(start + query.length);
  }
  return { text: out, count: matches.length };
}
