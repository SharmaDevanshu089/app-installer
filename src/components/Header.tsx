import { ThemeKey, ThemeDefinition } from '../types';
import { 
  PackagePlus, 
  Settings, 
  Search, 
  Palette, 
  Layers
} from 'lucide-react';

interface HeaderProps {
  activeTheme: ThemeKey;
  onThemeChange: (theme: ThemeKey) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenInstall: () => void;
  onOpenSettings: () => void;
}

const THEMES: ThemeDefinition[] = [
  { key: 'gtk', name: 'GNOME (GTK)', philosophy: 'Flat headerbar & rounded pills', accent: '#3584e4', icon: 'GNOME' },
  { key: 'kde', name: 'KDE (Qt / Breeze)', philosophy: 'Geometric & tech precision', accent: '#3daee9', icon: 'Breeze' },
  { key: 'macos', name: 'macOS (Aqua)', philosophy: 'Frosted glass & traffic lights', accent: '#0071e3', icon: 'Cupertino' },
  { key: 'cosmic', name: 'COSMIC (System76)', philosophy: 'Modular Rust applets', accent: '#f59e0b', icon: 'COSMIC' },
  { key: 'nord', name: 'Nord Modern', philosophy: 'Arctic clean minimalist', accent: '#88c0d0', icon: 'Nord' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTheme,
  onThemeChange,
  searchQuery,
  onSearchChange,
  onOpenInstall,
  onOpenSettings,
}) => {
  return (
    <header className="header-container">
      <div className="header-left">
        {/* macOS Traffic Lights Decoration */}
        {activeTheme === 'macos' && (
          <div className="macos-traffic-lights">
            <span className="light close" />
            <span className="light minimize" />
            <span className="light expand" />
          </div>
        )}

        <div className="brand">
          <div className="brand-logo">
            <Layers className="logo-icon" size={20} />
          </div>
          <div className="brand-text">
            <h1>App Installer</h1>
            <span className="badge-platform">Linux Rootless</span>
          </div>
        </div>
      </div>

      <div className="header-center">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search installed packages, binaries, categories..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => onSearchChange('')}>
              ×
            </button>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* Theme Selector */}
        <div className="theme-selector-wrapper">
          <Palette size={16} className="theme-icon" />
          <select
            value={activeTheme}
            onChange={(e) => onThemeChange(e.target.value as ThemeKey)}
            className="theme-select"
            title="Switch UI Design Philosophy"
          >
            {THEMES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button 
          className="btn-icon" 
          onClick={onOpenSettings} 
          title="Installer Configuration"
        >
          <Settings size={18} />
        </button>

        <button className="btn-primary" onClick={onOpenInstall}>
          <PackagePlus size={17} />
          <span>Install Package</span>
        </button>
      </div>

      <style>{`
        .header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: var(--header-bg);
          border-bottom: 1px solid var(--border-color);
          backdrop-filter: blur(16px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .macos-traffic-lights {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-right: 6px;
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
        }

        .brand-logo {
          width: 34px;
          height: 34px;
          border-radius: var(--radius-md);
          background: var(--accent-light);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color);
        }

        .brand-text h1 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .badge-platform {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .header-center {
          flex: 1;
          max-width: 440px;
          margin: 0 20px;
        }

        .search-bar {
          display: flex;
          align-items: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          padding: 6px 14px;
          gap: 8px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .search-bar:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-light);
        }

        .search-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .search-bar input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 13px;
          width: 100%;
        }

        .search-bar input::placeholder {
          color: var(--text-muted);
        }

        .clear-search {
          background: transparent;
          color: var(--text-muted);
          font-size: 16px;
          line-height: 1;
          padding: 0 4px;
        }

        .clear-search:hover {
          color: var(--text-primary);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .theme-selector-wrapper {
          display: flex;
          align-items: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          padding: 4px 12px;
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

        .btn-icon {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-icon:hover {
          color: var(--text-primary);
          background: var(--bg-card-hover);
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: var(--accent-text);
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          font-size: 13px;
          font-weight: 600;
          box-shadow: var(--shadow-sm);
        }

        .btn-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .btn-primary:active {
          transform: translateY(0);
        }
      `}</style>
    </header>
  );
};
