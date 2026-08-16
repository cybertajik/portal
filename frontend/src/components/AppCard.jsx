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
  Info,
  ChevronRight
} from 'lucide-react';

const ICON_MAP = {
  Calendar,
  GraduationCap,
  ReceiptText,
  Box
};

// Single credential account block
function CredentialBlock({ account, accentColor }) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

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

  return (
    <div className="account-cred-block">
      {/* Role badge */}
      <div className="account-role-header">
        <span className="role-tag" style={{ borderColor: `${accentColor || '#60a5fa'}44`, color: accentColor || '#93c5fd' }}>
          <UserCheck size={11} /> {account.role}
        </span>
        {account.badge && (
          <span className="account-badge-sub">{account.badge}</span>
        )}
      </div>

      <div className="credentials-fields">
        {/* Username Row */}
        <div className="credential-row">
          <span className="credential-label">Login:</span>
          <div className="credential-value-wrap">
            <code className="credential-value">{account.username}</code>
            <button 
              type="button"
              className="btn-copy-cred" 
              onClick={() => copyToClipboard(account.username, 'user')}
              title="Copy login email"
            >
              {copiedUser ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Password Row */}
        <div className="credential-row">
          <span className="credential-label">Pass:</span>
          <div className="credential-value-wrap">
            <code className="credential-value">
              {showPassword ? account.password : '••••••••••••'}
            </code>
            <div style={{ display: 'flex', gap: '4px' }}>
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
                onClick={() => copyToClipboard(account.password, 'pass')}
                title="Copy password"
              >
                {copiedPass ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {account.notes && (
        <div className="credential-notes">
          <Info size={11} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{account.notes}</span>
        </div>
      )}
    </div>
  );
}

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
  const [activeAccountTab, setActiveAccountTab] = useState(0);

  const IconComponent = ICON_MAP[app.icon] || Box;
  const isHealthy = app.state === 'HEALTHY';
  const isRunning = app.state === 'RUNNING';
  const isHibernated = app.state === 'HIBERNATED';
  const isStarting = app.state === 'STARTING';
  const isStopping = app.state === 'STOPPING';

  const creds = app.testCredentials;
  const accounts = creds ? (creds.accounts || [creds]) : [];

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
      {accounts.length > 0 && (
        <div className="test-credentials-card">
          <div className="credentials-header">
            <div className="credentials-title">
              <KeyRound size={14} style={{ color: app.accentColor || '#60a5fa' }} />
              <span>Testing Login Credentials</span>
            </div>
            {accounts.length > 1 && (
              <div className="account-tabs">
                {accounts.map((acc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`account-tab-btn ${activeAccountTab === idx ? 'active' : ''}`}
                    onClick={() => setActiveAccountTab(idx)}
                    style={{
                      borderColor: activeAccountTab === idx ? (app.accentColor || '#60a5fa') : 'transparent'
                    }}
                  >
                    {acc.role.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Render Active Account */}
          {accounts.length > 1 ? (
            <CredentialBlock 
              account={accounts[activeAccountTab] || accounts[0]} 
              accentColor={app.accentColor} 
            />
          ) : (
            <CredentialBlock 
              account={accounts[0]} 
              accentColor={app.accentColor} 
            />
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
          <div className="telemetry-item">
            <span className="telemetry-label">Idle In</span>
            <span className="telemetry-val" style={{ color: '#fbbf24' }}>
              {(isHealthy || isRunning) ? `${Math.max(0, Math.floor((app.idleTimeoutSeconds - (app.idleSeconds || 0)) / 60))}m` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="app-card-footer">
        {/* Main Launcher Button */}
        <div className="primary-action-wrap">
          {(isHealthy || isRunning) ? (
            <a 
              href={app.launchPath || `http://159.195.113.105:${app.internalPort}`}
              target="_blank" 
              rel="noreferrer"
              className="btn btn-primary"
            >
              <ExternalLink size={16} />
              Open {app.name}
            </a>
          ) : isStarting ? (
            <button 
              className="btn btn-primary" 
              onClick={() => onOpenStartupModal(app)}
              style={{ opacity: 0.8 }}
            >
              <RotateCw size={16} className="spin" />
              Starting Application...
            </button>
          ) : isStopping ? (
            <button className="btn btn-outline" disabled>
              <RotateCw size={16} className="spin" />
              Stopping Services...
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={() => onStart(app.id)}
            >
              <Play size={16} />
              Start & Open App
            </button>
          )}
        </div>

        {/* Admin Controls */}
        {isAdminMode && (
          <div className="admin-actions">
            {(isHealthy || isRunning) && (
              <>
                <button 
                  className="btn-icon" 
                  onClick={() => onStop(app.id)}
                  title="Hibernate Application"
                >
                  <Square size={15} color="#fb7185" />
                </button>
                <button 
                  className="btn-icon" 
                  onClick={() => onRestart(app.id)}
                  title="Restart Containers"
                >
                  <RotateCw size={15} />
                </button>
              </>
            )}
            
            <button 
              className="btn-icon" 
              onClick={() => onViewLogs(app.id)}
              title="View Container Logs"
            >
              <Terminal size={15} />
            </button>
            <button 
              className="btn-icon" 
              onClick={() => onOpenSettings(app)}
              title="Application Settings"
            >
              <Settings size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
