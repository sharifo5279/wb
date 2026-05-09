'use client';

import { useEffect, useRef } from 'react';
import type React from 'react';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

interface FindBarProps {
  open: boolean;
  query: string;
  replaceQuery: string;
  matchCount: number;
  /** 1-based current match. 0 when no matches. */
  currentMatch: number;
  showReplace: boolean;
  caseSensitive: boolean;
  regex: boolean;
  onQueryChange: (q: string) => void;
  onReplaceQueryChange: (q: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onToggleReplace: () => void;
  onToggleCase: () => void;
  onToggleRegex: () => void;
  onClose: () => void;
}

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

/**
 * FindBar — overlay above the editor body for Find / Find+Replace.
 *
 * Triggered by Ctrl+F (find) or Ctrl+H (find+replace) inside the editor.
 * Owns no state — parent (EDIEditor) computes match positions and drives
 * navigation; this component is purely presentational.
 */
export function FindBar({
  open,
  query,
  replaceQuery,
  matchCount,
  currentMatch,
  showReplace,
  caseSensitive,
  regex,
  onQueryChange,
  onReplaceQueryChange,
  onPrev,
  onNext,
  onReplace,
  onReplaceAll,
  onToggleReplace,
  onToggleCase,
  onToggleRegex,
  onClose,
}: FindBarProps) {
  const queryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) queryRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function handleQueryKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    }
  }

  function handleReplaceKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onReplaceAll();
      else onReplace();
    }
  }

  return (
    <div className="ds-findbar" role="search" aria-label="Find in document">
      <div className="ds-findbar__row">
        <button
          type="button"
          className={`ds-findbar__toggle${showReplace ? ' ds-findbar__toggle--active' : ''}`}
          onClick={onToggleReplace}
          aria-expanded={showReplace}
          aria-label="Toggle replace"
          title="Toggle replace (Ctrl+H)"
        >
          <span className="ds-findbar__icon" aria-hidden="true" style={icon(showReplace ? 'chevron-down' : 'chevron-right')} />
        </button>

        <input
          ref={queryRef}
          type="text"
          className="ds-findbar__input"
          placeholder="Find"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleQueryKey}
          spellCheck={false}
          autoCorrect="off"
          aria-label="Find text"
        />

        <button
          type="button"
          className={`ds-findbar__case${caseSensitive ? ' ds-findbar__case--active' : ''}`}
          onClick={onToggleCase}
          aria-pressed={caseSensitive}
          title="Match case"
        >
          Aa
        </button>

        <button
          type="button"
          className={`ds-findbar__case${regex ? ' ds-findbar__case--active' : ''}`}
          onClick={onToggleRegex}
          aria-pressed={regex}
          title="Use regular expression"
        >
          .*
        </button>

        <span className="ds-findbar__count" aria-live="polite">
          {matchCount === 0 ? 'No results' : `${currentMatch} of ${matchCount}`}
        </span>

        <button type="button" className="ds-findbar__btn" onClick={onPrev} disabled={matchCount === 0} aria-label="Previous match" title="Previous (Shift+Enter)">
          <span className="ds-findbar__icon" aria-hidden="true" style={icon('chevron-up')} />
        </button>
        <button type="button" className="ds-findbar__btn" onClick={onNext} disabled={matchCount === 0} aria-label="Next match" title="Next (Enter)">
          <span className="ds-findbar__icon" aria-hidden="true" style={icon('chevron-down')} />
        </button>
        <button type="button" className="ds-findbar__btn" onClick={onClose} aria-label="Close find" title="Close (Esc)">
          <span className="ds-findbar__icon" aria-hidden="true" style={icon('x')} />
        </button>
      </div>

      {showReplace && (
        <div className="ds-findbar__row">
          <span className="ds-findbar__toggle ds-findbar__toggle--placeholder" aria-hidden="true" />
          <input
            type="text"
            className="ds-findbar__input"
            placeholder="Replace"
            value={replaceQuery}
            onChange={(e) => onReplaceQueryChange(e.target.value)}
            onKeyDown={handleReplaceKey}
            spellCheck={false}
            autoCorrect="off"
            aria-label="Replace text"
          />
          <button type="button" className="ds-findbar__action" onClick={onReplace} disabled={matchCount === 0}>
            Replace
          </button>
          <button type="button" className="ds-findbar__action ds-findbar__action--primary" onClick={onReplaceAll} disabled={matchCount === 0}>
            Replace All
          </button>
        </div>
      )}
    </div>
  );
}
