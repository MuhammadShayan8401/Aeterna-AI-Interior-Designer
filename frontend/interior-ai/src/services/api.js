/**
 * api.js — Axios client + all API call functions.
 *
 * All keys, params, and body shapes match the backend exactly.
 * Last audited against backend routes:
 *   routes/generate.py, routes/history.py, routes/dashboard.py,
 *   routes/feedback.py, routes/auth.py, routes/empty_room.py
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL, timeout: 300_000 })
api.interceptors.response.use(
  r => r,
  e => {
    console.error('[API]', e.response?.status, e.response?.data ?? e.message)
    return Promise.reject(e)
  }
)

export default api

// ── Generation ────────────────────────────────────────────────────────────────
export const generateDesigns = (formData, onUploadProgress) =>
  api.post('/generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e =>
      onUploadProgress?.('upload', Math.round((e.loaded / (e.total ?? 1)) * 100)),
  }).then(r => r.data)

export const generateEmptyRoom = (formData) =>
  api.post('/generate/empty-room', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)

// ── Feedback ──────────────────────────────────────────────────────────────────
// Backend POST /feedback uses FastAPI Form fields (not JSON body)
// Must send as application/x-www-form-urlencoded
export const sendFeedback = (p) =>
  api.post('/feedback', new URLSearchParams(
    Object.entries(p).map(([k, v]) => [k, String(v)])
  )).then(r => r.data)
export const getFeedbackSummary = ()   => api.get('/feedback/summary').then(r => r.data)
export const getAllFeedback      = ()   => api.get('/feedback/all').then(r => r.data)
export const clearFeedback      = ()   => api.delete('/feedback/clear').then(r => r.data)
export const getFeedbackAnalytics = () => api.get('/feedback/analytics').then(r => r.data)
// Backend expects query params: epochs, lr
export const trainANN           = (epochs = 100, lr = 3e-4) =>
  api.post('/feedback/train', null, { params: { epochs, lr } }).then(r => r.data)
// Recommendation — query params
export const getRecommendations = (p)  => api.get('/feedback/recommend', { params: p }).then(r => r.data)
// Rank — JSON body (list of candidate contexts)
export const rankImages         = (p)  => api.post('/feedback/rank', p).then(r => r.data)
// ANN status (lightweight — just checkpoint + record count)
export const getANNFeedbackStatus = () => api.get('/feedback/ann-status').then(r => r.data)

// ── ANN metrics ───────────────────────────────────────────────────────────────
export const getANNMetrics  = () => api.get('/ann/metrics').then(r => r.data)
export const getANNLoss     = () => api.get('/ann/loss').then(r => r.data)
export const getANNROC      = () => api.get('/ann/roc').then(r => r.data)
export const getANNConfusion= () => api.get('/ann/confusion-matrix').then(r => r.data)
export const getANNStatus   = () => api.get('/ann/status').then(r => r.data)

// ── Health ────────────────────────────────────────────────────────────────────
export const checkHealth = () => api.get('/health').then(r => r.data)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authRegister   = (p) => api.post('/auth/register', p).then(r => r.data)
export const authLogin      = (p) => api.post('/auth/login', p).then(r => r.data)
export const authMe         = ()  => api.get('/auth/me').then(r => r.data)
export const authAdminLogin = (p) => api.post('/auth/admin/login', p).then(r => r.data)
export const authAdminMe    = ()  => api.get('/auth/admin/me').then(r => r.data)

// ── Dashboards ────────────────────────────────────────────────────────────────
export const getUserDashboard  = ()            => api.get('/dashboard/me').then(r => r.data)
export const getAdminDashboard = ()            => api.get('/dashboard/admin/overview').then(r => r.data)
export const adminRetrain      = (epochs = 150) =>
  api.post('/dashboard/admin/retrain', null, { params: { epochs } }).then(r => r.data)

// ── History ───────────────────────────────────────────────────────────────────
// Backend uses: page (int, 1-based), page_size (int), generation_type, favorites_only
// NOT skip/limit — those go inside list_generations() but the route uses page/page_size
export const getHistory = (params = {}) => {
  // Translate legacy skip/limit → page/page_size if caller still sends them
  const { skip, limit, ...rest } = params
  const page_size = params.page_size ?? limit ?? 12
  const page = params.page ?? (skip != null ? Math.floor(skip / page_size) + 1 : 1)
  return api.get('/history', { params: { ...rest, page, page_size } }).then(r => r.data)
}

export const getHistoryItem = (id) =>
  api.get(`/history/${id}`).then(r => r.data)

// Backend: PATCH /history/{id}/favorite — JSON body { is_favorite: bool }
export const setFavorite = (id, is_favorite) =>
  api.patch(`/history/${id}/favorite`, { is_favorite }).then(r => r.data)

export const deleteHistoryItem = (id) =>
  api.delete(`/history/${id}`).then(r => r.data)

// Backend: POST /history/{id}/regenerate — JSON body (RegenerateRequest)
export const regenerateFromHistory = (id, body = {}) =>
  api.post(`/history/${id}/regenerate`, body).then(r => r.data)
