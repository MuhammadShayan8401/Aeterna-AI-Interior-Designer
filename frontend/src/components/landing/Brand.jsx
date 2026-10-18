/**
 * Brand.jsx — Aeterna wordmark.
 *
 * Logo concept: A single thin square rotated 45° (a diamond lozenge)
 * paired with the wordmark "Aeterna" in Playfair Display.
 * The rotated square references a room corner viewed from above —
 * simple, architectural, distinct at all sizes.
 *
 * Usage:
 *   <BrandLockup />               → dark text (default)
 *   <BrandLockup light />         → white text (for dark backgrounds)
 */

export function BrandMark({ size = 20, color = '#111111' }) {
  const s = size
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {/* Outer diamond — architectural room-corner motif */}
      <rect
        x="10" y="1.5"
        width="11.5" height="11.5"
        rx="0"
        transform="rotate(45 10 10)"
        stroke={color}
        strokeWidth="1.2"
        fill="none"
      />
      {/* Inner dot — focal point */}
      <circle cx="10" cy="10" r="1.2" fill={color} />
    </svg>
  )
}

export function BrandLockup({ size = 16, light = false, color }) {
  const col = color ?? (light ? '#FAFAF8' : '#111111')
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      gap: Math.round(size * 0.55),
      userSelect: 'none', textDecoration: 'none',
    }}>
      <BrandMark size={Math.round(size * 1.1)} color={col} />
      <span style={{
        fontFamily: 'Playfair Display, Georgia, serif',
        fontWeight: 500,
        fontSize: size,
        color: col,
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        Aeterna
      </span>
    </span>
  )
}

// Legacy alias — some files import InfinityMark
export { BrandMark as InfinityMark }
