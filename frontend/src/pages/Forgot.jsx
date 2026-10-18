/** /forgot — request a password reset email. */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, MailCheck } from 'lucide-react'
import * as api from '../services/api'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!/^\S+@\S+\.\S{2,}$/.test(email.trim())) return setErr('Please enter a valid email address.')
    setBusy(true)
    try { await api.forgotPassword(email.trim()); setSent(true) } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '5rem 1.5rem' }}>
      {sent ? (
        <div style={{ textAlign: 'center' }}>
          <MailCheck size={34} strokeWidth={1.3} style={{ color: '#2F6F57' }} />
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '2rem', margin: '1rem 0 .5rem' }}>Check your inbox</h1>
          <p style={{ fontSize: 14, color: '#666', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>
            If an account exists for <b>{email}</b>, we've sent a link to reset your password. It works for one hour — check spam too.
          </p>
          <Link to="/login" className="btn-outline" style={{ marginTop: '1rem' }}>Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '2rem', margin: '0 0 .5rem' }}>Forgot your password?</h1>
          <p style={{ fontSize: 13, color: '#777', fontFamily: 'Inter, sans-serif', margin: '0 0 1.5rem' }}>Enter your email and we'll send you a reset link.</p>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Email</span>
          <input className="input-field" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr('') }} autoComplete="email" placeholder="you@example.com" />
          <div aria-live="polite" style={{ minHeight: 28, paddingTop: 8 }}>{err && <span style={{ fontSize: 13, color: '#B42318' }}>{err}</span>}</div>
          <button className="btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? <Loader2 size={14} className="animate-spin-cw" /> : 'Send reset link'}</button>
          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 13 }}><Link to="/login" style={{ color: '#666' }}>Back to sign in</Link></p>
        </form>
      )}
    </div>
  )
}
