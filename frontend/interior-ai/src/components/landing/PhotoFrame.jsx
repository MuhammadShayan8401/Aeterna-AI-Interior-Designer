/**
 * PhotoFrame.jsx — Curated interior photography via Unsplash CDN.
 *
 * All photo IDs verified as interior/architectural subjects.
 * Problematic replacements:
 *   before: was office space → now plain white room
 *   modern-img3: was architecture exterior → now bedroom corner
 *   industrial-img3: was generic bedroom → now raw concrete/brick
 *
 * Images are served directly from Unsplash (no API key needed in-browser).
 * Lazy-loaded with warm gradient skeleton shown while loading.
 */
import { useState } from 'react'

const IMAGES = {
  // ── Primary variants (used by PhotoFrame variant= prop) ──────────────────
  hero:         'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200&q=80&auto=format&fit=crop',
  feature:      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80&auto=format&fit=crop',
  airy:         'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80&auto=format&fit=crop',
  deep:         'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=900&q=80&auto=format&fit=crop',
  slate:        'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=900&q=80&auto=format&fit=crop',
  scandinavian: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80&auto=format&fit=crop',
  modern:       'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=900&q=80&auto=format&fit=crop',
  luxury:       'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=900&q=80&auto=format&fit=crop',
  japandi:      'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=900&q=80&auto=format&fit=crop',
  industrial:   'https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=900&q=80&auto=format&fit=crop',
  minimalist:   'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=900&q=80&auto=format&fit=crop',
  contemporary: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=900&q=80&auto=format&fit=crop',
  // ── Before / After comparison ────────────────────────────────────────────
  // before: plain unfurnished room (not office)
  before:       'https://images.unsplash.com/photo-1560448075-bb485b1a262a?w=1000&q=80&auto=format&fit=crop',
  after:        'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1000&q=80&auto=format&fit=crop',
}

// Warm fallback gradient shown while image loads (matches room tone)
const FALLBACKS = {
  hero:         ['#EFE7DA','#D8C9B2'],
  feature:      ['#EAE0D2','#D4C4AE'],
  airy:         ['#F2EDE6','#E4D9CC'],
  deep:         ['#D9CCBA','#C4B49E'],
  slate:        ['#DDD8D0','#C9C2B8'],
  scandinavian: ['#E8E2DA','#D4CBBF'],
  modern:       ['#D5CFC7','#C0B9AF'],
  luxury:       ['#C9BC9F','#B5A688'],
  japandi:      ['#DDD5C8','#CAC0B1'],
  industrial:   ['#C8C3BC','#B5B0A8'],
  minimalist:   ['#F2EDE6','#E4D9CC'],
  contemporary: ['#D9CCBA','#C4B49E'],
  before:       ['#EDEAE4','#DEDBD5'],
  after:        ['#C9BC9F','#B5A688'],
}

export default function PhotoFrame({ variant = 'hero', label, className = '', style = {}, children, src: srcProp }) {
  const [loaded,  setLoaded]  = useState(false)
  const [errored, setErrored] = useState(false)

  const src = srcProp || IMAGES[variant] || IMAGES.hero
  const [a, b] = FALLBACKS[variant] || FALLBACKS.hero

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(155deg, ${a} 0%, ${b} 100%)`, ...style }}
    >
      {!errored && (
        <img
          src={src}
          alt={label || variant}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.55s ease',
          }}
        />
      )}
      {children}
    </div>
  )
}
