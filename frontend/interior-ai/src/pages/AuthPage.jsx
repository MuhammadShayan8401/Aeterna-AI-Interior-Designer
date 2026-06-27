/**
 * AuthPage.jsx — Login + Register + Admin.
 * Split-screen: editorial interior photography left, form right.
 * No card, no shadow — structure is the layout itself.
 */
import { useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { BrandLockup } from '../components/landing/Brand'

const ease = [0.16, 1, 0.3, 1]

/* ── Password strength ──────────────────────────────────────────────────── */
function strengthOf(pw) {
  let s = 0
  if (pw.length >= 8)  s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', '#B42318', '#A36A00', '#1F4E79', '#2F6F57']

function PasswordStrength({ value }) {
  if (!value) return null
  const s = strengthOf(value)
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 2,
            background: i <= s ? STRENGTH_COLORS[s] : '#E5E5E5',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <p style={{ fontSize: 10, marginTop: 4, color: STRENGTH_COLORS[s], fontFamily: 'Inter,sans-serif' }}>
        {STRENGTH_LABELS[s]}
      </p>
    </div>
  )
}

/* ── Field ──────────────────────────────────────────────────────────────── */
function Field({ label, type = 'text', value, onChange, error, placeholder, hint, showStrength }) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  const isPassword = type === 'password'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: '#666666', fontFamily: 'Inter,sans-serif', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '11px 16px',
            paddingRight: isPassword ? 40 : 16,
            fontSize: 13, fontFamily: 'Inter,sans-serif', color: '#111111',
            background: '#FFFFFF',
            border: `1px solid ${error ? '#B42318' : focused ? '#111111' : '#E5E5E5'}`,
            outline: 'none', transition: 'border-color 0.2s',
            boxSizing: 'border-box',
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#AAAAAA',
              display: 'flex', alignItems: 'center',
            }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {showStrength && <PasswordStrength value={value} />}
      {error && <p style={{ fontSize: 11, color: '#B42318', fontFamily: 'Inter,sans-serif', margin: 0 }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 11, color: '#888882', fontFamily: 'Inter,sans-serif', margin: 0 }}>{hint}</p>}
    </div>
  )
}

/* ── Editorial left panel ───────────────────────────────────────────────── */
const EDITORIAL_IMAGES = [
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=900&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=900&q=85&auto=format&fit=crop',
]

