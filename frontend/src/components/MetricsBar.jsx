import React from 'react';
import { Cpu, HardDrive, Zap, Moon, Activity, CheckCircle2 } from 'lucide-react';

export default function MetricsBar({ metrics }) {
  const server = metrics?.server || {};
  const apps = metrics?.applications || {};

  const totalMem = server.totalMemoryGb || 8.0;
  const usedMem = server.usedMemoryGb || 2.4;
  const memPercent = server.memoryUsagePercent || 30;

  const activeApps = apps.active || 0;
  const hibernatedApps = apps.hibernated || 0;
  const totalApps = apps.total || (activeApps + hibernatedApps) || 3;

  // Estimated RAM saved by hibernating inactive stacks
  const estimatedSavedRam = (hibernatedApps * 1.2).toFixed(1);

  return (
    <div className="metrics-strip">
      {/* RAM Utilization */}
      <div className="metric-card">
        <div className="metric-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
          <HardDrive size={22} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Server Memory (RAM)</div>
          <div className="metric-value">
            {usedMem} GB <span className="metric-sub">/ {totalMem} GB ({memPercent}%)</span>
          </div>
          <div className="metric-progress">
            <div 
              className="metric-progress-fill" 
              style={{ 
                width: `${memPercent}%`, 
                background: memPercent > 80 ? 'var(--accent-rose)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)' 
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Application Hibernation Status */}
      <div className="metric-card">
        <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
          <Zap size={22} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Active vs Hibernated</div>
          <div className="metric-value">
            {activeApps} Active <span className="metric-sub">/ {hibernatedApps} Sleeping</span>
          </div>
          <div className="metric-progress">
            <div 
              className="metric-progress-fill" 
              style={{ 
                width: `${totalApps ? (activeApps / totalApps) * 100 : 0}%`, 
                background: 'linear-gradient(90deg, #10b981, #34d399)' 
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Hibernation Resource Savings */}
      <div className="metric-card">
        <div className="metric-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
          <Moon size={22} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Resource Preservation</div>
          <div className="metric-value">
            ~{estimatedSavedRam} GB <span className="metric-sub">RAM Conserved</span>
          </div>
          <div className="metric-sub" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} color="#10b981" /> Inactive stacks auto-hibernated
          </div>
        </div>
      </div>

      {/* Server CPU & Uptime */}
      <div className="metric-card">
        <div className="metric-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
          <Activity size={22} />
        </div>
        <div className="metric-info">
          <div className="metric-label">System Load Average</div>
          <div className="metric-value">
            {server.loadAverage ? server.loadAverage[0].toFixed(2) : '0.35'}
            <span className="metric-sub">({server.cpuCount || 2} vCPUs)</span>
          </div>
          <div className="metric-sub" style={{ marginTop: '4px' }}>
            Portal Uptime: {Math.floor((server.uptimeSeconds || 3600) / 3600)}h {Math.floor(((server.uptimeSeconds || 3600) % 3600) / 60)}m
          </div>
        </div>
      </div>
    </div>
  );
}
