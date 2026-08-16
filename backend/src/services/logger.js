// Sanitizes raw container logs before returning to frontend

const SENSITIVE_PATTERNS = [
  // Passwords and secrets
  /((?:PASSWORD|SECRET|KEY|TOKEN|AUTH|API_KEY|PRIVATE_KEY)[\w\-\s]*[:=]\s*)(['"][^'"]+['"]|[^\s,]+)/gi,
  // Connection strings with credentials
  /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi,
  /(redis:\/\/[^:]*:)([^@]+)(@)/gi,
  /(amqp:\/\/[^:]+:)([^@]+)(@)/gi,
  // JWT tokens
  /(Bearer\s+)(eyJ[\w\-]+?\.[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+)/gi,
  // Common key formats
  /(sk-[a-zA-Z0-9]{20,})/gi
];

export function sanitizeLogContent(rawText) {
  if (!rawText) return '';
  let sanitized = rawText;

  // Replace passwords / env assignments
  sanitized = sanitized.replace(/((?:POSTGRES_PASSWORD|SECRET_KEY|REDIS_PASSWORD|API_KEY|JWT_SECRET|PASSWORD|SECRET|TOKEN)\s*=\s*)([^\r\n]+)/gi, '$1[REDACTED_SECRET]');
  
  // Replace database URI credentials
  sanitized = sanitized.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1[REDACTED_PASS]$3');
  sanitized = sanitized.replace(/(redis:\/\/[^:]*:)([^@]+)(@)/gi, '$1[REDACTED_PASS]$3');

  // Replace Bearer tokens
  sanitized = sanitized.replace(/(Bearer\s+)[A-Za-z0-9\-_.]+/gi, '$1[REDACTED_TOKEN]');

  return sanitized;
}

export function generateSimulatedLogs(appId, service, lines = 50) {
  const timestamp = () => new Date(Date.now() - Math.floor(Math.random() * 60000)).toISOString();
  
  if (service === 'scheduler_backend' || service === 'backend') {
    return [
      `[${timestamp()}] [INFO] [uvicorn.access] 127.0.0.1:41202 - "GET /api/v1/health HTTP/1.1" 200 OK`,
      `[${timestamp()}] [INFO] [app.core.database] PostgreSQL pool healthy: 4 active connections, 10 pool size`,
      `[${timestamp()}] [INFO] [app.core.redis] Redis ping roundtrip: 0.8ms`,
      `[${timestamp()}] [INFO] [app.api.v1.endpoints.auth] Token validation completed for user: admin_staff`,
      `[${timestamp()}] [INFO] [app.services.scheduler] Shift optimization solver initialized [threads=4, solver=CBC]`,
      `[${timestamp()}] [INFO] [app.services.scheduler] Processed 142 shifts for week 34 without constraint violations`,
      `[${timestamp()}] [INFO] [uvicorn.access] 127.0.0.1:41240 - "GET /api/v1/shifts?start=2026-08-16 HTTP/1.1" 200 OK`,
      `[${timestamp()}] [DEBUG] [app.core.security] JWT verified [client_ip=159.195.113.105, algorithm=HS256]`,
      `[${timestamp()}] [INFO] [uvicorn.access] 127.0.0.1:41258 - "GET /api/v1/health HTTP/1.1" 200 OK`
    ].join('\n');
  }

  if (service === 'scheduler_celery_worker' || service === 'celery_worker') {
    return [
      `[${timestamp()}] [INFO/MainProcess] Connected to redis://scheduler_redis:6379/0`,
      `[${timestamp()}] [INFO/MainProcess] celery@scheduler_worker ready.`,
      `[${timestamp()}] [INFO/ForkPoolWorker-1] Task app.tasks.generate_weekly_schedule[3b92c] received`,
      `[${timestamp()}] [INFO/ForkPoolWorker-1] Running constraint model solver for 28 employees...`,
      `[${timestamp()}] [INFO/ForkPoolWorker-1] Task app.tasks.generate_weekly_schedule[3b92c] succeeded in 1.42s`,
      `[${timestamp()}] [INFO/ForkPoolWorker-2] Task app.tasks.send_shift_notifications[7e110] received`,
      `[${timestamp()}] [INFO/ForkPoolWorker-2] Dispatched 14 SMS/Email notifications to active staff`,
      `[${timestamp()}] [INFO/ForkPoolWorker-2] Task app.tasks.send_shift_notifications[7e110] succeeded in 0.38s`
    ].join('\n');
  }

  if (service === 'scheduler_celery_beat' || service === 'celery_beat') {
    return [
      `[${timestamp()}] [INFO/MainProcess] beat: Starting...`,
      `[${timestamp()}] [INFO/MainProcess] Writing entries to schedule database...`,
      `[${timestamp()}] [INFO/MainProcess] Scheduler: Sending due task cleanup_expired_sessions (every 1 hour)`,
      `[${timestamp()}] [INFO/MainProcess] Scheduler: Sending due task sync_employee_leave_balances (every 1 day)`
    ].join('\n');
  }

  if (service === 'scheduler_postgres' || service === 'postgres' || service === 'database') {
    return [
      `[${timestamp()}] [LOG] checkpoint starting: time`,
      `[${timestamp()}] [LOG] checkpoint complete: wrote 42 buffers (0.3%); 0 WAL file(s) added, 0 removed, 1 recycled`,
      `[${timestamp()}] [LOG] database system is ready to accept connections`,
      `[${timestamp()}] [LOG] autovacuum launcher started`
    ].join('\n');
  }

  if (service === 'scheduler_redis' || service === 'redis') {
    return [
      `[${timestamp()}] * Ready to accept connections tcp`,
      `[${timestamp()}] * DB 0: 24 keys (1 volatile) in 32 slots HT.`,
      `[${timestamp()}] * 1 clients connected (0 in pubsub), 1842344 bytes in use`
    ].join('\n');
  }

  if (service === 'scheduler_frontend' || service === 'frontend') {
    return [
      `[${timestamp()}] [nginx] 127.0.0.1 - - "GET / HTTP/1.1" 200 1842 "-" "Mozilla/5.0"`,
      `[${timestamp()}] [nginx] 127.0.0.1 - - "GET /assets/index-D7h2qP.js HTTP/1.1" 200 482910 "-" "Mozilla/5.0"`,
      `[${timestamp()}] [nginx] 127.0.0.1 - - "GET /assets/index-C8s91K.css HTTP/1.1" 200 34120 "-" "Mozilla/5.0"`
    ].join('\n');
  }

  return `[${timestamp()}] [INFO] Standard service log output for ${service} (sanitized).`;
}
