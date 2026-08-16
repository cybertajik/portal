import http from 'http';
import https from 'https';

export async function checkHttpHealth(url, timeoutMs = 3000) {
  if (!url) return { healthy: false, reason: 'No health URL configured' };

  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.get(url, { timeout: timeoutMs }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(rawData);
              resolve({
                healthy: json.status === 'healthy' || res.statusCode === 200,
                statusCode: res.statusCode,
                details: json,
                raw: rawData
              });
            } catch {
              resolve({
                healthy: true,
                statusCode: res.statusCode,
                details: { status: 'ok' },
                raw: rawData
              });
            }
          } else {
            resolve({
              healthy: false,
              statusCode: res.statusCode,
              reason: `HTTP Status ${res.statusCode}`
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({
          healthy: false,
          reason: err.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          healthy: false,
          reason: 'Health check timed out'
        });
      });
    } catch (err) {
      resolve({
        healthy: false,
        reason: err.message
      });
    }
  });
}
