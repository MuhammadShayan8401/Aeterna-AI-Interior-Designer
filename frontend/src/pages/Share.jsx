/** Share — public before/after page opened from a share link (#/s/:id). */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import CompareSlider from '../components/CompareSlider'
import * as api from '../services/api'

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

export default function Share() {
  const { id } = useParams()
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { api.shareGet(id).then(setD).catch((e) => setErr(e.message)) }, [id])

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '3rem clamp(1.5rem,4vw,3rem) 5rem' }}>
      {err ? <p style={{ fontFamily: 'Inter, sans-serif', color: '#B42318' }} role="alert">{err}</p>
        : !d ? <Loader2 className="animate-spin-cw" />
        : (<>
          <span className="eyebrow">Shared design{d.by ? ` · by ${d.by}` : ''}</span>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: 'clamp(1.8rem,4vw,2.6rem)', margin: '6px 0 1.5rem' }}>
            {cap(d.style)} {d.room_type}
          </h1>
          {d.before
            ? <CompareSlider before={d.before} after={d.image} aspect={d.aspect} beforeLabel="Original" afterLabel="Redesign" />
            : <img src={d.image} alt="Shared design" style={{ width: '100%', display: 'block' }} />}
          <p style={{ fontSize: 13, color: '#777', fontFamily: 'Inter, sans-serif', margin: '1.5rem 0' }}>
            Created with Aeterna, an AI interior design studio. Designs are AI-generated inspiration.
          </p>
          <Link to="/register" className="btn-primary" style={{ display: 'inline-flex' }}>Try it with your own room</Link>
        </>)}
    </div>
  )
}
