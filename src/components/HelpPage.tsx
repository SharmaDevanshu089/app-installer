import { 
  Package, 
  Terminal, 
  Trash2, 
  Wrench, 
  Layers
} from 'lucide-react';

export const HelpPage: React.FC = () => {
  return (
    <div className="help-page view-transition">
      <div className="help-header">
        <div>
          <h2>Operations Guide & User Manual</h2>
          <p>Learn how App Installer manages portable Linux packages, terminal $PATH integration, and clean uninstallation.</p>
        </div>
      </div>

      <div className="help-grid">
        {/* Guide 1: Installing AppImages */}
        <div className="help-card">
          <div className="card-top-icon">
            <Package size={20} className="icon-main" />
            <h3>Installing .AppImage Packages</h3>
          </div>

          <div className="guide-steps">
            <div className="step-item">
              <span className="step-badge">1</span>
              <div>
                <h4>Choose or Drop the File</h4>
                <p>Click &quot;Install Package&quot; or drop any <code>.AppImage</code> file into the app window.</p>
              </div>
            </div>

            <div className="step-item">
              <span className="step-badge">2</span>
              <div>
                <h4>Pre-Installation Inspection</h4>
                <p>App Installer extracts the embedded application icon and FreeDesktop <code>.desktop</code> metadata so you can preview and customize them.</p>
              </div>
            </div>

            <div className="step-item">
              <span className="step-badge">3</span>
              <div>
                <h4>Automated Deployment</h4>
                <p>The AppImage is copied to <code>~/.local/opt/&lt;alias&gt;/</code> with <code>chmod 0755</code>, a desktop shortcut is registered, and a symlink is added to <code>~/.local/bin</code>.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guide 2: Installing Tar Archives */}
        <div className="help-card">
          <div className="card-top-icon">
            <Layers size={20} className="icon-main" />
            <h3>Installing .tar.gz & .tar.xz Archives</h3>
          </div>

          <div className="guide-steps">
            <div className="step-item">
              <span className="step-badge">1</span>
              <div>
                <h4>Safe Sandboxed Unpacking</h4>
                <p>Archives are safely extracted into a temporary cache staging directory with Zip-Slip protection.</p>
              </div>
            </div>

            <div className="step-item">
              <span className="step-badge">2</span>
              <div>
                <h4>Executable Discovery & Selection</h4>
                <p>The inspector scans for ELF binaries and launcher scripts. If multiple executables are found, choose your preferred launcher in the dropdown.</p>
              </div>
            </div>

            <div className="step-item">
              <span className="step-badge">3</span>
              <div>
                <h4>Isolated Placement</h4>
                <p>The complete application tree is placed in <code>~/.local/opt/&lt;alias&gt;/</code>, keeping your system root clutter-free.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guide 3: Understanding PATH */}
        <div className="help-card">
          <div className="card-top-icon">
            <Terminal size={20} className="icon-main" />
            <h3>Terminal $PATH Integration</h3>
          </div>

          <div className="card-body-text">
            <p>
              Whenever you specify a <strong>Command Alias</strong> (e.g. <code>blender</code> or <code>godot</code>), a symlink is created in:
            </p>
            <code>~/.local/bin/&lt;alias&gt; → ~/.local/opt/&lt;app&gt;/&lt;binary&gt;</code>
            <p>
              To run these commands from any terminal, ensure <code>~/.local/bin</code> is in your <code>$PATH</code>:
            </p>
            <div className="code-snippet-box">
              <span># For Bash (~/.bashrc) / Zsh (~/.zshrc)</span>
              <code>export PATH=&quot;$HOME/.local/bin:$PATH&quot;</code>
            </div>
            <p>You can also use the <strong>Auto-Add to Shell</strong> button in the Settings page.</p>
          </div>
        </div>

        {/* Guide 4: Clean Uninstallation */}
        <div className="help-card">
          <div className="card-top-icon">
            <Trash2 size={20} className="icon-main" />
            <h3>Clean Uninstallation vs Purge</h3>
          </div>

          <div className="card-body-text">
            <div className="compare-item">
              <h4>Standard Clean Uninstall</h4>
              <p>
                Removes all files recorded in the manifest: the application folder in <code>~/.local/opt</code>, the symlink in <code>~/.local/bin</code>, the <code>.desktop</code> launcher, and the icons.
              </p>
            </div>

            <div className="compare-item">
              <h4>Purge User Configuration</h4>
              <p>
                Also checks and cleans user configuration folders created by the app in <code>~/.config/&lt;app-id&gt;</code> and <code>~/.local/share/&lt;app-id&gt;</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Guide 5: Troubleshooting */}
        <div className="help-card full-span">
          <div className="card-top-icon">
            <Wrench size={20} className="icon-main" />
            <h3>Linux Desktop Troubleshooting & FAQs</h3>
          </div>

          <div className="faq-grid">
            <div className="faq-item">
              <h4>Desktop icon does not appear in GNOME/KDE launcher?</h4>
              <p>
                Run <code>update-desktop-database ~/.local/share/applications</code> in terminal or enable &quot;Auto-Refresh Desktop Database&quot; in Settings. In GNOME, press <code>Alt+F2</code> then <code>r</code> to reload GNOME Shell on X11.
              </p>
            </div>

            <div className="faq-item">
              <h4>AppImage gives &quot;Cannot mount AppImage, please check FUSE&quot;?</h4>
              <p>
                Install <code>libfuse2</code> on your distribution (e.g. <code>sudo apt install libfuse2</code> on Ubuntu 24.04). App Installer automatically extracts metadata so it never fails during installation.
              </p>
            </div>

            <div className="faq-item">
              <h4>How do I inspect exactly what files were installed?</h4>
              <p>
                Click the <strong>Audit</strong> button on any application card in the library to open the System Changes &amp; Manifest Audit drawer. It displays every single installed file, symlink, and timestamp.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .help-page {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px;
        }

        .help-header {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .help-header h2 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .help-header p {
          font-size: 13px;
          color: var(--text-muted);
        }

        .help-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .help-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .help-card.full-span {
          grid-column: span 2;
        }

        .card-top-icon {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .icon-main {
          color: var(--accent);
        }

        .card-top-icon h3 {
          font-size: 15px;
          font-weight: 600;
        }

        .guide-steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .step-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--accent-light);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .step-item h4 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .step-item p {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .step-item code {
          background: var(--bg-primary);
          padding: 1px 4px;
          border-radius: 3px;
          font-family: monospace;
          color: var(--accent);
        }

        .card-body-text {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .card-body-text code {
          background: var(--bg-primary);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          font-family: monospace;
          color: var(--accent);
          display: block;
        }

        .code-snippet-box {
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .code-snippet-box span {
          font-size: 11px;
          color: var(--text-muted);
        }

        .code-snippet-box code {
          padding: 0;
          background: transparent;
        }

        .compare-item {
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 14px;
        }

        .compare-item h4 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .compare-item p {
          font-size: 11px;
          color: var(--text-muted);
        }

        .faq-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
        }

        .faq-item {
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .faq-item h4 {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .faq-item p {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .faq-item code {
          color: var(--accent);
          font-family: monospace;
        }
      `}</style>
    </div>
  );
};
