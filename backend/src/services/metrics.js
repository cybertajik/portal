import os from 'os';
import { getConfig } from '../config.js';
import { getSimulatedStatus } from './docker.js';

export function getServerMetrics() {
  const cfg = getConfig();
  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const usedMemBytes = totalMemBytes - freeMemBytes;

  const totalMemGb = +(totalMemBytes / (1024 * 1024 * 1024)).toFixed(1);
  const usedMemGb = +(usedMemBytes / (1024 * 1024 * 1024)).toFixed(1);
  const memUsagePercent = Math.round((usedMemBytes / totalMemBytes) * 100);

  const cpus = os.cpus();
  const cpuCount = cpus.length || 2;
  const loadAvg = os.loadavg ? os.loadavg() : [0.35, 0.42, 0.38];

  // Aggregate application status
  let totalApps = 0;
  let activeApps = 0;
  let hibernatedApps = 0;
  let totalAppRamMb = 0;
  let totalAppCpu = 0;

  for (const app of cfg.applications) {
    if (!app.enabled) continue;
    totalApps++;
    const sim = getSimulatedStatus(app.id);
    if (sim.state === 'HEALTHY' || sim.state === 'RUNNING') {
      activeApps++;
      totalAppRamMb += sim.memoryMb || 0;
      totalAppCpu += sim.cpuPercent || 0;
    } else {
      hibernatedApps++;
    }
  }

  return {
    server: {
      ip: cfg.portal.server_ip || '159.195.113.105',
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptimeSeconds: Math.floor(os.uptime()),
      cpuCount,
      loadAverage: loadAvg,
      totalMemoryGb: totalMemGb || 8.0,
      usedMemoryGb: usedMemGb || 2.4,
      memoryUsagePercent: memUsagePercent || 30
    },
    applications: {
      total: totalApps,
      active: activeApps,
      hibernated: hibernatedApps,
      allocatedRamMb: totalAppRamMb,
      allocatedCpuPercent: +totalAppCpu.toFixed(1)
    }
  };
}
