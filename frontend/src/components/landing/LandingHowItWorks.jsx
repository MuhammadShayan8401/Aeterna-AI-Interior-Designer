/**
 * LandingHowItWorks.jsx — Stripped to 4 steps (was 5). Removed scroll parallax.
 * Clean numbered list, no image, purely typographic.
 */
import { motion } from 'framer-motion'

const ease = [0.16, 1, 0.3, 1]
const inView = { once: true, margin: '-60px' }

const STEPS = [
  { n: '01', title: 'Add your room', body: 'Upload a photo, or skip it and describe the room you want to create.' },
  { n: '02', title: 'Pick a look', body: 'Choose a style, how furnished it should be, and how much you want to change.' },
  { n: '03', title: 'Compare and keep', body: 'Generation takes a minute or two. Drag to compare with your original, download your favourites, and like what you love.' },
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
            Three steps.<br />No sign-up.
          </h2>
          <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', lineHeight: 1.7, margin: 0 }}>
            From photo to reimagined room in a couple of minutes.
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
