import express from 'express';
import { getConfig, saveAppConfig } from '../config.js';
import { getAppStatus, startApp, stopApp, restartApp, recordHeartbeat, addSSEClient, checkSafety } from '../services/lifecycle.js';
import { fetchContainerLogs } from '../services/docker.js';
import { checkHttpHealth } from '../services/health.js';
import { getServerMetrics } from '../services/metrics.js';

export const router = express.Router();

// List all applications
router.get('/applications', async (req, res) => {
  try {
    const cfg = getConfig();
    const results = [];
    for (const app of cfg.applications) {
      if (app.enabled !== false) {
        const status = await getAppStatus(app.id);
        if (status) results.push(status);
      }
    }
    res.json({ applications: results, serverIp: cfg.portal.server_ip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single application status
router.get('/applications/:id', async (req, res) => {
  try {
    const status = await getAppStatus(req.params.id);
    if (!status) return res.status(404).json({ error: 'Application not found' });
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real-time Health check test
router.get('/applications/:id/health', async (req, res) => {
  try {
    const cfg = getConfig();
    const app = cfg.applications.find(a => a.id === req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const status = await getAppStatus(app.id);
    if (status.state === 'HIBERNATED') {
      return res.json({ healthy: false, state: 'HIBERNATED', message: 'Application is currently hibernated' });
    }

    const health = await checkHttpHealth(app.health_url, 3000);
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Application
router.post('/applications/:id/start', async (req, res) => {
  try {
    const appId = req.params.id;
    // Async start in background with progress events
    startApp(appId).catch(err => {
      console.error(`[API] Start failed for ${appId}:`, err);
    });
    res.json({ message: 'Startup initiated', id: appId, state: 'STARTING' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stop Application
router.post('/applications/:id/stop', async (req, res) => {
  try {
    const appId = req.params.id;
    const { force } = req.body || {};
    
    try {
      const result = await stopApp(appId, { force: Boolean(force) });
      res.json({ message: 'Application hibernated successfully', app: result });
    } catch (err) {
      if (err.isSafetyViolation) {
        return res.status(409).json({
          safetyViolation: true,
          activeJobs: err.activeJobs,
          activeUsers: err.activeUsers,
          reason: err.message
        });
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restart Application
router.post('/applications/:id/restart', async (req, res) => {
  try {
    const appId = req.params.id;
    restartApp(appId).catch(err => {
      console.error(`[API] Restart failed for ${appId}:`, err);
    });
    res.json({ message: 'Restart initiated', id: appId, state: 'STARTING' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Heartbeat - reset idle timer
router.post('/applications/:id/heartbeat', (req, res) => {
  try {
    recordHeartbeat(req.params.id);
    res.json({ status: 'ok', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update app settings (e.g. idle timeout)
router.post('/applications/:id/settings', (req, res) => {
  try {
    const { idleTimeoutSeconds } = req.body;
    if (typeof idleTimeoutSeconds === 'number' && idleTimeoutSeconds >= 60) {
      const updated = saveAppConfig(req.params.id, { idle_timeout_seconds: idleTimeoutSeconds });
      return res.json({ success: true, app: updated });
    }
    res.status(400).json({ error: 'Invalid idle timeout value' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch sanitized logs
router.get('/applications/:id/logs', async (req, res) => {
  try {
    const cfg = getConfig();
    const app = cfg.applications.find(a => a.id === req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const service = req.query.service || (app.containers && app.containers[0]) || 'backend';
    const lines = parseInt(req.query.lines, 10) || 100;
    
    const logs = await fetchContainerLogs(app, service, lines);
    res.json({
      id: app.id,
      service,
      containers: app.containers || [],
      logs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Server-Sent Events (SSE) stream for real-time lifecycle & startup stages
router.get('/applications/:id/events', (req, res) => {
  const appId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial connection greeting
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', appId })}\n\n`);

  const unsubscribe = addSSEClient(appId, (payload) => {
    res.write(payload);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// Global Metrics
router.get('/metrics', (req, res) => {
  try {
    const data = getServerMetrics();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GitHub Webhook & Auto-Deploy Endpoint
router.post('/webhook/deploy', async (req, res) => {
  const secret = req.headers['x-deploy-token'] || req.query.token;
  const expectedSecret = process.env.DEPLOY_SECRET || 'portal-auto-sync';

  if (secret && secret !== expectedSecret) {
    return res.status(403).json({ error: 'Invalid deployment token' });
  }

  console.log('[Deploy] Received deployment request from GitHub / user. Triggering auto-pull...');

  // Respond immediately so webhook doesn't time out
  res.json({
    status: 'initiated',
    message: 'Auto-pull and container update triggered successfully.'
  });

  // Execute git pull & compose rebuild in background
  import('child_process').then(({ exec }) => {
    const projectRoot = process.env.PROJECT_ROOT || '/opt/apps/portal';
    const cmd = `cd ${projectRoot} && git pull origin main && docker compose up -d --build`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('[Deploy] Auto-deploy failed:', error.message);
        return;
      }
      console.log('[Deploy] Auto-deploy stdout:', stdout);
      if (stderr) console.log('[Deploy] Auto-deploy stderr:', stderr);
    });
  });
});

