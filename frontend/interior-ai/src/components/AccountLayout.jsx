/**
 * AccountLayout.jsx
 * Layout for authenticated account pages (Dashboard, History).
 * Uses the shared PublicNav at the top, then a subtle breadcrumb/tab bar
 * with Dashboard and History tabs, then the page content.
 * No sidebar — full-width editorial layout.
 */
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { LayoutDashboard, Clock, Shield, LogOut } from 'lucide-react'
import PublicNav from './PublicNav'
import Footer    from './Footer'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { label: 'Dashboard', to: '/dashboard', Icon: LayoutDashboard },
  { label: 'History',   to: '/history',   Icon: Clock           },
]

function AccountTab({ label, to, Icon }) {
  const { pathname } = useLocation()
  const active = pathname === to

  return (
    <Link to={to} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '0 0 12px', marginRight: '2rem',
      fontSize: 13, fontFamily: 'Inter, sans-serif',
      fontWeight: active ? 500 : 400,
      color: active ? '#111111' : '#888882',
      textDecoration: 'none', position: 'relative',
      borderBottom: active ? '1px solid #111111' : '1px solid transparent',
      transition: 'color 0.2s',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#444444' }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#888882' }}>
      <Icon size={13} strokeWidth={1.5} />
      {label}
    </Link>
  )
}

export default function AccountLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user, navigate])

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', flexDirection: 'column' }}>
      <PublicNav />

      {/* Account header bar */}
      <div style={{ paddingTop: 60, borderBottom: '1px solid #E5E5E5', background: '#FAFAF8' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(1.5rem, 4vw, 3rem)' }}>

          {/* Page heading */}
          <div style={{ paddingTop: '2rem', paddingBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                {subtitle && (
                  <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>{subtitle}</span>
                )}
                <h1 style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontWeight: 500, fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                  letterSpacing: '-0.018em', color: '#111111', margin: 0,
                }}>
                  {title}
                </h1>
              </div>

              {/* User chip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: '#111111',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ color: '#FAFAF8', fontSize: 11, fontWeight: 600 }}>
                    {user.full_name?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                </div>
                <div style={{ display: 'none' }} className="hidden sm:block">
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#111111', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                    {user.full_name}
                  </p>
                  <p style={{ fontSize: 10, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                    {user.email}
                  </p>
                </div>
                {user.role === 'admin' && (
                  <Link to="/admin" style={{
                    fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                    color: '#1F4E79', background: '#EEF3F8', border: '1px solid #C8D9E8',
                    padding: '3px 8px', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Shield size={9} /> Admin
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'flex-end', borderTop: '1px solid #F0EFEB', paddingTop: '0.875rem' }}>
            {TABS.map(t => <AccountTab key={t.to} {...t} />)}
          </div>
        </div>
      </div>

      {/* Page body */}
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem clamp(1.5rem, 4vw, 3rem) 5rem' }}>
          {children}
        </div>
      </main>

      <Footer />
    </div>
  )
}
