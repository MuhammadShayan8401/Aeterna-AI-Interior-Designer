/**
 * LandingHowItWorks.jsx — Stripped to 4 steps (was 5). Removed scroll parallax.
 * Clean numbered list, no image, purely typographic.
 */
import { motion } from 'framer-motion'

const ease = [0.16, 1, 0.3, 1]
const inView = { once: true, margin: '-60px' }

const STEPS = [
  {
    n: '01',
    title: 'Upload or describe',
    body: 'Drop in a room photograph, or describe a space you want to create. Both modes support the full style range.',
  },
  {
    n: '02',
    title: 'Choose a style',
    body: 'Select from seven styles — Modern, Scandinavian, Japandi, Minimalist, Luxury, Industrial, Contemporary.',
  },
  {
    n: '03',
    title: 'Generate',
    body: 'SegFormer segments the room. MiDaS maps its depth. The preference ANN ranks candidates. Stable Diffusion renders. 30–90 seconds on GPU.',
  },
  {
    n: '04',
    title: 'Rate and refine',
    body: 'Rate what works. The model learns your taste. Each generation becomes more aligned to your aesthetic.',
  },
]

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" style={{ paddingTop: '4rem', paddingBottom: '4rem', borderTop: '1px solid #E5E5E5' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }}
        className="lg:grid-cols-[280px_1fr] lg:items-start">

        {/* Left: heading */}
        <div>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>Process</span>
          <h2 style={{
            fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
            fontSize: 'clamp(1.8rem, 2.8vw, 2.4rem)', letterSpacing: '-0.02em',
            color: '#111111', margin: '0 0 1rem', lineHeight: 1.05,
          }}>
            Four steps.<br />No friction.
          </h2>
          <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', lineHeight: 1.7, margin: 0 }}>
            From photograph to reimagined interior in under two minutes.
          </p>
        </div>

        {/* Right: steps */}
        <div>
          {STEPS.map((step, i) => (
            <motion.div key={step.n}
              initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={inView}
              transition={{ duration: 0.55, delay: i * 0.07, ease }}
              style={{
                display: 'grid', gridTemplateColumns: '2.5rem 1fr',
                gap: '1rem', paddingBottom: '2rem',
                borderBottom: i < STEPS.length - 1 ? '1px solid #F0EFEB' : 'none',
                marginBottom: i < STEPS.length - 1 ? '2rem' : 0,
                alignItems: 'start',
              }}>
              <span style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontWeight: 400, fontSize: '1.5rem',
                color: '#DEDAD5', lineHeight: 1.1, paddingTop: 2,
              }}>
                {step.n}
              </span>
              <div>
                <h3 style={{
                  fontSize: 14, fontWeight: 600, color: '#111111',
                  fontFamily: 'Inter, sans-serif', margin: '0 0 0.5rem',
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: 13, color: '#666666',
                  fontFamily: 'Inter, sans-serif', lineHeight: 1.72, margin: 0,
                }}>
                  {step.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
