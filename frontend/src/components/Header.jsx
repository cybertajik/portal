import React from 'react';
import { Layers, RefreshCw, User, Shield, ShieldCheck } from 'lucide-react';

export default function Header({ 
  serverIp, 
  onRefresh, 
  isRefreshing, 
  isAdminMode, 
  onToggleAdminMode 
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
          >
            <Shield size={13} />
            Admin Mode
          </button>
        </div>

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
