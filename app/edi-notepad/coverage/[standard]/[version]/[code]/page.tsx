import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getTransactionByStandard,
  getSegmentByStandard,
  listTransactions,
  type Standard,
} from '@/src/lib/edi/dictionaries';
import { SegmentDetail } from '../../../components/SegmentDetail';

const STANDARDS: Standard[] = ['X12', 'EDIFACT', 'TRADACOMS'];

export function generateStaticParams() {
  const out: { standard: string; version: string; code: string }[] = [];
  for (const std of STANDARDS) {
    for (const txn of listTransactions(std)) {
      out.push({ standard: std, version: txn.version, code: txn.code });
    }
  }
  return out;
}

interface PageProps {
  params: Promise<{ standard: string; version: string; code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { standard, code } = await params;
  return {
    title: `${standard} ${code} — EDI Notepad 2026`,
  };
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const { standard, version, code } = await params;
  const std = STANDARDS.find((s) => s.toLowerCase() === standard.toLowerCase());
  if (!std) notFound();

  const txn = getTransactionByStandard(std, code);
  if (!txn || txn.version !== version) notFound();

  const segmentDefsCount = txn.segments.filter((r) => !!getSegmentByStandard(std, r.id)).length;

  return (
    <div
      className="wb-shell"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div className="np-cov-page">
        <header className="np-cov-page__header">
          <Link href="/edi-notepad/coverage" className="np-cov-back">
            ← Back to coverage
          </Link>
          <div className="np-cov-detail__title-row">
            <h1 className="np-cov-page__title">
              <span className="np-cov-detail__std">{std}</span>{' '}
              <span className="np-cov-detail__ver">{txn.version}</span>{' '}
              <span className="np-cov-detail__code">{txn.code}</span>{' '}
              <span className="np-cov-detail__name">{txn.name}</span>
            </h1>
            <div className="np-cov-detail__pills">
              {txn.full ? (
                <span className="np-cov-pill np-cov-pill--full">Full segment list</span>
              ) : (
                <span className="np-cov-pill np-cov-pill--stub">Stub</span>
              )}
              {txn.full && segmentDefsCount > 0 && (
                <span className="np-cov-pill np-cov-pill--partial">
                  {segmentDefsCount} of {txn.segments.length} segments defined
                </span>
              )}
            </div>
          </div>
          <p className="np-cov-page__sub">
            <strong>Industry:</strong> {txn.industry}
            {txn.purpose && (<><br /><strong>Purpose:</strong> {txn.purpose}</>)}
          </p>
        </header>

        {!txn.full && (
          <section className="np-cov-stub-banner">
            <strong>Stub.</strong> This transaction is recognized by the parser but its segment
            list is not yet authored. Validation falls back to the generic per-segment checks
            (unknown segment ID, element count). Add segments to <code>{std === 'X12' ? 'x12-transactions.ts' : std === 'EDIFACT' ? 'edifact-messages.ts' : 'tradacoms-messages.ts'}</code> to enable mandatory-segment validation.
          </section>
        )}

        {txn.full && txn.segments.length > 0 && (
          <section className="np-cov-section">
            <h2 className="np-cov-section__title">
              Segments <span className="np-cov-section__count">({txn.segments.length})</span>
            </h2>
            <div className="np-cov-seglist">
              {txn.segments.map((ref, i) => (
                <SegmentDetail
                  key={`${ref.id}-${i}`}
                  segRef={ref}
                  def={getSegmentByStandard(std, ref.id)}
                  position={i + 1}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="wb-statusbar" aria-label="Notepad status">
        <span>EDI Notepad 2026 v0.1</span>
        <span className="wb-statusbar__ready">● Ready</span>
      </div>
    </div>
  );
}
