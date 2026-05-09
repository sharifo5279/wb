'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

export interface Command {
  id: string;
  label: string;
  category: 'File' | 'Edit' | 'View' | 'Tools' | 'Navigate';
  shortcut?: string;
  action: () => void;
  /** Hide the command when this returns false (defaults to always available). */
  enabled?: () => boolean;
}

interface CommandPaletteProps {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

/** Simple fuzzy score: matches characters in order, weighted toward consecutive runs. */
function fuzzyScore(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let score = 0;
  let qi = 0;
  let runStreak = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      runStreak++;
      score += 1 + runStreak;
    } else {
      runStreak = 0;
    }
  }
  if (qi < q.length) return 0;
  return score;
}

/**
 * CommandPalette — Ctrl+Shift+P / ⌘K modal exposing every action in the app
 * as a typed-fuzzy-search list. Keyboard nav: ↑/↓ select, Enter execute,
 * Esc close.
 */
export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const enabledCommands = commands.filter((c) => c.enabled?.() !== false);
    if (!query.trim()) return enabledCommands;
    return enabledCommands
      .map((c) => ({ c, score: fuzzyScore(query, c.label) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);
  }, [commands, query]);

  // Reset active row when query changes
  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIdx(0);
    inputRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[activeIdx];
        if (cmd) { cmd.action(); onClose(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIdx, onClose]);

  // Scroll active row into view
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const row = list.querySelector(`[data-idx="${activeIdx}"]`);
    if (row) (row as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  if (!open) return null;

  return (
    <div
      className="cm-overlay ds-cmdpal__overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ds-cmdpal">
        <div className="ds-cmdpal__searchrow">
          <span className="ds-cmdpal__searchicon" aria-hidden="true" style={icon('search')} />
          <input
            ref={inputRef}
            type="text"
            className="ds-cmdpal__input"
            placeholder="Type a command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            aria-label="Filter commands"
          />
          <span className="ds-cmdpal__count">{filtered.length}</span>
        </div>

        <div ref={listRef} className="ds-cmdpal__list" role="listbox">
          {filtered.length === 0 ? (
            <div className="ds-cmdpal__empty">No commands match &quot;{query}&quot;</div>
          ) : (
            filtered.map((c, idx) => {
              const active = idx === activeIdx;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-idx={idx}
                  className={`ds-cmdpal__row${active ? ' ds-cmdpal__row--active' : ''}`}
                  onClick={() => { c.action(); onClose(); }}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <span className="ds-cmdpal__cat">{c.category}</span>
                  <span className="ds-cmdpal__label">{c.label}</span>
                  {c.shortcut && <span className="ds-cmdpal__sc">{c.shortcut}</span>}
                </button>
              );
            })
          )}
        </div>

        <div className="ds-cmdpal__hint">
          <kbd>↑</kbd> <kbd>↓</kbd> select · <kbd>Enter</kbd> run · <kbd>Esc</kbd> close
        </div>
      </div>
    </div>
  );
}
