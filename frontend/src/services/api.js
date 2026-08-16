const API_BASE = '/api';

const ADMIN_TOKEN_KEY = 'portal_admin_token';

export function getAdminToken() {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY) || null;
  } catch (e) {
    return null;
  }
}

export function setAdminToken(token) {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch (e) {}
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch (e) {}
}

function getAuthHeaders() {
  const token = getAdminToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ==========================================
// Authentication APIs
// ==========================================

export async function loginAdmin(password) {
  const res = await fetch(`${API_BASE}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Admin verification failed');
  }

  if (data.token) {
    setAdminToken(data.token);
  }
  return data;
}

export async function verifyAdminSession() {
  const token = getAdminToken();
  if (!token) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/verify-admin`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.valid) {
      clearAdminToken();
    }
    return Boolean(data.valid);
  } catch (err) {
    return false;
  }
}

export async function logoutAdmin() {
  clearAdminToken();
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  } catch (err) {}
}

// ==========================================
// Application Lifecycle APIs
// ==========================================

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
    headers: getAuthHeaders(),
    body: JSON.stringify({ force })
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      clearAdminToken();
      const err = new Error(data.error || 'Admin authentication required.');
      err.isAuthError = true;
      throw err;
    }
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
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      clearAdminToken();
      const err = new Error(data.error || 'Admin authentication required.');
      err.isAuthError = true;
      throw err;
    }
    throw new Error(data.error || 'Failed to restart application');
  }
  return data;
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
    headers: getAuthHeaders(),
    body: JSON.stringify(settings)
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to update settings');
  }
  return res.json();
}

export async function fetchLogs(id, service = '', lines = 100) {
  const res = await fetch(`${API_BASE}/applications/${id}/logs?service=${encodeURIComponent(service)}&lines=${lines}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to fetch logs');
  }
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
