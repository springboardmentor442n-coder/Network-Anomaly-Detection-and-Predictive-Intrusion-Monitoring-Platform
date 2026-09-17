/**
 * API client.
 *
 * Single place that talks to the backend. Errors are normalised into an
 * ApiError carrying the structured {error, code, details} body the backend
 * returns, so pages can render a useful message instead of "[object Object]".
 */

const BASE = import.meta.env.VITE_API_BASE || ''
const TOKEN_KEY = 'netshield_token'

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

function describe(body, status, path) {
  // A bare FastAPI 404 on a known API path almost always means the request
  // reached a *different* service on the backend port, not that our route is
  // missing. Say so, because "Not Found" alone sends people hunting the wrong bug.
  if (status === 404 && body?.detail === 'Not Found' && path?.startsWith('/api/')) {
    return (
      'The backend responded, but does not recognise this endpoint. Another ' +
      'application is probably serving the backend port. Check what is on port ' +
      '8000, then start NetShield on a free port and set VITE_PROXY_TARGET in ' +
      'frontend/.env.'
    )
  }
  if (!body) return `Request failed (${status})`
  if (typeof body.detail === 'string') return body.detail
  if (body.error) return body.error
  if (body.detail?.message) return body.detail.message
  if (Array.isArray(body.detail)) {
    return body.detail.map((d) => d.msg || d.message).filter(Boolean).join('; ')
  }
  return `Request failed (${status})`
}

/** Field-level problems, if the backend supplied any. */
export function fieldProblems(error) {
  if (!(error instanceof ApiError)) return []
  const out = []
  const details = error.details || {}
  if (Array.isArray(details.fields)) {
    for (const f of details.fields) out.push(`${f.field}: ${f.message}`)
  }
  if (Array.isArray(details.problems)) out.push(...details.problems)
  return out
}

export async function request(path, { method = 'GET', body, signal, raw = false } = {}) {
  const token = tokenStore.get()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(BASE + path, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'Cannot reach the API. Is the backend running on port 8000?',
      { status: 0, code: 'NETWORK_ERROR' },
    )
  }

  if (response.status === 401) {
    tokenStore.clear()
    throw new ApiError('Session expired. Please sign in again.', {
      status: 401,
      code: 'AUTH_ERROR',
    })
  }

  if (!response.ok) {
    let parsed = null
    try {
      parsed = await response.json()
    } catch {
      /* non-JSON error body */
    }
    const detail = parsed?.detail
    throw new ApiError(describe(parsed, response.status, path), {
      status: response.status,
      code: parsed?.code || 'HTTP_ERROR',
      details: parsed?.details || (typeof detail === 'object' ? detail : undefined),
    })
  }

  if (raw) return response
  if (response.status === 204) return null
  return response.json()
}

