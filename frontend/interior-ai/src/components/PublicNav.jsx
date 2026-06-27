/**
 * PublicNav.jsx — Sticky navbar for all public + account pages.
 * Uses CSS media queries via a <style> tag for reliable show/hide —
 * avoids Tailwind responsive classes conflicting with inline display styles.
 *
 * Layout:
 *   Left:   Brand
 *   Centre: Home · Design · Pricing · About
 *   Right:  Account dropdown (signed in) OR Sign in + Get started (guest)
 */
import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LayoutDashboard, Clock, LogOut, ChevronDown, Shield } from 'lucide-react'
import { BrandLockup } from './landing/Brand'
import { useAuth } from '../context/AuthContext'

const ease = [0.16, 1, 0.3, 1]

const NAV_LINKS = [
  { label: 'Home',    to: '/'            },
  { label: 'Design',  to: '/design-room' },
  { label: 'Pricing', to: '/pricing'     },
  { label: 'About',   to: '/about'       },
]

/* ── Responsive CSS injected once ──────────────────────────────────────── */
const NAV_CSS = `
  .pnav-desktop { display: none !important; }
  .pnav-mobile  { display: flex !important; }
  @media (min-width: 768px) {
    .pnav-desktop { display: flex !important; }
    .pnav-mobile  { display: none !important; }
  }
  .pnav-centre {
    position: absolute; left: 50%; transform: translateX(-50%);
    display: none; align-items: center; gap: 2.25rem;
  }
  @media (min-width: 768px) {
    .pnav-centre { display: flex !important; }
  }
`

/* ── Avatar initials ────────────────────────────────────────────────────── */
function Avatar({ name, size = 28 }) {
  const initials = name
    ? name.trim().split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : 'U'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#111111', color: '#FAFAF8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.36), fontWeight: 600,
      fontFamily: 'Inter, sans-serif', flexShrink: 0, userSelect: 'none',
    }}>
      {initials}
    </div>
  )
}

/* ── Single nav link ────────────────────────────────────────────────────── */
function NavLink({ label, to, mobile, onClick }) {
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/' && pathname.startsWith(to))

  if (mobile) {
    return (
      <Link to={to} onClick={onClick} style={{
        display: 'block', padding: '0.9rem 0',
        borderBottom: '1px solid #F0EFEB',
        fontSize: 15, fontFamily: 'Inter, sans-serif',
        fontWeight: active ? 600 : 400,
        color: active ? '#111111' : '#444444',
        textDecoration: 'none',
      }}>
        {label}
      </Link>
    )
  }

  return (
    <Link to={to} style={{
      position: 'relative', fontSize: 13, fontFamily: 'Inter, sans-serif',
      fontWeight: active ? 500 : 400,
      color: active ? '#111111' : '#666666',
      textDecoration: 'none', paddingBottom: 2,
      transition: 'color 0.2s',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#111111' }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#666666' }}>
      {label}
      {active && (
        <motion.span layoutId="pub-nav-line"
          style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 1, background: '#111111' }}
          transition={{ duration: 0.28, ease }} />
      )}
    </Link>
  )
}

