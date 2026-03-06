'use client';

import { useState, useRef, useEffect } from 'react';
import type { ParseError } from '@/src/lib/edi/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ErrorTooltipProps {
  errors: ParseError[];
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ErrorTooltip — wraps a span with a hover tooltip listing parse errors.
 *
 * The tooltip is absolutely positioned relative to the nearest positioned
 * ancestor (.ds-editor-line). It appears above the underlined text and flips
 * below if there isn't enough room above.
 *
 * Usage:
 *   <ErrorTooltip errors={segment.errors}>
 *     <span className="ds-editor-token--segId ds-editor-token--error">ISA</span>
 *   </ErrorTooltip>
 */
export function ErrorTooltip({ errors, children }: ErrorTooltipProps) {
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef  = useRef<HTMLDivElement>(null);

  // Flip tooltip below the anchor if it would clip the top of the scroll container
  useEffect(() => {
    if (!visible || !tipRef.current || !wrapRef.current) return;
    const tip  = tipRef.current.getBoundingClientRect();
    const wrap = wrapRef.current.getBoundingClientRect();
    if (tip.top < 4) {
      tipRef.current.style.top    = `${wrap.height + 4}px`;
      tipRef.current.style.bottom = 'auto';
    }
  }, [visible]);

  if (errors.length === 0) return <>{children}</>;

  return (
    <span
      ref={wrapRef}
      className="ds-error-anchor"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          ref={tipRef}
          className="ds-error-tooltip"
          role="tooltip"
          aria-live="polite"
        >
          {errors.map((err, i) => (
            <div key={i} className="ds-error-tooltip__msg">
              {err.message}
            </div>
          ))}
        </div>
      )}
    </span>
  );
}
