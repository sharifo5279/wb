'use client';

import type React from 'react';

const LUCIDE_CDN = 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons';

interface TabConfig {
  id: string;
  label: string;
  icon: string;
  showBadge: boolean;
}

const TABS: TabConfig[] = [
  { id: 'document-studio',      label: 'Document Studio',      icon: 'file-text',     showBadge: false },
  { id: 'spec-intelligence',    label: 'Spec Intelligence',    icon: 'book-open',     showBadge: false },
  { id: 'mapping-designer',     label: 'Mapping Designer',     icon: 'git-branch',    showBadge: true  },
  { id: 'test-lab',             label: 'Test Lab',             icon: 'flask-conical', showBadge: true  },
  { id: 'transaction-debugger', label: 'Transaction Debugger', icon: 'bug',           showBadge: true  },
  { id: 'knowledge-assistant',  label: 'Knowledge Assistant',  icon: 'sparkles',      showBadge: true  },
];

interface Props {
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function WorkbenchTabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="wb-tabbar" role="tablist" aria-label="Workbench tools">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls="wb-workspace-panel"
            className={['wb-tab', isActive ? 'wb-tab--active' : ''].filter(Boolean).join(' ')}
            onClick={() => onTabChange(tab.id)}
          >
            <span
              className="wb-tab__icon"
              aria-hidden="true"
              style={
                { '--icon-url': `url(${LUCIDE_CDN}/${tab.icon}.svg)` } as React.CSSProperties
              }
            />
            <span className="wb-tab__label">{tab.label}</span>
            {tab.showBadge && (
              <span className="wb-tab__badge">Soon</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
