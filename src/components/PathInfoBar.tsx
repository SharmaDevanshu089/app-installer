import { useState, useEffect } from 'react';
import { PathStatusReport } from '../types';
import { AlertCircle, CheckCircle, Wrench, RefreshCw, X, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface PathInfoBarProps {
  pathStatus: PathStatusReport | null;
  onRefresh: () => void;
}

export const PathInfoBar: React.FC<PathInfoBarProps> = ({ pathStatus, onRefresh }) => {
  const [state, setState] = useState<'idle' | 'working' | 'verified' | 'dismissed'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (pathStatus?.isInCurrentPath) {
      setState('dismissed');
    }
  }, [pathStatus]);

  if (!pathStatus || pathStatus.isInCurrentPath || state === 'dismissed') {
    return null;
  }

  const handleAutoConfigure = async () => {
    try {
      setState('working');
      setMessage('Writing configuration to shell profiles...');
      await invoke('fix_path_environment', { targetFile: null });
      
      // Perform verification
      setMessage('Verifying shell path detection...');
      const updated: PathStatusReport = await invoke('check_path_status');
      
      setState('verified');
      setMessage(
        updated.isInCurrentPath
          ? `✓ Verified: ${pathStatus.targetBinDir} is active in current $PATH.`
          : `✓ Successfully configured: Added ${pathStatus.targetBinDir} to shell profiles. Active terminals need restart.`
      );

      // Auto-hide cleanly after 2.5 seconds upon successful verification
      setTimeout(() => {
        setState('dismissed');
        onRefresh();
      }, 2500);
    } catch (err: any) {
      setState('idle');
      setMessage(`Configuration failed: ${err}`);
    }
  };

  const handleRecheck = async () => {
    try {
      setState('working');
      setMessage('Re-checking environment $PATH...');
      const updated: PathStatusReport = await invoke('check_path_status');
      if (updated.isInCurrentPath) {
        setState('verified');
        setMessage(`✓ Verified: ${pathStatus.targetBinDir} is detected in your environment $PATH.`);
        setTimeout(() => {
          setState('dismissed');
          onRefresh();
        }, 2200);
      } else {
        setState('idle');
        setMessage(`Still not detected in active session. Click 'Auto-Add' to configure shell.`);
      }
    } catch (err: any) {
      setState('idle');
      setMessage(`Check failed: ${err}`);
    }
  };

  return (
    <div className={`native-info-bar ${state === 'verified' ? 'verified' : 'warning'}`}>
      <div className="info-bar-left">
        {state === 'working' ? (
          <Loader2 size={15} className="spin icon-status" />
        ) : state === 'verified' ? (
          <CheckCircle size={15} className="icon-status success" />
        ) : (
          <AlertCircle size={15} className="icon-status warning" />
        )}

        <div className="info-bar-text">
          {message ? (
            <span className="info-message">{message}</span>
          ) : (
            <span>
              Terminal warning: <code className="mini-link">{pathStatus.targetBinDir}</code> is not in your active <code>$PATH</code>. CLI commands will not be recognized without shell configuration.
            </span>
          )}
        </div>
      </div>

      <div className="info-bar-actions">
        {state === 'idle' && (
          <>
            <button className="btn-infobar-primary" onClick={handleAutoConfigure}>
              <Wrench size={13} />
              <span>Auto-Add to Shell</span>
            </button>
            <button className="btn-infobar-secondary" onClick={handleRecheck} title="Re-check environment">
              <RefreshCw size={13} />
              <span>Re-check</span>
            </button>
          </>
        )}

        {state === 'working' && (
          <span className="status-label">Configuring...</span>
        )}

        {state === 'verified' && (
          <span className="status-label-success">Auto-dismissing...</span>
        )}

        <button 
          className="btn-infobar-dismiss" 
          onClick={() => setState('dismissed')}
          title="Dismiss warning"
        >
          <X size={14} />
        </button>
      </div>

      <style>{`
        .native-info-bar {
          background-color: rgba(234, 179, 8, 0.1);
          border-bottom: 1px solid rgba(234, 179, 8, 0.25);
          color: var(--text-primary);
          padding: 6px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          animation: slideDownIn 0.2s ease both;
          z-index: 90;
        }

        .native-info-bar.verified {
          background-color: rgba(38, 162, 105, 0.12);
          border-bottom-color: rgba(38, 162, 105, 0.35);
        }

        .info-bar-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .icon-status {
          flex-shrink: 0;
        }

        .icon-status.warning {
          color: #eab308;
        }

        .icon-status.success {
          color: #26a269;
        }

        .info-bar-text {
          line-height: 1.4;
        }

        .info-bar-text code {
          background: rgba(0, 0, 0, 0.25);
          padding: 1px 5px;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .info-message {
          font-weight: 500;
        }

        .info-bar-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-infobar-primary {
          background: #eab308;
          color: #1c1c1c;
          font-weight: 600;
          font-size: 11.5px;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
        }

        .btn-infobar-primary:hover {
          background: #facc15;
        }

        .btn-infobar-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          font-size: 11.5px;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
        }

        .btn-infobar-secondary:hover {
          background: rgba(255, 255, 255, 0.14);
        }

        .btn-infobar-dismiss {
          background: transparent;
          color: var(--text-muted);
          padding: 3px;
          border-radius: var(--radius-sm);
        }

        .btn-infobar-dismiss:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.08);
        }

        .status-label {
          font-size: 11px;
          color: var(--text-muted);
        }

        .status-label-success {
          font-size: 11px;
          color: #26a269;
          font-weight: 500;
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
  );
};
