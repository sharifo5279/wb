'use client';

import { useState } from 'react';
import type { SegmentDef, ElementDef } from '@/src/lib/edi/dictionaries';

interface SegmentDetailProps {
  /** The segment as referenced by the transaction (with required + maxUse). */
  segRef?: { id: string; required: boolean; maxUse: number };
  /** The full segment definition (when the dictionary has it). May be undefined for unknown segments. */
  def: SegmentDef | undefined;
  /** Position in the transaction (1-based). Optional. */
  position?: number;
}

const TYPE_LABEL: Record<ElementDef['type'], string> = {
  AN: 'Alphanumeric',
  ID: 'Identifier (code)',
  N0: 'Integer',
  N2: 'Numeric ×10⁻²',
  R:  'Decimal',
  DT: 'Date',
  TM: 'Time',
};

/**
 * SegmentDetail — collapsible row showing one segment's metadata + element list.
 *
 * Used inside a transaction's detail page. Header row shows position / id /
 * name / required / max use; clicking expands to reveal the element-level
 * table (when the dictionary has element data for this segment).
 */
export function SegmentDetail({ segRef, def, position }: SegmentDetailProps) {
  const [open, setOpen] = useState(false);

  const id = segRef?.id ?? def?.id ?? '???';
  const name = def?.name ?? 'Unknown segment';
  const elements = def?.elements ?? [];
  const hasElements = elements.length > 0;

  return (
    <div className={`np-cov-segrow${open ? ' np-cov-segrow--open' : ''}`}>
      <button
        type="button"
        className="np-cov-segrow__header"
        onClick={() => hasElements && setOpen((v) => !v)}
        aria-expanded={open}
        disabled={!hasElements}
      >
        {position !== undefined && <span className="np-cov-segrow__pos">{position}</span>}
        <span className="np-cov-segrow__id">{id}</span>
        <span className="np-cov-segrow__name">{name}</span>
        {segRef && (
          <span className="np-cov-segrow__flags">
            {segRef.required && <span className="np-cov-pill np-cov-pill--full">Required</span>}
            {!segRef.required && <span className="np-cov-pill np-cov-pill--stub">Optional</span>}
            <span className="np-cov-segrow__maxuse">
              max use {segRef.maxUse === -1 ? '∞' : segRef.maxUse}
            </span>
          </span>
        )}
        {hasElements && (
          <span className="np-cov-segrow__chev" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
        )}
        {!hasElements && (
          <span className="np-cov-segrow__chev np-cov-segrow__chev--muted" aria-hidden="true">
            —
          </span>
        )}
      </button>

      {open && hasElements && (
        <div className="np-cov-segrow__body">
          <table className="np-cov-eltable">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Type</th>
                <th>Length</th>
                <th>Required</th>
                <th>Codes</th>
              </tr>
            </thead>
            <tbody>
              {elements.map((el, i) => (
                <tr key={i}>
                  <td className="np-cov-eltable__pos">{(i + 1).toString().padStart(2, '0')}</td>
                  <td>{el.name}</td>
                  <td className="np-cov-eltable__type">
                    <span className="np-cov-eltable__type-code">{el.type}</span>{' '}
                    <span className="np-cov-eltable__type-label">{TYPE_LABEL[el.type]}</span>
                  </td>
                  <td className="np-cov-eltable__len">
                    {el.minLength === el.maxLength
                      ? el.minLength
                      : `${el.minLength}–${el.maxLength}`}
                  </td>
                  <td>
                    {el.required ? (
                      <span className="np-cov-pill np-cov-pill--full">Yes</span>
                    ) : (
                      <span className="np-cov-pill np-cov-pill--stub">No</span>
                    )}
                  </td>
                  <td className="np-cov-eltable__codes">
                    {el.codes ? (
                      <details>
                        <summary>{Object.keys(el.codes).length} code{Object.keys(el.codes).length === 1 ? '' : 's'}</summary>
                        <ul className="np-cov-eltable__codelist">
                          {Object.entries(el.codes).map(([k, v]) => (
                            <li key={k}>
                              <span className="np-cov-eltable__code-key">{k}</span> {v}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
