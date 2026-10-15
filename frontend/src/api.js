// Thin wrapper around fetch for the backend API. All requests stay same-origin.

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status // 0 = network failure
  }
}

async function request(url, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }
  if (res.status === 204) return {}
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || 'Request failed.', res.status)
  return data
}

export const api = {
  submitRsvp: (payload) => request('/api/rsvp', { method: 'POST', body: payload }),
  session: () => request('/api/admin/session'),
  login: (password) => request('/api/admin/login', { method: 'POST', body: { password } }),
  logout: () => request('/api/admin/logout', { method: 'POST' }),
  rsvps: () => request('/api/admin/rsvps'),
  remove: (id) => request(`/api/admin/rsvps/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
