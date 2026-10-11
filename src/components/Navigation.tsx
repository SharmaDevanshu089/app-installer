import React from 'react';
import { ActiveView, ThemeKey, ThemeDefinition } from '../types';
import { 
  PackagePlus, 
  Settings, 
  Layers, 
  Search, 
  Palette, 
  FileText, 
  HelpCircle,
  FolderOpen
} from 'lucide-react';

interface NavigationProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  activeTheme: ThemeKey;
  onThemeChange: (theme: ThemeKey) => void;
  packagesCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenInstall: () => void;
}

const THEMES: ThemeDefinition[] = [
  { key: 'gtk', name: 'GNOME (GTK)', philosophy: 'Flat headerbar & rounded pills', accent: '#3584e4', icon: 'GNOME' },
  { key: 'kde', name: 'KDE (Qt / Breeze)', philosophy: 'Geometric & tech precision', accent: '#3daee9', icon: 'Breeze' },
  { key: 'macos', name: 'macOS (Aqua)', philosophy: 'Frosted glass & traffic lights', accent: '#0071e3', icon: 'Cupertino' },
  { key: 'cosmic', name: 'COSMIC (System76)', philosophy: 'Modular Rust applets', accent: '#f59e0b', icon: 'COSMIC' },
  { key: 'nord', name: 'Nord Modern', philosophy: 'Arctic clean minimalist', accent: '#88c0d0', icon: 'Nord' },
];

export const Navigation: React.FC<NavigationProps> = ({
  activeView,
  onViewChange,
  activeTheme,
  onThemeChange,
  packagesCount,
  searchQuery,
  onSearchChange,
  onOpenInstall,
}) => {
  return (
    <nav className="nav-header">
      <div className="nav-left">
        {activeTheme === 'macos' && (
          <div className="macos-traffic-lights">
            <span className="light close" />
            <span className="light minimize" />
            <span className="light expand" />
          </div>
        )}

        <div className="brand" onClick={() => onViewChange('packages')}>
          <div className="brand-logo">
            <Layers className="logo-icon" size={19} />
          </div>
          <div className="brand-info">
            <h1>App Installer</h1>
            <span className="platform-tag">Linux User-Space</span>
          </div>
        </div>

        {/* View Tabs */}
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeView === 'packages' ? 'active' : ''}`}
            onClick={() => onViewChange('packages')}
          >
            <FolderOpen size={15} />
            <span>Applications</span>
            {packagesCount > 0 && <span className="tab-count">{packagesCount}</span>}
          </button>

          <button
            className={`nav-tab ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => onViewChange('settings')}
          >
            <Settings size={15} />
            <span>Settings</span>
          </button>

          <button
            className={`nav-tab ${activeView === 'legal' ? 'active' : ''}`}
            onClick={() => onViewChange('legal')}
          >
            <FileText size={15} />
            <span>Legal & Licenses</span>
          </button>

          <button
            className={`nav-tab ${activeView === 'help' ? 'active' : ''}`}
            onClick={() => onViewChange('help')}
          >
            <HelpCircle size={15} />
            <span>Operations Guide</span>
          </button>
        </div>
      </div>

      <div className="nav-right">
        {activeView === 'packages' && (
          <div className="search-bar">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Filter installed apps..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => onSearchChange('')}>
                ×
              </button>
            )}
          </div>
        )}

        <div className="theme-picker-pill">
          <Palette size={15} className="theme-icon" />
          <select
            value={activeTheme}
            onChange={(e) => onThemeChange(e.target.value as ThemeKey)}
            className="theme-select"
          >
            {THEMES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button className="btn-install-primary" onClick={onOpenInstall}>
          <PackagePlus size={16} />
          <span>Install Package</span>
        </button>
      </div>

      <style>{`
        .nav-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 24px;
          background: var(--header-bg);
          border-bottom: 1px solid var(--border-color);
          backdrop-filter: blur(16px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .macos-traffic-lights {
          display: flex;
          align-items: center;
          gap: 7px;
          padding-right: 4px;
        }

        .macos-traffic-lights .light {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }

        .macos-traffic-lights .light.close { background: #ff5f56; border: 1px solid #e0443e; }
        .macos-traffic-lights .light.minimize { background: #ffbd2e; border: 1px solid #dea123; }
        .macos-traffic-lights .light.expand { background: #27c93f; border: 1px solid #1aab29; }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .brand-logo {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          background: var(--accent-light);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color);
        }

        .brand-info h1 {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .platform-tag {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .nav-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-tertiary);
          padding: 3px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-subtle);
        }

        .nav-tab {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: var(--radius-pill);
          font-size: 12px;
          font-weight: 500;
          background: transparent;
          color: var(--text-secondary);
        }

        .nav-tab:hover {
          color: var(--text-primary);
          background: var(--bg-card-hover);
        }

        .nav-tab.active {
          background: var(--accent);
          color: var(--accent-text);
          font-weight: 600;
          box-shadow: var(--shadow-sm);
        }

        .tab-count {
          background: rgba(255, 255, 255, 0.2);
          padding: 1px 6px;
          border-radius: var(--radius-pill);
          font-size: 10px;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .search-bar {
          display: flex;
          align-items: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          padding: 5px 12px;
          gap: 8px;
        }

        .search-bar:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-light);
        }

        .search-icon {
          color: var(--text-muted);
        }

        .search-bar input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 12px;
          width: 160px;
        }

        .clear-search {
          background: transparent;
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1;
        }

        .theme-picker-pill {
          display: flex;
          align-items: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          padding: 4px 10px;
          gap: 6px;
        }

        .theme-icon {
          color: var(--accent);
        }

        .theme-select {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
        }

        .theme-select option {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .btn-install-primary {
          display: flex;
          align-items: center;
          gap: 7px;
          background: var(--accent);
          color: var(--accent-text);
          padding: 7px 16px;
          border-radius: var(--radius-pill);
          font-size: 12px;
          font-weight: 600;
          box-shadow: var(--shadow-sm);
        }

        .btn-install-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }
      `}</style>
    </nav>
  );
};
