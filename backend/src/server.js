import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { router as apiRouter } from './routes/api.js';
import { startIdleWatcher, stopIdleWatcher } from './services/idleWatcher.js';
import { loadConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize config
loadConfig();

// Mount API routes
app.use('/api', apiRouter);

// Health endpoint for the Portal itself
app.get('/healthz', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'server-portal-controller',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend dist if available (in production single-container or unified build)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  console.log(`[Server] Serving static frontend build from ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Multi-App Server Portal Backend Controller`);
  console.log(`📡 Listening on: http://0.0.0.0:${PORT}`);
  console.log(`⚙️  Idle hibernation engine active`);
  console.log(`====================================================`);
  startIdleWatcher();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, stopping idle watcher and shutting down...');
  stopIdleWatcher();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, stopping idle watcher...');
  stopIdleWatcher();
  server.close(() => {
    process.exit(0);
  });
});
