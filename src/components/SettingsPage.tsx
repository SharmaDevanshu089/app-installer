import { useState, useEffect } from 'react';
import { 
  AppConfig, 
  CacheStatusReport, 
  DirectoryPresets, 
  PathStatusReport, 
  ThemeKey 
} from '../types';
import { 
  Folder, 
  ShieldAlert, 
  Palette, 
  HardDrive, 
  Save, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  FileCode,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface SettingsPageProps {
  config: AppConfig | null;
  pathStatus: PathStatusReport | null;
  onConfigSaved: (newConfig: AppConfig) => void;
  onRefreshData: () => void;
}

export const SettingsPage = ({
  config,
  pathStatus,
  onConfigSaved,
  onRefreshData,
}: SettingsPageProps) => {
  // Presets from backend
  const [presets, setPresets] = useState<DirectoryPresets | null>(null);

  // Directory inputs
  const [installBase, setInstallBase] = useState('');
  const [selectedInstallPreset, setSelectedInstallPreset] = useState<string>('custom');
  
  const [binDir, setBinDir] = useState('');
  const [selectedBinPreset, setSelectedBinPreset] = useState<string>('custom');

  const [appsDir, setAppsDir] = useState('');
  const [iconsDir, setIconsDir] = useState('');
  const [cacheDir, setCacheDir] = useState('');

  // Security & Bypass
  const [allowPrivileged, setAllowPrivileged] = useState(false);

  // Packaging defaults
  const [activeTheme, setActiveTheme] = useState<ThemeKey>('gtk');
  const [colorMode, setColorMode] = useState<'dark' | 'light'>('dark');
  const [animationLevel, setAnimationLevel] = useState<'smooth' | 'subtle' | 'reduced'>('smooth');
  const [checkPath, setCheckPath] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [defaultDesktop, setDefaultDesktop] = useState(true);
  const [defaultSymlink, setDefaultSymlink] = useState(true);
  const [preferredShell, setPreferredShell] = useState('auto');

  // Cache & JSON inspector state
  const [cacheStatus, setCacheStatus] = useState<CacheStatusReport | null>(null);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [showImportBox, setShowImportBox] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Load presets & cache status
  useEffect(() => {
    loadPresets();
    loadCacheStatus();
  }, []);

  const loadPresets = async () => {
    try {
      const data: DirectoryPresets = await invoke('get_directory_presets');
      setPresets(data);
    } catch (err) {
      console.error('Failed to load presets:', err);
    }
  };

  const loadCacheStatus = async () => {
    try {
      const rep: CacheStatusReport = await invoke('get_cache_size');
      setCacheStatus(rep);
    } catch (err) {
      console.error('Failed to load cache status:', err);
    }
  };

  // Sync state from config
  useEffect(() => {
    if (config) {
      setInstallBase(config.installBaseDir);
      setBinDir(config.binDir);
      setAppsDir(config.applicationsDir);
      setIconsDir(config.iconsDir || '~/.local/share/icons/hicolor');
      setCacheDir(config.cacheDir || '~/.cache/app-installer');
      setAllowPrivileged(config.allowPrivilegedSystemPaths || false);
      setActiveTheme(config.activeTheme as ThemeKey);
      setColorMode(config.colorMode || 'dark');
      setAnimationLevel(config.animationLevel || 'smooth');
      setCheckPath(config.checkPathOnStartup);
      setAutoRefresh(config.autoRefreshDesktopDatabase);
      setDefaultDesktop(config.defaultCreateDesktop);
      setDefaultSymlink(config.defaultCreateSymlink);
      setPreferredShell(config.preferredShell || 'auto');

      // Check matching presets
      if (presets) {
        const foundInstall = presets?.installDirs?.find(p => p.path === config.installBaseDir);
        setSelectedInstallPreset(foundInstall ? foundInstall.id : 'custom');

        const foundBin = presets?.binDirs?.find(p => p.path === config.binDir);
        setSelectedBinPreset(foundBin ? foundBin.id : 'custom');
      }
    }
  }, [config, presets]);

  const handleInstallPresetChange = (presetId: string) => {
    setSelectedInstallPreset(presetId);
    if (presetId !== 'custom' && presets) {
      const match = presets?.installDirs?.find(p => p.id === presetId);
      if (match) {
        setInstallBase(match.path);
      }
    }
  };

  const handleBinPresetChange = (presetId: string) => {
    setSelectedBinPreset(presetId);
    if (presetId !== 'custom' && presets) {
      const match = presets?.binDirs?.find(p => p.id === presetId);
      if (match) {
        setBinDir(match.path);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    const updated: AppConfig = {
      installBaseDir: installBase.trim(),
      binDir: binDir.trim(),
      applicationsDir: appsDir.trim(),
      iconsDir: iconsDir.trim(),
      cacheDir: cacheDir.trim(),
      activeTheme,
      colorMode,
      animationLevel,
      checkPathOnStartup: checkPath,
      autoRefreshDesktopDatabase: autoRefresh,
      defaultCreateDesktop: defaultDesktop,
      defaultCreateSymlink: defaultSymlink,
      defaultCategories: config?.defaultCategories || ['Utility'],
      preferredShell,
      allowPrivilegedSystemPaths: allowPrivileged,
    };

    try {
      await invoke('save_config', { config: updated });
      onConfigSaved(updated);
      setSaveMessage('Configuration validated & saved successfully.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveError(`Failed to save: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCleanCache = async () => {
    setIsCleaningCache(true);
    try {
      await invoke('clean_cache');
      loadCacheStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCleaningCache(false);
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset all App Installer settings to default rootless XDG specifications?')) {
      try {
        const def: AppConfig = await invoke('reset_config_to_defaults');
        onConfigSaved(def);
        setSaveMessage('Settings reset to defaults.');
        setTimeout(() => setSaveMessage(null), 2500);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleExportRegistry = async () => {
    try {
      const jsonStr: string = await invoke('export_registry');
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `app-installer-registry-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err}`);
    }
  };

  const handleImportRegistry = async () => {
    try {
      const count: number = await invoke('import_registry', { jsonContent: importJsonText });
      alert(`Successfully merged ${count} applications into your registry.`);
      setShowImportBox(false);
      setImportJsonText('');
      onRefreshData();
    } catch (err) {
      alert(`Import error: ${err}`);
    }
  };

  const copyConfigJson = () => {
    if (config) {
      navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    }
  };

  return (
    <div className="settings-container view-transition">
      {/* Header bar with actions */}
      <div className="settings-header">
        <div>
          <h2>Preferences & System Settings</h2>
          <p className="settings-subtitle">
            Configure application roots, terminal $PATH symlinks, security elevation, and desktop theme.
          </p>
        </div>

        <div className="settings-header-actions">
          <button className="btn-save-settings" onClick={handleSave} disabled={isSaving}>
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="settings-alert-banner success">
          <CheckCircle2 size={15} />
          <span>{saveMessage}</span>
        </div>
      )}

      {saveError && (
        <div className="settings-alert-banner error">
          <AlertTriangle size={15} />
          <span>{saveError}</span>
        </div>
      )}

      <div className="settings-groups">
        {/* GROUP 1: Installation Directories */}
        <div className="adw-pref-group">
          <div className="pref-group-title">
            <Folder size={15} />
            <span>Installation & Package Storage</span>
          </div>

          <div className="adw-pref-card">
            {/* App Root Row */}
            <div className="adw-row">
              <div className="row-text">
                <span className="row-title">Application Root Directory</span>
                <span className="row-sub">Target folder where portable applications are extracted and isolated</span>
              </div>
              <div className="row-controls">
                <select
                  className="pref-select"
                  value={selectedInstallPreset}
                  onChange={(e) => handleInstallPresetChange(e.target.value)}
                >
                  {presets?.installDirs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} {p.isPrivileged ? '(Elevated)' : ''}
                    </option>
                  ))}
                  <option value="custom">Custom Directory...</option>
                </select>

                <input
                  type="text"
                  className="pref-input"
                  value={installBase}
                  onChange={(e) => {
                    setInstallBase(e.target.value);
                    setSelectedInstallPreset('custom');
                  }}
                  placeholder="/home/user/.local/opt"
                />
              </div>
            </div>

            {/* CLI Bin Row */}
            <div className="adw-row">
              <div className="row-text">
                <div className="title-with-badge">
                  <span className="row-title">Terminal $PATH Executable Directory</span>
                  {pathStatus?.isInCurrentPath ? (
                    <span className="status-badge secure"><Check size={10} /> Active in $PATH</span>
                  ) : (
                    <span className="status-badge warning"><AlertTriangle size={10} /> Not in Active $PATH</span>
                  )}
                </div>
                <span className="row-sub">Directory where CLI alias symlinks are placed for instant terminal access</span>
              </div>
              <div className="row-controls">
                <select
                  className="pref-select"
                  value={selectedBinPreset}
                  onChange={(e) => handleBinPresetChange(e.target.value)}
                >
                  {presets?.binDirs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} {p.isPrivileged ? '(Elevated)' : ''}
                    </option>
                  ))}
                  <option value="custom">Custom Directory...</option>
                </select>

                <input
                  type="text"
                  className="pref-input"
                  value={binDir}
                  onChange={(e) => {
                    setBinDir(e.target.value);
                    setSelectedBinPreset('custom');
                  }}
                  placeholder="/home/user/.local/bin"
                />
              </div>
            </div>

            {/* Desktop Entry Row */}
            <div className="adw-row">
              <div className="row-text">
                <span className="row-title">FreeDesktop Launchers Directory</span>
                <span className="row-sub">Location of generated .desktop menu launcher shortcuts</span>
              </div>
              <input
                type="text"
                className="pref-input full"
                value={appsDir}
                onChange={(e) => setAppsDir(e.target.value)}
              />
            </div>

            {/* Icons Row */}
            <div className="adw-row">
              <div className="row-text">
                <span className="row-title">Icon Theme Directory</span>
                <span className="row-sub">Root for extracted application icons (hicolor icon theme)</span>
              </div>
              <input
                type="text"
                className="pref-input full"
                value={iconsDir}
                onChange={(e) => setIconsDir(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* GROUP 2: Security & Privileged System Paths */}
        <div className="adw-pref-group">
          <div className="pref-group-title">
            <ShieldAlert size={15} />
            <span>Security & Privileged Elevation</span>
          </div>

          <div className="adw-pref-card">
            <div className="adw-row">
              <div className="row-text">
                <div className="title-with-badge">
                  <span className="row-title">Allow Privileged System Directories</span>
                  {allowPrivileged ? (
                    <span className="status-badge warning"><Unlock size={10} /> Bypass Enabled</span>
                  ) : (
                    <span className="status-badge secure"><Lock size={10} /> Rootless Strict</span>
                  )}
                </div>
                <span className="row-sub">
                  Enables installing to system directories like <code>/opt</code> or <code>/usr/local/bin</code> using PolicyKit (<code>pkexec</code>) graphical elevation.
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={allowPrivileged}
                  onChange={(e) => setAllowPrivileged(e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="adw-row-callout">
              <AlertTriangle size={15} className="callout-icon" />
              <div className="callout-text">
                <strong>Permanent Safety Invariant:</strong>
                <p>
                  Even with privileged bypass enabled, core operating system roots (<code>/</code>, <code>/etc</code>, <code>/bin</code>, <code>/sbin</code>, <code>/boot</code>, <code>/root</code>, <code>/var</code>) are strictly and permanently protected against modifications.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 3: Appearance & Desktop Philosophy */}
        <div className="adw-pref-group">
          <div className="pref-group-title">
            <Palette size={15} />
            <span>Appearance & Typography</span>
          </div>

          <div className="adw-pref-card">
            <div className="adw-row">
              <div className="row-text">
                <span className="row-title">Color Mode</span>
                <span className="row-sub">Switch between Dark Mode and Light Mode</span>
              </div>
              <select
                className="pref-select"
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as 'dark' | 'light')}
              >
                <option value="dark">Dark Mode (Default)</option>
                <option value="light">Light Mode</option>
              </select>
            </div>

            <div className="adw-row">
              <div className="row-text">
                <span className="row-title">Desktop Design Philosophy</span>
                <span className="row-sub">Match your Linux desktop environment's look and feel</span>
              </div>
              <select
                className="pref-select"
                value={activeTheme}
                onChange={(e) => setActiveTheme(e.target.value as ThemeKey)}
              >
                <option value="gtk">GNOME Adwaita (GTK 4 / Libadwaita)</option>
                <option value="kde">KDE Breeze (Qt 6 / Kirigami)</option>
                <option value="macos">macOS Aqua (Cupertino Glass)</option>
                <option value="cosmic">System76 COSMIC (Rust modular)</option>
                <option value="nord">Nord Modern (Arctic Frost)</option>
              </select>
            </div>

            <div className="adw-row">
              <div className="row-text">
                <span className="row-title">Micro-Interactions & Animation Speed</span>
                <span className="row-sub">Select transition fluidity or accessibility reduced motion</span>
              </div>
              <select
                className="pref-select"
                value={animationLevel}
                onChange={(e) => setAnimationLevel(e.target.value as any)}
              >
                <option value="smooth">Smooth (Fluid spring animations)</option>
                <option value="subtle">Subtle (Refined micro-transitions)</option>
                <option value="reduced">Reduced Motion (Accessible instant cuts)</option>
              </select>
            </div>
          </div>
        </div>

        {/* GROUP 4: Storage, Cache & Readable JSON Config */}
        <div className="adw-pref-group">
          <div className="pref-group-title">
            <HardDrive size={15} />
            <span>Storage Cache & Readable JSON Configuration</span>
          </div>

          <div className="adw-pref-card">
            {/* Cache Row */}
            <div className="adw-row">
              <div className="row-text">
                <span className="row-title">Pre-Inspection Staging Cache</span>
                <span className="row-sub">
                  Footprint: {cacheStatus?.sizeFormatted || '0 B'} ({cacheStatus?.itemCount || 0} staged items) in <code>~/.cache/app-installer</code>
                </span>
              </div>
              <button 
                className="btn-pref-subtle" 
                onClick={handleCleanCache} 
                disabled={isCleaningCache}
              >
                <Trash2 size={13} />
                <span>{isCleaningCache ? 'Clearing...' : 'Clear Cache'}</span>
              </button>
            </div>

            {/* JSON Config Inspector Row */}
            <div className="adw-row">
              <div className="row-text">
                <span className="row-title">Formatted JSON Configuration</span>
                <span className="row-sub">Inspect human-readable formatted <code>config.json</code> saved on disk</span>
              </div>
              <div className="button-pair">
                <button 
                  className="btn-pref-subtle"
                  onClick={() => setShowJsonInspector(!showJsonInspector)}
                >
                  <FileCode size={13} />
                  <span>{showJsonInspector ? 'Hide JSON' : 'Inspect JSON'}</span>
                </button>
                <button 
                  className="btn-pref-subtle"
                  onClick={copyConfigJson}
                >
                  {copiedConfig ? <Check size={13} color="#26a269" /> : <Copy size={13} />}
                  <span>{copiedConfig ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {showJsonInspector && config && (
              <div className="json-inspector-box">
                <pre>{JSON.stringify(config, null, 2)}</pre>
              </div>
            )}

            {/* Registry Export / Import */}
            <div className="adw-row">
              <div className="row-text">
                <span className="row-title">Registry Manifest Backup & Sync</span>
                <span className="row-sub">Export or import installed software catalog (<code>registry.json</code>)</span>
              </div>
              <div className="button-pair">
                <button className="btn-pref-subtle" onClick={handleExportRegistry}>
                  <Download size={13} />
                  <span>Export</span>
                </button>
                <button className="btn-pref-subtle" onClick={() => setShowImportBox(!showImportBox)}>
                  <Upload size={13} />
                  <span>Import</span>
                </button>
              </div>
            </div>

            {showImportBox && (
              <div className="import-box">
                <textarea
                  className="import-textarea"
                  placeholder="Paste exported registry JSON content here..."
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  rows={4}
                />
                <div className="import-actions">
                  <button className="btn-save-settings" onClick={handleImportRegistry} disabled={!importJsonText.trim()}>
                    Confirm Import
                  </button>
                  <button className="btn-pref-subtle" onClick={() => setShowImportBox(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Factory Reset */}
            <div className="adw-row danger">
              <div className="row-text">
                <span className="row-title">Reset to Default Settings</span>
                <span className="row-sub">Reverts all directory paths and packaging preferences to default XDG rootless layout</span>
              </div>
              <button className="btn-pref-danger" onClick={handleResetDefaults}>
                <RotateCcw size={13} />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .settings-container {
          padding-bottom: 40px;
        }

        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .settings-header h2 {
          font-size: 17px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .settings-subtitle {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .btn-save-settings {
          background-color: var(--accent);
          color: var(--accent-text);
          font-weight: 600;
          font-size: 12.5px;
          padding: 6px 14px;
          border-radius: var(--radius-sm);
        }

        .btn-save-settings:hover:not(:disabled) {
          background-color: var(--accent-hover);
        }

        .settings-alert-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          margin-bottom: 16px;
        }

        .settings-alert-banner.success {
          background: rgba(38, 162, 105, 0.12);
          border: 1px solid rgba(38, 162, 105, 0.35);
          color: #26a269;
        }

        .settings-alert-banner.error {
          background: rgba(224, 27, 36, 0.12);
          border: 1px solid rgba(224, 27, 36, 0.35);
          color: #e01b24;
        }

        .settings-groups {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .adw-pref-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pref-group-title {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
          padding-left: 2px;
        }

        .adw-pref-card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .adw-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          gap: 16px;
        }

        .adw-row:last-child {
          border-bottom: none;
        }

        .adw-row.danger {
          background: rgba(224, 27, 36, 0.03);
        }

        .row-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .row-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .title-with-badge {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-badge {
          font-size: 10.5px;
          padding: 1px 6px;
          border-radius: 999px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .status-badge.secure {
          background: rgba(38, 162, 105, 0.15);
          color: #26a269;
        }

        .status-badge.warning {
          background: rgba(234, 179, 8, 0.15);
          color: #eab308;
        }

        .row-sub {
          font-size: 11.5px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .row-sub code {
          background: rgba(0, 0, 0, 0.25);
          padding: 1px 4px;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .row-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pref-select {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 5px 8px;
          font-size: 12px;
        }

        .pref-input {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 5px 10px;
          font-size: 12px;
          font-family: var(--font-mono);
          width: 240px;
        }

        .pref-input.full {
          width: 320px;
        }

        .adw-row-callout {
          background: rgba(234, 179, 8, 0.07);
          border-top: 1px solid rgba(234, 179, 8, 0.2);
          padding: 10px 16px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 11.5px;
        }

        .callout-icon {
          color: #eab308;
          margin-top: 1px;
          flex-shrink: 0;
        }

        .callout-text p {
          color: var(--text-muted);
          margin-top: 2px;
        }

        .callout-text code {
          background: rgba(0, 0, 0, 0.25);
          padding: 1px 4px;
          border-radius: 3px;
          font-family: var(--font-mono);
        }

        .btn-pref-subtle {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          padding: 5px 10px;
          border-radius: var(--radius-sm);
          font-size: 11.5px;
        }

        .btn-pref-subtle:hover {
          background: rgba(255, 255, 255, 0.09);
          color: var(--text-primary);
        }

        .btn-pref-danger {
          background: rgba(224, 27, 36, 0.1);
          color: #e01b24;
          border: 1px solid rgba(224, 27, 36, 0.3);
          padding: 5px 10px;
          border-radius: var(--radius-sm);
          font-size: 11.5px;
        }

        .btn-pref-danger:hover {
          background: rgba(224, 27, 36, 0.2);
        }

        .button-pair {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Toggle Switch */
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 38px;
          height: 20px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.15);
          transition: 0.2s;
          border-radius: 20px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.2s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: var(--accent);
        }

        input:checked + .slider:before {
          transform: translateX(18px);
        }

        .json-inspector-box {
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid var(--border-color);
        }

        .json-inspector-box pre {
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: var(--text-secondary);
          line-height: 1.45;
          max-height: 220px;
          overflow-y: auto;
        }

        .import-box {
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
        }

        .import-textarea {
          width: 100%;
          font-family: var(--font-mono);
          font-size: 11.5px;
          margin-bottom: 8px;
          padding: 6px;
        }

        .import-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
};
