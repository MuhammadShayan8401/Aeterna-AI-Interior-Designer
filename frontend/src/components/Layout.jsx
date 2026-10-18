/** Layout — sticky nav + footer shared by every page. */
import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Github } from 'lucide-react'
import { BrandLockup } from './landing/Brand'
import { useAuth } from '../context/AuthContext'
import VerifyBanner from './VerifyBanner'
import { useT, LangToggle } from '../i18n'

const PUBLIC_LINKS = [
  { label: 'Home', to: '/', end: true },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
]
const USER_LINKS = [
  { label: 'Home', to: '/', end: true },
  { label: 'Studio', to: '/studio' },
  { label: 'History', to: '/history' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
]

const linkStyle = (active) => ({
  fontSize: 13, fontFamily: 'Inter, sans-serif', textDecoration: 'none',
  color: active ? '#111' : '#666', fontWeight: active ? 500 : 400,
  borderBottom: `1px solid ${active ? '#111' : 'transparent'}`, paddingBottom: 2,
})

function UserMenu({ user, onNavigate }) {
  const { t } = useT()
  const { logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  const item = { display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13, background: 'none',
    border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: '#444', textDecoration: 'none' }
  return (
    <div style={{ position: 'relative' }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
      <button onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} style={{
        display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid #E5E5E5', cursor: 'pointer', padding: '5px 12px 5px 6px' }}>
        <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#111', color: '#FAFAF8', fontSize: 10, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials}</span>
        <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'Inter, sans-serif', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name.split(/\s+/)[0]}</span>
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 190, background: '#FAFAF8', border: '1px solid #E5E5E5', boxShadow: '0 12px 30px rgba(17,17,17,.08)' }}>
          <p style={{ margin: 0, padding: '10px 16px', fontSize: 11, color: '#999', borderBottom: '1px solid #F0EFEB', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
          <Link role="menuitem" to="/account" style={item} onClick={() => { setOpen(false); onNavigate?.() }}>{t('Account')}</Link>
          <button role="menuitem" style={{ ...item, color: '#B42318' }} onClick={async () => { setOpen(false); await logout(); nav('/') }}>{t('Sign out')}</button>
        </div>
      )}
    </div>
  )
}

function Nav() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const LINKS = user ? USER_LINKS : PUBLIC_LINKS
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 60,
      background: 'rgba(250,250,248,0.94)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #E5E5E5' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', height: '100%', padding: '0 clamp(1.5rem,4vw,3rem)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none' }} onClick={() => setOpen(false)}><BrandLockup size={17} /></Link>

        <nav className="hidden md:flex" style={{ gap: '2rem', alignItems: 'center' }}>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              style={({ isActive }) => linkStyle(isActive)}>{t(l.label)}</NavLink>
          ))}
        </nav>

        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 10 }}>
          <LangToggle />
          {user ? <UserMenu user={user} /> : (<>
            <Link to="/login" style={{ ...linkStyle(false), padding: '0 6px' }}>{t('Sign in')}</Link>
            <Link to="/register" className="btn-primary" style={{ padding: '9px 20px', fontSize: 12 }}>{t('Get started')}</Link>
          </>)}
        </div>

        <button className="md:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111' }}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden" style={{ background: '#FAFAF8', borderBottom: '1px solid #E5E5E5',
          padding: '0.5rem clamp(1.5rem,4vw,3rem) 1rem' }}>
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} style={{
              display: 'block', padding: '0.85rem 0', borderBottom: '1px solid #F0EFEB',
              fontSize: 15, fontFamily: 'Inter, sans-serif', textDecoration: 'none',
              color: pathname === l.to ? '#111' : '#555', fontWeight: pathname === l.to ? 600 : 400,
            }}>{t(l.label)}</Link>
          ))}
          {user ? (<>
            <Link to="/account" onClick={() => setOpen(false)} style={{ display: 'block', padding: '0.85rem 0', borderBottom: '1px solid #F0EFEB', fontSize: 15, fontFamily: 'Inter, sans-serif', textDecoration: 'none', color: '#555' }}>{t('Account')}</Link>
            <button onClick={async () => { setOpen(false); await logout(); nav('/') }} style={{ display: 'block', padding: '0.85rem 0', background: 'none', border: 'none', fontSize: 15, fontFamily: 'Inter, sans-serif', color: '#B42318', cursor: 'pointer' }}>Sign out</button>
          </>) : (
            <div style={{ display: 'flex', gap: 10, paddingTop: 14 }}>
              <Link to="/login" onClick={() => setOpen(false)} className="btn-outline" style={{ flex: 1 }}>{t('Sign in')}</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-primary" style={{ flex: 1 }}>{t('Get started')}</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

const COLS = [
  { title: 'Product', links: [['Studio', '/studio'], ['History', '/history'], ['Pricing', '/pricing'], ['About', '/about']] },
  { title: 'Account', links: [['Sign in', '/login'], ['Create account', '/register'], ['Reset password', '/forgot'], ['My account', '/account']] },
  { title: 'Legal', links: [['Terms & Conditions', '/terms'], ['Privacy Policy', '/privacy'], ['Refund Policy', '/refunds']] },
]
const FL = { fontSize: 13, color: '#666', textDecoration: 'none', fontFamily: 'Inter, sans-serif', lineHeight: 2 }

function Footer() {
  const { t } = useT()
  return (
    <footer style={{ borderTop: '1px solid #E5E5E5', background: '#F5F4F0' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '3.5rem clamp(1.5rem,4vw,3rem) 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '2.5rem' }}>
          <div style={{ gridColumn: 'span 2', minWidth: 220 }}>
            <BrandLockup size={16} />
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#777', fontFamily: 'Inter, sans-serif', maxWidth: 340, margin: '1rem 0' }}>
              {t('AI interior design for homes, studios and renovation projects. Upload a photo or describe a room and see it restyled in minutes.')}
            </p>
            <a href="mailto:m.shayan.8401@gmail.com" style={{ ...FL, display: 'block' }}>Support: m.shayan.8401@gmail.com</a>
            <a href="https://github.com/MuhammadShayan8401" target="_blank" rel="noreferrer"
              style={{ ...FL, display: 'inline-flex', gap: 6, alignItems: 'center' }}><Github size={13} /> GitHub</a>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#999', fontFamily: 'Inter, sans-serif', marginBottom: 10 }}>{t(c.title)}</div>
              {c.links.map(([l, to]) => <Link key={to} to={to} style={{ ...FL, display: 'block' }}>{t(l)}</Link>)}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E5E5E5', display: 'flex', flexWrap: 'wrap',
          gap: '.75rem 1.5rem', justifyContent: 'space-between', fontSize: 12, color: '#999', fontFamily: 'Inter, sans-serif' }}>
          <span>© {new Date().getFullYear()} Aeterna. {t('All rights reserved.')}</span>
          <span>{t('Payments accepted via Easypaisa · Prices in PKR · Made in Karachi, Pakistan')}</span>
        </div>
      </div>
    </footer>
  )
}

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FAFAF8' }}>
      <Nav />
      <main style={{ flex: 1, paddingTop: 60 }}><VerifyBanner />{children}</main>
      <Footer />
    </div>
  )
}
