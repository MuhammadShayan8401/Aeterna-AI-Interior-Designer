/** MaskPainter — paint over the part of the photo to restyle. Exposes the mask as a PNG blob via onChange(blob|null). */
import { useEffect, useRef, useState } from 'react'
import { Eraser, Brush, Undo2, Trash2 } from 'lucide-react'

export default function MaskPainter({ src, onChange, t = (s) => s }) {
  const imgRef = useRef(null), cv = useRef(null)       // cv: visible overlay; mask is rebuilt from it
  const [brush, setBrush] = useState(36)
  const [erase, setErase] = useState(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const history = useRef([])
  const drawing = useRef(false)

  const fit = () => {
    const im = imgRef.current; if (!im || !im.naturalWidth) return
    const w = im.clientWidth, h = im.clientHeight
    if (cv.current && (cv.current.width !== w || cv.current.height !== h)) {
      // keep the painting when the layout resizes
      const had = cv.current.width > 0 && cv.current.height > 0
      let old = null
      if (had) { old = document.createElement('canvas'); old.width = cv.current.width; old.height = cv.current.height; old.getContext('2d').drawImage(cv.current, 0, 0) }
      cv.current.width = w; cv.current.height = h
      if (old) cv.current.getContext('2d').drawImage(old, 0, 0, w, h)
    }
    setSize({ w, h })
  }
  useEffect(() => {
    fit()                                            // the image may already be loaded (cached blob), so onLoad can be missed
    const ro = typeof ResizeObserver !== 'undefined' && imgRef.current ? new ResizeObserver(fit) : null
    ro?.observe(imgRef.current)
    window.addEventListener('resize', fit)
    return () => { ro?.disconnect(); window.removeEventListener('resize', fit) }
  }, [src])

  const emit = () => {
    const c = cv.current; if (!c || !c.width) return onChange(null)
    const out = document.createElement('canvas'); out.width = c.width; out.height = c.height
    const g = out.getContext('2d')
    g.fillStyle = '#000'; g.fillRect(0, 0, out.width, out.height)
    // any painted pixel (alpha > 0) becomes white
    const src = c.getContext('2d').getImageData(0, 0, c.width, c.height), dst = g.getImageData(0, 0, c.width, c.height)
    let any = false
    for (let i = 0; i < src.data.length; i += 4) if (src.data[i + 3] > 20) { dst.data[i] = dst.data[i + 1] = dst.data[i + 2] = 255; any = true }
    g.putImageData(dst, 0, 0)
    if (!any) return onChange(null)
    out.toBlob((b) => onChange(b), 'image/png')
  }

  const pos = (e) => { const r = cv.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  const down = (e) => {
    e.preventDefault(); cv.current.setPointerCapture(e.pointerId); drawing.current = true
    history.current.push(cv.current.getContext('2d').getImageData(0, 0, cv.current.width, cv.current.height))
    if (history.current.length > 15) history.current.shift()
    move(e, true)
  }
  const move = (e, first) => {
    if (!drawing.current) return
    const g = cv.current.getContext('2d'), [x, y] = pos(e)
    g.lineCap = g.lineJoin = 'round'; g.lineWidth = brush
    g.globalCompositeOperation = erase ? 'destination-out' : 'source-over'
    g.strokeStyle = '#D6285A'; g.fillStyle = '#D6285A'
    const last = g._last
    g.beginPath()
    if (first || !last) { g.arc(x, y, brush / 2, 0, Math.PI * 2); g.fill() } else { g.moveTo(last[0], last[1]); g.lineTo(x, y); g.stroke() }
    g._last = [x, y]
  }
  const up = () => { if (!drawing.current) return; drawing.current = false; cv.current.getContext('2d')._last = null; emit() }
  const undo = () => { const h = history.current.pop(); if (h) { cv.current.getContext('2d').putImageData(h, 0, 0); emit() } }
  const clear = () => { cv.current.getContext('2d').clearRect(0, 0, cv.current.width, cv.current.height); history.current = []; onChange(null) }

  const b = (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    border: `1px solid ${active ? '#111' : '#E0DDD6'}`, background: active ? '#111' : '#fff', color: active ? '#FAFAF8' : '#555' })

  return (
    <div>
      <div style={{ position: 'relative', lineHeight: 0, touchAction: 'none' }}>
        <img ref={imgRef} src={src} alt="Your room" onLoad={fit} style={{ width: '100%', display: 'block' }} />
        <canvas ref={cv} width={size.w} height={size.h} aria-label="Paint the area to change"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none', opacity: 0.55 }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 8 }}>
        <button type="button" style={b(!erase)} onClick={() => setErase(false)}><Brush size={12} /> {t('Paint')}</button>
        <button type="button" style={b(erase)} onClick={() => setErase(true)}><Eraser size={12} /> {t('Erase')}</button>
        <button type="button" style={b(false)} onClick={undo}><Undo2 size={12} /> {t('Undo')}</button>
        <button type="button" style={b(false)} onClick={clear}><Trash2 size={12} /> {t('Clear')}</button>
        <label style={{ fontSize: 12, color: '#777', fontFamily: 'Inter, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {t('Brush')} <input type="range" min={10} max={90} value={brush} onChange={(e) => setBrush(+e.target.value)} />
        </label>
      </div>
    </div>
  )
}
