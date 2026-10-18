/**
 * Studio — the one place to create designs.
 * Two modes: redesign a photo, or design a room from scratch.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ImagePlus, Wand2, Sparkles, Download, ThumbsUp, ThumbsDown, Heart, RefreshCw, X, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import CompareSlider from '../components/CompareSlider'
import DesignTools from '../components/DesignTools'
import MaskPainter from '../components/MaskPainter'
import { track } from '../services/track'
import { useT } from '../i18n'
import * as api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { downscale, topStyle } from '../services/store'
import {
  ROOM_TYPES, STYLES, DENSITIES, CHANGE_LEVELS, LIGHTINGS, PALETTES, MAX_UPLOAD_MB,
} from '../utils/constants'

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/* ── small UI atoms ─────────────────────────────────────────────────────── */
const Label = ({ children, hint }) => { const { t } = useT(); return (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '1.25rem 0 0.5rem' }}>
    <span className="eyebrow">{t(children)}</span>
    {hint && <span style={{ fontSize: 11, color: '#AAA', fontFamily: 'Inter, sans-serif' }}>{t(hint)}</span>}
  </div>
) }

const Chip = ({ active, onClick, children, title }) => { const { t } = useT(); return (
  <button type="button" onClick={onClick} title={title} aria-pressed={active} style={{
    padding: '7px 14px', fontSize: 12, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
    border: `1px solid ${active ? '#111' : '#E5E5E5'}`, background: active ? '#111' : 'transparent',
    color: active ? '#FAFAF8' : '#555', transition: 'all .15s',
  }}>{typeof children === 'string' ? t(children) : children}</button>
) }

const Segment = ({ options, value, onChange }) => { const { t } = useT(); return (
  <div style={{ display: 'flex', border: '1px solid #E5E5E5' }}>
    {options.map((o, i) => (
      <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id} style={{
        flex: 1, padding: '9px 6px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        border: 'none', borderLeft: i ? '1px solid #E5E5E5' : 'none',
        background: value === o.id ? '#111' : 'transparent', color: value === o.id ? '#FAFAF8' : '#555',
      }}>{t(o.label)}</button>
    ))}
  </div>
) }

/* ── first-run tips (dismissible, remembered) ───────────────────────────── */
function Tips() {
  const { t } = useT()
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('aeterna.tips') !== '1' } catch { return true } })
  if (!open) return null
  const close = () => { setOpen(false); try { localStorage.setItem('aeterna.tips', '1') } catch { /* ignore */ } }
  return (
    <div role="note" style={{ background: '#F5F4F0', border: '1px solid #E5E5E5', padding: '12px 14px', margin: '0 0 1rem', fontFamily: 'Inter, sans-serif', fontSize: 12.5, color: '#555', lineHeight: 1.6 }}>
      <b style={{ color: '#111' }}>{t('Quick start')}</b>
      <ol style={{ margin: '6px 0 8px', paddingInlineStart: '1.1rem' }}>
        <li>{t('Add a bright, straight-on photo of the whole room (or use the sample).')}</li>
        <li>{t('Pick a style and colours, then press the button.')}</li>
        <li>{t('Like or dislike results so Aeterna learns your taste.')}</li>
      </ol>
      <button type="button" className="btn-ghost" onClick={close}>{t('Got it')}</button>
    </div>
  )
}

/* ── photo upload ───────────────────────────────────────────────────────── */
function Dropzone({ preview, onFile, onClear, onSample }) {
  const { t } = useT()
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const pick = (f) => {
    if (!f) return
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return toast.error('Please use a JPG, PNG or WEBP image.')
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) return toast.error(`Image is over ${MAX_UPLOAD_MB} MB.`)
    onFile(f)
  }
  if (preview) {
    return (
      <div style={{ position: 'relative', background: '#EEEDE9' }}>
        <img src={preview} alt="Your room" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />
        <button type="button" aria-label="Remove photo" onClick={onClear} style={{
          position: 'absolute', top: 8, right: 8, width: 28, height: 28, border: 'none', cursor: 'pointer',
          background: 'rgba(17,17,17,.75)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><X size={14} /></button>
      </div>
    )
  }
  return (<>
    <button type="button" onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]) }}
      style={{
        width: '100%', padding: '2.2rem 1rem', cursor: 'pointer', background: over ? '#F0EFEB' : '#F5F4F0',
        border: `1px dashed ${over ? '#111' : '#CFCAC0'}`, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8, fontFamily: 'Inter, sans-serif', color: '#666',
      }}>
      <ImagePlus size={22} strokeWidth={1.4} />
      <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{t('Add a photo of your room')}</span>
      <span style={{ fontSize: 11 }}>{t('Drop it here or click · JPG, PNG, WEBP · up to {mb} MB', { mb: MAX_UPLOAD_MB })}</span>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
    </button>
    {onSample && (
      <button type="button" className="btn-ghost" style={{ marginTop: 6 }} onClick={onSample}>
        {t('No photo handy? Try a sample room')}
      </button>
    )}
  </>)
}

