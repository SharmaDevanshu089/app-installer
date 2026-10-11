import React from 'react';
import { ShieldCheck, Scale, Lock, BookOpen } from 'lucide-react';

export const LegalPage: React.FC = () => {
  return (
    <div className="legal-page view-transition">
      <div className="legal-header">
        <div>
          <h2>Legal Documents, Licenses & Standards</h2>
          <p>Official software licensing, open-source attributions, offline privacy policy, and Linux standards compliance.</p>
        </div>
      </div>

      <div className="legal-sections">
        {/* Section 1: Application License */}
        <div className="legal-card">
          <div className="card-badge-row">
            <Scale size={18} className="badge-icon" />
            <h3>Software License (MIT)</h3>
            <span className="license-pill">Open Source</span>
          </div>

          <div className="license-body">
            <p><strong>Copyright (c) 2026 App Installer Contributors</strong></p>
            <p>
              Permission is hereby granted, free of charge, to any person obtaining a copy
              of this software and associated documentation files (the &quot;Software&quot;), to deal
              in the Software without restriction, including without limitation the rights
              to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
              copies of the Software, and to permit persons to whom the Software is
              furnished to do so, subject to the following conditions:
            </p>
            <p>
              The above copyright notice and this permission notice shall be included in all
              copies or substantial portions of the Software.
            </p>
            <p>
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
              AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
              LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
              OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
              SOFTWARE.
            </p>
          </div>
        </div>

        {/* Section 2: Privacy Policy */}
        <div className="legal-card">
          <div className="card-badge-row">
            <Lock size={18} className="badge-icon" />
            <h3>Privacy Policy & Local Execution Guarantee</h3>
            <span className="license-pill green">100% Offline</span>
          </div>

          <div className="privacy-body">
            <div className="privacy-point">
              <h4>Zero Remote Telemetry & Tracking</h4>
              <p>
                App Installer does not collect, transmit, or store any personal data, usage metrics, crash dumps, or network identifiers. It operates entirely offline.
              </p>
            </div>

            <div className="privacy-point">
              <h4>Strict User-Space Storage</h4>
              <p>
                All package manifests, configuration files, and extracted application data reside strictly in your local user directory:
                <code>~/.local/opt</code>, <code>~/.local/bin</code>, <code>~/.local/share/applications</code>, and <code>~/.config/app-installer</code>.
              </p>
            </div>

            <div className="privacy-point">
              <h4>Rootless Execution Security</h4>
              <p>
                App Installer never requests root (sudo) access and does not write to system-wide directories like <code>/usr</code> or <code>/etc</code>. Your system configuration remains isolated and tamper-free.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Third-Party Open Source Attributions */}
        <div className="legal-card full-width">
          <div className="card-badge-row">
            <BookOpen size={18} className="badge-icon" />
            <h3>Third-Party Open Source Attributions</h3>
            <span className="license-pill">Dependencies</span>
          </div>

          <p className="section-desc">
            App Installer is built on top of world-class open-source software. We gratefully acknowledge the following projects:
          </p>

          <div className="dependencies-table">
            <div className="dep-row header">
              <span>Component / Crate</span>
              <span>Layer</span>
              <span>License</span>
              <span>Purpose</span>
            </div>

            <div className="dep-row">
              <span className="comp-name">Tauri Framework</span>
              <span>Core / IPC</span>
              <span className="badge-lic">Apache-2.0 / MIT</span>
              <span>Native webview integration & Rust backend</span>
            </div>

            <div className="dep-row">
              <span className="comp-name">React 19</span>
              <span>Frontend</span>
              <span className="badge-lic">MIT</span>
              <span>Component-based UI state architecture</span>
            </div>

            <div className="dep-row">
              <span className="comp-name">Vite</span>
              <span>Build Tool</span>
              <span className="badge-lic">MIT</span>
              <span>Next-generation frontend tooling</span>
            </div>

            <div className="dep-row">
              <span className="comp-name">Lucide React</span>
              <span>UI Icons</span>
              <span className="badge-lic">ISC</span>
              <span>Clean desktop interface typography & icons</span>
            </div>

            <div className="dep-row">
              <span className="comp-name">tar / flate2 / xz2</span>
              <span>Rust Archives</span>
              <span className="badge-lic">MIT / Apache-2.0</span>
              <span>Decompression of .tar, .tar.gz, and .tar.xz packages</span>
            </div>

            <div className="dep-row">
              <span className="comp-name">walkdir & dirs</span>
              <span>Rust Filesystem</span>
              <span className="badge-lic">Unlicense / MIT</span>
              <span>Directory traversal and XDG base path resolution</span>
            </div>

            <div className="dep-row">
              <span className="comp-name">serde & serde_json</span>
              <span>Serialization</span>
              <span className="badge-lic">MIT / Apache-2.0</span>
              <span>JSON configuration and manifest persistence</span>
            </div>

            <div className="dep-row">
              <span className="comp-name">sha2 & chrono</span>
              <span>Security / Time</span>
              <span className="badge-lic">MIT / Apache-2.0</span>
              <span>Cryptographic package SHA-256 verification</span>
            </div>

            <div className="dep-row">
              <span className="comp-name">WebKitGTK & GTK 3</span>
              <span>Linux System</span>
              <span className="badge-lic">LGPL-2.1+</span>
              <span>Linux graphical webview and windowing system</span>
            </div>
          </div>
        </div>

        {/* Section 4: FreeDesktop Standards Compliance */}
        <div className="legal-card full-width">
          <div className="card-badge-row">
            <ShieldCheck size={18} className="badge-icon" />
            <h3>FreeDesktop Standards Compliance</h3>
            <span className="license-pill blue">Specification</span>
          </div>

          <div className="specs-grid">
            <div className="spec-item">
              <h4>XDG Base Directory Specification</h4>
              <p>
                Conforms to standard directories: <code>$XDG_DATA_HOME</code> (<code>~/.local/share</code>), <code>$XDG_CONFIG_HOME</code> (<code>~/.config</code>), and <code>$XDG_CACHE_HOME</code> (<code>~/.cache</code>).
              </p>
            </div>

            <div className="spec-item">
              <h4>Desktop Entry Specification (v1.5)</h4>
              <p>
                Generates valid <code>.desktop</code> files matching the FreeDesktop standard, ensuring compatibility with GNOME Shell, KDE Plasma, XFCE, Cinnamon, and tiling window managers.
              </p>
            </div>

            <div className="spec-item">
              <h4>Icon Theme Specification</h4>
              <p>
                Installs raster icons into <code>~/.local/share/icons/hicolor/512x512/apps/</code> and vector icons into <code>~/.local/share/icons/hicolor/scalable/apps/</code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .legal-page {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px;
        }

        .legal-header {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .legal-header h2 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .legal-header p {
          font-size: 13px;
          color: var(--text-muted);
        }

        .legal-sections {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .legal-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .legal-card.full-width {
          grid-column: span 2;
        }

        .card-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .badge-icon {
          color: var(--accent);
        }

        .card-badge-row h3 {
          font-size: 15px;
          font-weight: 600;
          flex: 1;
        }

        .license-pill {
          font-size: 11px;
          font-weight: 600;
          background: var(--accent-light);
          color: var(--accent);
          padding: 2px 10px;
          border-radius: var(--radius-pill);
        }

        .license-pill.green {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .license-pill.blue {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .license-body {
          font-family: monospace;
          font-size: 11px;
          line-height: 1.6;
          color: var(--text-secondary);
          background: var(--bg-primary);
          padding: 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .privacy-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .privacy-point h4 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .privacy-point p {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .privacy-point code {
          background: var(--bg-primary);
          padding: 1px 5px;
          border-radius: var(--radius-sm);
          font-family: monospace;
          color: var(--accent);
        }

        .section-desc {
          font-size: 12px;
          color: var(--text-muted);
        }

        .dependencies-table {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .dep-row {
          display: grid;
          grid-template-columns: 180px 120px 140px 1fr;
          padding: 8px 14px;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 12px;
          align-items: center;
        }

        .dep-row:last-child {
          border-bottom: none;
        }

        .dep-row.header {
          background: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 11px;
          text-transform: uppercase;
        }

        .comp-name {
          font-weight: 600;
          color: var(--text-primary);
        }

        .badge-lic {
          font-family: monospace;
          font-size: 11px;
          color: var(--accent);
        }

        .specs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
        }

        .spec-item {
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 12px;
        }

        .spec-item h4 {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
          color: var(--text-primary);
        }

        .spec-item p {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .spec-item code {
          color: var(--accent);
          font-family: monospace;
        }
      `}</style>
    </div>
  );
};
