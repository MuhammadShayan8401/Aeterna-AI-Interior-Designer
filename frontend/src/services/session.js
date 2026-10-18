/**
 * session.js — the signed-in session (tokens + user) kept in localStorage.
 *
 * Access token: short-lived (30 min), sent with every call. Refresh token: long-lived and single-use;
 * every refresh returns a new pair. Concurrent callers share one refresh request.
 * (Tokens in localStorage are readable by any script on this page — keep the app free of third-party scripts.)
 */
import { predict } from './gradio'

const KEY = 'aeterna.session.v1'
const listeners = new Set()
let refreshing = null

export function loadSession() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}
export function saveSession(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage blocked: session lasts until reload */ }
  memory = s; listeners.forEach((f) => f(s))
}
export function clearSession() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
  memory = null; listeners.forEach((f) => f(null))
}
export const onSessionChange = (f) => { listeners.add(f); return () => listeners.delete(f) }

let memory = loadSession()
export const currentSession = () => memory

/** Server reply -> stored session. */
export function adoptSession(reply) {
  const s = { user: reply.user, access: reply.access_token, refresh: reply.refresh_token }
  saveSession(s)
  return s
}

const expiresInSeconds = (jwt) => {
  try { return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp - Date.now() / 1000 }
  catch { return 0 }
}

export const isAuthExpired = (e) => /AUTH_EXPIRED/.test(e?.message ?? '')

export function refreshSession() {
  if (!refreshing) {
    const s = memory
    if (!s?.refresh) return Promise.reject(new Error('AUTH_EXPIRED'))
    refreshing = predict('/auth_refresh', [s.refresh])
      .then(adoptSession)
      .catch((e) => { clearSession(); throw e })
      .finally(() => { refreshing = null })
  }
  return refreshing
}

/** A valid access token (refreshing first if it is about to expire). */
export async function accessToken() {
  const s = memory
  if (!s) throw new Error('AUTH_EXPIRED')
  if (expiresInSeconds(s.access) > 60) return s.access
  return (await refreshSession()).access
}
