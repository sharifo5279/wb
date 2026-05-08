'use client';

import { useEffect, useRef, useState } from 'react';
import type { ElementDef } from '@/src/lib/edi/dictionaries';

interface ElementEditorProps {
  /** Anchor coordinates from the click event. */
  x: number;
  y: number;
  segmentId: string;
  /** 1-based element position within the segment. */
  position: number;
  currentValue: string;
  /** Element definition from the curated dictionary, if known. */
  def: ElementDef | undefined;
  onApply: (newValue: string) => void;
  onCancel: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  AN: 'Alphanumeric',
  ID: 'Identifier (code)',
  N0: 'Integer',
  N2: 'Numeric ×10⁻²',
  R:  'Decimal',
  DT: 'Date',
  TM: 'Time',
};

/**
 * ElementEditor — popover anchored at a clicked element token. Shows the
 * element's curated metadata when known (name, type, length, code list) and
 * accepts a new value. If the dictionary supplies a code list the input is a
 * dropdown; otherwise a free-text input.
 *
 * Keyboard: Enter = apply, Escape = cancel.
 */
export function ElementEditor({
  x, y, segmentId, position, currentValue, def, onApply, onCancel,
}: ElementEditorProps) {
  const [value, setValue] = useState(currentValue);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      if (e.key === 'Enter')  { e.preventDefault(); onApply(value); }
    }
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onCancel();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    inputRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [value, onApply, onCancel]);

  // Constrain to viewport
  const left = typeof window !== 'undefined' ? Math.min(x, window.innerWidth - 320) : x;
  const top  = typeof window !== 'undefined' ? Math.min(y + 18, window.innerHeight - 220) : y + 18;

  const codes = def?.codes;
  const positionLabel = `${segmentId}${position.toString().padStart(2, '0')}`;

  return (
    <div
      ref={wrapRef}
      className="ds-elemedit"
      role="dialog"
      aria-label={`Edit ${positionLabel}`}
      style={{ position: 'fixed', left, top, zIndex: 1000 }}
    >
      <header className="ds-elemedit__header">
        <span className="ds-elemedit__pos">{positionLabel}</span>
        {def && <span className="ds-elemedit__name">{def.name}</span>}
      </header>

      {def && (
        <div className="ds-elemedit__meta">
          <span className="ds-elemedit__type">{def.type} · {TYPE_LABEL[def.type] ?? def.type}</span>
          <span className="ds-elemedit__len">
            {def.minLength === def.maxLength ? def.minLength : `${def.minLength}–${def.maxLength}`}
          </span>
          {def.required && <span className="ds-elemedit__required">required</span>}
        </div>
      )}

      <div className="ds-elemedit__body">
        {codes ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="ds-elemedit__select"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            <option value="">— empty —</option>
            {Object.entries(codes).map(([k, label]) => (
              <option key={k} value={k}>
                {k} · {label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            className="ds-elemedit__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
          />
        )}
      </div>

      <footer className="ds-elemedit__footer">
        <button type="button" className="ds-elemedit__btn" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className="ds-elemedit__btn ds-elemedit__btn--primary"
          onClick={() => onApply(value)}
        >
          Apply
        </button>
      </footer>
    </div>
  );
}
