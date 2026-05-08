import type { ParseResult, Segment } from './types';

// ─── Document summary ───────────────────────────────────────────────────────
//
// Distills a parse result into a compact, hierarchical summary of what the
// document contains: per-interchange sender/receiver/control, per-group
// info, per-transaction set IDs and segment counts, plus document totals.

export interface TransactionSummary {
  setCode: string;
  controlNumber: string;
  segmentCount: number;
  errorCount: number;
}

export interface GroupSummary {
  functionalCode: string;
  sender: string;
  receiver: string;
  controlNumber: string;
  transactions: TransactionSummary[];
}

export interface InterchangeSummary {
  sender: string;
  receiver: string;
  controlNumber: string;
  date: string;
  groups: GroupSummary[];
}

export interface DocumentSummary {
  standard: ParseResult['standard'];
  totalSegments: number;
  errorCount: number;
  warningCount: number;
  segmentCounts: Array<{ id: string; count: number }>;
  interchanges: InterchangeSummary[];
}

export function buildSummary(result: ParseResult): DocumentSummary {
  const segs = result.segments;
  const errors = result.errors.filter((e) => (e.severity ?? 'error') === 'error');
  const warnings = result.errors.filter((e) => e.severity === 'warning');

  const segmentCounts = countSegmentIds(segs);

  const interchanges: InterchangeSummary[] = [];

  if (result.standard === 'X12') {
    let i = 0;
    while (i < segs.length) {
      if (segs[i].id !== 'ISA') { i++; continue; }
      const isa = segs[i];
      const ich: InterchangeSummary = {
        sender: trim(isa.elements[5]),
        receiver: trim(isa.elements[7]),
        controlNumber: trim(isa.elements[12]),
        date: formatX12Date(trim(isa.elements[8])),
        groups: [],
      };
      i++;
      while (i < segs.length && segs[i].id !== 'IEA') {
        if (segs[i].id === 'GS') {
          const gs = segs[i];
          const grp: GroupSummary = {
            functionalCode: trim(gs.elements[0]),
            sender: trim(gs.elements[1]),
            receiver: trim(gs.elements[2]),
            controlNumber: trim(gs.elements[5]),
            transactions: [],
          };
          i++;
          while (i < segs.length && segs[i].id !== 'GE') {
            if (segs[i].id === 'ST') {
              const st = segs[i];
              const start = i;
              while (i < segs.length && segs[i].id !== 'SE') i++;
              const end = i; // SE position (or end of doc)
              const seg = segs[start];
              grp.transactions.push({
                setCode: trim(seg.elements[0]),
                controlNumber: trim(seg.elements[1]),
                segmentCount: end - start + 1,
                errorCount: segs.slice(start, end + 1).reduce((n, s) => n + s.errors.length, 0),
              });
              if (i < segs.length) i++; // skip SE
            } else { i++; }
          }
          ich.groups.push(grp);
          if (i < segs.length) i++; // skip GE
        } else { i++; }
      }
      interchanges.push(ich);
      if (i < segs.length) i++; // skip IEA
    }
  } else if (result.standard === 'EDIFACT') {
    let i = 0;
    while (i < segs.length) {
      if (segs[i].id !== 'UNB') { i++; continue; }
      const unb = segs[i];
      const ich: InterchangeSummary = {
        sender: trim(unb.elements[1]).split(':')[0] ?? '',
        receiver: trim(unb.elements[2]).split(':')[0] ?? '',
        controlNumber: trim(unb.elements[4]),
        date: formatEdifactDateComposite(trim(unb.elements[3])),
        groups: [],
      };
      // EDIFACT often has UNH directly inside UNB; treat as a single virtual group.
      const group: GroupSummary = {
        functionalCode: '—',
        sender: ich.sender,
        receiver: ich.receiver,
        controlNumber: ich.controlNumber,
        transactions: [],
      };
      i++;
      while (i < segs.length && segs[i].id !== 'UNZ') {
        if (segs[i].id === 'UNH') {
          const start = i;
          while (i < segs.length && segs[i].id !== 'UNT') i++;
          const end = i;
          const composite = segs[start].elements[1] ?? '';
          group.transactions.push({
            setCode: composite.split(':')[0]?.trim() ?? '',
            controlNumber: trim(segs[start].elements[0]),
            segmentCount: end - start + 1,
            errorCount: segs.slice(start, end + 1).reduce((n, s) => n + s.errors.length, 0),
          });
          if (i < segs.length) i++; // skip UNT
        } else { i++; }
      }
      ich.groups.push(group);
      interchanges.push(ich);
      if (i < segs.length) i++; // skip UNZ
    }
  }

  return {
    standard: result.standard,
    totalSegments: segs.length,
    errorCount: errors.length,
    warningCount: warnings.length,
    segmentCounts,
    interchanges,
  };
}

function trim(s: string | undefined): string { return (s ?? '').trim(); }

function countSegmentIds(segs: Segment[]): Array<{ id: string; count: number }> {
  const map = new Map<string, number>();
  for (const s of segs) map.set(s.id, (map.get(s.id) ?? 0) + 1);
  return [...map.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

function formatX12Date(yymmdd: string): string {
  if (!yymmdd) return '—';
  if (yymmdd.length === 6) {
    const yy = parseInt(yymmdd.slice(0, 2), 10);
    const cc = yy >= 50 ? '19' : '20';
    return `${cc}${yymmdd.slice(0, 2)}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
  }
  if (yymmdd.length === 8) return `${yymmdd.slice(0, 4)}-${yymmdd.slice(4, 6)}-${yymmdd.slice(6, 8)}`;
  return yymmdd;
}

function formatEdifactDateComposite(s: string): string {
  // UNB04 is DATE:TIME; e.g. "210101:1200"
  const [d, t] = s.split(':');
  return `${formatX12Date(d ?? '')}${t ? ' ' + t.slice(0, 2) + ':' + t.slice(2, 4) : ''}`;
}
