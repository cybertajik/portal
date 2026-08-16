const API_BASE = '/api';

export async function fetchApplications() {
  const res = await fetch(`${API_BASE}/applications`);
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json();
}

export async function fetchApplication(id) {
  const res = await fetch(`${API_BASE}/applications/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch application ${id}`);
  return res.json();
}

export async function startApplication(id) {
  const res = await fetch(`${API_BASE}/applications/${id}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to start application');
  }
  return res.json();
}

export async function stopApplication(id, force = false) {
  const res = await fetch(`${API_BASE}/applications/${id}/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.reason || data.error || 'Failed to stop application');
    if (data.safetyViolation) {
      err.isSafetyViolation = true;
      err.activeJobs = data.activeJobs;
      err.activeUsers = data.activeUsers;
    }
    throw err;
  }
  return data;
}

export async function restartApplication(id) {
  const res = await fetch(`${API_BASE}/applications/${id}/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to restart application');
  }
  return res.json();
}

export async function sendHeartbeat(id) {
  const res = await fetch(`${API_BASE}/applications/${id}/heartbeat`, {
    method: 'POST'
  });
  return res.json();
}

export async function updateAppSettings(id, settings) {
  const res = await fetch(`${API_BASE}/applications/${id}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function fetchLogs(id, service = '', lines = 100) {
  const res = await fetch(`${API_BASE}/applications/${id}/logs?service=${encodeURIComponent(service)}&lines=${lines}`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function fetchMetrics() {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export function subscribeAppEvents(id, onEvent) {
  const eventSource = new EventSource(`${API_BASE}/applications/${id}/events`);
  
  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch (err) {
      console.error('Error parsing SSE event:', err);
    }
  };

  eventSource.onerror = (err) => {
    console.warn(`SSE connection error for ${id}:`, err);
  };

  return () => {
    eventSource.close();
  };
}
