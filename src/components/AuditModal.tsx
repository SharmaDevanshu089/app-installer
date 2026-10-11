import { useState } from 'react';
import { InstalledPackage } from '../types';
import { 
  X, 
  History, 
  Folder, 
  Link, 
  AppWindow, 
  FileText, 
  HardDrive, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  Terminal
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface AuditModalProps {
  pkg: InstalledPackage | null;
  isOpen: boolean;
  onClose: () => void;
  onUninstall: (packageId: string) => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ pkg, isOpen, onClose, onUninstall }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'files' | 'symlinks'>('audit');

  if (!isOpen || !pkg) return null;

  const handleOpenFolder = async (path: string) => {
    try {
      await invoke('open_directory', { path });
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container audit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <History size={20} className="modal-title-icon" />
            <div>
              <h2>System Changes & Manifest Audit</h2>
              <span className="subtitle">{pkg.name} (v{pkg.version})</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="audit-tabs">
          <button 
            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <ShieldCheck size={14} />
            <span>Audit Trail ({pkg.changeAuditLog.length})</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'symlinks' ? 'active' : ''}`}
            onClick={() => setActiveTab('symlinks')}
          >
            <Link size={14} />
            <span>Integrations ({pkg.symlinks.length + pkg.desktopFiles.length})</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FileText size={14} />
            <span>Installed Files ({pkg.installedFiles.length})</span>
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'audit' && (
            <div className="audit-timeline">
              <div className="audit-summary-card">
                <div className="summary-item">
                  <span className="summary-label">Installed On</span>
                  <span className="summary-value">
                    <Clock size={13} />
                    {new Date(pkg.installedAt).toLocaleString()}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Install Location</span>
                  <span className="summary-value code-val" onClick={() => handleOpenFolder(pkg.installDir)}>
                    <Folder size={13} />
                    {pkg.installDir}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Size</span>
                  <span className="summary-value">
                    <HardDrive size={13} />
                    {pkg.totalSizeFormatted}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Package Format</span>
                  <span className="summary-value badge">{pkg.packageType}</span>
                </div>
              </div>

              <div className="timeline-list">
                {pkg.changeAuditLog.map((step, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-dot">
                      <CheckCircle2 size={14} />
                    </div>
                    <div className="timeline-content">
                      <span className="step-number">Step {idx + 1}</span>
                      <p className="step-text">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'symlinks' && (
            <div className="integrations-list">
              <div className="section-block">
                <h4>
                  <Terminal size={15} />
                  <span>Terminal $PATH Symlinks</span>
                </h4>
                {pkg.symlinks.length === 0 ? (
                  <p className="empty-notice">No terminal symlinks registered.</p>
                ) : (
                  pkg.symlinks.map((link, i) => (
                    <div key={i} className="integration-item">
                      <div className="integration-path">
                        <code>{link}</code>
                        <span className="arrow">→</span>
                        <code className="target">{pkg.primaryBinary}</code>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="section-block">
                <h4>
                  <AppWindow size={15} />
                  <span>FreeDesktop Launchers (.desktop)</span>
                </h4>
                {pkg.desktopFiles.length === 0 ? (
                  <p className="empty-notice">No desktop entries registered.</p>
                ) : (
                  pkg.desktopFiles.map((df, i) => (
                    <div key={i} className="integration-item">
                      <code>{df}</code>
                    </div>
                  ))
                )}
              </div>

              <div className="section-block">
                <h4>
                  <Folder size={15} />
                  <span>Desktop Icons</span>
                </h4>
                {pkg.iconFiles.length === 0 ? (
                  <p className="empty-notice">No custom icons deployed.</p>
                ) : (
                  pkg.iconFiles.map((ic, i) => (
                    <div key={i} className="integration-item">
                      <code>{ic}</code>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="installed-files-list">
              <div className="files-header">
                <span>File Path</span>
                <button 
                  className="btn-open-dir" 
                  onClick={() => handleOpenFolder(pkg.installDir)}
                >
                  <Folder size={13} />
                  <span>Open Folder</span>
                </button>
              </div>
              <div className="files-scroll-area">
                {pkg.installedFiles.map((f, i) => (
                  <div key={i} className="file-item-row">
                    <span className="file-idx">{i + 1}</span>
                    <span className="file-path-text">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="btn-danger" 
            onClick={() => {
              if (confirm(`Uninstall ${pkg.name}? This will cleanly remove all ${pkg.installedFiles.length} files, symlinks, desktop entries, and icons.`)) {
                onUninstall(pkg.id);
                onClose();
              }
            }}
          >
            <Trash2 size={15} />
            <span>Clean Uninstall</span>
          </button>

          <button type="button" className="btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>

        <style>{`
          .audit-modal {
            max-width: 680px;
          }

          .modal-title .subtitle {
            font-size: 11px;
            color: var(--text-muted);
            font-weight: 500;
          }

          .audit-tabs {
            display: flex;
            background: var(--bg-tertiary);
            border-bottom: 1px solid var(--border-color);
            padding: 0 16px;
          }

          .tab-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background: transparent;
            color: var(--text-secondary);
            padding: 10px 14px;
            font-size: 12px;
            font-weight: 500;
            border-bottom: 2px solid transparent;
          }

          .tab-btn:hover {
            color: var(--text-primary);
          }

          .tab-btn.active {
            color: var(--accent);
            border-bottom-color: var(--accent);
            font-weight: 600;
          }

          .audit-summary-card {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 14px;
            margin-bottom: 18px;
          }

          .summary-item {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }

          .summary-label {
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
          }

          .summary-value {
            font-size: 12px;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .summary-value.code-val {
            font-family: monospace;
            cursor: pointer;
            color: var(--accent);
            text-decoration: underline;
          }

          .summary-value.badge {
            background: var(--accent-light);
            color: var(--accent);
            padding: 2px 8px;
            border-radius: var(--radius-pill);
            display: inline-block;
            font-size: 11px;
            font-weight: 600;
            width: fit-content;
          }

          .timeline-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .timeline-item {
            display: flex;
            gap: 12px;
            position: relative;
          }

          .timeline-dot {
            color: var(--accent);
            flex-shrink: 0;
            margin-top: 2px;
          }

          .timeline-content {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .step-number {
            font-size: 10px;
            text-transform: uppercase;
            color: var(--text-muted);
            font-weight: 700;
          }

          .step-text {
            font-size: 13px;
            color: var(--text-primary);
          }

          .section-block {
            margin-bottom: 18px;
          }

          .section-block h4 {
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            color: var(--text-secondary);
          }

          .integration-item {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            padding: 8px 12px;
            margin-bottom: 6px;
            font-size: 12px;
          }

          .integration-path {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .integration-path code {
            font-family: monospace;
            color: var(--accent);
          }

          .integration-path .target {
            color: var(--text-secondary);
          }

          .empty-notice {
            font-size: 12px;
            color: var(--text-muted);
            font-style: italic;
          }

          .files-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 8px;
          }

          .btn-open-dir {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--bg-tertiary);
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-pill);
            padding: 4px 10px;
            font-size: 11px;
          }

          .btn-open-dir:hover {
            color: var(--text-primary);
            background: var(--bg-card-hover);
          }

          .files-scroll-area {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            max-height: 280px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 11px;
          }

          .file-item-row {
            display: flex;
            gap: 10px;
            padding: 6px 10px;
            border-bottom: 1px solid var(--border-subtle);
          }

          .file-item-row:last-child {
            border-bottom: none;
          }

          .file-idx {
            color: var(--text-muted);
            width: 24px;
            text-align: right;
            flex-shrink: 0;
          }

          .file-path-text {
            color: var(--text-secondary);
            word-break: break-all;
          }

          .btn-danger {
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: var(--radius-pill);
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            margin-right: auto;
          }

          .btn-danger:hover {
            background: #ef4444;
            color: #ffffff;
          }
        `}</style>
      </div>
    </div>
  );
};
