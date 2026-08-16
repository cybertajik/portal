import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Possible paths for apps.yaml
const CONFIG_PATHS = [
  process.env.APPS_CONFIG_PATH,
  path.resolve(__dirname, '../../config/apps.yaml'),
  path.resolve(__dirname, '../config/apps.yaml'),
  '/opt/apps/portal/config/apps.yaml',
  '/opt/apps/config/apps.yaml'
].filter(Boolean);

let cachedConfig = null;

export function loadConfig() {
  for (const configPath of CONFIG_PATHS) {
    if (fs.existsSync(configPath)) {
      try {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        const parsed = YAML.parse(fileContent);
        cachedConfig = parsed;
        console.log(`[Config] Loaded application registry from ${configPath}`);
        return parsed;
      } catch (err) {
        console.error(`[Config] Error parsing config file at ${configPath}:`, err);
      }
    }
  }

  console.warn('[Config] No apps.yaml found on disk, using fallback in-memory registry');
  return {
    portal: {
      version: '1.0.0',
      server_ip: '159.195.113.105',
      default_idle_timeout: 1800,
      check_interval_seconds: 30
    },
    applications: []
  };
}

export function getConfig() {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

export function saveAppConfig(appId, updates) {
  const cfg = getConfig();
  const app = cfg.applications.find(a => a.id === appId);
  if (app) {
    Object.assign(app, updates);
    // Write back to config file if available
    for (const configPath of CONFIG_PATHS) {
      if (fs.existsSync(configPath)) {
        try {
          fs.writeFileSync(configPath, YAML.stringify(cfg), 'utf8');
          console.log(`[Config] Updated app ${appId} in ${configPath}`);
          break;
        } catch (err) {
          console.error(`[Config] Failed to save config to ${configPath}:`, err);
        }
      }
    }
    return app;
  }
  return null;
}
