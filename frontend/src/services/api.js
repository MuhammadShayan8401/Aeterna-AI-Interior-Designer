/** api.js — every backend call the app makes. Authenticated calls refresh the token once if needed. */
import { handle_file } from '@gradio/client'
import { predict, submit } from './gradio'
import { accessToken, refreshSession, adoptSession, clearSession, isAuthExpired, currentSession } from './session'

/** Runs `fn(token)`; on an expired token refreshes once and retries. */
async function authed(fn) {
  try { return await fn(await accessToken()) }
  catch (e) {
    if (!isAuthExpired(e)) throw e
    try { return await fn((await refreshSession()).access) }
    catch (e2) { clearSession(); throw new Error('Your session expired. Please sign in again.') }
  }
}

// ── accounts ──────────────────────────────────────────────────────────────────
export const register = (name, email, password, ref = '', captcha = '') =>
  predict('/auth_register', [name, email, password, ref, captcha]).then(adoptSession)
export const login    = (email, password) => predict('/auth_login', [email, password]).then(adoptSession)
export async function logout() {
  const s = currentSession()
  clearSession()
  if (s?.refresh) predict('/auth_logout', [s.refresh]).catch(() => {})
}
export const me = () => authed((t) => predict('/auth_me', [t]))
export const changePassword = (oldPw, newPw) =>
  authed((t) => predict('/auth_change_password', [t, oldPw, newPw])).then(adoptSession)
export const deleteAccount = (password) => authed((t) => predict('/auth_delete', [t, password])).then(() => clearSession())

// ── email verification, password reset, billing ──────────────────────────────
export const verifyEmail = (token) => predict('/auth_verify_email', [token])
export const resendVerification = () => authed((t) => predict('/auth_resend_verification', [t]))
export const forgotPassword = (email) => predict('/auth_forgot', [email])
export const resetPassword = (token, newPassword) => predict('/auth_reset', [token, newPassword])
export const billingPlans = () => predict('/billing_plans', [])
export const billingInfo = () => authed((t) => predict('/billing_info', [t]))
export const billingPayStart = (plan = 'month') => authed((t) => predict('/billing_pay_start', [t, plan]))
export const billingSubmit = (txId, amount, sender, method = 'easypaisa', proof = '', plan = 'month') =>
  authed((t) => predict('/billing_submit', [t, txId, amount, sender || '', method, proof || '', plan]))

// ── budget, sharing, variations ──────────────────────────────────────────────
export const budgetEstimate = (room, style, density) => predict('/budget_estimate', [room, style, density])
export const shareCreate = (itemId, index) => authed((t) => predict('/share_create', [t, itemId, index]))
export const shareGet    = (id) => predict('/share_get', [id])
export const shareList   = () => authed((t) => predict('/share_list', [t])).then((r) => r.items)
export const shareDelete = (id) => authed((t) => predict('/share_delete', [t, id]))
export const ping        = () => predict('/ping', [])

// ── history (stored per user on the server) ──────────────────────────────────
export const historyList     = () => authed((t) => predict('/history_list', [t])).then((r) => r.items)
export const historyGet      = (id) => authed((t) => predict('/history_get', [t, id]))
export const historyFavorite = (id, value) => authed((t) => predict('/history_favorite', [t, id, value]))
export const historyRate     = (id, index, value) => authed((t) => predict('/history_rate', [t, id, index, value]))
export const historyDelete   = (id) => authed((t) => predict('/history_delete', [t, id]))
export const historyClear    = () => authed((t) => predict('/history_clear', [t]))

// ── generation ────────────────────────────────────────────────────────────────
export const redesign = (blob, o, onStatus) =>
  authed((t) => submit('/redesign',
    [t, handle_file(blob), o.room, o.style, o.density, o.palette, o.change, o.extra, o.count], onStatus))

export const redesignRegion = (blob, mask, o, onStatus) =>
  authed((t) => submit('/redesign_region',
    [t, handle_file(blob), handle_file(mask), o.room, o.style, o.density, o.palette, o.change, o.extra, o.count], onStatus))

export const fromScratch = (o, onStatus) =>
  authed((t) => submit('/from_scratch',
    [t, o.room, o.style, o.density, o.lighting, o.palette, o.extra, o.count], onStatus))


/** "More like this" / "change the colours" on one generated image. */
export const variation = (itemId, index, o, onStatus) =>
  authed((t) => submit('/variation', [t, itemId, index, o.style, o.palette, o.extra || '', o.change || 'subtle', o.count || 1], onStatus))
