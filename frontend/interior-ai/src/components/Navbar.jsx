import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { BrandLockup } from './landing/Brand'

const NAV = [
  { id: 'features',     label: 'Capabilities' },
  { id: 'how-it-works', label: 'Process' },
  { id: 'style-gallery',label: 'Styles' },
  { id: 'generate',     label: 'Start Designing' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled,   setScrolled]   = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12)
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
        className="fixed top-0 left-0 right-0 z-30 bg-white"
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 'clamp(1.25rem, 4vw, 2.5rem)',
          paddingRight: 'clamp(1.25rem, 4vw, 2.5rem)',
          borderBottom: scrolled ? '1px solid #E7E0D5' : '1px solid transparent',
          transition: 'border-color 0.4s',
        }}
      >
        {/* Brand */}
        <button onClick={() => scrollTo('home')} className="select-none">
          <BrandLockup size={18} />
        </button>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-8 ml-12">
          {NAV.slice(0, -1).map(({ id, label }) => (
            <button key={id} onClick={() => scrollTo(id)}
              className="link-underline text-sm text-charcoal/60 hover:text-charcoal transition-colors duration-300"
              style={{ fontFamily: 'Inter, sans-serif' }}>
              {label}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden lg:block ml-auto">
          <button
            onClick={() => scrollTo('generate')}
            className="btn-charcoal text-sm py-2.5 px-5"
          >
            Start Designing
          </button>
        </div>

        {/* Mobile hamburger */}
        <button className="lg:hidden ml-auto text-charcoal p-1.5" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 left-0 right-0 z-20 bg-white border-b border-stone-100 p-5 space-y-1"
          >
            {NAV.map(({ id, label }) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="w-full text-left py-3 text-base text-charcoal/80 hover:text-charcoal border-b border-stone-100 last:border-0 transition-colors">
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
