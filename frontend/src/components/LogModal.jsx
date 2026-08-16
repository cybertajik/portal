import React, { useState, useEffect } from 'react';
import { Terminal, X, RefreshCw, Copy, Check, ShieldCheck, Search } from 'lucide-react';
import { fetchLogs } from '../services/api';

export default function LogModal({ app, onClose }) {
  const [selectedService, setSelectedService] = useState(
    (app.containers && app.containers[0]) || 'backend'
  );
  const [logContent, setLogContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const containers = app.containers || [
    'backend',
    'celery_worker',
    'celery_beat',
    'postgres',
    'redis',
    'frontend'
  ];

  const loadLogs = async (service) => {
    setIsLoading(true);
    try {
      const data = await fetchLogs(app.id, service || selectedService, 80);
      setLogContent(data.logs || 'No logs available');
    } catch (err) {
      setLogContent(`Failed to load logs: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(selectedService);
  }, [selectedService]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter logs by search term
  const filteredLogs = searchFilter
    ? logContent
        .split('\n')
        .filter(line => line.toLowerCase().includes(searchFilter.toLowerCase()))
        .join('\n')
    : logContent;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>
            <Terminal size={18} style={{ color: app.accentColor || '#3b82f6' }} />
            Container Logs: {app.name}
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '16px 24px' }}>
          {/* Security notice */}
          <div className="log-security-notice">
            <ShieldCheck size={16} />
            <span><strong>Sanitized Output:</strong> Secret keys, passwords, database URIs, and auth tokens are automatically redacted.</span>
          </div>

          {/* Service Tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '14px', paddingBottom: '4px' }}>
            {containers.map(container => (
              <button
                key={container}
                className={`filter-tab ${selectedService === container ? 'active' : ''}`}
                onClick={() => setSelectedService(container)}
                style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}
              >
                {container.replace(`${app.id}_`, '')}
              </button>
            ))}
          </div>

          {/* Search bar & actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
            <div className="filter-search" style={{ flex: 1 }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search log messages (regex / keywords)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            <button 
              className="btn btn-outline" 
              onClick={() => loadLogs(selectedService)} 
              disabled={isLoading}
              title="Refresh log output"
            >
              <RefreshCw size={14} className={isLoading ? 'spin-anim' : ''} />
              Refresh
            </button>

            <button 
              className="btn btn-outline" 
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Log terminal */}
          <div className="log-viewer-box">
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <RefreshCw size={14} className="spin-anim" /> Loading container logs...
              </div>
            ) : filteredLogs ? (
              filteredLogs
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>No log entries found for this filter.</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
