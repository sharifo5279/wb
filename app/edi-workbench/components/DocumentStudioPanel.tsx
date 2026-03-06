'use client';

import type React from 'react';

const LUCIDE_CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

interface StackPill {
  label: string;
  color: string;
  glow: string;
}

const STACK_PILLS: StackPill[] = [
  { label: 'Portal auth active',           color: '#34c97a', glow: 'rgba(52, 201, 122, .5)'  },
  { label: 'Next.js route /edi-workbench', color: '#4f8ef7', glow: 'rgba(79, 142, 247, .5)'  },
  { label: 'Claude streaming ready',        color: '#6366f1', glow: 'rgba(99, 102, 241, .5)'  },
  { label: 'Design tokens loaded',          color: '#f5a623', glow: 'rgba(245, 166, 35, .5)'  },
];

/**
 * Document Studio panel — shown when the Document Studio tab is active.
 *
 * Layout (flex column, fills the workspace panel):
 *   ┌─────────────────────────────────────────┐
 *   │  .ds-empty (flex: 1)                    │  ← empty state / future document view
 *   │    icon · title · subtitle · buttons    │
 *   ├─────────────────────────────────────────┤
 *   │  .ds-stack-strip                        │  ← temporary foundation indicator
 *   │    ● Portal auth  ● Next.js  ● Claude … │
 *   └─────────────────────────────────────────┘
 *
 * The stack strip is a visual-only indicator and will be removed when REQ-2
 * replaces the empty state with the document viewer.
 * Buttons are non-functional placeholders — REQ-2 wires them up.
 */
export function DocumentStudioPanel() {
  return (
    <div className="ds-panel">
      {/* ── Empty state ── */}
      <div className="ds-empty">
        <div className="ds-empty__content">
          {/* Icon */}
          <div className="ds-empty__icon-wrap">
            <span
              className="ds-empty__icon"
              aria-hidden="true"
              style={
                { '--icon-url': `url(${LUCIDE_CDN}/file-text.svg)` } as React.CSSProperties
              }
            />
          </div>

          {/* Copy */}
          <h2 className="ds-empty__title">Document Studio</h2>
          <p className="ds-empty__subtitle">
            Paste or upload a raw EDI document to inspect its structure, visualize
            the segment hierarchy, and get AI-powered explanations — all without
            leaving the portal.
          </p>

          {/* Action buttons (placeholders — REQ-2 adds behaviour) */}
          <div className="ds-empty__actions">
            <button type="button" className="ds-btn ds-btn--primary">
              <span
                className="ds-btn__icon"
                aria-hidden="true"
                style={
                  { '--icon-url': `url(${LUCIDE_CDN}/upload.svg)` } as React.CSSProperties
                }
              />
              Upload EDI file
            </button>
            <button type="button" className="ds-btn ds-btn--ghost">
              <span
                className="ds-btn__icon"
                aria-hidden="true"
                style={
                  { '--icon-url': `url(${LUCIDE_CDN}/clipboard.svg)` } as React.CSSProperties
                }
              />
              Paste EDI text
            </button>
          </div>
        </div>
      </div>

      {/* ── Stack confirmation strip ── */}
      <div className="ds-stack-strip" aria-label="Foundation status">
        {STACK_PILLS.map(({ label, color, glow }) => (
          <div key={label} className="ds-stack-pill">
            <span
              className="ds-stack-pill__dot"
              aria-hidden="true"
              style={{ background: color, boxShadow: `0 0 4px ${glow}` }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