/* ── progress while generating ──────────────────────────────────────────── */
function Progress({ status, startedAt }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const secs = Math.floor((now - startedAt) / 1000)

  let title = 'Designing your room …', sub = 'This usually takes one to three minutes on the free server.'
  if (status?.stage === 'waking') { title = 'Waking up the design server …'; sub = 'It sleeps when unused. The first request can take a few minutes.' }
  else if (status?.stage === 'connecting') { title = 'Connecting …'; sub = '' }
  else if (status?.stage === 'pending') {
    title = status.position != null ? `In line — ${status.position + 1} of ${status.queueSize ?? '?'}` : 'Waiting for a free slot …'
    sub = 'Someone else is being designed right now. You are next in line.'
  } else if (status?.desc) title = status.desc

  const pct = status?.length ? Math.round(((status.index ?? 0) / status.length) * 100) : null
  return (
    <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
      <div className="animate-spin-cw" style={{ width: 28, height: 28, margin: '0 auto 1.25rem',
        border: '2px solid #E5E5E5', borderTopColor: '#111', borderRadius: '50%' }} />
      <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.3rem', margin: '0 0 .5rem', color: '#111' }}>{title}</p>
      {sub && <p style={{ fontSize: 13, color: '#777', fontFamily: 'Inter, sans-serif', margin: '0 auto', maxWidth: 380 }}>{sub}</p>}
      {pct !== null && (
        <div style={{ height: 2, background: '#E5E5E5', maxWidth: 260, margin: '1.25rem auto 0' }}>
          <div style={{ height: 2, width: `${pct}%`, background: '#111', transition: 'width .4s' }} />
        </div>
      )}
      <p className="mono" style={{ fontSize: 11, color: '#AAA', marginTop: '1rem' }}>{secs}s</p>
    </div>
  )
}

/* ── one result card ────────────────────────────────────────────────────── */
function ResultCard({ src, before, aspect, rating, favorite, onRate, onFavorite, index, tools }) {
  const { t } = useT()
  const btn = (active, danger) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, cursor: 'pointer',
    border: `1px solid ${active ? '#111' : '#E5E5E5'}`, background: active ? '#111' : 'transparent',
    color: active ? (danger ? '#FFB4A8' : '#FAFAF8') : '#666',
  })
  return (
    <motion.figure initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}
      style={{ margin: 0 }}>
      {before
        ? <CompareSlider before={before} after={src} aspect={aspect} beforeLabel={t("Original")} afterLabel={t("Redesign")} />
        : <img src={src} alt={`Design ${index + 1}`} style={{ width: '100%', display: 'block', aspectRatio: aspect, objectFit: 'cover' }} />}
      <figcaption style={{ display: 'flex', gap: 6, paddingTop: 8, alignItems: 'center' }}>
        <button style={btn(rating === 1)} onClick={() => onRate(1)} aria-label="Like" title="I like this"><ThumbsUp size={14} /></button>
        <button style={btn(rating === -1, true)} onClick={() => onRate(-1)} aria-label="Dislike" title="Not for me"><ThumbsDown size={14} /></button>
        <button style={btn(favorite)} onClick={onFavorite} aria-label="Save to favourites" title="Save to favourites"><Heart size={14} /></button>
      </figcaption>
      {tools}
    </motion.figure>
  )
}

