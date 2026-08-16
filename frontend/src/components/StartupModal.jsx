import React from 'react';
import { 
  X, 
  CheckCircle2, 
  RotateCw, 
  Circle, 
  ExternalLink, 
  Server, 
  Database, 
  Zap, 
  Code, 
  Cog, 
  Globe, 
  Activity 
} from 'lucide-react';

const STAGE_ICON_MAP = {
  postgres: Database,
  database: Database,
  redis: Zap,
  backend: Code,
  celery_worker: Cog,
  celery_beat: Activity,
  frontend: Globe,
  health_check: CheckCircle2
};

export default function StartupModal({ 
  app, 
  startupProgress, 
  onClose, 
  onLaunch 
}) {
  if (!app) return null;

  const stages = app.startupStages || [
    { key: 'database', name: 'Database Service', description: 'Mounting data store' },
    { key: 'redis', name: 'Redis Cache', description: 'Starting message broker' },
    { key: 'backend', name: 'Backend API Service', description: 'Booting application API' },
    { key: 'celery_worker', name: 'Background Workers', description: 'Initializing task workers' },
    { key: 'frontend', name: 'Web Frontend', description: 'Serving client UI' },
    { key: 'health_check', name: 'Application Health Verification', description: 'Validating /api/v1/health' }
  ];

  // Include health check as the final stage
  const allStages = [
    ...stages,
    {
      key: 'health_check',
      name: 'Application Health Verification',
      description: `Probing ${app.healthUrl || 'health endpoint'} for valid status`
    }
  ];

  const currentStageIndex = startupProgress?.stageIndex ?? 0;
  const isComplete = app.state === 'HEALTHY' || startupProgress?.isComplete;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>
            <RotateCw size={20} className={!isComplete ? 'spin-anim' : ''} style={{ color: app.accentColor || '#3b82f6' }} />
            Starting {app.name}
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div style={{ marginBottom: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Orchestrating multi-container stack and performing sequential dependency checks:
          </div>

          {/* Stepper Checklist */}
          <div className="startup-stepper">
            {allStages.map((stage, idx) => {
              const Icon = STAGE_ICON_MAP[stage.key] || Server;
              
              let status = 'pending';
              if (isComplete || idx < currentStageIndex) {
                status = 'completed';
              } else if (idx === currentStageIndex) {
                status = startupProgress?.status === 'completed' ? 'completed' : 'in_progress';
              }

              return (
                <div key={stage.key || idx} className={`stepper-item ${status}`}>
                  <div className="stepper-icon-box">
                    {status === 'completed' && <CheckCircle2 size={18} />}
                    {status === 'in_progress' && <RotateCw size={16} className="spin-anim" />}
                    {status === 'pending' && <Circle size={14} />}
                  </div>

                  <div className="stepper-text">
                    <div className="stepper-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={14} style={{ color: status === 'completed' ? '#34d399' : 'var(--text-muted)' }} />
                      {stage.name}
                    </div>
                    <div className="stepper-desc">{stage.description}</div>
                  </div>

                  {status === 'completed' && (
                    <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      VERIFIED ✓
                    </span>
                  )}
                  {status === 'in_progress' && (
                    <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      BOOTING...
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Completion Banner */}
          {isComplete && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginTop: '10px'
            }}>
              <div>
                <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem' }}>
                  {app.name} is Healthy & Ready
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  All sub-services initialized and endpoint responding normally.
                </div>
              </div>
              <a 
                href={app.launchPath} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-success"
                onClick={onLaunch}
              >
                <ExternalLink size={15} />
                Open Application
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            {isComplete ? 'Done' : 'Run in Background'}
          </button>
          {isComplete && (
            <a 
              href={app.launchPath} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-primary"
              onClick={onLaunch}
            >
              <ExternalLink size={16} />
              Launch {app.name}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
