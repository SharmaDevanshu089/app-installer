import { useState } from 'react';
import { InspectResult, InstallRequest } from '../types';
import { 
  X, 
  UploadCloud, 
  FolderSearch, 
  Check, 
  Loader2, 
  AppWindow, 
  ShieldCheck, 
  ChevronDown
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstalled: () => void;
}

const COMMON_CATEGORIES = ['Utility', 'Development', 'Graphics', 'AudioVideo', 'Network', 'Office', 'Game', 'System'];

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose, onInstalled }) => {
  const [filePath, setFilePath] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [inspectResult, setInspectResult] = useState<InspectResult | null>(null);

  // Form states
  const [appName, setAppName] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [selectedBinary, setSelectedBinary] = useState('');
  const [cliAlias, setCliAlias] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Utility']);
  const [createDesktop, setCreateDesktop] = useState(true);
  const [createSymlink, setCreateSymlink] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const validateAliasInput = (val: string) => {
    setCliAlias(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setAliasError('Alias cannot be empty');
      return;
    }
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
    if (!regex.test(trimmed)) {
      setAliasError('Alias must start with a letter/digit and contain only letters, digits, dashes, and underscores.');
    } else {
      setAliasError(null);
    }
  };

  if (!isOpen) return null;

  const handlePickFile = async () => {
    try {
      const selected: string | null = await invoke('pick_package_file');
      if (selected) {
        setFilePath(selected);
        triggerInspection(selected);
      }
    } catch (err) {
      console.error('File chooser error:', err);
    }
  };

  const triggerInspection = async (path: string) => {
    if (!path.trim()) return;
    setIsInspecting(true);
    setInspectError(null);
    setInspectResult(null);

    try {
      const res: InspectResult = await invoke('inspect_package', { filePath: path.trim() });
      setInspectResult(res);
      setAppName(res.suggestedName);
      setAppVersion(res.suggestedVersion);
      setAppDescription(res.description || 'Linux Desktop Application');
      setCliAlias(res.suggestedAlias);

      if (res.categories && res.categories.length > 0) {
        setSelectedCategories(res.categories);
      }

      const primary = res.discoveredBinaries.find(b => b.isPrimaryCandidate) || res.discoveredBinaries[0];
      if (primary) {
        setSelectedBinary(primary.relativePath);
      }
    } catch (err: any) {
      setInspectError(typeof err === 'string' ? err : err.message || 'Inspection failed');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleInstall = async () => {
    if (!inspectResult) return;
    setIsInstalling(true);
    setInstallError(null);

    const req: InstallRequest = {
      filePath: inspectResult.filePath,
      packageType: inspectResult.packageType,
      name: appName.trim(),
      version: appVersion.trim(),
      selectedBinaryRelative: selectedBinary,
      cliAlias: cliAlias.trim(),
      categories: selectedCategories,
      description: appDescription.trim(),
      createDesktopShortcut: createDesktop,
      createTerminalSymlink: createSymlink,
      iconBase64: inspectResult.iconBase64,
      stagingDir: inspectResult.stagingDir,
    };

    try {
      await invoke('install_package', { request: req });
      onInstalled();
      handleClose();
    } catch (err: any) {
      setInstallError(typeof err === 'string' ? err : err.message || 'Installation failed');
      setIsInstalling(false);
    }
  };

  const handleClose = () => {
    setFilePath('');
    setInspectResult(null);
    setInspectError(null);
    setInstallError(null);
    setIsInstalling(false);
    setIsInspecting(false);
    onClose();
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== cat));
      }
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <AppWindow size={20} className="modal-title-icon" />
            <h2>{inspectResult ? 'Configure & Install' : 'Install Linux Package'}</h2>
          </div>
          <button className="btn-close" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {!inspectResult ? (
            <div className="step-select-file">
              <div 
                className="drop-zone"
                onClick={handlePickFile}
              >
                <UploadCloud size={48} className="drop-icon" />
                <h3>Choose or Drag a Linux Package</h3>
                <p>Supports <code>.AppImage</code>, <code>.tar.gz</code>, <code>.tar.xz</code>, <code>.tar.bz2</code>, and standalone binaries</p>
                <button type="button" className="btn-browse" onClick={(e) => { e.stopPropagation(); handlePickFile(); }}>
                  <FolderSearch size={16} />
                  <span>Browse System Files</span>
                </button>
              </div>

              <div className="divider">
                <span>or enter path directly</span>
              </div>

              <div className="manual-path-box">
                <input
                  type="text"
                  placeholder="/home/user/Downloads/my-app.AppImage"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') triggerInspection(filePath);
                  }}
                />
                <button 
                  type="button" 
                  className="btn-inspect" 
                  onClick={() => triggerInspection(filePath)}
                  disabled={!filePath.trim() || isInspecting}
                >
                  {isInspecting ? <Loader2 size={16} className="spin" /> : 'Inspect'}
                </button>
              </div>

              {isInspecting && (
                <div className="inspecting-loader">
                  <Loader2 size={24} className="spin" />
                  <span>Extracting package metadata, icon, and binaries...</span>
                </div>
              )}

              {inspectError && (
                <div className="modal-error">
                  {inspectError}
                </div>
              )}
            </div>
          ) : (
            <div className="step-inspect-details">
              {/* Top Banner: Extracted Icon & Basic Info */}
              <div className="package-preview-card">
                <div className="package-icon-wrapper">
                  {inspectResult.iconBase64 ? (
                    <img 
                      src={inspectResult.iconBase64} 
                      alt={appName} 
                      className="extracted-icon" 
                    />
                  ) : (
                    <div className="fallback-icon">
                      {appName ? appName.charAt(0).toUpperCase() : 'A'}
                    </div>
                  )}
                </div>

                <div className="package-headline">
                  <div className="name-badge-row">
                    <h3>{appName || 'Unnamed Application'}</h3>
                    <span className="type-badge">{inspectResult.packageType}</span>
                    <span className="size-badge">{inspectResult.fileSizeFormatted}</span>
                  </div>
                  <p className="file-origin-path" title={inspectResult.filePath}>
                    Source: {inspectResult.fileName}
                  </p>
                </div>
              </div>

              {/* Form Customization */}
              <div className="form-grid">
                <div className="form-group">
                  <label>Application Name</label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Version</label>
                  <input
                    type="text"
                    value={appVersion}
                    onChange={(e) => setAppVersion(e.target.value)}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <input
                    type="text"
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                  />
                </div>

                {/* Primary Executable Selector */}
                {inspectResult.discoveredBinaries.length > 0 && (
                  <div className="form-group full-width">
                    <label>
                      Primary Launcher Binary
                      <span className="label-hint">Executable that starts the application</span>
                    </label>
                    <div className="select-wrapper">
                      <select
                        value={selectedBinary}
                        onChange={(e) => setSelectedBinary(e.target.value)}
                      >
                        {inspectResult.discoveredBinaries.map((bin) => (
                          <option key={bin.relativePath} value={bin.relativePath}>
                            {bin.relativePath} {bin.isElf ? '(ELF Binary)' : '(Script)'} {bin.isPrimaryCandidate ? '⭐ Recommended' : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="select-arrow" />
                    </div>
                  </div>
                )}

                {/* CLI Alias */}
                <div className="form-group full-width">
                  <label>
                    Terminal Command Alias
                    <span className="label-hint">Symlinked in <code>~/.local/bin/&lt;alias&gt;</code></span>
                  </label>
                  <div className={`alias-input-wrapper ${aliasError ? 'error-border' : ''}`}>
                    <span className="alias-prefix">$</span>
                    <input
                      type="text"
                      value={cliAlias}
                      onChange={(e) => validateAliasInput(e.target.value)}
                      placeholder="e.g. my-app"
                    />
                  </div>
                  {aliasError && (
                    <span className="field-error-text">{aliasError}</span>
                  )}
                </div>

                {/* Categories */}
                <div className="form-group full-width">
                  <label>FreeDesktop Categories</label>
                  <div className="categories-chips">
                    {COMMON_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`chip ${selectedCategories.includes(cat) ? 'active' : ''}`}
                        onClick={() => toggleCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop Integration Toggles */}
                <div className="form-group full-width integration-toggles">
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={createDesktop}
                      onChange={(e) => setCreateDesktop(e.target.checked)}
                    />
                    <div className="toggle-info">
                      <span className="toggle-title">Register Desktop Launcher</span>
                      <span className="toggle-desc">Creates <code>~/.local/share/applications/{cliAlias || 'app'}.desktop</code> so it appears in application menus and docks.</span>
                    </div>
                  </label>

                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={createSymlink}
                      onChange={(e) => setCreateSymlink(e.target.checked)}
                    />
                    <div className="toggle-info">
                      <span className="toggle-title">Add to Terminal PATH</span>
                      <span className="toggle-desc">Creates symlink in <code>~/.local/bin/{cliAlias || 'app'}</code> for terminal access.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Technical Accordion */}
              <div className="technical-section">
                <button 
                  type="button" 
                  className="accordion-toggle"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                >
                  <ShieldCheck size={16} />
                  <span>Security & Integrity Details</span>
                  <ChevronDown size={14} className={`chevron ${showTechnicalDetails ? 'open' : ''}`} />
                </button>

                {showTechnicalDetails && (
                  <div className="technical-content">
                    <div className="tech-row">
                      <span className="tech-label">SHA-256 Checksum:</span>
                      <code className="tech-value">{inspectResult.sha256Checksum}</code>
                    </div>
                    <div className="tech-row">
                      <span className="tech-label">Destination Folder:</span>
                      <span className="tech-value">~/.local/opt/{cliAlias || 'app'}</span>
                    </div>
                    <div className="tech-row">
                      <span className="tech-label">Total Binaries Found:</span>
                      <span className="tech-value">{inspectResult.discoveredBinaries.length}</span>
                    </div>
                  </div>
                )}
              </div>

              {installError && (
                <div className="modal-error">
                  {installError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {inspectResult && (
            <button 
              type="button" 
              className="btn-back" 
              onClick={() => setInspectResult(null)}
              disabled={isInstalling}
            >
              Back
            </button>
          )}

          <button 
            type="button" 
            className="btn-cancel" 
            onClick={handleClose}
            disabled={isInstalling}
          >
            Cancel
          </button>

          {inspectResult && (
            <button 
              type="button" 
              className="btn-hero-install" 
              onClick={handleInstall}
              disabled={isInstalling || !appName.trim() || !!aliasError}
            >
              {isInstalling ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Installing Package...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Install Application</span>
                </>
              )}
            </button>
          )}
        </div>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            padding: 24px;
          }

          .modal-container {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            width: 100%;
            max-width: 640px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: var(--shadow-modal);
            overflow: hidden;
          }

          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color);
            background: var(--header-bg);
          }

          .modal-title {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .modal-title-icon {
            color: var(--accent);
          }

          .modal-title h2 {
            font-size: 16px;
            font-weight: 600;
          }

          .btn-close {
            background: transparent;
            color: var(--text-muted);
            border-radius: var(--radius-sm);
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .btn-close:hover {
            color: var(--text-primary);
            background: var(--bg-tertiary);
          }

          .modal-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
          }

          .step-select-file {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .drop-zone {
            border: 2px dashed var(--border-color);
            border-radius: var(--radius-md);
            padding: 36px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            background: var(--bg-primary);
            cursor: pointer;
            transition: border-color 0.2s, background 0.2s;
          }

          .drop-zone:hover {
            border-color: var(--accent);
            background: var(--accent-light);
          }

          .drop-icon {
            color: var(--accent);
            margin-bottom: 12px;
          }

          .drop-zone h3 {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 6px;
          }

          .drop-zone p {
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 16px;
          }

          .drop-zone code {
            background: var(--bg-tertiary);
            padding: 2px 5px;
            border-radius: 4px;
          }

          .btn-browse {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: 8px 18px;
            border-radius: var(--radius-pill);
            font-size: 13px;
            font-weight: 500;
          }

          .btn-browse:hover {
            background: var(--bg-card-hover);
            border-color: var(--text-muted);
          }

          .divider {
            display: flex;
            align-items: center;
            text-align: center;
            color: var(--text-muted);
            font-size: 12px;
          }

          .divider::before, .divider::after {
            content: '';
            flex: 1;
            border-bottom: 1px solid var(--border-subtle);
          }

          .divider span {
            padding: 0 10px;
          }

          .manual-path-box {
            display: flex;
            gap: 8px;
          }

          .manual-path-box input {
            flex: 1;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 8px 14px;
            color: var(--text-primary);
            font-size: 13px;
          }

          .manual-path-box input:focus {
            border-color: var(--accent);
          }

          .btn-inspect {
            background: var(--accent);
            color: var(--accent-text);
            padding: 8px 18px;
            border-radius: var(--radius-md);
            font-weight: 600;
            font-size: 13px;
          }

          .btn-inspect:hover:not(:disabled) {
            background: var(--accent-hover);
          }

          .inspecting-loader {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 16px;
            color: var(--accent);
            font-size: 13px;
          }

          .package-preview-card {
            display: flex;
            align-items: center;
            gap: 16px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 14px 18px;
            margin-bottom: 18px;
          }

          .package-icon-wrapper {
            width: 56px;
            height: 56px;
            border-radius: var(--radius-md);
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
          }

          .extracted-icon {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .fallback-icon {
            font-size: 24px;
            font-weight: 700;
            color: var(--accent);
          }

          .package-headline {
            flex: 1;
            overflow: hidden;
          }

          .name-badge-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
          }

          .name-badge-row h3 {
            font-size: 16px;
            font-weight: 600;
          }

          .type-badge {
            background: var(--accent-light);
            color: var(--accent);
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: var(--radius-pill);
            text-transform: uppercase;
          }

          .size-badge {
            background: var(--chip-bg);
            color: var(--text-muted);
            font-size: 11px;
            padding: 2px 8px;
            border-radius: var(--radius-pill);
          }

          .file-origin-path {
            font-size: 12px;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 18px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .form-group.full-width {
            grid-column: span 2;
          }

          .form-group label {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .label-hint {
            font-size: 11px;
            font-weight: 400;
            color: var(--text-muted);
          }

          .label-hint code {
            color: var(--accent);
          }

          .form-group input[type="text"],
          .select-wrapper select {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 8px 12px;
            color: var(--text-primary);
            font-size: 13px;
            width: 100%;
          }

          .form-group input[type="text"]:focus,
          .select-wrapper select:focus {
            border-color: var(--accent);
          }

          .select-wrapper {
            position: relative;
          }

          .select-wrapper select {
            appearance: none;
            padding-right: 32px;
          }

          .select-arrow {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
          }

          .alias-input-wrapper.error-border {
            border-color: #ef4444;
          }

          .field-error-text {
            font-size: 11px;
            color: #ef4444;
            margin-top: 4px;
          }

          .alias-prefix {
            color: var(--text-muted);
            font-family: monospace;
            font-size: 14px;
            margin-right: 6px;
          }

          .alias-input-wrapper input {
            border: none;
            background: transparent;
            color: var(--text-primary);
            font-size: 13px;
            padding: 8px 0;
            width: 100%;
          }

          .categories-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }

          .chip {
            background: var(--chip-bg);
            color: var(--text-secondary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-pill);
            padding: 4px 10px;
            font-size: 12px;
            cursor: pointer;
          }

          .chip:hover {
            border-color: var(--border-color);
          }

          .chip.active {
            background: var(--accent-light);
            color: var(--accent);
            border-color: var(--accent);
            font-weight: 600;
          }

          .integration-toggles {
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 12px 16px;
          }

          .toggle-row {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            cursor: pointer;
          }

          .toggle-row input {
            margin-top: 3px;
            accent-color: var(--accent);
            width: 16px;
            height: 16px;
          }

          .toggle-info {
            display: flex;
            flex-direction: column;
          }

          .toggle-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .toggle-desc {
            font-size: 11px;
            color: var(--text-muted);
          }

          .toggle-desc code {
            background: var(--bg-tertiary);
            padding: 1px 4px;
            border-radius: 3px;
          }

          .technical-section {
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            overflow: hidden;
            margin-bottom: 14px;
          }

          .accordion-toggle {
            width: 100%;
            background: var(--bg-primary);
            color: var(--text-secondary);
            padding: 10px 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 600;
          }

          .accordion-toggle:hover {
            color: var(--text-primary);
          }

          .accordion-toggle .chevron {
            margin-left: auto;
            transition: transform 0.2s;
          }

          .accordion-toggle .chevron.open {
            transform: rotate(180deg);
          }

          .technical-content {
            padding: 12px 16px;
            background: var(--bg-card);
            border-top: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 11px;
          }

          .tech-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .tech-label {
            color: var(--text-muted);
          }

          .tech-value {
            color: var(--text-primary);
            font-family: monospace;
            word-break: break-all;
          }

          .modal-error {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.35);
            color: #ef4444;
            padding: 10px 14px;
            border-radius: var(--radius-md);
            font-size: 12px;
            margin-top: 12px;
          }

          .modal-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            padding: 14px 20px;
            border-top: 1px solid var(--border-color);
            background: var(--header-bg);
          }

          .btn-cancel, .btn-back {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
            padding: 8px 16px;
            border-radius: var(--radius-pill);
            font-size: 13px;
            font-weight: 500;
          }

          .btn-cancel:hover, .btn-back:hover {
            background: var(--bg-tertiary);
            color: var(--text-primary);
          }

          .btn-install {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--accent);
            color: var(--accent-text);
            padding: 8px 20px;
            border-radius: var(--radius-pill);
            font-size: 13px;
            font-weight: 600;
          }

          .btn-install:hover:not(:disabled) {
            background: var(--accent-hover);
          }

          .spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
