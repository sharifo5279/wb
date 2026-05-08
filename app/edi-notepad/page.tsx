import Link from 'next/link';
import { DocumentStudio } from './components/document-studio/DocumentStudio';

/**
 * /edi-notepad — EDI Notepad 2026 route entry point.
 *
 * Vertical band layout (flex children of <body>):
 *
 *   Band 1 │ <PortalNav>      — inherited from root layout (56px)
 *   Band 2 │ .wb-workspace    — full-bleed Notepad workspace (flex: 1)
 *   Band 3 │ .wb-statusbar    — 22px status bar
 */
export default function EdiNotepadPage() {
  return (
    <div
      className="wb-shell"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        className="wb-workspace"
        style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
      >
        <DocumentStudio />
      </div>

      <div className="wb-statusbar" aria-label="Notepad status">
        <span>EDI Notepad 2026 v0.1</span>
        <Link href="/edi-notepad/coverage" className="wb-statusbar__link">
          Coverage
        </Link>
        <span className="wb-statusbar__ready">● Ready</span>
      </div>
    </div>
  );
}
