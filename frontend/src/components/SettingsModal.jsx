import React, { useState } from 'react';
import { Settings, X, Clock, Heart, Folder, Check, Globe } from 'lucide-react';
import { updateAppSettings, sendHeartbeat } from '../services/api';

export default function SettingsModal({ app, onClose, onUpdated, onShowToast }) {
  const [timeoutMinutes, setTimeoutMinutes] = useState(
    Math.floor((app.idleTimeoutSeconds || 1800) / 60)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [heartbeatSent, setHeartbeatSent] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAppSettings(app.id, { idleTimeoutSeconds: timeoutMinutes * 60 });
      onShowToast(`Updated idle timeout for ${app.name} to ${timeoutMinutes} minutes.`, 'success');
      onUpdated();
      onClose();
    } catch (err) {
      onShowToast(`Failed to update settings: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHeartbeat = async () => {
    try {
      await sendHeartbeat(app.id);
      setHeartbeatSent(true);
      onShowToast(`Heartbeat dispatched for ${app.name}. Idle timer reset.`, 'success');
      onUpdated();
      setTimeout(() => setHeartbeatSent(false), 2500);
    } catch (err) {
      onShowToast(`Heartbeat failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>
            <Settings size={18} style={{ color: app.accentColor || '#3b82f6' }} />
            Application Settings: {app.name}
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Idle Timeout Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              <Clock size={15} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#60a5fa' }} />
              Automatic Idle Hibernation Timeout
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              The application stack will automatically sleep when inactive for this duration, saving server RAM.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[15, 30, 60, 120].map(mins => (
                <button
                  key={mins}
                  type="button"
                  className={`filter-tab ${timeoutMinutes === mins ? 'active' : ''}`}
                  onClick={() => setTimeoutMinutes(mins)}
                  style={{ textAlign: 'center', padding: '8px' }}
                >
                  {mins >= 60 ? `${mins / 60} Hour${mins > 60 ? 's' : ''}` : `${mins} Mins`}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Heartbeat */}
          <div style={{
            background: 'rgba(10, 15, 26, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Keep-Alive Activity Heartbeat
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Manually refresh session activity to postpone hibernation
              </div>
            </div>
            <button 
              className="btn btn-outline" 
              onClick={handleHeartbeat}
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              <Heart size={14} fill={heartbeatSent ? '#f43f5e' : 'none'} color={heartbeatSent ? '#f43f5e' : 'currentColor'} />
              {heartbeatSent ? 'Active' : 'Send Ping'}
            </button>
          </div>

          {/* Server Details */}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Deployment Metadata
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Host Directory:</span>
                <span>/opt/apps/{app.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Internal Port:</span>
                <span>127.0.0.1:{app.internalPort}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Health Check:</span>
                <span>{app.healthUrl || 'Enabled'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
