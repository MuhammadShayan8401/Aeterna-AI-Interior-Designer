/**
 * LandingFeatures.jsx — Four core capabilities in a 2x2 editorial grid.
 * Reduced from 6 blocks to 4. Removed redundant "Professional Visualization"
 * and merged depth + segmentation into pipeline step. Cleaner image usage.
 */
import { motion } from 'framer-motion'
import PhotoFrame from './PhotoFrame'

const ease = [0.16, 1, 0.3, 1]
const inView = { once: true, margin: '-60px' }

const FEATURES = [
  {
    n: '01',
    title: 'AI Room Redesign',
    body: 'Upload any room photo. The system segments its structure, maps depth, and generates a photorealistic redesign in your chosen style.',
    variant: 'feature',
    label: 'Room redesign',
    wide: true,
  },
  {
    n: '02',
    title: 'Empty Room Generation',
    body: 'No photo required. Describe a room in text and generate a fully furnished interior from scratch.',
    variant: 'airy',
    label: 'Empty room generation',
    wide: false,
  },
  {
    n: '03',
    title: 'Adaptive Preferences',
    body: 'Rate results and the ANN-based preference model learns your aesthetic — each generation becomes more you.',
    variant: 'slate',
    label: 'Adaptive preferences',
    wide: false,
  },
  {
    n: '04',
    title: 'Seven Design Styles',
    body: 'Modern, Scandinavian, Japandi, Minimalist, Luxury, Industrial, Contemporary — across both generation modes.',
    variant: 'scandinavian',
    label: 'Interior styles',
    wide: false,
  },
]

export default function LandingFeatures() {
  return (
    <section id="features" style={{ paddingBottom: '4rem', borderTop: '1px solid #E5E5E5', paddingTop: '4rem' }}>

      {/* Section header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '3rem' }}
        className="lg:grid-cols-2 lg:items-end">
        <div>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>Capabilities</span>
          <h2 style={{
            fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
            fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', letterSpacing: '-0.02em',
            color: '#111111', margin: 0, lineHeight: 1.0,
          }}>
            Four ways to redesign.
          </h2>
        </div>
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={inView}
          transition={{ duration: 0.6 }}
          style={{ fontSize: 14, color: '#666666', fontFamily: 'Inter, sans-serif', lineHeight: 1.75, margin: 0 }}>
          SegFormer reads the room. MiDaS maps its depth.
          The ANN learns your taste. Stable Diffusion renders the result.
        </motion.p>
      </div>

      {/* Feature grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}
        className="md:grid-cols-2">
        {FEATURES.map((f, i) => (
          <motion.div key={f.n}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={inView}
            transition={{ duration: 0.7, delay: (i % 2) * 0.08, ease }}
            style={{ display: 'flex', flexDirection: 'column' }}>

            <PhotoFrame
              variant={f.variant}
              label={f.label}
              style={{ width: '100%', aspectRatio: f.wide ? '16/7' : '4/3' }}
            />

            <div style={{ paddingTop: '1.25rem', paddingBottom: '1.75rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '2rem', fontWeight: 400,
                  color: '#E0DDD8', lineHeight: 1,
                }}>
                  {f.n}
                </span>
                <h3 style={{
                  fontFamily: 'Inter, sans-serif', fontWeight: 600,
                  fontSize: 15, color: '#111111', margin: 0,
                }}>
                  {f.title}
                </h3>
              </div>
              <p style={{
                fontSize: 13, color: '#666666',
                fontFamily: 'Inter, sans-serif', lineHeight: 1.72,
                margin: 0, maxWidth: 380,
              }}>
                {f.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
