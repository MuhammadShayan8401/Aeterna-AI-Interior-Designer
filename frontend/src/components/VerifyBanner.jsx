/** Shown under the nav while the signed-in user hasn't confirmed their email. */
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'

export default function VerifyBanner() {
  const { user, reload } = useAuth()
  const [busy, setBusy] = useState(false)
  if (!user || !user.verification_required || user.verified) return null
  const act = async (fn, ok) => {
    setBusy(true)
    try { await fn(); if (ok) toast.success(ok) } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const btn = { background: 'none', border: 'none', color: '#111', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: 12, padding: 0, fontFamily: 'Inter, sans-serif' }
  return (
    <div style={{ background: '#FFF6E0', borderBottom: '1px solid #F0DFA8', padding: '9px clamp(1.5rem,4vw,3rem)', fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#6B5200', textAlign: 'center' }}>
      Please confirm your email — we sent a link to <b>{user.email}</b>.{' '}
      <button disabled={busy} style={btn} onClick={() => act(api.resendVerification, 'Email sent')}>Resend</button>{' · '}
      <button disabled={busy} style={btn} onClick={() => act(reload)}>I've confirmed</button>
    </div>
  )
}
