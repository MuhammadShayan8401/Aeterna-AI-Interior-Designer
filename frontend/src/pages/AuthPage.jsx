/** AuthPage — one page for /login and /register. */
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import PhotoFrame from '../components/landing/PhotoFrame'
import { BrandLockup } from '../components/landing/Brand'
import { useAuth } from '../context/AuthContext'
import { useT } from '../i18n'
import Turnstile, { TURNSTILE_ON } from '../components/Turnstile'

const strength = (p) => {
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++
  return s   // 0..4
}
const STRENGTH = ['Too short', 'Weak', 'Okay', 'Good', 'Strong']

function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'block', marginBottom: '1.1rem' }}>
      <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
      {hint}
    </label>
  )
}

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { user, login, register } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const dest = loc.state?.from && loc.state.from !== '/login' ? loc.state.from : '/studio'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const { t } = useT()
  const [captcha, setCaptcha] = useState('')
  const ref = (() => { try { return localStorage.getItem('aeterna.ref') || '' } catch { return '' } })()

  if (user) return <Navigate to={dest} replace />

  const s = strength(pw)
  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (isRegister && !name.trim()) return setErr('Please enter your name.')
    if (!/^\S+@\S+\.\S{2,}$/.test(email.trim())) return setErr('Please enter a valid email address.')
    if (isRegister && pw.length < 8) return setErr('Password must be at least 8 characters.')
    if (isRegister && TURNSTILE_ON && !captcha) return setErr('Please complete the check below.')
    setBusy(true)
    try {
      if (isRegister) await register(name.trim(), email.trim(), pw, ref, captcha)
      else await login(email.trim(), pw)
      nav(dest, { replace: true })
    } catch (e2) {
      setErr(e2?.message || 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'grid' }} className="lg:grid-cols-2">
      {/* image side */}
      <div className="hidden lg:block" style={{ position: 'relative' }}>
        <PhotoFrame variant="scandinavian" label="Scandinavian living room" style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(17,17,17,.6), transparent 55%)' }} />
          <div style={{ position: 'absolute', left: 40, right: 40, bottom: 40, color: '#FAFAF8' }}>
            <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.9rem', lineHeight: 1.15, margin: 0, letterSpacing: '-0.015em' }}>
              Picture your room in a new light.
            </p>
            <p style={{ fontSize: 13, opacity: 0.75, margin: '10px 0 0', fontFamily: 'Inter, sans-serif' }}>
              Your designs, favourites and taste are saved to your account.
            </p>
          </div>
        </PhotoFrame>
      </div>

      {/* form side */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem clamp(1.5rem,5vw,4rem)' }}>
        <form onSubmit={submit} noValidate style={{ width: '100%', maxWidth: 400 }}>
          <BrandLockup size={17} />
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '2.1rem', letterSpacing: '-0.02em', margin: '1.75rem 0 .4rem' }}>
            {t(isRegister ? 'Create your account' : 'Welcome back')}
          </h1>
          <p style={{ fontSize: 13, color: '#777', fontFamily: 'Inter, sans-serif', margin: '0 0 1.75rem' }}>
            {t(isRegister ? 'Free. Takes ten seconds.' : 'Sign in to open your Studio.')}
          </p>

          {isRegister && (
            <Field label={t("Name")}>
              <input className="input-field" value={name} onChange={(e) => { setName(e.target.value); setErr('') }}
                autoComplete="name" maxLength={60} placeholder="Ada Lovelace" />
            </Field>
          )}
          <Field label={t("Email")}>
            <input className="input-field" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr('') }}
              autoComplete="email" placeholder="you@example.com" />
          </Field>
          <Field label={t("Password")}
            hint={isRegister && pw && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <i key={i} style={{ flex: 1, height: 3, background: i <= s ? ['#B42318', '#B42318', '#A36A00', '#2F6F57', '#2F6F57'][s] : '#E5E5E5' }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: '#888', fontFamily: 'Inter, sans-serif' }}>{STRENGTH[s]} · 8+ characters, mix letters, numbers and symbols</span>
              </div>
            )}>
            <div style={{ position: 'relative' }}>
              <input className="input-field" type={show ? 'text' : 'password'} value={pw} onChange={(e) => { setPw(e.target.value); setErr('') }}
                autoComplete={isRegister ? 'new-password' : 'current-password'} style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          {!isRegister && (
            <p style={{ margin: '-0.4rem 0 1rem', textAlign: 'right' }}>
              <Link to="/forgot" style={{ fontSize: 12, color: '#666', fontFamily: 'Inter, sans-serif' }}>{t('Forgot password?')}</Link>
            </p>
          )}

          {isRegister && ref && <p style={{ fontSize: 12, color: '#2F6F57', fontFamily: 'Inter, sans-serif', margin: '0 0 .75rem' }}>A friend invited you — you both get extra daily designs.</p>}
          {isRegister && <Turnstile onToken={setCaptcha} />}

          <div aria-live="polite" style={{ minHeight: 22 }}>
            {err && <p style={{ margin: '0 0 .75rem', fontSize: 13, color: '#B42318', fontFamily: 'Inter, sans-serif' }}>{err}</p>}
          </div>

          <button className="btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? <><Loader2 size={14} className="animate-spin-cw" /> {isRegister ? 'Creating …' : 'Signing in …'}</> : t(isRegister ? 'Create account' : 'Sign in')}
          </button>

          {isRegister && (
            <p style={{ fontSize: 11.5, color: '#888', fontFamily: 'Inter, sans-serif', textAlign: 'center', margin: '.9rem 0 0', lineHeight: 1.6 }}>
              By creating an account you agree to our <Link to="/terms" style={{ color: '#555' }}>Terms &amp; Conditions</Link> and <Link to="/privacy" style={{ color: '#555' }}>Privacy Policy</Link>.
            </p>
          )}
          <p style={{ fontSize: 13, color: '#666', fontFamily: 'Inter, sans-serif', textAlign: 'center', marginTop: '1.5rem' }}>
            {t(isRegister ? 'Already have an account? ' : 'New to Aeterna? ')}
            <Link to={isRegister ? '/login' : '/register'} state={loc.state} style={{ color: '#111', fontWeight: 500 }}>
              {t(isRegister ? 'Sign in' : 'Create an account')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
