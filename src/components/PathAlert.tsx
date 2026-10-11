import { useState } from 'react';
import { PathStatusReport } from '../types';
import { AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface PathAlertProps {
  pathStatus: PathStatusReport | null;
  onRefresh: () => void;
}

export const PathAlert: React.FC<PathAlertProps> = ({ pathStatus, onRefresh }) => {
  const [fixing, setFixing] = useState(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (!pathStatus || pathStatus.isInCurrentPath || dismissed) {
    return null;
  }

  const handleAutoFix = async () => {
    try {
      setFixing(true);
      const res: string = await invoke('fix_path_environment', { targetFile: null });
      setFixMessage(res);
      setTimeout(() => {
        onRefresh();
      }, 1500);
    } catch (err) {
      setFixMessage(`Failed to update configuration: ${err}`);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="path-alert-banner">
      <div className="path-alert-icon">
        <AlertTriangle size={20} />
      </div>
      <div className="path-alert-content">
        <h4>User PATH Warning: <code>{pathStatus.targetBinDir}</code> not detected in current $PATH</h4>
        <p>
          Applications installed with CLI symlinks won't be accessible directly by command name in new terminals unless added to your shell profile.
        </p>
        {fixMessage && (
          <div className="path-fix-success">
            <CheckCircle size={14} />
            <span>{fixMessage}</span>
          </div>
        )}
      </div>
      <div className="path-alert-actions">
        <button className="btn-fix" onClick={handleAutoFix} disabled={fixing}>
          <Wrench size={14} />
          <span>{fixing ? 'Configuring...' : 'Auto-Add to Shell'}</span>
        </button>
        <button className="btn-dismiss" onClick={() => setDismissed(true)}>
          Dismiss
        </button>
      </div>

      <style>{`
        .path-alert-banner {
          margin: 16px 24px 0;
          background: rgba(234, 179, 8, 0.12);
          border: 1px solid rgba(234, 179, 8, 0.35);
          border-radius: var(--radius-md);
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .path-alert-icon {
          color: #eab308;
          flex-shrink: 0;
        }

        .path-alert-content {
          flex: 1;
        }

        .path-alert-content h4 {
          font-size: 13px;
          font-weight: 600;
          color: #fef08a;
          margin-bottom: 2px;
        }

        .path-alert-content code {
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-family: monospace;
          color: #ffffff;
        }

        .path-alert-content p {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .path-fix-success {
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #4ade80;
          font-weight: 500;
        }

        .path-alert-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-fix {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #eab308;
          color: #1c1917;
          font-weight: 600;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: var(--radius-pill);
        }

        .btn-fix:hover:not(:disabled) {
          background: #facc15;
        }

        .btn-dismiss {
          background: transparent;
          color: var(--text-muted);
          font-size: 12px;
          padding: 6px 10px;
        }

        .btn-dismiss:hover {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};
