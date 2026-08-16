import { getConfig } from '../config.js';
import { getAppStatus, stopApp, checkSafety, broadcastAppEvent } from './lifecycle.js';
import { getSimulatedStatus, setSimulatedStatus } from './docker.js';

let watcherInterval = null;

export function startIdleWatcher() {
  if (watcherInterval) clearInterval(watcherInterval);

  console.log('[IdleWatcher] Starting automatic idle detection loop (interval: 15s)...');
  
  watcherInterval = setInterval(async () => {
    try {
      const cfg = getConfig();
      for (const app of cfg.applications) {
        if (!app.enabled) continue;

        const sim = getSimulatedStatus(app.id);
        if (sim.state === 'HEALTHY' || sim.state === 'RUNNING') {
          // Increment or calculate idle time
          let idleSeconds = 0;
          if (sim.lastActivity) {
            idleSeconds = Math.floor((Date.now() - new Date(sim.lastActivity).getTime()) / 1000);
          } else {
            sim.lastActivity = new Date().toISOString();
          }

          setSimulatedStatus(app.id, { idleSeconds });

          const timeoutLimit = app.idle_timeout_seconds || cfg.portal.default_idle_timeout || 1800;

          // Check if idle threshold reached
          if (idleSeconds >= timeoutLimit) {
            console.log(`[IdleWatcher] App ${app.id} reached idle threshold (${idleSeconds}s >= ${timeoutLimit}s). Checking safety...`);
            const safety = await checkSafety(app.id);

            if (safety.safe) {
              console.log(`[IdleWatcher] Safety verified. Auto-hibernating ${app.name}...`);
              broadcastAppEvent(app.id, {
                type: 'AUTO_HIBERNATION',
                message: `${app.name} automatically hibernated due to ${Math.round(timeoutLimit / 60)} minutes of inactivity.`
              });
              await stopApp(app.id, { force: false });
            } else {
              console.log(`[IdleWatcher] Safety check postponed hibernation for ${app.id}: ${safety.reason}`);
            }
          }
        }
      }
    } catch (err) {
      console.error('[IdleWatcher] Error in idle cycle:', err.message);
    }
  }, 15000); // 15 seconds
}

export function stopIdleWatcher() {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
  }
}
