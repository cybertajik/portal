import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MetricsBar from './components/MetricsBar';
import AppCard from './components/AppCard';
import StartupModal from './components/StartupModal';
import StopConfirmModal from './components/StopConfirmModal';
import LogModal from './components/LogModal';
import SettingsModal from './components/SettingsModal';
import AdminAuthModal from './components/AdminAuthModal';
import Toast from './components/Toast';
import { 
  fetchApplications, 
  fetchMetrics, 
  startApplication, 
  stopApplication, 
  restartApplication, 
  subscribeAppEvents,
  verifyAdminSession,
  logoutAdmin
} from './services/api';
import { Search, Layers } from 'lucide-react';

export default function App() {
  const [applications, setApplications] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [serverIp, setServerIp] = useState('159.195.113.105');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false); // Default to clean User View
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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

  // Check existing session on mount
  useEffect(() => {
    verifyAdminSession().then(isValid => {
      if (isValid) {
        setIsAdminAuthenticated(true);
      }
    });
  }, []);

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

  // Admin Mode Toggle with Password Protection
  const handleToggleAdminMode = (wantsAdmin) => {
    if (!wantsAdmin) {
      setIsAdminMode(false);
    } else {
      if (isAdminAuthenticated) {
        setIsAdminMode(true);
      } else {
        setIsAuthModalOpen(true);
      }
    }
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    setIsAdminMode(true);
    setIsAuthModalOpen(false);
    addToast('Admin mode unlocked successfully.', 'success');
  };

  const handleLogoutAdmin = () => {
    logoutAdmin();
    setIsAdminAuthenticated(false);
    setIsAdminMode(false);
    addToast('Admin console locked. Returned to User View.', 'info');
  };

  // Actions
  const handleStart = async (appId) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
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

  const handleStopRequest = (appId) => {
    if (!isAdminAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    const app = applications.find(a => a.id === appId);
    if (app) setStopConfirmApp(app);
  };

  const handleStopConfirm = async (app, force) => {
    setStopConfirmApp(null);
    try {
      addToast(`Stopping ${app.name}...`, 'info');
      await stopApplication(app.id, force);
      addToast(`${app.name} hibernated.`, 'success');
      loadData(false);
    } catch (err) {
      if (err.isAuthError) {
        setIsAdminAuthenticated(false);
        setIsAdminMode(false);
        setIsAuthModalOpen(true);
      } else if (err.isSafetyViolation) {
        addToast(`Hibernation blocked: ${err.message}`, 'warning');
      } else {
        addToast(`Stop failed: ${err.message}`, 'error');
      }
    }
  };

  const handleRestart = async (appId) => {
    if (!isAdminAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    try {
      setStartupProgress({ stageIndex: 0, status: 'in_progress' });
      setStartupModalApp(app);
      await restartApplication(app.id);
      addToast(`Restarting ${app.name}...`, 'info');
      loadData(false);
    } catch (err) {
      if (err.isAuthError) {
        setIsAdminAuthenticated(false);
        setIsAdminMode(false);
        setIsAuthModalOpen(true);
      } else {
        addToast(`Restart failed: ${err.message}`, 'error');
      }
    }
  };

  const handleViewLogs = (appId) => {
    if (!isAdminAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    const app = applications.find(a => a.id === appId);
    if (app) setLogModalApp(app);
  };

  const handleOpenSettings = (app) => {
    if (!isAdminAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setSettingsModalApp(app);
  };

  // Filtered applications
  const filteredApps = applications.filter(app => {
    const matchesSearch = 
      app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'running') return app.state === 'HEALTHY' || app.state === 'RUNNING' || app.state === 'ONLINE';
    if (activeFilter === 'hibernated') return app.state === 'HIBERNATED';
    return true;
  });

  return (
    <div className="portal-layout">
      {/* Background Ambience */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      <div className="portal-container">
        {/* Header */}
        <Header 
          serverIp={serverIp}
          onRefresh={() => loadData(true)}
          isRefreshing={isRefreshing}
          isAdminMode={isAdminMode}
          isAdminAuthenticated={isAdminAuthenticated}
          onToggleAdminMode={handleToggleAdminMode}
          onLogoutAdmin={handleLogoutAdmin}
        />

        {/* Global Server Metrics (Admin View only) */}
        {isAdminMode && (
          <MetricsBar 
            metrics={metrics} 
            applications={applications} 
          />
        )}

        {/* Search & Filter Bar */}
        <div className="filter-search-strip">
          <div className="search-box">
            <Search size={16} />
            <input 
              type="text"
              placeholder="Search applications by name, category, or features..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            <button 
              className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Apps ({applications.length})
            </button>
            <button 
              className={`filter-pill ${activeFilter === 'running' ? 'active' : ''}`}
              onClick={() => setActiveFilter('running')}
            >
              Online ({applications.filter(a => a.state === 'HEALTHY' || a.state === 'RUNNING' || a.state === 'ONLINE').length})
            </button>
            <button 
              className={`filter-pill ${activeFilter === 'hibernated' ? 'active' : ''}`}
              onClick={() => setActiveFilter('hibernated')}
            >
              Sleeping ({applications.filter(a => a.state === 'HIBERNATED').length})
            </button>
          </div>
        </div>

        {/* Applications Grid */}
        <main className="apps-grid">
          {filteredApps.map(app => (
            <AppCard 
              key={app.id}
              app={app}
              isAdminMode={isAdminMode}
              onStart={handleStart}
              onStop={handleStopRequest}
              onRestart={handleRestart}
              onViewLogs={handleViewLogs}
              onOpenSettings={handleOpenSettings}
              onOpenStartupModal={(targetApp) => {
                setStartupModalApp(targetApp);
              }}
            />
          ))}

          {filteredApps.length === 0 && (
            <div className="empty-state">
              <Layers size={48} />
              <h3>No matching applications found</h3>
              <p>Try refining your search query or reset active filters.</p>
              <button 
                className="btn btn-outline" 
                onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Admin Password Authentication Modal */}
      <AdminAuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* Modals */}
      {startupModalApp && (
        <StartupModal 
          app={startupModalApp}
          progress={startupProgress}
          onClose={() => {
            setStartupModalApp(null);
            setStartupProgress(null);
          }}
        />
      )}

      {stopConfirmApp && (
        <StopConfirmModal 
          app={stopConfirmApp}
          onConfirm={(force) => handleStopConfirm(stopConfirmApp, force)}
          onClose={() => setStopConfirmApp(null)}
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
          onSave={() => loadData(false)}
          onClose={() => setSettingsModalApp(null)}
          onToast={addToast}
        />
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast 
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}
