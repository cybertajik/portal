import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X, Square, AlertCircle, HardDrive } from 'lucide-react';

export default function StopConfirmModal({ app, onClose, onConfirm }) {
  const [force, setForce] = useState(false);
  const hasActiveWork = (app.activeJobs > 0) || (app.activeUsers > 0);

  const memoryFormatted = app.memoryMb >= 1024 
    ? `${(app.memoryMb / 1024).toFixed(1)} GB` 
    : `${app.memoryMb || 0} MB`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3 style={{ color: hasActiveWork ? '#fbbf24' : 'var(--text-primary)' }}>
            {hasActiveWork ? <AlertTriangle size={20} color="#fbbf24" /> : <Square size={18} color="#f43f5e" />}
            Hibernate {app.name}?
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {hasActiveWork ? (
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>
                <AlertCircle size={18} />
                Application is currently in use
              </div>
              <p style={{ fontSize: '0.82rem', color: '#fde68a' }}>
                {app.activeJobs > 0 && `• ${app.activeJobs} active Celery worker background job(s) in-flight.`}
                <br />
                {app.activeUsers > 0 && `• ${app.activeUsers} active user session(s) detected.`}
              </p>
            </div>
          ) : null}

          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
            Stopping <strong>{app.name}</strong> will cleanly stop all {app.totalContainers || 6} Docker containers and immediately free <strong>~{memoryFormatted} RAM</strong> and CPU.
          </p>

          <div style={{
            background: 'rgba(10, 15, 26, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.8rem',
            color: '#34d399'
          }}>
            <ShieldCheck size={18} color="#34d399" />
            <span>Persistent database volumes and configuration files are <strong>100% preserved</strong>.</span>
          </div>

          {hasActiveWork && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={force} 
                onChange={(e) => setForce(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              Force immediate stop (interrupt active background jobs)
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-danger" 
            onClick={() => onConfirm(app, force)}
          >
            <Square size={14} fill="currentColor" />
            {hasActiveWork && force ? 'Force Hibernate Now' : 'Confirm Hibernation'}
          </button>
        </div>
      </div>
    </div>
  );
}
