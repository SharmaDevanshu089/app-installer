import { useState } from 'react';
import { InstalledPackage, UninstallRequest } from '../types';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  Folder, 
  Link, 
  AppWindow
} from 'lucide-react';

interface UninstallModalProps {
  pkg: InstalledPackage | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmUninstall: (req: UninstallRequest) => void;
}

export const UninstallModal = ({
  pkg,
  isOpen,
  onClose,
  onConfirmUninstall,
}: UninstallModalProps) => {
  const [purgeConfigs, setPurgeConfigs] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !pkg) return null;

  const handleConfirm = () => {
    setIsDeleting(true);
    onConfirmUninstall({
      packageId: pkg.id,
      purgeUserConfigs: purgeConfigs,
    });
    setIsDeleting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container uninstall-modal modal-spring" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Trash2 size={18} className="danger-icon" />
            <h2>Uninstall Application</h2>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="app-summary-row">
            <div className="summary-icon-box">
              {pkg.iconBase64 ? (
                <img src={pkg.iconBase64} alt={pkg.name} />
              ) : (
                <div className="fallback-badge">{pkg.name.charAt(0).toUpperCase()}</div>
              )}
            </div>
            <div>
              <h3>{pkg.name}</h3>
              <p className="summary-meta">Version {pkg.version} • {pkg.totalSizeFormatted} disk space</p>
            </div>
          </div>

          <div className="removal-manifest-box">
            <h4>Items That Will Be Atomically Cleaned:</h4>
            <ul>
              <li>
                <Folder size={13} />
                <span>Isolated App Folder: <code>{pkg.installDir}</code> ({pkg.installedFiles.length} files)</span>
              </li>
              {pkg.symlinks.map((s, i) => (
                <li key={i}>
                  <Link size={13} />
                  <span>Terminal $PATH Symlink: <code>{s}</code></span>
                </li>
              ))}
              {pkg.desktopFiles.map((d, i) => (
                <li key={i}>
                  <AppWindow size={13} />
                  <span>Desktop Launcher: <code>{d}</code></span>
                </li>
              ))}
            </ul>
          </div>

          {/* Purge user configurations option */}
          <label className="purge-checkbox-label">
            <input
              type="checkbox"
              checked={purgeConfigs}
              onChange={(e) => setPurgeConfigs(e.target.checked)}
            />
            <div className="purge-text">
              <span className="purge-title">Also purge application user data and settings</span>
              <p className="purge-desc">
                Removes <code>~/.config/{pkg.id}</code> and <code>~/.local/share/{pkg.id}</code> if created by this application.
              </p>
            </div>
          </label>

          <div className="clean-guarantee-note">
            <AlertTriangle size={14} />
            <span>Zero-Orphan Guarantee: No broken symlinks or dangling files will remain on your system.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>

          <button 
            type="button" 
            className="btn-danger-confirm" 
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            <Trash2 size={15} />
            <span>{isDeleting ? 'Removing...' : 'Confirm Clean Uninstall'}</span>
          </button>
        </div>

        <style>{`
          .uninstall-modal {
            max-width: 520px;
          }

          .danger-icon {
            color: #ef4444;
          }

          .app-summary-row {
            display: flex;
            align-items: center;
            gap: 14px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 12px 16px;
            margin-bottom: 16px;
          }

          .summary-icon-box {
            width: 44px;
            height: 44px;
            border-radius: var(--radius-sm);
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
          }

          .summary-icon-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .fallback-badge {
            font-size: 20px;
            font-weight: 700;
            color: var(--accent);
          }

          .app-summary-row h3 {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 2px;
          }

          .summary-meta {
            font-size: 12px;
            color: var(--text-muted);
          }

          .removal-manifest-box {
            background: var(--bg-primary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 12px 14px;
            margin-bottom: 16px;
          }

          .removal-manifest-box h4 {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 8px;
          }

          .removal-manifest-box ul {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .removal-manifest-box li {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            color: var(--text-muted);
          }

          .removal-manifest-box code {
            color: var(--text-primary);
            font-family: monospace;
          }

          .purge-checkbox-label {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.25);
            border-radius: var(--radius-md);
            padding: 12px;
            cursor: pointer;
            margin-bottom: 14px;
          }

          .purge-checkbox-label input {
            margin-top: 3px;
            accent-color: #ef4444;
          }

          .purge-title {
            font-size: 12px;
            font-weight: 600;
            color: #ef4444;
            display: block;
          }

          .purge-desc {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 2px;
          }

          .purge-desc code {
            font-family: monospace;
          }

          .clean-guarantee-note {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            color: var(--text-muted);
          }

          .btn-danger-confirm {
            display: flex;
            align-items: center;
            gap: 6px;
            background: #ef4444;
            color: #ffffff;
            border-radius: var(--radius-pill);
            padding: 8px 18px;
            font-size: 13px;
            font-weight: 600;
          }

          .btn-danger-confirm:hover {
            background: #dc2626;
          }
        `}</style>
      </div>
    </div>
  );
};
