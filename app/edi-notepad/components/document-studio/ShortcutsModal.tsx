'use client';

import { useEffect, useRef } from 'react';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  { category: 'Editor',  keys: ['Ctrl', 'V'],         description: 'Paste from clipboard (when in editor)' },
  { category: 'Editor',  keys: ['Ctrl', 'F'],         description: 'Find in document' },
  { category: 'Editor',  keys: ['Ctrl', 'H'],         description: 'Find and replace' },
  { category: 'Editor',  keys: ['Esc'],               description: 'Close find / element popover / drawers' },
  { category: 'Editor',  keys: ['Enter'],             description: 'In Find: next match · In element editor: apply' },
  { category: 'Editor',  keys: ['Shift', 'Enter'],    description: 'In Find: previous match · In element editor: replace all' },
  { category: 'Editor',  keys: ['Tab'],               description: 'Insert two spaces (block indent)' },
  { category: 'Editor',  keys: ['Double-click'],      description: 'Edit element value (popover with code list)' },
  { category: 'Tree',    keys: ['Right-click'],       description: 'Segment context menu (Insert / Duplicate / Delete)' },
  { category: 'Global',  keys: ['Ctrl', 'Shift', 'P'],description: 'Open command palette' },
  { category: 'Global',  keys: ['Ctrl', 'K'],         description: 'Open command palette' },
  { category: 'Global',  keys: ['?'],                 description: 'Open this shortcut reference' },
  { category: 'Global',  keys: ['F1'],                description: 'Open this shortcut reference' },
  { category: 'Drawer',  keys: ['↑', '↓'],            description: 'Previous / next error in error drawer' },
];

/**
 * ShortcutsModal — keyboard shortcut reference. Triggered by `?` (when not
 * focused in an input) or F1.
 */
export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Group by category
  const byCategory = SHORTCUTS.reduce<Record<string, Shortcut[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div
      className="cm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cm-modal ds-shortcuts">
        <header className="cm-modal__header">
          <h2 className="cm-modal__title">Keyboard Shortcuts</h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="cm-modal__close"
            onClick={onClose}
            aria-label="Close shortcuts"
          >
            ×
          </button>
        </header>

        <div className="cm-modal__body ds-shortcuts__body">
          {Object.entries(byCategory).map(([cat, items]) => (
            <section key={cat} className="ds-shortcuts__group">
              <h3 className="ds-shortcuts__cat">{cat}</h3>
              <ul className="ds-shortcuts__list">
                {items.map((s, i) => (
                  <li key={i} className="ds-shortcuts__row">
                    <span className="ds-shortcuts__keys">
                      {s.keys.map((k, j) => (
                        <span key={j}>
                          <kbd className="ds-shortcuts__kbd">{k}</kbd>
                          {j < s.keys.length - 1 && <span className="ds-shortcuts__plus">+</span>}
                        </span>
                      ))}
                    </span>
                    <span className="ds-shortcuts__desc">{s.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
