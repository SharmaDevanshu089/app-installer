import { useState } from 'react';
import { InstalledPackage } from '../types';
import { 
  Play, 
  FileText, 
  FolderOpen, 
  Trash2, 
  Terminal, 
  CheckCircle, 
  AlertCircle,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface AppCardProps {
  pkg: InstalledPackage;
  onOpenAudit: (pkg: InstalledPackage) => void;
  onRequestUninstall: (pkg: InstalledPackage) => void;
}

export const AppCard = ({ pkg, onOpenAudit, onRequestUninstall }: AppCardProps) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [copiedAlias, setCopiedAlias] = useState(false);

  const handleLaunch = async () => {
    try {
      setIsLaunching(true);
      setLaunchMessage(null);
      await invoke('launch_package', { packageId: pkg.id });
      setLaunchMessage('Started');
      setTimeout(() => setLaunchMessage(null), 1800);
    } catch (err: any) {
      alert(`Launch error: ${err}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await invoke('open_directory', { path: pkg.installDir });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyAlias = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pkg.cliAlias);
    setCopiedAlias(true);
    setTimeout(() => setCopiedAlias(false), 1500);
  };

  return (
    <div className={`native-app-row ${!pkg.isHealthy ? 'unhealthy' : ''}`}>
      {/* App Icon */}
      <div className="row-icon-box">
        {pkg.iconBase64 ? (
          <img src={pkg.iconBase64} alt={pkg.name} className="row-icon-img" />
        ) : (
          <div className="row-icon-fallback">
            {pkg.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Main Metadata */}
      <div className="row-main-info">
        <div className="row-title-line">
          <span className="row-app-name">{pkg.name}</span>
          <span className="row-version-tag">v{pkg.version}</span>
          <span className="row-type-tag">{pkg.packageType}</span>
          <span className="row-size-tag">{pkg.totalSizeFormatted}</span>
          <span 
            className={`row-health-badge ${pkg.isHealthy ? 'healthy' : 'broken'}`}
            title={pkg.isHealthy ? 'Executable ready in install directory' : 'Binary executable not found'}
          >
            {pkg.isHealthy ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
            <span>{pkg.isHealthy ? 'Healthy' : 'Broken'}</span>
          </span>
        </div>

        {/* Description */}
        <p className="row-desc">
          {pkg.description || 'Portable package installed in user-space directory.'}
        </p>

        {/* Very small links / pills */}
        <div className="row-small-links">
          {pkg.cliAlias && (
            <button 
              className="mini-link" 
              onClick={handleCopyAlias}
              title="Click to copy CLI command"
            >
              <Terminal size={10} />
              <span>$ {pkg.cliAlias}</span>
              {copiedAlias ? <Check size={10} color="#26a269" /> : <Copy size={9} />}
            </button>
          )}

          <button 
            className="mini-link" 
            onClick={handleOpenFolder}
            title="Open installation directory in file manager"
          >
            <FolderOpen size={10} />
            <span>{pkg.installDir}</span>
          </button>
        </div>
      </div>

      {/* Row Action Buttons */}
      <div className="row-actions">
        <button 
          className="btn-row-launch" 
          onClick={handleLaunch} 
          disabled={isLaunching || !pkg.isHealthy}
          title="Launch executable"
        >
          {isLaunching ? (
            <Loader2 size={13} className="spin" />
          ) : (
            <Play size={12} fill="currentColor" />
          )}
          <span>{launchMessage || 'Launch'}</span>
        </button>

        <button 
          className="btn-row-flat" 
          onClick={() => onOpenAudit(pkg)}
          title="View file manifest and change history"
        >
          <FileText size={13} />
          <span>Audit</span>
        </button>

        <button 
          className="btn-row-destructive" 
          onClick={() => onRequestUninstall(pkg)}
          title="Uninstall package"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <style>{`
        .native-app-row {
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }

        .native-app-row:hover {
          background-color: var(--bg-card-hover);
          border-color: rgba(255, 255, 255, 0.14);
        }

        .native-app-row.unhealthy {
          border-left: 3px solid #e01b24;
        }

        .row-icon-box {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .row-icon-img {
          width: 38px;
          height: 38px;
          object-fit: contain;
          border-radius: var(--radius-sm);
        }

        .row-icon-fallback {
          width: 38px;
          height: 38px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          color: var(--accent);
        }

        .row-main-info {
          flex: 1;
          min-width: 0;
        }

        .row-title-line {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 2px;
          flex-wrap: wrap;
        }

        .row-app-name {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .row-version-tag {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
        }

        .row-type-tag {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 10.5px;
          padding: 1px 5px;
          border-radius: 3px;
        }

        .row-size-tag {
          font-size: 10.5px;
          color: var(--text-muted);
        }

        .row-health-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 3px;
        }

        .row-health-badge.healthy {
          background: rgba(38, 162, 105, 0.12);
          color: #26a269;
        }

        .row-health-badge.broken {
          background: rgba(224, 27, 36, 0.12);
          color: #e01b24;
        }

        .row-desc {
          font-size: 12px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }

        .row-small-links {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .row-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .btn-row-launch {
          background-color: var(--accent) !important;
          color: var(--accent-text) !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          padding: 0 10px !important;
          height: 22px !important;
          border-radius: 0px !important;
          border: 1px solid var(--accent-hover) !important;
        }

        .btn-row-launch:hover:not(:disabled) {
          background-color: var(--accent-hover) !important;
        }

        .btn-row-flat {
          background-color: var(--bg-secondary) !important;
          color: var(--text-secondary) !important;
          border: 1px solid var(--border-color) !important;
          font-size: 11.5px !important;
          padding: 0 8px !important;
          height: 22px !important;
          border-radius: 0px !important;
        }

        .btn-row-flat:hover {
          background-color: var(--bg-card-hover) !important;
          color: var(--text-primary) !important;
          border-color: var(--accent) !important;
        }

        .btn-row-destructive {
          background-color: var(--bg-secondary) !important;
          color: var(--text-muted) !important;
          border: 1px solid var(--border-color) !important;
          padding: 0 6px !important;
          height: 22px !important;
          border-radius: 0px !important;
        }

        .btn-row-destructive:hover {
          background-color: #e01b24 !important;
          color: #ffffff !important;
          border-color: #e01b24 !important;
        }

        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
