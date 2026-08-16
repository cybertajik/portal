import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { sanitizeLogContent, generateSimulatedLogs } from './logger.js';

const execAsync = promisify(exec);

// In-memory state for offline/simulation mode or tracking transitions
const simulatedState = {
  scheduler: {
    state: 'HEALTHY', // Starts healthy initially for demo, can be stopped/started
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    lastActivity: new Date(Date.now() - 600000).toISOString(),
    idleSeconds: 600,
    containersRunning: 6,
    cpuPercent: 2.8,
    memoryMb: 1420,
    activeJobs: 0,
    activeUsers: 2
  },
  lms: {
    state: 'HIBERNATED',
    startedAt: null,
    lastActivity: null,
    idleSeconds: 0,
    containersRunning: 0,
    cpuPercent: 0,
    memoryMb: 0,
    activeJobs: 0,
    activeUsers: 0
  },
  accounting: {
    state: 'HIBERNATED',
    startedAt: null,
    lastActivity: null,
    idleSeconds: 0,
    containersRunning: 0,
    cpuPercent: 0,
    memoryMb: 0,
    activeJobs: 0,
    activeUsers: 0
  }
};

export async function isDockerAvailable() {
  // Check if docker socket exists or docker command runs
  if (fs.existsSync('/var/run/docker.sock')) {
    return true;
  }
  try {
    const { stdout } = await execAsync('docker --version', { timeout: 2000 });
    return stdout.includes('Docker version');
  } catch {
    return false;
  }
}

export async function getRealContainerStats(appConfig) {
  try {
    const isAvail = await isDockerAvailable();
    if (!isAvail || !fs.existsSync(appConfig.directory)) {
      return getSimulatedStatus(appConfig.id);
    }

    // Inspect real docker compose status
    const cmd = `docker compose -f ${appConfig.compose_file} ps --format json`;
    const { stdout } = await execAsync(cmd, { cwd: appConfig.directory, timeout: 5000 });
    
    if (!stdout.trim()) {
      return {
        state: 'HIBERNATED',
        containersRunning: 0,
        cpuPercent: 0,
        memoryMb: 0,
        details: []
      };
    }

    const lines = stdout.trim().split('\n').filter(Boolean);
    const containers = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const running = containers.filter(c => c.State === 'running' || c.Status?.toLowerCase().startsWith('up'));
    
    let state = 'HIBERNATED';
    if (running.length === 0) {
      state = 'HIBERNATED';
    } else if (running.length === containers.length) {
      state = 'RUNNING';
    } else {
      state = 'STARTING';
    }

    return {
      state,
      containersRunning: running.length,
      totalContainers: containers.length,
      containers: containers.map(c => ({
        name: c.Name || c.Service,
        service: c.Service,
        state: c.State,
        status: c.Status
      }))
    };
  } catch (err) {
    console.warn(`[Docker] Error querying stats for ${appConfig.id}:`, err.message);
    return getSimulatedStatus(appConfig.id);
  }
}

export function getSimulatedStatus(appId) {
  if (!simulatedState[appId]) {
    simulatedState[appId] = {
      state: 'HIBERNATED',
      startedAt: null,
      lastActivity: null,
      idleSeconds: 0,
      containersRunning: 0,
      cpuPercent: 0,
      memoryMb: 0,
      activeJobs: 0,
      activeUsers: 0
    };
  }
  return simulatedState[appId];
}

export function setSimulatedStatus(appId, updates) {
  if (!simulatedState[appId]) {
    simulatedState[appId] = {};
  }
  Object.assign(simulatedState[appId], updates);
  return simulatedState[appId];
}

export async function executeComposeCommand(appConfig, action) {
  const isAvail = await isDockerAvailable();
  if (!isAvail || !fs.existsSync(appConfig.directory)) {
    console.log(`[Docker Simulated] Executed ${action} for ${appConfig.id}`);
    return { simulated: true, success: true };
  }

  // Safe allowlist of docker compose actions
  const ALLOWED_ACTIONS = ['start', 'stop', 'restart', 'up -d'];
  if (!ALLOWED_ACTIONS.includes(action)) {
    throw new Error(`Forbidden docker compose action: ${action}`);
  }

  const cmd = `docker compose -f ${appConfig.compose_file} ${action}`;
  console.log(`[Docker] Executing: ${cmd} in ${appConfig.directory}`);
  const { stdout, stderr } = await execAsync(cmd, { cwd: appConfig.directory, timeout: 60000 });
  return { simulated: false, success: true, stdout, stderr };
}

export async function fetchContainerLogs(appConfig, serviceName, lines = 100) {
  const isAvail = await isDockerAvailable();
  if (!isAvail || !fs.existsSync(appConfig.directory)) {
    return generateSimulatedLogs(appConfig.id, serviceName, lines);
  }

  try {
    const cmd = `docker compose -f ${appConfig.compose_file} logs --tail=${lines} --no-color ${serviceName || ''}`;
    const { stdout, stderr } = await execAsync(cmd, { cwd: appConfig.directory, timeout: 10000 });
    const raw = stdout || stderr;
    return sanitizeLogContent(raw);
  } catch (err) {
    return `[Error fetching logs]: ${err.message}\n` + generateSimulatedLogs(appConfig.id, serviceName, lines);
  }
}
