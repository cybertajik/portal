import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MetricsBar from './components/MetricsBar';
import AppCard from './components/AppCard';
import StartupModal from './components/StartupModal';
import StopConfirmModal from './components/StopConfirmModal';
import LogModal from './components/LogModal';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';
import { 
  fetchApplications, 
  fetchMetrics, 
  startApplication, 
  stopApplication, 
  restartApplication, 
  subscribeAppEvents 
} from './services/api';
import { Search, Layers } from 'lucide-react';

export default function App() {
  const [applications, setApplications] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [serverIp, setServerIp] = useState('159.195.113.105');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false); // Default to clean User View
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [startupModalApp, setStartupModalApp] = useState(null);
  const [startupProgress, setStartupProgress] = useState(null);
  const [stopConfirmApp, setStopConfirmApp] = useState(null);
  const [logModalApp, setLogModalApp] = useState(null);
  const [settingsModalApp, setSettingsModalApp] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Load Data
  const loadData = useCallback(async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const [appsData, metricsData] = await Promise.all([
        fetchApplications(),
        fetchMetrics()
      ]);
      setApplications(appsData.applications || []);
      if (appsData.serverIp) setServerIp(appsData.serverIp);
      setMetrics(metricsData);
      if (showToast) addToast('Portal telemetry synchronized.', 'success');
    } catch (err) {
      console.error('Error loading data:', err);
      if (showToast) addToast(`Sync error: ${err.message}`, 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Subscribe to SSE events for all apps
  useEffect(() => {
    if (!applications || applications.length === 0) return;

    const unsubs = applications.map(app => {
      return subscribeAppEvents(app.id, (event) => {
        if (event.type === 'STAGE_PROGRESS') {
          setStartupProgress({
            stageIndex: event.stageIndex,
            totalStages: event.totalStages,
            stageKey: event.stageKey,
            stageName: event.stageName,
            status: event.status
          });
        }

        if (event.type === 'STARTUP_COMPLETE') {
          setStartupProgress(prev => ({ ...prev, isComplete: true }));
          addToast(event.message || `${app.name} is ready!`, 'success');
          loadData(false);
        }

        if (event.type === 'STATE_CHANGE') {
          addToast(event.message, event.state === 'HIBERNATED' ? 'info' : 'success');
          loadData(false);
        }

        if (event.type === 'AUTO_HIBERNATION') {
          addToast(event.message, 'warning');
          loadData(false);
        }
      });
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [applications.map(a => a.id).join(',')]);

  // Actions
  const handleStart = async (app) => {
    try {
      setStartupProgress({ stageIndex: 0, status: 'in_progress' });
      setStartupModalApp(app);
      await startApplication(app.id);
      addToast(`Starting ${app.name}...`, 'info');
      loadData(false);
    } catch (err) {
      addToast(`Start failed: ${err.message}`, 'error');
    }
  };

  const handleStopRequest = (app) => {
    setStopConfirmApp(app);
  };

  const handleStopConfirm = async (app, force) => {
    setStopConfirmApp(null);
    try {
      addToast(`Stopping ${app.name}...`, 'info');
      await stopApplication(app.id, force);
      addToast(`${app.name} hibernated.`, 'success');
      loadData(false);
    } catch (err) {
      if (err.isSafetyViolation) {
        addToast(`Hibernation blocked: ${err.message}`, 'warning');
      } else {
        addToast(`Stop failed: ${err.message}`, 'error');
      }
    }
  };

  const handleRestart = async (app) => {
    try {
      setStartupProgress({ stageIndex: 0, status: 'in_progress' });
      setStartupModalApp(app);
      await restartApplication(app.id);
      addToast(`Restarting ${app.name}...`, 'info');
      loadData(false);
    } catch (err) {
      addToast(`Restart failed: ${err.message}`, 'error');
    }
  };

  // Filtered applications
  const filteredApps = applications.filter(app => {
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = app.name.toLowerCase().includes(q);
      const matchDesc = app.description.toLowerCase().includes(q);
      const matchCat = (app.category || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat) return false;
    }

    // Category / State filter
    if (activeFilter === 'all') return true;
    if (activeFilter === 'healthy') return app.state === 'HEALTHY' || app.state === 'RUNNING';
    if (activeFilter === 'hibernated') return app.state === 'HIBERNATED';
    if (activeFilter === 'operations') return app.category?.toLowerCase().includes('operations') || app.category?.toLowerCase().includes('scheduling');
    if (activeFilter === 'education') return app.category?.toLowerCase().includes('education') || app.category?.toLowerCase().includes('training');
    if (activeFilter === 'finance') return app.category?.toLowerCase().includes('finance');

    return true;
  });

  return (
    <div className="portal-container">
      {/* Header with User / Admin Mode Toggle */}
      <Header 
        serverIp={serverIp} 
        onRefresh={() => loadData(true)} 
        isRefreshing={isRefreshing}
        isAdminMode={isAdminMode}
        onToggleAdminMode={setIsAdminMode}
      />

      {/* System Telemetry Bar (Shown in Admin Mode) */}
      {isAdminMode && <MetricsBar metrics={metrics} />}

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Applications ({applications.length})
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'healthy' ? 'active' : ''}`}
            onClick={() => setActiveFilter('healthy')}
          >
            ● Ready ({applications.filter(a => a.state === 'HEALTHY' || a.state === 'RUNNING').length})
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'hibernated' ? 'active' : ''}`}
            onClick={() => setActiveFilter('hibernated')}
          >
            ○ Sleeping ({applications.filter(a => a.state === 'HIBERNATED').length})
          </button>
        </div>

        <div className="filter-search">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search applications..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Applications Grid */}
      {filteredApps.length > 0 ? (
        <div className="apps-grid">
          {filteredApps.map(app => (
            <AppCard 
              key={app.id}
              app={app}
              isAdminMode={isAdminMode}
              onStart={handleStart}
              onStop={handleStopRequest}
              onRestart={handleRestart}
              onViewLogs={(a) => setLogModalApp(a)}
              onOpenSettings={(a) => setSettingsModalApp(a)}
              onOpenStartupModal={(a) => setStartupModalApp(a)}
            />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-subtle)'
        }}>
          <Layers size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>No applications found</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Try adjusting your search query.
          </p>
        </div>
      )}

      {/* Modals */}
      {startupModalApp && (
        <StartupModal 
          app={startupModalApp}
          startupProgress={startupProgress}
          onClose={() => setStartupModalApp(null)}
          onLaunch={() => setStartupModalApp(null)}
        />
      )}

      {stopConfirmApp && (
        <StopConfirmModal 
          app={stopConfirmApp}
          onClose={() => setStopConfirmApp(null)}
          onConfirm={handleStopConfirm}
        />
      )}

      {logModalApp && (
        <LogModal 
          app={logModalApp}
          onClose={() => setLogModalApp(null)}
        />
      )}

      {settingsModalApp && (
        <SettingsModal 
          app={settingsModalApp}
          onClose={() => setSettingsModalApp(null)}
          onUpdated={() => loadData(false)}
          onShowToast={addToast}
        />
      )}

      {/* Floating Toasts */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
