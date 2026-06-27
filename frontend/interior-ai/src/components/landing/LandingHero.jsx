/**
 * LandingHero.jsx — Stripped-back hero. One headline, one image, two CTAs.
 * Removed: capability strip, secondary image column clutter.
 */
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import PhotoFrame from './PhotoFrame'

const ease = [0.16, 1, 0.3, 1]

export default function LandingHero() {
  return (
    <section id="home" style={{ paddingTop: '3.5rem', paddingBottom: '4rem' }}>

      {/* Eyebrow */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <span style={{ width: 20, height: 1, background: 'rgba(17,17,17,0.2)', display: 'block' }} />
        <span className="eyebrow">AI-Powered Interior Design</span>
      </motion.div>

      {/* Headline + subtext in split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2.5rem' }}
        className="lg:grid-cols-[1fr_320px] lg:items-end">
        <motion.h1
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.07, ease }}
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontWeight: 500,
            fontSize: 'clamp(2.6rem, 6vw, 5.2rem)',
            lineHeight: 0.97,
            letterSpacing: '-0.025em',
            color: '#111111',
            margin: 0,
          }}>
          Transform Any Space<br />
          <em style={{ fontStyle: 'italic', color: '#333333' }}>Into Its Best Version</em>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.25, ease }}>
          <p style={{ fontSize: 14, color: '#666666', fontFamily: 'Inter, sans-serif',
            lineHeight: 1.75, margin: '0 0 1.5rem' }}>
            Upload a room photo or describe a space from scratch.
            The four-stage AI pipeline redesigns it in seconds.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/design-room"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 20px', fontSize: 13, fontFamily: 'Inter, sans-serif',
                fontWeight: 500, letterSpacing: '0.03em',
                color: '#FAFAF8', background: '#111111', border: '1px solid #111111',
                textDecoration: 'none', transition: 'background 0.35s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1F4E79'}
              onMouseLeave={e => e.currentTarget.style.background = '#111111'}>
              <span>Start designing</span>
              <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
            <Link to="/register"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '12px 20px', fontSize: 12, fontFamily: 'Inter, sans-serif',
                color: '#666666', background: 'transparent',
                border: '1px solid #E5E5E5', textDecoration: 'none',
                transition: 'border-color 0.25s, color 0.25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#111111'; e.currentTarget.style.color = '#111111' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.color = '#666666' }}>
              Free — 10 generations included
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Full-width hero image */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 1.1, delay: 0.35, ease }}>
        <PhotoFrame
          variant="hero"
          label="AI-generated interior — modern living room"
          style={{ width: '100%', aspectRatio: '21/9' }}>
          <div style={{ position: 'absolute', top: 16, left: 16 }}>
            <span style={{
              display: 'inline-block', padding: '4px 12px',
              fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#666666', background: 'rgba(250,250,248,0.88)',
            }}>
              AI Generated
            </span>
          </div>
        </PhotoFrame>
      </motion.div>

    </section>
  )
}
