/**
 * AuthContext.jsx — JWT auth state + free plan generation limit.
 *
 * Free plan: 10 generations max.
 * Counter stored in localStorage as `aeterna_gen_count_{userId}`.
 * Reset is NOT possible client-side — tracks total lifetime generations.
 * Pro/Studio users are unlimited (role === 'pro' || role === 'studio').
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

const FREE_LIMIT = 10

const storeToken = (token) => {
  localStorage.setItem('aeterna_token', token)
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}
const clearToken = () => {
  localStorage.removeItem('aeterna_token')
  localStorage.removeItem('aeterna_refresh')
  delete api.defaults.headers.common['Authorization']
}

function genCountKey(userId) {
  return `aeterna_gen_count_${userId}`
}

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [genCount, setGenCount] = useState(0)   // free-plan usage counter

  // Restore count from localStorage when user is known
  const loadCount = useCallback((u) => {
    if (!u) return 0
    const stored = parseInt(localStorage.getItem(genCountKey(u._id ?? u.id ?? u.email)) ?? '0', 10)
    setGenCount(stored)
    return stored
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('aeterna_token')
    if (!token) { setLoading(false); return }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    api.get('/auth/me')
      .then(r => { setUser(r.data); loadCount(r.data) })
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [loadCount])

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password })
    storeToken(r.data.access_token)
    localStorage.setItem('aeterna_refresh', r.data.refresh_token)
    const me = await api.get('/auth/me')
    setUser(me.data)
    loadCount(me.data)
    return me.data
  }, [loadCount])

  const adminLogin = useCallback(async (email, password) => {
    const r = await api.post('/auth/admin/login', { email, password })
    storeToken(r.data.access_token)
    localStorage.setItem('aeterna_refresh', r.data.refresh_token)
    const me = await api.get('/auth/admin/me')
    setUser({ ...me.data, role: 'admin' })
    return me.data
  }, [])

  const register = useCallback(async (email, fullName, password) => {
    await api.post('/auth/register', { email, full_name: fullName, password })
    return login(email, password)
  }, [login])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setGenCount(0)
  }, [])

  /** Call this BEFORE each generate call to check + enforce the free limit. */
  const checkAndIncrementGeneration = useCallback(() => {
    if (!user) return { allowed: false, reason: 'not_logged_in' }
    const plan = user.plan ?? user.role ?? 'free'
    const isPaid = ['pro', 'studio', 'admin'].includes(plan)
    if (isPaid) return { allowed: true }

    if (genCount >= FREE_LIMIT) {
      return { allowed: false, reason: 'limit_reached', count: genCount, limit: FREE_LIMIT }
    }

    // Increment
    const next = genCount + 1
    setGenCount(next)
    const key = genCountKey(user._id ?? user.id ?? user.email)
    localStorage.setItem(key, String(next))
    return { allowed: true, count: next, remaining: FREE_LIMIT - next }
  }, [user, genCount])

  const isFreePlan    = user ? !(['pro','studio','admin'].includes(user.plan ?? user.role ?? '')) : false
  const genLimitReached = isFreePlan && genCount >= FREE_LIMIT
  const genRemaining    = isFreePlan ? Math.max(0, FREE_LIMIT - genCount) : Infinity

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, adminLogin, register, logout,
      // Generation limit API
      genCount, genRemaining, genLimitReached, isFreePlan, FREE_LIMIT,
      checkAndIncrementGeneration,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
