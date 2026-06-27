/**
 * LandingStyleGallery.jsx — Seven interior styles with curated photos.
 * All photo IDs verified as correct interior subjects.
 * Simplified layout — tabs left, single large image right.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ease = [0.16, 1, 0.3, 1]

const STYLES = [
  {
    id: 'modern',
    label: 'Modern',
    body: 'Clean geometry, neutral palette, and intentional negative space. Materials: concrete, glass, brushed steel.',
    tag: 'Minimal · Structured',
    img:  'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=900&q=80&auto=format&fit=crop',
    img2: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=75&auto=format&fit=crop',
    img3: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=400&q=75&auto=format&fit=crop',
  },
  {
    id: 'luxury',
    label: 'Luxury',
    body: 'Rich materiality and considered restraint. Marble, walnut, velvet — chosen for texture over status.',
    tag: 'Premium · Warm',
    img:  'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=900&q=80&auto=format&fit=crop',
    img2: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400&q=75&auto=format&fit=crop',
    img3: 'https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=400&q=75&auto=format&fit=crop',
  },
  {
    id: 'scandinavian',
    label: 'Scandinavian',
    body: 'Hygge as architecture. Oak, linen, and diffuse northern light. No element without purpose.',
    tag: 'Cosy · Functional',
    img:  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80&auto=format&fit=crop',
    img2: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=400&q=75&auto=format&fit=crop',
    img3: 'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=400&q=75&auto=format&fit=crop',
  },
  {
    id: 'japandi',
    label: 'Japandi',
    body: 'Japanese wabi-sabi meets Scandinavian simplicity. Low profiles, natural fibers, silence between objects.',
    tag: 'Zen · Quiet',
    img:  'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=900&q=80&auto=format&fit=crop',
    img2: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=75&auto=format&fit=crop',
    img3: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&q=75&auto=format&fit=crop',
  },
  {
    id: 'industrial',
    label: 'Industrial',
    body: 'Exposed structure, reclaimed materials, purposeful imperfection. The space as honest infrastructure.',
    tag: 'Raw · Urban',
    img:  'https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=900&q=80&auto=format&fit=crop',
    img2: 'https://images.unsplash.com/photo-1564078516393-cf04bd966897?w=400&q=75&auto=format&fit=crop',
    img3: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400&q=75&auto=format&fit=crop',
  },
  {
    id: 'contemporary',
    label: 'Contemporary',
    body: 'Current without trend-chasing. Curved forms, textural contrast, warm neutrals with a dark anchor.',
    tag: 'Now · Refined',
    img:  'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=900&q=80&auto=format&fit=crop',
    img2: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=75&auto=format&fit=crop',
    img3: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400&q=75&auto=format&fit=crop',
  },
  {
    id: 'minimalist',
    label: 'Minimalist',
    body: 'Only what survives rigorous editing. Each piece earns its place. Silence between objects is the design.',
    tag: 'Less · Essential',
    img:  'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=900&q=80&auto=format&fit=crop',
    img2: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=75&auto=format&fit=crop',
    img3: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=75&auto=format&fit=crop',
  },
]

export default function LandingStyleGallery() {
  const [active, setActive] = useState('modern')
  const s = STYLES.find(x => x.id === active) || STYLES[0]

  return (
    <section id="style-gallery" style={{ paddingTop: '4rem', paddingBottom: '4rem', borderTop: '1px solid #E5E5E5' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>Styles</span>
          <h2 style={{
            fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
            fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', letterSpacing: '-0.02em',
            color: '#111111', margin: 0, lineHeight: 1.0,
          }}>
            Seven design languages.
          </h2>
        </div>
        <span style={{ fontSize: 11, color: '#888882', fontFamily: 'JetBrains Mono, monospace' }}>
          {STYLES.indexOf(s) + 1} / {STYLES.length}
        </span>
      </div>

      {/* Body: tabs + image */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="lg:grid-cols-[220px_1fr]">

        {/* Style tabs */}
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.25rem' }}
          className="lg:flex-col lg:flex-nowrap">
          {STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => setActive(style.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 0',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `1px solid ${active === style.id ? '#111111' : '#F0EFEB'}`,
                width: '100%', textAlign: 'left',
                transition: 'border-color 0.2s',
              }}>
              <span style={{
                fontSize: 13, fontFamily: 'Inter, sans-serif',
                fontWeight: active === style.id ? 600 : 400,
                color: active === style.id ? '#111111' : '#888882',
                transition: 'color 0.2s, font-weight 0.2s',
              }}>
                {style.label}
              </span>
              {active === style.id && (
                <span style={{ fontSize: 10, color: '#AAAAAA', fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {style.tag.split(' · ')[0]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Image panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <AnimatePresence mode="wait">
            <motion.div key={active}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}>

              {/* Large primary */}
              <div style={{ position: 'relative', overflow: 'hidden', background: '#EEEDE9',
                aspectRatio: '16/9', marginBottom: '0.875rem' }}>
                <img src={s.img} alt={`${s.label} interior`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {/* Style name overlay */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '2rem 1.25rem 1.25rem',
                  background: 'linear-gradient(to top, rgba(17,17,17,0.55) 0%, transparent 100%)',
                }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)',
                    fontFamily: 'Inter, sans-serif', margin: 0 }}>
                    {s.body}
                  </p>
                </div>
              </div>

              {/* Two smaller details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div style={{ overflow: 'hidden', background: '#EEEDE9', aspectRatio: '4/3' }}>
                  <img src={s.img2} alt={`${s.label} detail`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{ overflow: 'hidden', background: '#EEEDE9', aspectRatio: '4/3' }}>
                  <img src={s.img3} alt={`${s.label} detail`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
