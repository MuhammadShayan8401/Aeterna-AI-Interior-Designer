/**
 * CompareSlider — drag (or use ← → keys) to compare two images of the same size.
 * Both images are stacked at 100%; the top one is revealed with clip-path, so
 * there is no width maths to go wrong. Pointer capture keeps the drag alive
 * even when the cursor leaves the box.
 */
import { useRef, useState, useCallback } from 'react'

export default function CompareSlider({
  before, after, aspect = '4 / 3',
  beforeLabel = 'Before', afterLabel = 'After', initial = 50, rounded = false,
}) {
  const box = useRef(null)
  const [pos, setPos] = useState(initial)

  const move = useCallback((clientX) => {
    const r = box.current?.getBoundingClientRect()
    if (!r || !r.width) return
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }, [])

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    move(e.clientX)
  }
  const onPointerMove = (e) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e.clientX)
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft')  { setPos((p) => Math.max(0, p - 5)); e.preventDefault() }
    if (e.key === 'ArrowRight') { setPos((p) => Math.min(100, p + 5)); e.preventDefault() }
  }

  const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', display: 'block', pointerEvents: 'none', userSelect: 'none' }
  const tag = (side) => ({
    position: 'absolute', bottom: 12, [side]: 12, padding: '3px 10px',
    fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
    fontFamily: 'Inter, sans-serif', pointerEvents: 'none',
    background: 'rgba(250,250,248,0.9)', color: '#444',
  })

  return (
    <div
      ref={box}
      role="slider" tabIndex={0}
      aria-label="Drag to compare before and after"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onKeyDown={onKeyDown}
      style={{
        position: 'relative', width: '100%', aspectRatio: aspect, overflow: 'hidden',
        cursor: 'ew-resize', touchAction: 'pan-y', background: '#EEEDE9',
        borderRadius: rounded ? 4 : 0,
      }}>
      <img src={after} alt={afterLabel} draggable={false} style={fill} />
      <img src={before} alt={beforeLabel} draggable={false}
        style={{ ...fill, clipPath: `inset(0 ${100 - pos}% 0 0)` }} />

      {pos > 12 && <span style={tag('left')}>{beforeLabel}</span>}
      {pos < 88 && <span style={tag('right')}>{afterLabel}</span>}

      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 2,
        marginLeft: -1, background: '#FAFAF8', boxShadow: '0 0 0 1px rgba(17,17,17,0.12)',
        pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 36, height: 36,
          transform: 'translate(-50%, -50%)', borderRadius: '50%',
          background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(17,17,17,0.25)',
        }}>
          <svg width="16" height="10" viewBox="0 0 14 10" fill="none" aria-hidden>
            <path d="M4 1L1 5L4 9M10 1L13 5L10 9" stroke="#555" strokeWidth="1.3"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
