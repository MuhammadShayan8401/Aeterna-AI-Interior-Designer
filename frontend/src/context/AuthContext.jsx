/** AuthContext — who is signed in, plus today's quota and the user's style taste. */
import { track } from '../services/track'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../services/api'
import { currentSession, onSessionChange, saveSession } from '../services/session'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(currentSession())
  const [ready, setReady] = useState(!currentSession())     // false while we validate a stored session
  const [quota, setQuota] = useState(null)
  const [taste, setTaste] = useState({})

  useEffect(() => onSessionChange(setSession), [])

  const reload = useCallback(async () => {
    const r = await api.me()
    setQuota(r.quota); setTaste(r.taste ?? {})
    const cur = currentSession()
    if (cur && JSON.stringify(cur.user) !== JSON.stringify(r.user)) saveSession({ ...cur, user: r.user })
    return r
  }, [])

  // Validate a stored session once at startup.
  useEffect(() => {
    if (!currentSession()) return
    reload().catch(() => {}).finally(() => setReady(true))
  }, [reload])

  useEffect(() => { if (!session) { setQuota(null); setTaste({}) } }, [session])

  const value = useMemo(() => ({
    user: session?.user ?? null,
    ready, quota, taste, setQuota, setTaste, reload,
    async login(email, password) { await api.login(email, password); await reload() },
    async register(name, email, password, ref = '', captcha = '') { await api.register(name, email, password, ref, captcha); track('signup'); await reload() },
    async logout() { await api.logout() },
  }), [session, ready, quota, taste, reload])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  const loc = window.location.hash.replace(/^#/, '') || '/studio'
  if (!ready) return <div style={{ padding: '6rem 0', textAlign: 'center', color: '#999', fontSize: 13 }}>Loading …</div>
  if (!user) return <Redirect to="/login" from={loc} />
  return children
}

import { Navigate } from 'react-router-dom'
const Redirect = ({ to, from }) => <Navigate to={to} replace state={{ from }} />
