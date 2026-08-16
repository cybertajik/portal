import React from 'react';
import { Layers, RefreshCw, User, Shield, ShieldCheck, Lock, LogOut } from 'lucide-react';

export default function Header({ 
  serverIp, 
  onRefresh, 
  isRefreshing, 
  isAdminMode, 
  isAdminAuthenticated,
  onToggleAdminMode,
  onLogoutAdmin
}) {
  return (
    <header className="portal-header">
      <div className="brand-section">
        <div className="brand-logo-glow">
          <Layers size={26} />
        </div>
        <div className="brand-text">
          <h1>
            Application Launcher Portal
          </h1>
          <p>Select any application below to launch and test instantly</p>
        </div>
      </div>

      <div className="header-actions">
        {/* User / Admin View Toggle */}
        <div className="view-toggle-pill">
          <button 
            type="button"
            className={`view-toggle-btn ${!isAdminMode ? 'active' : ''}`}
            onClick={() => onToggleAdminMode(false)}
          >
            <User size={13} />
            User View
          </button>
          <button 
            type="button"
            className={`view-toggle-btn ${isAdminMode ? 'active' : ''}`}
            onClick={() => onToggleAdminMode(true)}
            title={isAdminAuthenticated ? 'Admin Console Active' : 'Password Protected'}
          >
            {isAdminAuthenticated ? (
              <ShieldCheck size={13} color="#34d399" />
            ) : (
              <Lock size={13} color="#f59e0b" />
            )}
            Admin Mode
          </button>
        </div>

        {/* Lock Console / Logout Button when Admin is active */}
        {isAdminMode && isAdminAuthenticated && (
          <button 
            type="button"
            className="btn btn-outline"
            onClick={onLogoutAdmin}
            title="Lock Admin Console & Return to User View"
            style={{ borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}
          >
            <Lock size={13} />
            Lock
          </button>
        )}

        {isAdminMode && (
          <button 
            className="btn btn-outline" 
            onClick={onRefresh} 
            disabled={isRefreshing}
            title="Refresh application status"
          >
            <RefreshCw size={15} className={isRefreshing ? 'spin-anim' : ''} />
            {isRefreshing ? 'Syncing...' : 'Sync'}
          </button>
        )}
      </div>
    </header>
  );
}