/* ── Account dropdown (desktop, signed-in) ─────────────────────────────── */
function AccountDropdown({ user, logout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const go = path => { setOpen(false); navigate(path) }
  const handleLogout = () => { setOpen(false); logout(); navigate('/') }

  const Item = ({ Icon, label, action, danger }) => (
    <button onClick={action} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', padding: '9px 16px', background: 'none', border: 'none',
      cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif',
      color: danger ? '#B42318' : '#444444', textAlign: 'left',
      transition: 'background 0.15s, color 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#F5F4F0'; if (!danger) e.currentTarget.style.color = '#111111' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = danger ? '#B42318' : '#444444' }}>
      <Icon size={13} strokeWidth={1.5} style={{ flexShrink: 0, color: danger ? '#B42318' : '#CCCCCC' }} />
      {label}
    </button>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'none', border: '1px solid',
        borderColor: open ? '#111111' : '#E5E5E5',
        cursor: 'pointer', padding: '5px 10px 5px 6px',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#111111'}
      onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = '#E5E5E5' }}>
        <Avatar name={user.full_name} size={26} />
        <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500,
          color: '#111111', maxWidth: 90, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.full_name?.split(' ')[0] ?? 'Account'}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          style={{ display: 'flex', color: '#AAAAAA' }}>
          <ChevronDown size={12} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.18, ease }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              minWidth: 200, background: '#FAFAF8',
              border: '1px solid #E5E5E5',
              boxShadow: '0 8px 24px rgba(17,17,17,0.09)',
              zIndex: 200,
            }}>
            {/* User info */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0EFEB' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#111111',
                fontFamily: 'Inter, sans-serif', margin: '0 0 2px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name}
              </p>
              <p style={{ fontSize: 11, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </p>
            </div>
            {/* Nav items */}
            <div style={{ padding: '4px 0' }}>
              <Item Icon={LayoutDashboard} label="Dashboard" action={() => go('/dashboard')} />
              <Item Icon={Clock}           label="History"   action={() => go('/history')} />
              {user.role === 'admin' && (
                <Item Icon={Shield} label="Admin Panel" action={() => go('/admin')} />
              )}
            </div>
            <div style={{ height: 1, background: '#F0EFEB', margin: '2px 0' }} />
            <div style={{ padding: '4px 0 6px' }}>
              <Item Icon={LogOut} label="Sign out" action={handleLogout} danger />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Guest buttons (desktop) ────────────────────────────────────────────── */
function GuestButtons() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <Link to="/login" style={{
        fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#666666',
        textDecoration: 'none', transition: 'color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = '#111111'}
      onMouseLeave={e => e.currentTarget.style.color = '#666666'}>
        Sign in
      </Link>
      <Link to="/register" style={{
        display: 'inline-flex', alignItems: 'center',
        fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500,
        color: '#FAFAF8', background: '#111111',
        border: '1px solid #111111', padding: '8px 18px',
        textDecoration: 'none', transition: 'background 0.3s, border-color 0.3s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#1F4E79'; e.currentTarget.style.borderColor = '#1F4E79' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#111111'; e.currentTarget.style.borderColor = '#111111' }}>
        Get started
      </Link>
    </div>
  )
}

/* ── Main export ────────────────────────────────────────────────────────── */
export default function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled,   setScrolled]   = useState(false)
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Close drawer on route change
  useEffect(() => setMobileOpen(false), [pathname])

  // Scroll shadow
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      {/* Inject responsive CSS once */}
      <style>{NAV_CSS}</style>

      {/* ── Bar ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 60,
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(1.25rem, 4vw, 3rem)',
        background: '#FAFAF8',
        borderBottom: scrolled ? '1px solid #E5E5E5' : '1px solid transparent',
        transition: 'border-color 0.3s',
      }}>

        {/* Brand */}
        <Link to="/" style={{ flexShrink: 0, textDecoration: 'none', position: 'relative', zIndex: 1 }}>
          <BrandLockup size={17} />
        </Link>

        {/* Centre links — desktop only */}
        <div className="pnav-centre">
          {NAV_LINKS.map(l => <NavLink key={l.to} {...l} />)}
        </div>

        {/* Right side — desktop */}
        <div className="pnav-desktop" style={{ marginLeft: 'auto', alignItems: 'center', gap: '0.75rem' }}>
          {user
            ? <AccountDropdown user={user} logout={logout} />
            : <GuestButtons />
          }
        </div>

        {/* Right side — mobile */}
        <div className="pnav-mobile" style={{ marginLeft: 'auto', alignItems: 'center', gap: '0.5rem' }}>
          {user && (
            <Link to="/dashboard" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <Avatar name={user.full_name} size={28} />
            </Link>
          )}
          <button onClick={() => setMobileOpen(v => !v)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0.375rem', color: '#111111',
            display: 'flex', alignItems: 'center',
          }}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(17,17,17,0.2)' }}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease }}
              style={{
                position: 'fixed', top: 60, left: 0, right: 0, zIndex: 99,
                background: '#FAFAF8', borderBottom: '1px solid #E5E5E5',
                padding: '0.5rem clamp(1.25rem, 4vw, 2rem) 1.75rem',
              }}>

              {/* Page links */}
              {NAV_LINKS.map(l => (
                <NavLink key={l.to} {...l} mobile onClick={() => setMobileOpen(false)} />
              ))}

              {/* Account section */}
              <div style={{ marginTop: '1.25rem' }}>
                {user ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {/* Profile strip */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '0.875rem 0', borderBottom: '1px solid #F0EFEB', marginBottom: '0.25rem',
                    }}>
                      <Avatar name={user.full_name} size={34} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111111', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                          {user.full_name}
                        </p>
                        <p style={{ fontSize: 11, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {/* Account links */}
                    {[
                      { Icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
                      { Icon: Clock,           label: 'History',   to: '/history'   },
                    ].map(({ Icon, label, to }) => (
                      <Link key={to} to={to} onClick={() => setMobileOpen(false)} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '0.8rem 0', fontSize: 14,
                        color: '#444444', textDecoration: 'none',
                        fontFamily: 'Inter, sans-serif',
                        borderBottom: '1px solid #F8F7F5',
                      }}>
                        <Icon size={14} strokeWidth={1.5} style={{ color: '#BBBBBB' }} />
                        {label}
                      </Link>
                    ))}
                    {user.role === 'admin' && (
                      <Link to="/admin" onClick={() => setMobileOpen(false)} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '0.8rem 0', fontSize: 14,
                        color: '#1F4E79', textDecoration: 'none',
                        fontFamily: 'Inter, sans-serif', borderBottom: '1px solid #F8F7F5',
                      }}>
                        <Shield size={14} strokeWidth={1.5} style={{ color: '#1F4E79' }} />
                        Admin Panel
                      </Link>
                    )}
                    <button onClick={() => { logout(); setMobileOpen(false); navigate('/') }} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '0.8rem 0', fontSize: 14,
                      color: '#B42318', background: 'none', border: 'none',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                      <LogOut size={14} strokeWidth={1.5} style={{ color: '#B42318' }} />
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <Link to="/login" onClick={() => setMobileOpen(false)} style={{
                      display: 'block', textAlign: 'center', padding: '12px',
                      fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                      color: '#111111', border: '1px solid #E5E5E5', textDecoration: 'none',
                    }}>
                      Sign in
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} style={{
                      display: 'block', textAlign: 'center', padding: '12px',
                      fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 600,
                      color: '#FAFAF8', background: '#111111',
                      border: '1px solid #111111', textDecoration: 'none',
                    }}>
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