/* ── page ───────────────────────────────────────────────────────────────── */
export default function Studio() {
  const location = useLocation()
  const reuse = location.state?.reuse           // settings sent from History
  const { user, quota, setQuota, taste, setTaste } = useAuth()
  const suggestion = useMemo(() => topStyle(taste), [taste])

  const [mode, setMode] = useState(reuse?.mode ?? 'photo')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [room, setRoom] = useState(reuse?.settings?.room_type ?? 'living room')
  const [style, setStyle] = useState(reuse?.settings?.style ?? topStyle(taste) ?? 'modern')
  const [density, setDensity] = useState(reuse?.settings?.density ?? 'balanced')
  const [change, setChange] = useState(reuse?.settings?.change ?? 'balanced')
  const [lighting, setLighting] = useState(reuse?.settings?.lighting ?? 'natural')
  const [palette, setPalette] = useState(reuse?.settings?.palette ?? 'neutral')
  const [extra, setExtra] = useState(reuse?.settings?.extra ?? '')
  const [count, setCount] = useState(reuse?.settings?.num_images ?? 2)

  const { t } = useT()
  const [region, setRegion] = useState(false)     // paint a mask to restyle only part of the photo
  const [mask, setMask] = useState(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const [startedAt, setStartedAt] = useState(0)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)    // { id, payload, before, aspect, ratings[], favorite }
  const resultsRef = useRef(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const onFile = (f) => { if (preview) URL.revokeObjectURL(preview); setFile(f); setPreview(URL.createObjectURL(f)) }
  const useSample = async () => {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}samples/before.jpg`)
      const blob = await r.blob()
      onFile(new File([blob], 'sample-room.jpg', { type: blob.type || 'image/jpeg' })); track('sample_room')
    } catch { toast.error('Could not load the sample room.') }
  }
  const onClear = () => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); setMask(null); setRegion(false) }

  const noQuota = quota ? quota.remaining < 1 : false
  const unverified = !!user?.verification_required && !user?.verified
  const canGo = !busy && !noQuota && !unverified && (mode === 'scratch' || (!!file && (!region || !!mask)))

  async function generate() {
    setBusy(true); setError(null); setStatus({ stage: 'connecting' }); setStartedAt(Date.now())
    const opts = { room, style, density, change, lighting, palette, extra: extra.trim(), count }
    try {
      let payload, before = null, aspect = '4 / 3'
      if (mode === 'photo') {
        const small = await downscale(file)
        before = small.dataUrl
        aspect = `${small.width} / ${small.height}`
        payload = region && mask ? await api.redesignRegion(small.blob, mask, opts, setStatus) : await api.redesign(small.blob, opts, setStatus)
      } else {
        payload = await api.fromScratch(opts, setStatus)
      }
      const item = {
        id: payload.id, createdAt: Date.now(), mode, settings: payload.settings, prompt: payload.prompt,
        furniture: payload.furniture, seconds: payload.seconds, images: payload.images,
        before, aspect, ratings: payload.images.map(() => 0), favorite: false,
      }
      setResult(item); track('design_created', { mode })
      if (payload.quota) setQuota(payload.quota)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError((e?.message || 'Something went wrong. Please try again.').replace(/^VERIFY_EMAIL:\s*/, ''))
    } finally {
      setBusy(false)
    }
  }

  const patch = (changes) => setResult((r) => ({ ...r, ...changes }))
  const rate = (i, value) => {
    const prev = result.ratings[i]
    const next = prev === value ? 0 : value
    patch({ ratings: result.ratings.map((r, k) => (k === i ? next : r)) })
    api.historyRate(result.id, i, next).then((r) => setTaste(r.taste ?? {}))
      .catch((e) => { patch({ ratings: result.ratings }); toast.error(e.message) })
    if (next === 1) toast.success(`Noted — you like ${cap(result.settings.style)}`)
  }

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '2.5rem clamp(1.5rem,4vw,3rem) 5rem' }}>
      <div style={{ display: 'grid', gap: '2.5rem' }} className="lg:grid-cols-[400px_1fr]">

        {/* ── controls ─────────────────────────────────────────────── */}
        <aside style={{ alignSelf: 'start' }} className="lg:sticky lg:top-20">
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '2rem',
            letterSpacing: '-0.02em', margin: '0 0 1.25rem' }}>{t('Studio')}</h1>

          <Tips />
          <Segment value={mode} onChange={setMode}
            options={[{ id: 'photo', label: 'My room photo' }, { id: 'scratch', label: 'From scratch' }]} />

          {mode === 'photo' && (<>
            <Label>Your photo</Label>
            {region && preview ? (
              <div>
                <MaskPainter src={preview} onChange={setMask} t={t} />
                <p style={{ fontSize: 11, color: '#888', fontFamily: 'Inter, sans-serif', margin: '6px 0 0' }}>{t('Paint over what you want to change. The rest stays exactly as it is.')}</p>
                <button type="button" className="btn-ghost" onClick={onClear} style={{ marginTop: 6 }}><X size={12} /> {t('Remove photo')}</button>
              </div>
            ) : <Dropzone preview={preview} onFile={onFile} onClear={onClear} onSample={useSample} />}
            {preview && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                <input type="checkbox" checked={region} onChange={(e) => { setRegion(e.target.checked); if (!e.target.checked) setMask(null) }} />
                {t('Only change part of the room')}
              </label>
            )}
          </>)}

          <Label>Room</Label>
          <select className="input-field" value={room} onChange={(e) => setRoom(e.target.value)}>
            {ROOM_TYPES.map((r) => <option key={r} value={r}>{t(cap(r))}</option>)}
          </select>

          <Label hint={suggestion && style === suggestion ? 'picked from your likes' : undefined}>Style</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STYLES.map((s) => (
              <Chip key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>
                {t(s.label)}{suggestion === s.id ? ' ★' : ''}
              </Chip>
            ))}
          </div>

          <Label>Furnishing</Label>
          <Segment value={density} onChange={setDensity} options={DENSITIES} />

          {mode === 'photo' ? (<>
            <Label hint={CHANGE_LEVELS.find((c) => c.id === change)?.hint}>How much to change</Label>
            <Segment value={change} onChange={setChange} options={CHANGE_LEVELS} />
          </>) : (<>
            <Label>Lighting</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LIGHTINGS.map((l) => <Chip key={l} active={lighting === l} onClick={() => setLighting(l)}>{cap(l)}</Chip>)}
            </div>
          </>)}

          <Label>Colours</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PALETTES.map((p) => (
              <Chip key={p.id} active={palette === p.id} onClick={() => setPalette(p.id)}>
                <span style={{ display: 'inline-flex', gap: 2, marginInlineEnd: 7, verticalAlign: 'middle' }}>
                  {p.swatch.map((c) => <i key={c} style={{ width: 8, height: 8, background: c, display: 'block', border: '1px solid rgba(0,0,0,.12)' }} />)}
                </span>{t(p.label)}
              </Chip>
            ))}
          </div>

          <Label hint="optional">Anything specific?</Label>
          <input className="input-field" value={extra} maxLength={200} onChange={(e) => setExtra(e.target.value)}
            placeholder={t('e.g. large windows, green velvet sofa')} />

          <Label hint="more = slower">Variations</Label>
          <Segment value={count} onChange={setCount}
            options={[1, 2, 3, 4].map((n) => ({ id: n, label: String(n) }))} />

          <button className="btn-primary" disabled={!canGo} onClick={generate}
            style={{ width: '100%', marginTop: '1.75rem' }}>
            {busy ? t('Designing …') : (<><Wand2 size={14} /> {t(mode === 'photo' ? 'Redesign my room' : 'Generate designs')}</>)}
          </button>
          {quota && (
            <p style={{ fontSize: 11, color: noQuota ? '#B42318' : '#999', textAlign: 'center', marginTop: 10, fontFamily: 'Inter, sans-serif' }}>
              {noQuota ? (user?.plan?.active ? `You've used all ${quota.limit} designs for today — come back tomorrow.` : `You've used all ${quota.limit} designs for today — come back tomorrow, or upgrade to Pro.`) : t('{n} of {limit} designs left today', { n: quota.remaining, limit: quota.limit })}
            </p>
          )}
          {unverified && (
            <p style={{ fontSize: 12, color: '#8A6400', textAlign: 'center', marginTop: 8, fontFamily: 'Inter, sans-serif' }}>Confirm your email to start designing.</p>
          )}
          {mode === 'photo' && !file && (
            <p style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8, fontFamily: 'Inter, sans-serif' }}>
              {t('Add a photo to continue')}
            </p>
          )}
          {mode === 'photo' && file && region && !mask && (
            <p style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8, fontFamily: 'Inter, sans-serif' }}>{t('Paint the area you want to change')}</p>
          )}
        </aside>

        {/* ── results ──────────────────────────────────────────────── */}
        <section ref={resultsRef} style={{ minHeight: 420 }}>
          <AnimatePresence mode="wait">
            {busy ? (
              <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Progress status={status} startedAt={startedAt} />
              </motion.div>
            ) : error ? (
              <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ padding: '2rem', border: '1px solid #F1C7C1', background: '#FDF4F2' }}>
                <p style={{ margin: '0 0 .5rem', fontWeight: 600, color: '#B42318', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
                  We couldn't finish that design</p>
                <p style={{ margin: '0 0 1rem', color: '#7A2B22', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>{error}</p>
                <button className="btn-outline" onClick={generate} disabled={!canGo}><RefreshCw size={13} /> Try again</button>
              </motion.div>
            ) : result ? (
              <motion.div key="res" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
                  <div>
                    <span className="eyebrow">{t('Your designs')}</span>
                    <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '1.5rem', margin: '4px 0 0', letterSpacing: '-0.015em' }}>
                      {cap(result.settings.style)} {result.settings.room_type}
                    </h2>
                  </div>
                  <button className="btn-ghost" onClick={generate} disabled={!canGo}><RefreshCw size={12} /> {t('New variations')}</button>
                </div>

                {result.furniture?.length > 0 && (
                  <p style={{ fontSize: 12, color: '#666', fontFamily: 'Inter, sans-serif', margin: '0 0 1.25rem' }}>
                    <Sparkles size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />
                    {t('Spotted in your photo')}: {result.furniture.join(', ')}
                  </p>
                )}

                <div style={{ display: 'grid', gap: '1.5rem' }} className={result.images.length > 1 ? 'md:grid-cols-2' : ''}>
                  {result.images.map((src, i) => (
                    <ResultCard key={i} index={i} src={src} before={result.before} aspect={result.aspect}
                      rating={result.ratings[i]} favorite={result.favorite}
                      tools={<DesignTools itemId={result.id} index={i} src={src} all={result.images} before={result.before} settings={result.settings}
                        onBusy={(b) => { setBusy(b); if (b) { setError(null); setStatus({ stage: 'connecting' }); setStartedAt(Date.now()) } }}
                        onResult={(p) => { setResult({ ...result, id: p.id, settings: p.settings, prompt: p.prompt, seconds: p.seconds, images: p.images, ratings: p.images.map(() => 0), favorite: false }); if (p.quota) setQuota(p.quota) }} />}
                      onRate={(v) => rate(i, v)} onFavorite={() => { const v = !result.favorite; patch({ favorite: v }); api.historyFavorite(result.id, v).catch((e) => { patch({ favorite: !v }); toast.error(e.message) }) }} />
                  ))}
                </div>

                <details style={{ marginTop: '1.75rem', fontFamily: 'Inter, sans-serif' }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#777', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChevronDown size={12} /> {t('How this was made')} · {result.seconds}s
                  </summary>
                  <p className="mono" style={{ fontSize: 11, color: '#777', lineHeight: 1.6, marginTop: 8 }}>{result.prompt}</p>
                </details>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ border: '1px dashed #DAD6CE', padding: '3rem 2rem', textAlign: 'center', background: '#FBFAF8' }}>
                <Sparkles size={22} strokeWidth={1.3} style={{ color: '#AAA' }} />
                <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.4rem', margin: '1rem 0 .5rem' }}>
                  {t('Your designs will appear here')}</p>
                <p style={{ fontSize: 13, color: '#777', fontFamily: 'Inter, sans-serif', maxWidth: 380, margin: '0 auto' }}>
                  {t(mode === 'photo'
                    ? 'Add a photo, pick a style and press Redesign. Tip: a bright, straight-on photo of the whole room works best.'
                    : 'Choose a room, style and lighting, then press Generate to see new room concepts.')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  )
}