function EditorialPanel() {
  const [imgIdx] = useState(() => Math.floor(Math.random() * EDITORIAL_IMAGES.length))
  const FEATURES = [
    'Four-stage AI pipeline — segment, depth, prefer, generate',
    'Adaptive taste model that learns from your feedback',
    'Empty room generation — no photo required',
    'Full project history and design archive',
  ]

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: '#1A1A1A' }}>
      {/* Photo */}
      <img
        src={EDITORIAL_IMAGES[imgIdx]}
        alt="Interior design editorial"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
      />
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(17,17,17,0.92) 0%, rgba(17,17,17,0.35) 55%, transparent 100%)',
      }} />

      {/* Brand top-left */}
      <div style={{ position: 'absolute', top: 36, left: 40 }}>
        <BrandLockup size={17} light />
      </div>

      {/* Bottom content */}
      <div style={{ position: 'absolute', bottom: 48, left: 40, right: 40 }}>
        <p style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 'clamp(1.4rem, 2.2vw, 1.9rem)',
          fontWeight: 400, fontStyle: 'italic',
          color: '#FAFAF8', lineHeight: 1.25, margin: '0 0 28px',
          letterSpacing: '-0.01em',
        }}>
          "Every space holds the potential<br />for its best version."
        </p>
        <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.3)', marginBottom: 24 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Check size={12} style={{ color: '#FAFAF8', opacity: 0.6, marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter,sans-serif', lineHeight: 1.5 }}>
                {f}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function AuthPage() {
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [name,     setName]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [errors,   setErrors]   = useState({})
  const [apiError, setApiError] = useState('')

  const { login, adminLogin, register } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const errs = {}
    if (!email.includes('@')) errs.email = 'Enter a valid email address'
    if (password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (mode === 'register') {
      if (!name.trim()) errs.name = 'Full name is required'
      if (password !== confirm) errs.confirm = 'Passwords do not match'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true); setApiError('')
    try {
      if (mode === 'login') {
        const user = await login(email, password)
        navigate(user.role === 'admin' ? '/admin' : '/dashboard')
      } else if (mode === 'admin') {
        await adminLogin(email, password)
        navigate('/admin')
      } else {
        await register(email, name, password)
        navigate('/dashboard')
      }
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.message
      setApiError(typeof msg === 'string' ? msg : 'Authentication failed — check your credentials')
    } finally { setLoading(false) }
  }, [mode, email, name, password, confirm, login, adminLogin, register, navigate])

  const switchMode = (m) => { setMode(m); setErrors({}); setApiError('') }

  const TITLES = {
    login:    { h: 'Sign in',        sub: 'Welcome back to Aeterna.' },
    register: { h: 'Create account', sub: 'Start designing with AI.' },
    admin:    { h: 'Admin access',   sub: 'Studio management portal.' },
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#FAFAF8' }}>
      {/* Left: editorial image */}
      <div className="hidden lg:block" style={{ width: '46%', flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh' }}>
          <EditorialPanel />
        </div>
      </div>

      {/* Right: form */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: 'clamp(2rem, 5vw, 4rem)',
        minHeight: '100vh',
      }}>
        {/* Back link (mobile only) */}
        <Link to="/"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: '#888882', textDecoration: 'none',
            marginBottom: '3rem', fontFamily: 'Inter,sans-serif',
          }}
          className="lg:hidden">
          <ArrowLeft size={12} /> Back to Aeterna
        </Link>

        <div style={{ maxWidth: 360, width: '100%' }}>
          {/* Mode tabs */}
          <div style={{
            display: 'flex', gap: 0,
            borderBottom: '1px solid #E5E5E5',
            marginBottom: '2.25rem',
          }}>
            {[
              { id: 'login',    label: 'Sign In'  },
              { id: 'register', label: 'Register' },
              { id: 'admin',    label: 'Admin'    },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => switchMode(id)}
                style={{
                  position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0 0 12px', marginRight: '1.75rem',
                  fontSize: 13, fontFamily: 'Inter,sans-serif',
                  color: mode === id ? '#111111' : '#AAAAAA',
                  fontWeight: mode === id ? 600 : 400,
                  transition: 'color 0.2s',
                }}>
                {label}
                {mode === id && (
                  <motion.div layoutId="auth-tab"
                    style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 1, background: '#111111' }}
                    transition={{ duration: 0.3, ease }} />
                )}
              </button>
            ))}
          </div>

          {/* Heading + form */}
          <AnimatePresence mode="wait">
            <motion.div key={mode}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}>

              <h1 style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontWeight: 500, fontSize: 'clamp(1.6rem, 2.5vw, 2rem)',
                letterSpacing: '-0.018em', color: '#111111',
                margin: '0 0 6px',
              }}>
                {TITLES[mode].h}
              </h1>
              <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter,sans-serif', margin: '0 0 2rem', lineHeight: 1.5 }}>
                {TITLES[mode].sub}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                {mode === 'register' && (
                  <Field label="Full Name" value={name} onChange={setName}
                    error={errors.name} placeholder="Your name" />
                )}
                <Field label="Email address" type="email" value={email} onChange={setEmail}
                  error={errors.email} placeholder="you@example.com" />
                <Field label="Password" type="password" value={password} onChange={setPassword}
                  error={errors.password} placeholder="Min. 8 characters"
                  showStrength={mode === 'register'} />
                {mode === 'register' && (
                  <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm}
                    error={errors.confirm} placeholder="Repeat password" />
                )}

                {apiError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{
                      fontSize: 12, padding: '10px 14px', margin: 0,
                      color: '#B42318', background: '#FEF2F1',
                      border: '1px solid #F5C6C3', fontFamily: 'Inter,sans-serif',
                    }}>
                    {apiError}
                  </motion.p>
                )}

                <button type="submit" disabled={loading} className="btn-primary"
                  style={{ width: '100%', marginTop: 6, justifyContent: 'center', padding: '13px 24px' }}>
                  {loading ? 'Please wait…' : TITLES[mode].h}
                </button>

                {mode === 'login' && (
                  <p style={{ textAlign: 'center', fontSize: 12, color: '#888882', fontFamily: 'Inter,sans-serif', margin: '4px 0 0' }}>
                    No account?{' '}
                    <button type="button" onClick={() => switchMode('register')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111111',
                        fontSize: 12, fontFamily: 'Inter,sans-serif', textDecoration: 'underline', padding: 0 }}>
                      Register free
                    </button>
                  </p>
                )}
              </form>
            </motion.div>
          </AnimatePresence>
        </div>

        <p style={{
          marginTop: 'auto', paddingTop: '3rem',
          fontSize: 11, color: '#AAAAAA', fontFamily: 'Inter,sans-serif',
          lineHeight: 1.6, maxWidth: 360,
        }}>
          Your session is stored as a JWT in your browser.
          Images and history are only accessible while signed in.
        </p>
      </div>
    </div>
  )
}
