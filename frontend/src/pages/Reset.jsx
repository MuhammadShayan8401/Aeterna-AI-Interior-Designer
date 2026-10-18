/** /reset?token=…  — choose a new password (opened from the reset email). */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import * as api from '../services/api'

export default function Reset() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (pw.length < 8) return setErr('Password must be at least 8 characters.')
    if (pw !== pw2) return setErr('The two passwords do not match.')
    setBusy(true)
    try { await api.resetPassword(token, pw); setDone(true) } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  if (!token) return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '5rem 1.5rem', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '2rem' }}>Link not valid</h1>
      <p style={{ fontSize: 14, color: '#666' }}>This reset link is missing its token.</p>
      <Link className="btn-primary" to="/forgot">Request a new link</Link>
    </div>
  )
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '5rem 1.5rem' }}>
      {done ? (
        <div style={{ textAlign: 'center' }}>
          <CheckCircle2 size={34} strokeWidth={1.3} style={{ color: '#2F6F57' }} />
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '2rem', margin: '1rem 0 .5rem' }}>Password updated</h1>
          <p style={{ fontSize: 14, color: '#666', fontFamily: 'Inter, sans-serif' }}>You've been signed out everywhere. Sign in with your new password.</p>
          <Link to="/login" className="btn-primary" style={{ marginTop: '1rem' }}>Sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '2rem', margin: '0 0 1.5rem' }}>Choose a new password</h1>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>New password</span>
          <input className="input-field" type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr('') }} autoComplete="new-password" />
          <span className="eyebrow" style={{ display: 'block', margin: '1rem 0 6px' }}>Repeat it</span>
          <input className="input-field" type="password" value={pw2} onChange={(e) => { setPw2(e.target.value); setErr('') }} autoComplete="new-password" />
          <div aria-live="polite" style={{ minHeight: 28, paddingTop: 8 }}>
            {err && <span style={{ fontSize: 13, color: '#B42318' }}>{err} {/expired|invalid/i.test(err) && <Link to="/forgot" style={{ color: '#111' }}>Request a new link</Link>}</span>}
          </div>
          <button className="btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? <Loader2 size={14} className="animate-spin-cw" /> : 'Update password'}</button>
        </form>
      )}
    </div>
  )
}
