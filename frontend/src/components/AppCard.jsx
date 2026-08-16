import React, { useState } from 'react';
import { 
  Calendar, 
  GraduationCap, 
  ReceiptText, 
  Box, 
  Play, 
  Square, 
  RotateCw, 
  Terminal, 
  Settings, 
  ExternalLink, 
  Clock, 
  ShieldCheck, 
  Copy,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  UserCheck,
  Info
} from 'lucide-react';

const ICON_MAP = {
  Calendar,
  GraduationCap,
  ReceiptText,
  Box
};

export default function AppCard({ 
  app, 
  isAdminMode,
  onStart, 
  onStop, 
  onRestart, 
  onViewLogs, 
  onOpenSettings,
  onOpenStartupModal 
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const IconComponent = ICON_MAP[app.icon] || Box;
  const isHealthy = app.state === 'HEALTHY';
  const isRunning = app.state === 'RUNNING';
  const isHibernated = app.state === 'HIBERNATED';
  const isStarting = app.state === 'STARTING';
  const isStopping = app.state === 'STOPPING';

  const creds = app.testCredentials;

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'user') {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else if (type === 'pass') {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  // Format memory
  const memoryFormatted = app.memoryMb >= 1024 
    ? `${(app.memoryMb / 1024).toFixed(1)} GB` 
    : `${app.memoryMb || 0} MB`;

  return (
    <div 
      className="app-card" 
      style={{ '--card-accent': app.accentColor || '#3b82f6' }}
    >
      {/* Header with App Identity & Status */}
      <div className="app-card-header">
        <div className="app-identity">
          <div 
            className="app-icon-wrap" 
            style={{ 
              background: `linear-gradient(135deg, ${app.accentColor || '#3b82f6'}, #1e293b)`,
              border: `1px solid ${app.accentColor || '#3b82f6'}44`
            }}
          >
            <IconComponent size={24} />
          </div>
          <div className="app-titles">
            <h3>{app.name}</h3>
            <div className="app-tagline">{app.tagline || app.category}</div>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isHealthy && (
            <div className="status-badge status-healthy">
              <span className="status-dot"></span>
              ONLINE
            </div>
          )}
          {isRunning && (
            <div className="status-badge status-healthy">
              <span className="status-dot"></span>
              RUNNING
            </div>
          )}
          {isHibernated && (
            <div className="status-badge status-hibernated">
              <span className="status-dot"></span>
              SLEEPING
            </div>
          )}
          {isStarting && (
            <div className="status-badge status-starting" onClick={() => onOpenStartupModal(app)} style={{ cursor: 'pointer' }}>
              <span className="status-dot"></span>
              STARTING...
            </div>
          )}
          {isStopping && (
            <div className="status-badge status-stopping">
              <span className="status-dot"></span>
              STOPPING
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="app-description">
        {app.description}
      </p>

      {/* Test Login Information Card */}
      {creds && (
        <div className="test-credentials-card">
          <div className="credentials-header">
            <div className="credentials-title">
              <KeyRound size={14} style={{ color: app.accentColor || '#60a5fa' }} />
              <span>Testing Login Credentials</span>
            </div>
            {creds.role && (
              <span className="role-tag">
                <UserCheck size={11} /> {creds.role}
              </span>
            )}
          </div>

          <div className="credentials-fields">
            {/* Username Row */}
            <div className="credential-row">
              <span className="credential-label">Username:</span>
              <div className="credential-value-wrap">
                <code className="credential-value">{creds.username}</code>
                <button 
                  type="button"
                  className="btn-copy-cred" 
                  onClick={() => copyToClipboard(creds.username, 'user')}
                  title="Copy username"
                >
                  {copiedUser ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Password Row */}
            <div className="credential-row">
              <span className="credential-label">Password:</span>
              <div className="credential-value-wrap">
                <code className="credential-value">
                  {showPassword ? creds.password : '••••••••••••'}
                </code>
                <button 
                  type="button"
                  className="btn-copy-cred" 
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button 
                  type="button"
                  className="btn-copy-cred" 
                  onClick={() => copyToClipboard(creds.password, 'pass')}
                  title="Copy password"
                >
                  {copiedPass ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>

          {creds.notes && (
            <div className="credential-notes">
              <Info size={11} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{creds.notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Admin Mode Resource Telemetry */}
      {isAdminMode && (
        <div className="app-telemetry" style={{ marginTop: '12px' }}>
          <div className="telemetry-item">
            <span className="telemetry-label">CPU Usage</span>
            <span className="telemetry-val" style={{ color: (isHealthy || isRunning) ? '#60a5fa' : 'var(--text-muted)' }}>
              {(isHealthy || isRunning) ? `${app.cpuPercent}%` : '0.0%'}
            </span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">RAM Usage</span>
            <span className="telemetry-val" style={{ color: (isHealthy || isRunning) ? '#34d399' : 'var(--text-muted)' }}>
              {(isHealthy || isRunning) ? memoryFormatted : '0 MB'}
            </span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Containers</span>
            <span className="telemetry-val">
              {(isHealthy || isRunning) ? `${app.containersRunning}/${app.totalContainers}` : `0/${app.totalContainers}`}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="app-card-actions" style={{ marginTop: 'auto', paddingTop: '16px' }}>
        {isHibernated && (
          <button 
            className="btn btn-primary" 
            onClick={() => onStart(app)}
            style={{ 
              width: '100%', 
              background: `linear-gradient(135deg, ${app.accentColor || '#3b82f6'}, #2563eb)`,
              padding: '12px 20px',
              fontSize: '0.92rem'
            }}
          >
            <Play size={16} fill="white" />
            Start & Open {app.name}
          </button>
        )}

        {(isHealthy || isRunning) && (
          <>
            <a 
              href={app.launchPath} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-success"
              style={{ flex: 1, padding: '12px 20px', fontSize: '0.92rem' }}
              title="Open application in new tab"
            >
              <ExternalLink size={16} />
              Open {app.name}
            </a>

            {isAdminMode && (
              <>
                <button 
                  className="btn btn-outline" 
                  onClick={() => onViewLogs(app)}
                  title="Inspect Logs"
                >
                  <Terminal size={15} />
                </button>

                <button 
                  className="btn btn-outline" 
                  onClick={() => onRestart(app)}
                  title="Restart"
                >
                  <RotateCw size={15} />
                </button>

                <button 
                  className="btn btn-danger" 
                  onClick={() => onStop(app)}
                  title="Hibernate"
                >
                  <Square size={14} fill="currentColor" />
                </button>
              </>
            )}
          </>
        )}

        {isStarting && (
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)', padding: '12px 20px' }}
            onClick={() => onOpenStartupModal(app)}
          >
            <RotateCw size={16} className="spin-anim" />
            Starting {app.name}... (Click to View)
          </button>
        )}

        {isStopping && (
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)', padding: '12px 20px' }}
            disabled
          >
            <RotateCw size={16} className="spin-anim" />
            Hibernating & Freeing RAM...
          </button>
        )}

        {isAdminMode && isHibernated && (
          <button 
            className="btn btn-icon" 
            onClick={() => onOpenSettings(app)}
            title="Settings"
          >
            <Settings size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
