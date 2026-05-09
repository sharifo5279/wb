// ─── Session persistence ────────────────────────────────────────────────────
//
// Saves the user's open documents + active doc + tree-collapsed state into
// localStorage so a page reload doesn't lose work. We deliberately only
// persist the *raw* content per doc; the parsed structure is reconstructed
// by re-running parseEDI() on mount.
//
// Bounded by MAX_SESSION_BYTES — beyond that, persistence is silently skipped.
// localStorage is typically 5–10 MB per origin; 4 MB leaves headroom.

const STORAGE_KEY = 'np-session-v1';
const MAX_SESSION_BYTES = 4 * 1024 * 1024;

export interface PersistedDoc {
  id: string;
  title: string;
  rawContent: string;
}

export interface SessionSnapshot {
  docs: PersistedDoc[];
  activeDocId: string;
  treePanelCollapsed: boolean;
}

export function loadSession(): SessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.docs)) return null;
    if (typeof parsed.activeDocId !== 'string') return null;
    // Light validation; toss anything malformed.
    const docs = parsed.docs.filter((d: unknown) => {
      const x = d as { id?: unknown; title?: unknown; rawContent?: unknown };
      return typeof x?.id === 'string' && typeof x?.title === 'string' && typeof x?.rawContent === 'string';
    }) as PersistedDoc[];
    if (docs.length === 0) return null;
    return {
      docs,
      activeDocId: parsed.activeDocId,
      treePanelCollapsed: !!parsed.treePanelCollapsed,
    };
  } catch {
    return null;
  }
}

export function saveSession(snapshot: SessionSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(snapshot);
    if (json.length > MAX_SESSION_BYTES) return; // skip persistence for very large sessions
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // localStorage may be disabled (private mode, quota exceeded, etc.) — silently ignore
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
