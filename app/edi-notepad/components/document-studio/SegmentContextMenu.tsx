'use client';

import { useEffect, useRef } from 'react';

export type SegmentAction =
  | 'delete'
  | 'duplicate'
  | 'insertRefAfter'
  | 'insertDtmAfter'
  | 'insertNteAfter';

interface MenuItem {
  action: SegmentAction;
  label: string;
  destructive?: boolean;
}

const ITEMS: MenuItem[] = [
  { action: 'duplicate',       label: 'Duplicate segment' },
  { action: 'insertRefAfter',  label: 'Insert REF after' },
  { action: 'insertDtmAfter',  label: 'Insert DTM after' },
  { action: 'insertNteAfter',  label: 'Insert NTE after' },
  { action: 'delete',          label: 'Delete segment', destructive: true },
];

interface SegmentContextMenuProps {
  /** Anchor position (clientX, clientY). */
  x: number;
  y: number;
  segmentId: string;
  onAction: (action: SegmentAction) => void;
  onClose: () => void;
}

/**
 * SegmentContextMenu — right-click popover anchored at the click position.
 * Closes on Escape, click outside, or after an action is chosen.
 */
export function SegmentContextMenu({
  x, y, segmentId, onAction, onClose,
}: SegmentContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  // Constrain to viewport so we don't overflow off the right or bottom edge.
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, (typeof window !== 'undefined' ? window.innerWidth - 220 : x)),
    top: Math.min(y, (typeof window !== 'undefined' ? window.innerHeight - 200 : y)),
    zIndex: 1000,
  };

  return (
    <div ref={ref} className="ds-ctxmenu" role="menu" style={style}>
      <div className="ds-ctxmenu__header">
        <span className="ds-ctxmenu__seg">{segmentId}</span>
      </div>
      {ITEMS.map((item) => (
        <button
          key={item.action}
          type="button"
          role="menuitem"
          className={`ds-ctxmenu__item${item.destructive ? ' ds-ctxmenu__item--destructive' : ''}`}
          onClick={() => onAction(item.action)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