export const api = {
  // auth
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, password) =>
    request('/api/auth/register', { method: 'POST', body: { email, password } }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // analytics
  overview: (hours = 24) => request(`/api/analytics/overview?hours=${hours}`),
  traffic: (refresh = false) => request(`/api/analytics/traffic?refresh=${refresh}`),
  attackTrends: (hours = 24) => request(`/api/analytics/attack-trends?hours=${hours}`),
  modelMetrics: () => request('/api/analytics/model-metrics'),
  riskPolicy: () => request('/api/analytics/risk-policy'),
  topIps: () => request('/api/analytics/top-ips'),
  detectionsByType: () => request('/api/analytics/detections-by-type'),
  severityDistribution: () => request('/api/analytics/severity-distribution'),

  // predictions
  predictionStatus: () => request('/api/predictions/status'),
  expectedFeatures: () => request('/api/predictions/features'),
  predict: (payload) => request('/api/predictions', { method: 'POST', body: payload }),
  explain: (payload) => request('/api/predictions/explain', { method: 'POST', body: payload }),
  detections: (params = '') => request(`/api/predictions/detections${params}`),
  detection: (id) => request(`/api/predictions/detections/${id}`),

  // monitoring
  sources: () => request('/api/monitoring/sources'),
  sampleFlow: (source = 'csv_replay') =>
    request(`/api/monitoring/sample-flow?source=${encodeURIComponent(source)}`),
  scan: (source, limit) =>
    request(`/api/monitoring/scan?source=${encodeURIComponent(source)}&limit=${limit}`, {
      method: 'POST',
    }),
  resetReplay: () => request('/api/monitoring/replay/reset', { method: 'POST' }),

  // alerts
  alerts: (query = '') => request(`/api/alerts${query}`),
  alert: (id) => request(`/api/alerts/${id}`),
  updateAlert: (id, body) => request(`/api/alerts/${id}`, { method: 'PATCH', body }),
  acknowledgeAlert: (id) => request(`/api/alerts/${id}/acknowledge`, { method: 'POST' }),
  resolveAlert: (id) => request(`/api/alerts/${id}/resolve`, { method: 'POST' }),
  falsePositive: (id) => request(`/api/alerts/${id}/false-positive`, { method: 'POST' }),

  // incidents
  incidents: (query = '') => request(`/api/incidents${query}`),
  incident: (id) => request(`/api/incidents/${id}`),
  createIncident: (body) => request('/api/incidents', { method: 'POST', body }),
  updateIncident: (id, body) => request(`/api/incidents/${id}`, { method: 'PATCH', body }),
  addIncidentNote: (id, note) =>
    request(`/api/incidents/${id}/notes`, { method: 'POST', body: { note } }),
  linkAlert: (incidentId, alertId) =>
    request(`/api/incidents/${incidentId}/link-alert/${alertId}`, { method: 'POST' }),

  // threat intel
  threatIntelStatus: () => request('/api/threat-intel/status'),
  lookupIp: (ip) => request(`/api/threat-intel/lookup/${encodeURIComponent(ip)}`),
  indicators: (query = '') => request(`/api/threat-intel/indicators${query}`),
  createIndicator: (body) =>
    request('/api/threat-intel/indicators', { method: 'POST', body }),
  deleteIndicator: (id) =>
    request(`/api/threat-intel/indicators/${id}`, { method: 'DELETE' }),

  // reports
  reportFormats: () => request('/api/reports/formats'),
  reports: () => request('/api/reports'),
  previewReport: (days = 7) => request(`/api/reports/preview?days=${days}`),
  createReport: (body) => request('/api/reports', { method: 'POST', body }),
  reportUrl: (id, format) => `${BASE}/api/reports/${id}?format=${format}`,

  // stream
  streamStatus: () => request('/api/stream/status'),
  pollEvents: (sinceId) =>
    request(`/api/stream/events${sinceId ? `?since_id=${sinceId}` : ''}`),

  // admin
  users: () => request('/api/admin/users'),
  adminStats: () => request('/api/admin/stats'),
  updateUser: (id, body) => request(`/api/admin/users/${id}`, { method: 'PATCH', body }),
  activateUser: (id) => request(`/api/admin/users/${id}/activate`, { method: 'POST' }),
  deactivateUser: (id) => request(`/api/admin/users/${id}/deactivate`, { method: 'POST' }),
  promoteUser: (id) => request(`/api/admin/users/${id}/promote-admin`, { method: 'POST' }),
  demoteUser: (id) => request(`/api/admin/users/${id}/demote-analyst`, { method: 'POST' }),
  userActivity: (id) => request(`/api/admin/users/${id}/activity`),
  auditLogs: (query = '') => request(`/api/admin/audit-logs${query}`),
  auditActions: () => request('/api/admin/audit-logs/actions'),
  systemConfig: () => request('/api/admin/system-config'),
  models: () => request('/api/admin/models'),
  syncModels: () => request('/api/admin/models/sync', { method: 'POST' }),
}

/** Base URL for WebSocket/SSE transports. */
export function streamBase() {
  if (BASE) return BASE
  return `${window.location.protocol}//${window.location.host}`
}
