/** History — your designs, saved to your account (newest first, last 20 plus favourites). */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Trash2, Download, RotateCcw, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import CompareSlider from '../components/CompareSlider'
import * as api from '../services/api'

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const when = (t) => new Date(t * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function Viewer({ id, onClose }) {
  const [item, setItem] = useState(null)
  const [i, setI] = useState(0)
  useEffect(() => { api.historyGet(id).then(setItem).catch((e) => { toast.error(e.message); onClose() }) }, [id, onClose])
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(17,17,17,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(900px, 100%)', maxHeight: '100%', overflow: 'auto', background: '#FAFAF8', padding: '1rem' }}>
        {!item ? <div style={{ padding: '4rem', textAlign: 'center' }}><Loader2 className="animate-spin-cw" size={22} /></div> : (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{cap(item.settings.style)} {item.settings.room_type}</span>
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          {item.before
            ? <CompareSlider before={item.before} after={item.images[i]} aspect={item.aspect} beforeLabel="Original" afterLabel="Redesign" />
            : <img src={item.images[i]} alt="" style={{ width: '100%', display: 'block' }} />}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {item.images.map((s, k) => (
              <button key={k} onClick={() => setI(k)} style={{ padding: 0, border: `2px solid ${k === i ? '#111' : 'transparent'}`, cursor: 'pointer', background: 'none' }}>
                <img src={s} alt="" style={{ width: 64, height: 48, objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
            <a className="btn-ghost" href={item.images[i]} download={`aeterna-${id.slice(0, 6)}-${i + 1}.jpg`} style={{ marginLeft: 'auto', textDecoration: 'none' }}>
              <Download size={12} /> Download
            </a>
          </div>
        </>)}
      </div>
    </div>
  )
}

export default function History() {
  const [items, setItems] = useState(null)
  const [onlyFav, setOnlyFav] = useState(false)
  const [open, setOpen] = useState(null)
  const nav = useNavigate()
  const close = useCallback(() => setOpen(null), [])

  const refresh = useCallback(() => api.historyList().then(setItems).catch((e) => { toast.error(e.message); setItems([]) }), [])
  useEffect(() => { refresh() }, [refresh])

  const toggleFav = async (it) => {
    setItems((l) => l.map((x) => (x.id === it.id ? { ...x, favorite: !x.favorite } : x)))
    api.historyFavorite(it.id, !it.favorite).catch((e) => { toast.error(e.message); refresh() })
  }
  const del = async (it) => {
    setItems((l) => l.filter((x) => x.id !== it.id))
    api.historyDelete(it.id).catch((e) => { toast.error(e.message); refresh() })
  }
  const clear = async () => {
    if (!confirm('Delete all designs except your favourites?')) return
    await api.historyClear().catch((e) => toast.error(e.message)); refresh(); toast.success('Cleared')
  }
  const reuse = async (it) => nav('/studio', { state: { reuse: { mode: it.mode, settings: it.settings } } })

  const shown = (items ?? []).filter((x) => !onlyFav || x.favorite)

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '2.5rem clamp(1.5rem,4vw,3rem) 5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: '2rem' }}>
        <div>
          <span className="eyebrow">Saved to your account</span>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '2rem', letterSpacing: '-0.02em', margin: '4px 0 0' }}>History</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav} style={onlyFav ? { borderColor: '#111', color: '#111' } : undefined}><Heart size={12} /> Favourites</button>
          {items?.length > 0 && <button className="btn-ghost" onClick={clear}><Trash2 size={12} /> Clear</button>}
        </div>
      </div>

      {items === null ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#999' }}><Loader2 className="animate-spin-cw" size={22} /></div>
      ) : shown.length === 0 ? (
        <div style={{ border: '1px dashed #DAD6CE', padding: '3rem 2rem', textAlign: 'center', background: '#FBFAF8' }}>
          <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.3rem', margin: '0 0 .5rem' }}>{onlyFav ? 'No favourites yet' : 'Nothing here yet'}</p>
          <p style={{ fontSize: 13, color: '#777', fontFamily: 'Inter, sans-serif', margin: '0 0 1.25rem' }}>
            {onlyFav ? 'Tap the heart on a design to keep it.' : 'Designs you create are saved here automatically.'}</p>
          <Link to="/studio" className="btn-primary">Open Studio</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }} className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((it) => (
            <article key={it.id} style={{ border: '1px solid #E5E5E5', background: '#fff' }}>
              <button onClick={() => setOpen(it.id)} style={{ display: 'block', width: '100%', padding: 0, border: 'none', cursor: 'pointer', background: '#EEEDE9' }}>
                <img src={it.thumb} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }} />
              </button>
              <div style={{ padding: '0.75rem 0.9rem', fontFamily: 'Inter, sans-serif' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{cap(it.settings.style)} {it.settings.room_type}</p>
                <p style={{ margin: '2px 0 10px', fontSize: 11, color: '#999' }}>
                  {it.mode === 'photo' ? 'Photo redesign' : 'From scratch'} · {it.count} image{it.count > 1 ? 's' : ''} · {when(it.created)}
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => toggleFav(it)} aria-label="Favourite" title="Favourite"><Heart size={12} fill={it.favorite ? '#111' : 'none'} /></button>
                  <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => reuse(it)} title="Use these settings again"><RotateCcw size={12} /> Reuse</button>
                  <button className="btn-ghost" style={{ padding: '6px 10px', marginLeft: 'auto' }} onClick={() => del(it)} aria-label="Delete" title="Delete"><Trash2 size={12} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {open && <Viewer id={open} onClose={close} />}
    </div>
  )
}
