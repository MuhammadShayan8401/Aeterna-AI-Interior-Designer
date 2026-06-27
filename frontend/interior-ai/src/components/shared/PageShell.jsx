/**
 * PageShell.jsx — Shared layout for all inner pages.
 * Left sidebar (220px) + main content area. Mobile drawer.
 * Design: white sidebar, hairline borders, no shadows.
 */
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, X, LogOut, Wand2, LayoutDashboard, Clock,
  Tag, Info, Shield, Compass
} from 'lucide-react'
import { BrandLockup } from '../landing/Brand'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { href: '/',            label: 'Studio',       Icon: Wand2,          external: true },
  { href: '/dashboard',   label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/design-room', label: 'Design Room',  Icon: Compass },
  { href: '/history',     label: 'History',      Icon: Clock           },
  { href: '/pricing',     label: 'Pricing',      Icon: Tag             },
  { href: '/about',       label: 'About',        Icon: Info            },
]

function SidebarContent({ location, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
    onClose?.()
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#FAFAF8', borderRight: '1px solid #E5E5E5', width: 220,
    }}>
      {/* Brand */}
      <div style={{
        padding: '1.25rem 1.25rem', borderBottom: '1px solid #E5E5E5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 64,
      }}>
        <Link to="/" onClick={onClose} style={{ textDecoration: 'none' }}>
          <BrandLockup size={16} />
        </Link>
        {onClose && (
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888882', padding: '0.25rem' }}
            className="lg:hidden">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
        {NAV.map(({ href, label, Icon, external }) => {
          const active = !external && location.pathname === href
          const inner = (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 0.875rem',
              fontSize: 13, fontFamily: 'Inter, sans-serif',
              color: active ? '#111111' : '#888882',
              fontWeight: active ? 500 : 400,
              background: active ? '#F0EFEB' : 'transparent',
              transition: 'color 0.2s, background 0.2s',
              cursor: 'pointer', textDecoration: 'none', borderRadius: 0,
            }}>
              <Icon size={14} strokeWidth={1.5}
                style={{ color: active ? '#111111' : '#BBBBBB', flexShrink: 0 }} />
              {label}
              {active && (
                <span style={{
                  marginLeft: 'auto', width: 3, height: 3, borderRadius: '50%', background: '#111111', flexShrink: 0
                }} />
              )}
            </span>
          )
          if (external) return (
            <a key={href} href={href} onClick={onClose}
              style={{ display: 'block', textDecoration: 'none' }}
              onMouseEnter={e => { if (!active) e.currentTarget.querySelector('span').style.color = '#111111' }}
              onMouseLeave={e => { if (!active) e.currentTarget.querySelector('span').style.color = '#888882' }}>
              {inner}
            </a>
          )
          return (
            <Link key={href} to={href} onClick={onClose}
              style={{ display: 'block', textDecoration: 'none' }}>
              {inner}
            </Link>
          )
        })}

        {user?.role === 'admin' && (
          <>
            <div style={{ height: 1, background: '#E5E5E5', margin: '0.75rem 0.875rem' }} />
            <Link to="/admin" onClick={onClose} style={{ display: 'block', textDecoration: 'none' }}>
              <span style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.875rem', fontSize: 13, fontFamily: 'Inter, sans-serif',
                color: location.pathname === '/admin' ? '#111111' : '#888882',
                fontWeight: location.pathname === '/admin' ? 500 : 400,
                background: location.pathname === '/admin' ? '#F0EFEB' : 'transparent',
              }}>
                <Shield size={14} strokeWidth={1.5} style={{ color: location.pathname === '/admin' ? '#111111' : '#BBBBBB' }} />
                Admin Panel
              </span>
            </Link>
          </>
        )}
      </nav>

      {/* User footer */}
      {user && (
        <div style={{ borderTop: '1px solid #E5E5E5', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: 28, height: 28, background: '#111111', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ color: '#FAFAF8', fontSize: 10, fontWeight: 600 }}>
                {user.full_name?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#111111', fontFamily: 'Inter, sans-serif',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {user.full_name}
              </p>
              <p style={{ fontSize: 10, color: '#888882', fontFamily: 'Inter, sans-serif',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '1px 0 0' }}>
                {user.email}
              </p>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 11, color: '#888882', fontFamily: 'Inter, sans-serif',
              padding: 0, transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#111111'}
            onMouseLeave={e => e.currentTarget.style.color = '#888882'}>
            <LogOut size={11} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function PageShell({ children, title }) {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex" style={{ flexShrink: 0, position: 'sticky', top: 0, height: '100vh', flexDirection: 'column' }}>
        <SidebarContent location={location} />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(17,17,17,0.25)' }}
              className="lg:hidden"
              onClick={() => setDrawerOpen(false)} />
            <motion.div initial={{ x: -220 }} animate={{ x: 0 }} exit={{ x: -220 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, display: 'flex', flexDirection: 'column' }}
              className="lg:hidden">
              <SidebarContent location={location} onClose={() => setDrawerOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'auto' }}>
        {/* Top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20, background: '#FAFAF8',
          borderBottom: '1px solid #E5E5E5', padding: '0 2rem',
          height: 56, display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888882', padding: '0.25rem' }}>
            <Menu size={17} />
          </button>
          <span className="eyebrow">{title}</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '2.5rem clamp(1.5rem, 3vw, 2.5rem)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
