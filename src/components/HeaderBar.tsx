import React, { useState } from 'react';
import { ActiveView, ThemeKey, ColorMode } from '../types';
import { 
  Package, 
  PackagePlus, 
  Settings, 
  HelpCircle, 
  Search, 
  Minus, 
  Square, 
  X, 
  Layers,
  Sun,
  Moon
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface HeaderBarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  activeTheme: ThemeKey;
  onThemeChange: (theme: ThemeKey) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  packagesCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenInstall: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeView,
  onViewChange,
  activeTheme,
  onThemeChange,
  colorMode,
  onColorModeChange,
  packagesCount,
  searchQuery,
  onSearchChange,
  onOpenInstall,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = async () => {
    try {
      await invoke('window_minimize');
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      const state: boolean = await invoke('window_toggle_maximize');
      setIsMaximized(state);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = async () => {
    try {
      await invoke('window_close');
    } catch (e) {
      console.error(e);
    }
  };

  const handleHeaderMouseDown = async (e: React.MouseEvent) => {
    // Only primary button initiates window drag
    if (e.button !== 0) return;
    
    // Check if clicked element or any parent wants no-drag
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-tauri-no-drag], button, input, select, textarea, a, .no-drag')) {
      return;
    }

    try {
      await invoke('window_start_dragging');
    } catch (err) {
      // In web browser preview or environments without window dragging, silently ignore
      console.debug('Window drag fallback:', err);
    }
  };

  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-tauri-no-drag], button, input, select, textarea, a, .no-drag')) {
      return;
    }
    handleToggleMaximize();
  };

  const THEMES: { key: ThemeKey; label: string }[] = [
    { key: 'gtk', label: 'GNOME Adwaita' },
    { key: 'kde', label: 'KDE Breeze' },
    { key: 'macos', label: 'macOS Aqua' },
    { key: 'cosmic', label: 'COSMIC' },
    { key: 'nord', label: 'Nord' },
  ];

  return (
    <header 
      className="native-header-bar" 
      data-tauri-drag-region 
      onMouseDown={handleHeaderMouseDown}
      onDoubleClick={handleHeaderDoubleClick}
    >
      {/* Left: Window Controls (macOS) or Brand Identity */}
      <div className="header-start" data-tauri-no-drag>
        {activeTheme === 'macos' ? (
          <div className="macos-traffic-lights" data-tauri-no-drag>
            <button className="traffic-btn close" onClick={handleClose} title="Close window" />
            <button className="traffic-btn minimize" onClick={handleMinimize} title="Minimize window" />
            <button className="traffic-btn maximize" onClick={handleToggleMaximize} title="Maximize window" />
          </div>
        ) : (
          <div className="app-brand" onClick={() => onViewChange('packages')}>
            <div className="app-logo">
              <Layers size={14} />
            </div>
            <span className="app-title">App Installer</span>
          </div>
        )}
      </div>

      {/* Draggable spacer between brand and center buttons */}
      <div className="header-drag-space" data-tauri-drag-region />

      {/* Center: Segmented View Switcher with HERO INSTALL BUTTON */}
      <div className="header-center" data-tauri-no-drag>
        <div className="view-switcher-group" data-tauri-no-drag>
          <button
            className={`view-switcher-btn ${activeView === 'packages' ? 'active' : ''}`}
            onClick={() => onViewChange('packages')}
            title="Installed Applications"
          >
            <Package size={13} />
            <span>Apps</span>
            {packagesCount > 0 && <span className="badge-count">{packagesCount}</span>}
          </button>

          {/* MAIN FOCUS: HERO INSTALL BUTTON */}
          <button
            className="btn-hero-install"
            onClick={onOpenInstall}
            title="Inspect and install .AppImage or archive packages"
          >
            <PackagePlus size={14} />
            <span>Install Package</span>
          </button>

          <button
            className={`view-switcher-btn ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => onViewChange('settings')}
            title="Configuration & Defaults"
          >
            <Settings size={13} />
            <span>Settings</span>
          </button>

          <button
            className={`view-switcher-btn ${activeView === 'help' || activeView === 'legal' ? 'active' : ''}`}
            onClick={() => onViewChange('help')}
            title="Manual & Legal Documents"
          >
            <HelpCircle size={13} />
            <span>Guide</span>
          </button>
        </div>
      </div>

      {/* Draggable spacer between center buttons and right tools */}
      <div className="header-drag-space" data-tauri-drag-region />

      {/* Right: Search, Dark/Light Mode, Theme Quick Switch & Window Controls */}
      <div className="header-end" data-tauri-no-drag>
        {/* Search Input / Toggle */}
        <div className="header-search-box">
          {showSearch ? (
            <div className="search-input-wrapper">
              <Search size={12} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Filter apps..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
                onBlur={() => {
                  if (!searchQuery) setShowSearch(false);
                }}
              />
              {searchQuery && (
                <button 
                  className="search-clear-btn" 
                  onClick={() => onSearchChange('')}
                  title="Clear filter"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ) : (
            <button
              className={`header-tool-btn ${searchQuery ? 'has-query' : ''}`}
              onClick={() => setShowSearch(true)}
              title="Search packages"
            >
              <Search size={13} />
            </button>
          )}
        </div>

        {/* Dark / Light Mode Toggle */}
        <button
          className="header-tool-btn color-mode-btn"
          onClick={() => onColorModeChange(colorMode === 'dark' ? 'light' : 'dark')}
          title={colorMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {colorMode === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* Quick Theme Selector Dropdown */}
        <div className="theme-dropdown-wrapper">
          <select
            className="theme-select"
            value={activeTheme}
            onChange={(e) => onThemeChange(e.target.value as ThemeKey)}
            title="Desktop Theme"
          >
            {THEMES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Standard Linux Window Controls */}
        {activeTheme !== 'macos' && (
          <div className="window-controls-group" data-tauri-no-drag>
            <button
              className="window-control-btn minimize"
              onClick={handleMinimize}
              title="Minimize"
            >
              <Minus size={12} />
            </button>
            <button
              className="window-control-btn maximize"
              onClick={handleToggleMaximize}
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <Square size={10} />
            </button>
            <button
              className="window-control-btn close"
              onClick={handleClose}
              title="Close"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .native-header-bar {
          height: 38px;
          min-height: 38px;
          background-color: var(--header-bg);
          border-bottom: 1px solid var(--header-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          user-select: none;
          z-index: 100;
          cursor: default;
        }

        .header-drag-space {
          flex: 1;
          height: 100%;
          min-width: 16px;
        }

        .header-start, .header-end {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .header-center {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .app-brand {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 2px 4px;
        }

        .app-logo {
          color: var(--accent);
          display: flex;
          align-items: center;
        }

        .app-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.2px;
        }

        /* Segmented View Switcher */
        .view-switcher-group {
          display: flex;
          align-items: center;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 2px;
          gap: 4px;
        }

        .view-switcher-btn {
          background: transparent !important;
          color: var(--text-secondary) !important;
          border: 1px solid transparent !important;
          border-radius: 0px !important;
          padding: 0 8px !important;
          height: 24px !important;
          font-size: 11.5px !important;
          font-weight: 500 !important;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .view-switcher-btn:hover {
          color: var(--text-primary) !important;
          background: var(--bg-card-hover) !important;
        }

        .view-switcher-btn.active {
          background: var(--bg-card) !important;
          color: var(--text-primary) !important;
          font-weight: 600 !important;
          border-color: var(--border-color) !important;
        }

        .badge-count {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          font-size: 10px;
          padding: 0 4px;
          font-weight: 600;
          color: var(--text-primary);
        }

        /* Header Search */
        .header-search-box {
          position: relative;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          background: var(--input-bg);
          border: 1px solid var(--border-color);
          padding: 0 4px;
          gap: 4px;
          height: 24px;
        }

        .search-icon {
          color: var(--text-muted);
        }

        .search-input {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          font-size: 11.5px !important;
          width: 120px;
          height: 20px !important;
          color: var(--input-text) !important;
        }

        .search-clear-btn {
          background: transparent !important;
          color: var(--text-muted) !important;
          padding: 0 !important;
          height: 18px !important;
          border: none !important;
        }

        .header-tool-btn {
          background: var(--bg-secondary) !important;
          color: var(--text-secondary) !important;
          border: 1px solid var(--border-color) !important;
          width: 24px !important;
          height: 24px !important;
          padding: 0 !important;
        }

        .header-tool-btn:hover, .header-tool-btn.has-query {
          background: var(--bg-card-hover) !important;
          color: var(--text-primary) !important;
        }

        /* Theme Select Dropdown */
        .theme-select {
          font-size: 11px !important;
          height: 24px !important;
          padding: 0 4px !important;
        }

        /* Linux Window Controls */
        .window-controls-group {
          display: flex;
          align-items: center;
          margin-left: 4px;
          gap: 1px;
        }

        .window-control-btn {
          width: 24px !important;
          height: 24px !important;
          background: transparent !important;
          color: var(--text-secondary) !important;
          border: none !important;
          padding: 0 !important;
        }

        .window-control-btn:hover {
          background: var(--bg-card-hover) !important;
          color: var(--text-primary) !important;
        }

        .window-control-btn.close:hover {
          background: #e01b24 !important;
          color: #ffffff !important;
        }

        /* macOS Traffic Lights */
        .macos-traffic-lights {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-right: 6px;
        }

        .traffic-btn {
          width: 11px;
          height: 11px;
          border-radius: 50% !important;
          border: none !important;
          padding: 0 !important;
        }

        .traffic-btn.close { background-color: #ff5f56; }
        .traffic-btn.minimize { background-color: #ffbd2e; }
        .traffic-btn.maximize { background-color: #27c93f; }
      `}</style>
    </header>
  );
};
