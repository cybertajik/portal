import express from 'express';
import { getConfig, saveAppConfig } from '../config.js';
import { getAppStatus, startApp, stopApp, restartApp, recordHeartbeat, addSSEClient, checkSafety } from '../services/lifecycle.js';
import { fetchContainerLogs } from '../services/docker.js';
import { checkHttpHealth } from '../services/health.js';
import { getServerMetrics } from '../services/metrics.js';
import { verifyAdminPassword, generateAdminToken, verifyAdminToken, requireAdminAuth } from '../services/auth.js';

export const router = express.Router();

// ==========================================
// Admin Authentication Routes
// ==========================================

/**
 * Admin Login Endpoint
 */
router.post('/auth/admin-login', (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const isValid = verifyAdminPassword(password);
    if (!isValid) {
      // Delay response slightly to mitigate brute-force attempts
      return setTimeout(() => {
        res.status(401).json({ error: 'Invalid administrator password. Access denied.' });
      }, 400);
    }

    const token = generateAdminToken();
    res.json({
      success: true,
      token,
      message: 'Admin access granted'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Verify Admin Session Token
 */
router.get('/auth/verify-admin', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ valid: false });
    }
    const token = authHeader.slice(7).trim();
    const isValid = verifyAdminToken(token);
    res.json({ valid: isValid });
  } catch (err) {
    res.json({ valid: false });
  }
});

/**
 * Admin Logout
 */
router.post('/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==========================================
// Public Application Routes (User View)
// ==========================================

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

// Start Application (Public on-demand launcher)
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

// Heartbeat - reset idle timer
router.post('/applications/:id/heartbeat', (req, res) => {
  try {
    recordHeartbeat(req.params.id);
    res.json({ status: 'ok', id: req.params.id });
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

// ==========================================
// Protected Admin-Only Routes
// ==========================================

// Stop / Hibernate Application (Requires Admin)
router.post('/applications/:id/stop', requireAdminAuth, async (req, res) => {
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

// Restart Application (Requires Admin)
router.post('/applications/:id/restart', requireAdminAuth, async (req, res) => {
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

// Update app settings (e.g. idle timeout) (Requires Admin)
router.post('/applications/:id/settings', requireAdminAuth, (req, res) => {
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

// Fetch sanitized logs (Requires Admin)
router.get('/applications/:id/logs', requireAdminAuth, async (req, res) => {
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

// GitHub Webhook for automated deployment
router.post('/webhook/deploy', (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    console.log('[Webhook] Received deployment webhook notification');
    
    import('child_process').then(({ exec }) => {
      exec('/opt/apps/portal/auto_sync.sh', (err, stdout, stderr) => {
        if (err) console.error('[Webhook] Deploy execution error:', err);
        else console.log('[Webhook] Deploy output:', stdout);
      });
    });

    res.json({ status: 'deployment_triggered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
