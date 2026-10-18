/**
 * Before/after demo — the original Unsplash pair. If Unsplash can't be reached (blocked, offline),
 * it falls back to a bundled real before/after so the slider is never empty.
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import CompareSlider from '../CompareSlider'

const BEFORE = 'https://images.unsplash.com/photo-1560448075-bb485b1a262a?w=1200&q=80&auto=format&fit=crop'
const AFTER  = 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1200&q=80&auto=format&fit=crop'
const base = import.meta.env.BASE_URL
const LOCAL = { before: `${base}samples/before.jpg`, after: `${base}samples/after.jpg`, aspect: '1 / 1' }

const loads = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(true); i.onerror = () => ok(false); i.src = src })

export default function LandingBeforeAfter() {
  const [pair, setPair] = useState({ before: BEFORE, after: AFTER, aspect: '16 / 9' })
  useEffect(() => {
    let live = true
    Promise.all([loads(BEFORE), loads(AFTER)]).then(([a, b]) => { if (live && !(a && b)) setPair(LOCAL) })
    return () => { live = false }
  }, [])

  return (
    <section style={{ paddingTop: '4rem', paddingBottom: '4rem', borderTop: '1px solid #E5E5E5' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>Transformation</span>
          <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
            letterSpacing: '-0.02em', color: '#111', margin: 0, lineHeight: 1 }}>Before and after.</h2>
        </div>
        <p style={{ fontSize: 12, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>Drag the handle to compare</p>
      </div>
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8 }}>
        <CompareSlider before={pair.before} after={pair.after} aspect={pair.aspect} />
      </motion.div>
    </section>
  )
}
