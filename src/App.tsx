import { useState, useEffect, useMemo } from 'react';
import { 
  ActiveView,
  AppConfig, 
  ColorMode,
  InstalledPackage, 
  PathStatusReport, 
  ThemeKey,
  UninstallRequest
} from './types';
import { HeaderBar } from './components/HeaderBar';
import { PathInfoBar } from './components/PathInfoBar';
import { AppCard } from './components/AppCard';
import { InstallModal } from './components/InstallModal';
import { AuditModal } from './components/AuditModal';
import { UninstallModal } from './components/UninstallModal';
import { SettingsPage } from './components/SettingsPage';
import { LegalPage } from './components/LegalPage';
import { HelpPage } from './components/HelpPage';
import { 
  Package, 
  PackagePlus, 
  Layers, 
  FileArchive, 
  AlertCircle, 
  CheckCircle2
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

export function App() {
  const [activeView, setActiveView] = useState<ActiveView>('packages');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>('gtk');
  const [colorMode, setColorMode] = useState<ColorMode>('dark');
  const [pathStatus, setPathStatus] = useState<PathStatusReport | null>(null);
  const [packages, setPackages] = useState<InstalledPackage[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'appImage' | 'tar' | 'broken'>('all');

  // Modals
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<InstalledPackage | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<InstalledPackage | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const conf: AppConfig = await invoke('get_config');
      setConfig(conf);
      setActiveTheme(conf.activeTheme as ThemeKey);
      const mode = (conf.colorMode as ColorMode) || 'dark';
      setColorMode(mode);
      document.body.setAttribute('data-theme', conf.activeTheme);
      document.body.setAttribute('data-mode', mode);
      document.body.setAttribute('data-animation', conf.animationLevel || 'smooth');

      const pathRep: PathStatusReport = await invoke('check_path_status');
      setPathStatus(pathRep);

      const pkgs: InstalledPackage[] = await invoke('list_installed_packages');
      setPackages(pkgs);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleThemeChange = async (newTheme: ThemeKey) => {
    setActiveTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
    if (config) {
      const updated = { ...config, activeTheme: newTheme };
      setConfig(updated);
      try {
        await invoke('save_config', { config: updated });
      } catch (err) {
        console.error('Failed to save theme:', err);
      }
    }
  };

  const handleColorModeChange = async (newMode: ColorMode) => {
    setColorMode(newMode);
    document.body.setAttribute('data-mode', newMode);
    if (config) {
      const updated = { ...config, colorMode: newMode };
      setConfig(updated);
      try {
        await invoke('save_config', { config: updated });
      } catch (err) {
        console.error('Failed to save color mode:', err);
      }
    }
  };

  const handleConfigSaved = (newConfig: AppConfig) => {
    setConfig(newConfig);
    setActiveTheme(newConfig.activeTheme as ThemeKey);
    const mode = (newConfig.colorMode as ColorMode) || 'dark';
    setColorMode(mode);
    document.body.setAttribute('data-theme', newConfig.activeTheme);
    document.body.setAttribute('data-mode', mode);
    document.body.setAttribute('data-animation', newConfig.animationLevel || 'smooth');
  };

  const handleAdvancedUninstall = async (req: UninstallRequest) => {
    try {
      const removed: InstalledPackage = await invoke('uninstall_package_advanced', { request: req });
      showToast(`Cleanly uninstalled ${removed.name}. All files & symlinks removed.`);
      loadData();
    } catch (err: any) {
      showToast(`Uninstall error: ${err}`, 'error');
    }
  };

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchesName = (pkg.name || '').toLowerCase().includes(query);
        const matchesAlias = (pkg.cliAlias || '').toLowerCase().includes(query);
        const matchesCategory = (pkg.categories || []).some(c => (c || '').toLowerCase().includes(query));
        const matchesDesc = (pkg.description || '').toLowerCase().includes(query);
        if (!matchesName && !matchesAlias && !matchesCategory && !matchesDesc) {
          return false;
        }
      }

      if (filterType === 'appImage') {
        return pkg.packageType === 'appImage';
      }
      if (filterType === 'tar') {
        return ['tarGz', 'tarXz', 'tarBz2', 'tar'].includes(pkg.packageType);
      }
      if (filterType === 'broken') {
        return !pkg.isHealthy;
      }

      return true;
    });
  }, [packages, searchQuery, filterType]);

  return (
    <div className="app-root">
      <HeaderBar
        activeView={activeView}
        onViewChange={setActiveView}
        activeTheme={activeTheme}
        onThemeChange={handleThemeChange}
        colorMode={colorMode}
        onColorModeChange={handleColorModeChange}
        packagesCount={packages.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenInstall={() => setIsInstallOpen(true)}
      />

      {activeView === 'packages' && (
        <>
          <PathInfoBar
            pathStatus={pathStatus}
            onRefresh={loadData}
          />

          <main className="main-content view-transition">
            <div className="content-toolbar">
              <div className="filter-segmented-group">
                <button
                  className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  <Layers size={13} />
                  <span>All ({packages.length})</span>
                </button>

                <button
                  className={`filter-btn ${filterType === 'appImage' ? 'active' : ''}`}
                  onClick={() => setFilterType('appImage')}
                >
                  <Package size={13} />
                  <span>AppImages</span>
                </button>

                <button
                  className={`filter-btn ${filterType === 'tar' ? 'active' : ''}`}
                  onClick={() => setFilterType('tar')}
                >
                  <FileArchive size={13} />
                  <span>Archives</span>
                </button>

                {packages.some(p => !p.isHealthy) && (
                  <button
                    className={`filter-btn ${filterType === 'broken' ? 'active' : ''}`}
                    onClick={() => setFilterType('broken')}
                  >
                    <AlertCircle size={13} />
                    <span>Broken</span>
                  </button>
                )}
              </div>

              <span className="package-count">
                Showing {filteredPackages.length} of {packages.length} installed
              </span>
            </div>

            {filteredPackages.length > 0 ? (
              <div className="packages-list">
                {filteredPackages.map((pkg) => (
                  <AppCard
                    key={pkg.id}
                    pkg={pkg}
                    onOpenAudit={(p) => setAuditTarget(p)}
                    onRequestUninstall={(p) => setUninstallTarget(p)}
                  />
                ))}
              </div>
            ) : (
              <div className="status-page-empty">
                <div className="status-page-icon">
                  <PackagePlus size={28} />
                </div>
                <h3>
                  {packages.length === 0 ? 'No Packages Installed Yet' : 'No Matching Packages Found'}
                </h3>
                <p>
                  {packages.length === 0
                    ? 'Install portable Linux packages (.AppImage, .tar.gz, .tar.xz) safely into isolated user-space storage with desktop shortcuts and terminal links.'
                    : 'Try clearing your search query or selecting a different package filter.'}
                </p>
                {packages.length === 0 && (
                  <button className="btn-hero-install" onClick={() => setIsInstallOpen(true)}>
                    <PackagePlus size={14} />
                    <span>Install Package Now</span>
                  </button>
                )}
              </div>
            )}
          </main>
        </>
      )}

      {activeView === 'settings' && (
        <main className="main-content view-transition">
          <SettingsPage
            config={config}
            pathStatus={pathStatus}
            onConfigSaved={handleConfigSaved}
            onRefreshData={loadData}
          />
        </main>
      )}

      {activeView === 'legal' && (
        <main className="main-content view-transition">
          <LegalPage />
        </main>
      )}

      {activeView === 'help' && (
        <main className="main-content view-transition">
          <HelpPage />
        </main>
      )}

      {/* Modals */}
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        onInstalled={() => {
          loadData();
          showToast('Package installed successfully!');
        }}
      />

      <AuditModal
        isOpen={!!auditTarget}
        pkg={auditTarget}
        onClose={() => setAuditTarget(null)}
        onUninstall={(id) => {
          const found = packages.find(p => p.id === id);
          if (found) setUninstallTarget(found);
        }}
      />

      <UninstallModal
        isOpen={!!uninstallTarget}
        pkg={uninstallTarget}
        onClose={() => setUninstallTarget(null)}
        onConfirmUninstall={handleAdvancedUninstall}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-container ${toast.type}`}>
          <CheckCircle2 size={16} className="toast-icon" />
          <span className="toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
