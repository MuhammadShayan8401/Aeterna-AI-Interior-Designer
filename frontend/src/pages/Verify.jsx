/** /verify?token=…  — opened from the confirmation email. */
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import * as api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Verify() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const { user, reload } = useAuth()
  const [state, setState] = useState(token ? 'working' : 'bad')
  const [msg, setMsg] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (!token || ran.current) return
    ran.current = true          // StrictMode runs effects twice; the token is single-use
    api.verifyEmail(token)
      .then(() => { setState('ok'); if (user) reload().catch(() => {}) })
      .catch((e) => { setState('bad'); setMsg(e.message) })
  }, [token]) // eslint-disable-line

  const Icon = state === 'ok' ? CheckCircle2 : state === 'bad' ? XCircle : Loader2
  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '6rem 1.5rem', textAlign: 'center' }}>
      <Icon size={36} strokeWidth={1.3} className={state === 'working' ? 'animate-spin-cw' : ''} style={{ color: state === 'ok' ? '#2F6F57' : state === 'bad' ? '#B42318' : '#888' }} />
      <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '2rem', margin: '1rem 0 .5rem' }}>
        {state === 'ok' ? 'Email confirmed' : state === 'bad' ? 'Link not valid' : 'Confirming …'}
      </h1>
      <p style={{ fontSize: 14, color: '#666', fontFamily: 'Inter, sans-serif', margin: '0 0 1.75rem' }}>
        {state === 'ok' ? 'Thanks — you can start designing now.' : state === 'bad' ? (msg || 'This confirmation link is missing or invalid.') : 'One moment.'}
      </p>
      {state !== 'working' && <Link className="btn-primary" to={user ? '/studio' : '/login'}>{user ? 'Open Studio' : 'Sign in'}</Link>}
    </div>
  )
}
