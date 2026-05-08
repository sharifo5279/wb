'use client';

import type React from 'react';
import type { DocState } from './DocumentStudio';

const CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

interface DocTabsProps {
  docs: DocState[];
  activeDocId: string;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

function icon(name: string): React.CSSProperties {
  return { '--icon-url': `url(${CDN}/${name}.svg)` } as React.CSSProperties;
}

/**
 * DocTabs — tab strip above the toolbar listing every open document.
 *
 * Click a tab to make it active. The ✕ button closes a tab; the "+" button
 * opens a fresh untitled doc. Closing the only tab replaces it with a fresh
 * one rather than leaving the workspace empty.
 */
export function DocTabs({ docs, activeDocId, onSwitch, onClose, onNew }: DocTabsProps) {
  return (
    <div className="ds-doctabs" role="tablist" aria-label="Open documents">
      <div className="ds-doctabs__row">
        {docs.map((doc) => {
          const active = doc.id === activeDocId;
          return (
            <div
              key={doc.id}
              role="tab"
              aria-selected={active}
              className={`ds-doctab${active ? ' ds-doctab--active' : ''}`}
              onClick={() => onSwitch(doc.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSwitch(doc.id);
                }
              }}
              tabIndex={active ? 0 : -1}
              title={doc.title}
            >
              <span className="ds-doctab__title">{doc.title || 'Untitled'}</span>
              <button
                type="button"
                className="ds-doctab__close"
                aria-label={`Close ${doc.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(doc.id);
                }}
              >
                <span className="ds-doctab__close-icon" aria-hidden="true" style={icon('x')} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="ds-doctabs__new"
          aria-label="Open new document tab"
          title="New document tab"
          onClick={onNew}
        >
          <span className="ds-doctab__close-icon" aria-hidden="true" style={icon('plus')} />
        </button>
      </div>
    </div>
  );
}
