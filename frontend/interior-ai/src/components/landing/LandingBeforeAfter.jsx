/**
 * LandingBeforeAfter.jsx — Interactive before/after drag slider.
 * Before: plain empty room (photo-1560448075)
 * After:  luxury AI-redesigned room (photo-1631679706909)
 * Simplified: removed verbose labels, tighter layout.
 */
import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

const ease = [0.16, 1, 0.3, 1]
const inView = { once: true, margin: '-60px' }

const BEFORE_IMG = 'https://images.unsplash.com/photo-1560448075-bb485b1a262a?w=1200&q=80&auto=format&fit=crop'
const AFTER_IMG  = 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1200&q=80&auto=format&fit=crop'

function Slider() {
  const [split, setSplit] = useState(50)
  const containerRef = useRef(null)
  const dragging = useRef(false)

  const getX = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return 50
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
  }, [])

  const onStart = useCallback((e) => {
    dragging.current = true
    setSplit(getX(e))
    e.preventDefault()
  }, [getX])

  const onMove = useCallback((e) => {
    if (!dragging.current) return
    setSplit(getX(e))
  }, [getX])

  const onEnd = useCallback(() => { dragging.current = false }, [])

  return (
    <div
      ref={containerRef}
      onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
      onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
      style={{
        position: 'relative', width: '100%', aspectRatio: '16/9',
        overflow: 'hidden', cursor: 'ew-resize', userSelect: 'none',
        background: '#EEEDE9',
      }}>

      {/* After image (full width, underneath) */}
      <img src={AFTER_IMG} alt="After — AI redesigned interior"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Before image (clipped) */}
      <div style={{ position: 'absolute', inset: 0, width: `${split}%`, overflow: 'hidden' }}>
        <img src={BEFORE_IMG} alt="Before — original room"
          style={{ position: 'absolute', inset: 0, width: `${10000 / split}%`, maxWidth: 'none', height: '100%', objectFit: 'cover' }} />
        {/* Before label */}
        <div style={{ position: 'absolute', bottom: 14, left: 14 }}>
          <span style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 500,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#666666', background: 'rgba(250,250,248,0.88)', padding: '3px 10px' }}>
            Before
          </span>
        </div>
      </div>

      {/* After label */}
      <div style={{ position: 'absolute', bottom: 14, right: 14 }}>
        <span style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 500,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.8)', padding: '3px 10px',
          background: 'rgba(17,17,17,0.35)' }}>
          After
        </span>
      </div>

      {/* Divider line */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: `${split}%`, width: 1,
        background: 'rgba(255,255,255,0.7)',
        transform: 'translateX(-50%)',
      }}>
        {/* Handle */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 32, height: 32,
          background: '#FAFAF8', border: '1px solid #E5E5E5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(17,17,17,0.12)',
        }}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path d="M4 1L1 5L4 9M10 1L13 5L10 9" stroke="#888882" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

export default function LandingBeforeAfter() {
  return (
    <section style={{ paddingTop: '4rem', paddingBottom: '4rem', borderTop: '1px solid #E5E5E5' }}>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>Transformation</span>
          <h2 style={{
            fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
            fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', letterSpacing: '-0.02em',
            color: '#111111', margin: 0, lineHeight: 1.0,
          }}>
            Before and after.
          </h2>
        </div>
        <p style={{ fontSize: 12, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>
          Drag to compare
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
        viewport={inView} transition={{ duration: 0.8, ease }}>
        <Slider />
      </motion.div>
    </section>
  )
}
