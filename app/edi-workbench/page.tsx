'use client';

import { useState } from 'react';
import { WorkbenchTabBar } from './components/WorkbenchTabBar';
import { DocumentStudio } from './components/document-studio/DocumentStudio';

/**
 * /edi-workbench — EDI Workbench route entry point.
 *
 * Vertical band layout (flex children of <body>):
 *
 *   Band 1 │ <PortalNav>          — inherited from root layout (56px)
 *   ────────┼───────────────────────────────────────────────────────
 *   Band 2 │ <WorkbenchTabBar>    — 42px tab bar
 *   ────────┼───────────────────────────────────────────────────────
 *   Band 3 │ .wb-workspace        — full-bleed workspace (flex: 1)
 *           │   <DocumentStudio>  — 3-panel IDE layout (Task 2)
 *           │   <ComingSoon>      — placeholder for other tabs
 *   ────────┼───────────────────────────────────────────────────────
 *   Band 4 │ .wb-statusbar        — 22px status bar
 *
 * Tab state is NOT persisted (useState default — no localStorage/URL sync).
 */
export default function EdiWorkbenchPage() {
  const [activeTab, setActiveTab] = useState('document-studio');

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
      {/* ── Band 2: Workbench tab bar ── */}
      <WorkbenchTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Band 3: Workspace ── */}
      <div
        id="wb-workspace-panel"
        role="tabpanel"
        aria-label={activeTab === 'document-studio' ? 'Document Studio' : 'Coming soon'}
        className="wb-workspace"
        style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
      >
        {activeTab !== 'document-studio' ? (
          <div className="wb-coming-soon">
            <p className="wb-coming-soon__heading">Coming soon</p>
            <p className="wb-coming-soon__sub">
              This tool is under construction and will be available in a future release.
            </p>
          </div>
        ) : (
          <DocumentStudio />
        )}
      </div>

      {/* ── Band 4: Workbench-level status bar ── */}
      <div className="wb-statusbar" aria-label="Workbench status">
        <span>EDI Workbench v0.1</span>
        <span className="wb-statusbar__sep">|</span>
        <span>{activeTab === 'document-studio' ? 'Document Studio' : 'Coming soon'}</span>
        <span className="wb-statusbar__ready">● Ready</span>
      </div>
    </div>
  );
}
