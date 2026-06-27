/**
 * SiteNav.jsx — Top navigation for the landing page (/).
 * Replaces Navbar.jsx for the public-facing site.
 * Shows auth links; smooth scroll for anchor sections.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { BrandLockup } from './landing/Brand'
import { useAuth } from '../context/AuthContext'

const ANCHORS = [
  { id: 'features',      label: 'Capabilities' },
  { id: 'how-it-works',  label: 'Process' },
  { id: 'style-gallery', label: 'Styles' },
]

export default function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled,   setScrolled]   = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileOpen(false)
  }, [])

  return (
    <>
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
          height: 64, display: 'flex', alignItems: 'center',
          paddingLeft: 'clamp(1.5rem, 4vw, 3rem)',
          paddingRight: 'clamp(1.5rem, 4vw, 3rem)',
          background: '#FAFAF8',
          borderBottom: scrolled ? '1px solid #E5E5E5' : '1px solid transparent',
          transition: 'border-color 0.4s',
        }}
      >
        <button onClick={() => scrollTo('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <BrandLockup size={18} />
        </button>

        {/* Desktop nav */}
        <div style={{ display: 'none', alignItems: 'center', gap: '2.5rem', marginLeft: '3rem' }}
          className="hidden lg:flex">
          {ANCHORS.map(({ id, label }) => (
            <button key={id} onClick={() => scrollTo(id)} className="link-underline"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
                fontFamily: 'Inter, sans-serif', color: '#666666', padding: 0 }}>
              {label}
            </button>
          ))}
          <Link to="/about" className="link-underline"
            style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#666666', textDecoration: 'none' }}>
            About
          </Link>
          <Link to="/pricing" className="link-underline"
            style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#666666', textDecoration: 'none' }}>
            Pricing
          </Link>
        </div>

        {/* Desktop right */}
        <div style={{ marginLeft: 'auto', display: 'none', alignItems: 'center', gap: '1rem' }}
          className="hidden lg:flex">
          {user ? (
            <>
              <Link to="/dashboard"
                style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#666666', textDecoration: 'none' }}
                className="link-underline">
                Dashboard
              </Link>
              <Link to="/design-room" className="btn-primary" style={{ padding: '10px 24px', fontSize: 12 }}>
                Design Room
              </Link>
            </>
          ) : (
            <>
              <Link to="/login"
                style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#666666', textDecoration: 'none' }}
                className="link-underline">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '10px 24px', fontSize: 12 }}>
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(v => !v)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '0.375rem', color: '#111111' }}
          className="lg:hidden">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', top: 64, left: 0, right: 0, zIndex: 20,
              background: '#FAFAF8', borderBottom: '1px solid #E5E5E5',
              padding: '1.25rem clamp(1.5rem, 4vw, 3rem) 1.5rem',
            }}>
            {ANCHORS.map(({ id, label }) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  borderBottom: '1px solid #E5E5E5', padding: '0.875rem 0',
                  fontSize: 15, color: '#111111', fontFamily: 'Inter, sans-serif', cursor: 'pointer'
                }}>
                {label}
              </button>
            ))}
            <Link to="/about" onClick={() => setMobileOpen(false)}
              style={{ display: 'block', borderBottom: '1px solid #E5E5E5', padding: '0.875rem 0',
                fontSize: 15, color: '#111111', fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}>
              About
            </Link>
            <Link to="/pricing" onClick={() => setMobileOpen(false)}
              style={{ display: 'block', borderBottom: '1px solid #E5E5E5', padding: '0.875rem 0',
                fontSize: 15, color: '#111111', fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}>
              Pricing
            </Link>
            {user ? (
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}
                style={{ display: 'block', padding: '0.875rem 0',
                  fontSize: 15, color: '#111111', fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}>
                Dashboard
              </Link>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}
                style={{ display: 'block', padding: '0.875rem 0',
                  fontSize: 15, color: '#111111', fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}>
                Sign in
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
