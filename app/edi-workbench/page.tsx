'use client';

import { useState } from 'react';
import { WorkbenchTabBar } from './components/WorkbenchTabBar';
import { DocumentStudio } from './components/document-studio/DocumentStudio';
import { SpecIntelligence } from './components/spec-intelligence/SpecIntelligence';

/** Human-readable label shown in the status bar for each tab ID. */
const TAB_LABELS: Record<string, string> = {
  'document-studio':   'Document Studio',
  'spec-intelligence': 'Spec Intelligence',
};

/**
 * /edi-workbench — EDI Workbench route entry point.
 *
 * Vertical band layout (flex children of <body>):
 *
 *   Band 1 │ <PortalNav>             — inherited from root layout (56px)
 *   ────────┼──────────────────────────────────────────────────────────
 *   Band 2 │ <WorkbenchTabBar>       — 42px tab bar
 *   ────────┼──────────────────────────────────────────────────────────
 *   Band 3 │ .wb-workspace           — full-bleed workspace (flex: 1)
 *           │   <DocumentStudio>     — 3-panel IDE layout (Task 2)
 *           │   <SpecIntelligence>   — PDF extraction (Task 9)
 *           │   <ComingSoon>         — placeholder for other tabs
 *   ────────┼──────────────────────────────────────────────────────────
 *   Band 4 │ .wb-statusbar           — 22px status bar
 *
 * Tab state is NOT persisted (useState default — no localStorage/URL sync).
 */
export default function EdiWorkbenchPage() {
  const [activeTab, setActiveTab] = useState('document-studio');

  const tabLabel = TAB_LABELS[activeTab] ?? 'Coming soon';

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
        aria-label={tabLabel}
        className="wb-workspace"
        style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
      >
        {activeTab === 'document-studio' ? (
          <DocumentStudio />
        ) : activeTab === 'spec-intelligence' ? (
          <SpecIntelligence />
        ) : (
          <div className="wb-coming-soon">
            <p className="wb-coming-soon__heading">Coming soon</p>
            <p className="wb-coming-soon__sub">
              This tool is under construction and will be available in a future release.
            </p>
          </div>
        )}
      </div>

      {/* ── Band 4: Workbench-level status bar ── */}
      <div className="wb-statusbar" aria-label="Workbench status">
        <span>EDI Workbench v0.1</span>
        <span className="wb-statusbar__sep">|</span>
        <span>{tabLabel}</span>
        <span className="wb-statusbar__ready">● Ready</span>
      </div>
    </div>
  );
}
