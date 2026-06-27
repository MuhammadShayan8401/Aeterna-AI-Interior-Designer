/**
 * DesignPage.jsx — /design-room
 * Full design studio with two modes:
 *   1. Image Redesign — upload a room photo, pick style, generate
 *   2. Empty Room     — text description + controls, no photo needed
 *
 * Embeds the existing GenerationWorkspace which already contains the full
 * AI pipeline (SegFormer → MiDaS → ANN → Stable Diffusion).
 * Also includes the step-by-step Empty Room wizard for a guided experience.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, ImagePlus, ArrowRight, ArrowLeft, Check, Download, Heart, RefreshCw, X } from 'lucide-react'
import PublicLayout     from '../components/PublicLayout'
import { useAuth }        from '../context/AuthContext'
import GenerationWorkspace from '../components/GenerationWorkspace'
import { generateEmptyRoom } from '../services/api'
import toast from 'react-hot-toast'

const ease = [0.16, 1, 0.3, 1]

/* ─────────────────────────────────────────────────────────────────────────
   MODE TABS
───────────────────────────────────────────────────────────────────────── */
function ModeTabs({ mode, setMode }) {
  const TABS = [
    { id: 'redesign',   label: 'Image Redesign',   sub: 'Upload a room photo to transform' },
    { id: 'empty',      label: 'Design from Scratch', sub: 'Describe a room to create' },
  ]
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      borderBottom: '1px solid #E5E5E5', marginBottom: '2.5rem',
    }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setMode(t.id)} style={{
          position: 'relative', padding: '1rem 1.25rem',
          background: mode === t.id ? '#FAFAF8' : '#F5F4F0',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          borderRight: t.id === 'redesign' ? '1px solid #E5E5E5' : 'none',
          transition: 'background 0.2s',
        }}>
          {mode === t.id && (
            <motion.div layoutId="design-tab-line"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#111111' }}
              transition={{ duration: 0.3, ease }} />
          )}
          <p style={{ fontSize: 13, fontWeight: 600, color: mode === t.id ? '#111111' : '#888882',
            fontFamily: 'Inter, sans-serif', margin: '0 0 3px', transition: 'color 0.2s' }}>
            {t.label}
          </p>
          <p style={{ fontSize: 11, color: '#AAAAAA', fontFamily: 'Inter, sans-serif', margin: 0 }}>
            {t.sub}
          </p>
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   EMPTY ROOM WIZARD (guided 7-step flow)
───────────────────────────────────────────────────────────────────────── */
const ROOM_TYPES = ['Living Room','Bedroom','Kitchen','Dining Room','Home Office','Bathroom','Studio Apartment']
const STYLES     = ['Modern','Japandi','Scandinavian','Minimalist','Luxury','Industrial','Contemporary']
const COLORS     = [
  { name: 'Neutral', palette: ['#F5F0E8','#D4C5AD','#8A7766'] },
  { name: 'Warm',    palette: ['#F2DFD0','#C4895E','#6B3A2A'] },
  { name: 'Cool',    palette: ['#D8E4EC','#7BA7BC','#2A4E6B'] },
  { name: 'Earth',   palette: ['#E8E0D5','#A0956E','#4A3F2F'] },
  { name: 'Mono',    palette: ['#F0F0F0','#888888','#222222'] },
  { name: 'Forest',  palette: ['#DDE8D8','#6A9973','#2D4D35'] },
]
const BUDGETS    = ['Budget-friendly','Mid-range','Premium','Luxury']
const PRESETS    = [
  'A bright Scandinavian living room with oak wood accents, linen upholstery, and abundant natural light.',
  'A Japandi bedroom with low-profile furniture, wabi-sabi textures, and a muted neutral palette.',
  'A modern home office with integrated shelving, clean desk lines, and warm pendant lighting.',
  'A luxury dining room with marble surfaces, statement chandelier, and velvet seating.',
]
const LIGHTINGS  = ['natural','warm','bright','evening','golden hour','overcast']
const STEPS      = ['Room Type','Dimensions','Prompt','Style','Colour','Budget','Controls']

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px', fontSize: 12, fontFamily: 'Inter, sans-serif',
      cursor: 'pointer', border: '1px solid',
      borderColor: active ? '#111111' : '#E5E5E5',
      background: active ? '#111111' : 'transparent',
      color: active ? '#FAFAF8' : '#666666',
      transition: 'all 0.18s',
    }}>
      {label}
    </button>
  )
}

function StepProgress({ current, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2.5rem' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 2,
          background: i < current ? '#111111' : i === current ? '#888882' : '#E5E5E5',
          transition: 'background 0.3s',
        }} />
      ))}
      <span style={{ marginLeft: '0.75rem', fontSize: 11, color: '#888882',
        fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
        {current + 1}/{total}
      </span>
    </div>
  )
}

function WizardResults({ results, onReset, roomType, style }) {
  const images = results?.generated_images ?? []
  const b64 = b => `data:image/png;base64,${b}`
  const [favs, setFavs] = useState({})

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>Generated</span>
          <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
            fontSize: '1.25rem', color: '#111111', margin: 0, letterSpacing: '-0.015em',
            textTransform: 'capitalize' }}>
            {style} {roomType}
          </h3>
        </div>
        <button onClick={onReset} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <RefreshCw size={11} /> Design again
        </button>
      </div>

      {images.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '1rem' }}
          className="sm:grid-cols-2">
          {images.map((img, i) => (
            <div key={i} style={{ position: 'relative', overflow: 'hidden', background: '#EEEDE9', border: '1px solid #E5E5E5' }}>
              <img src={b64(img)} alt={`Design ${i + 1}`}
                style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: 0, insetInline: 0, padding: '0.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'linear-gradient(to top, rgba(17,17,17,0.6), transparent)',
              }}>
                <a href={b64(img)} download={`aeterna_design_${i + 1}.png`}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
                    background: 'rgba(250,250,248,0.9)', color: '#111111',
                    padding: '5px 10px', textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
                  <Download size={10} /> Download
                </a>
                <button onClick={() => setFavs(v => ({ ...v, [i]: !v[i] }))}
                  style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(250,250,248,0.9)', border: 'none', cursor: 'pointer' }}>
                  <Heart size={12} fill={favs[i] ? '#1F4E79' : 'none'} stroke={favs[i] ? '#1F4E79' : '#888882'} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed #E5E5E5' }}>
          <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>
            Generation complete but no images returned. Check backend logs.
          </p>
        </div>
      )}
    </motion.div>
  )
}

function EmptyRoomWizard({ onBeforeGenerate }) {
  const [step,       setStep]       = useState(0)
  const [roomType,   setRoomType]   = useState('Living Room')
  const [dims,       setDims]       = useState({ width: '', length: '', ceiling: '' })
  const [prompt,     setPrompt]     = useState('')
  const [style,      setStyle]      = useState('Modern')
  const [colorPref,  setColorPref]  = useState('Neutral')
  const [budget,     setBudget]     = useState('Mid-range')
  const [strength,   setStrength]   = useState(75)
  const [density,    setDensity]    = useState(2)
  const [lighting,   setLighting]   = useState('natural')
  const [generating, setGenerating] = useState(false)
  const [results,    setResults]    = useState(null)
  const [error,      setError]      = useState(null)

  const canNext = () => {
    if (step === 0) return !!roomType
    if (step === 2) return prompt.trim().length > 0
    if (step === 3) return !!style
    return true
  }

  const generate = async () => {
    // Check free plan limit before generating
    if (onBeforeGenerate) {
      const check = onBeforeGenerate()
      if (!check.allowed) {
        if (check.reason === 'not_logged_in') {
          toast.error('Please sign in to generate designs')
        } else {
          toast.error('Free plan limit reached — upgrade to continue')
        }
        return
      }
    }
    setGenerating(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('room_type',        roomType.toLowerCase())
      fd.append('style',            style.toLowerCase())
      fd.append('prompt',           prompt || `A beautiful ${style.toLowerCase()} ${roomType.toLowerCase()}`)
      fd.append('lighting',         lighting)
      fd.append('density',          ['','minimal','moderate','dense'][density])
      fd.append('strength',         (strength / 100).toString())
      fd.append('color_preference', colorPref.toLowerCase())
      fd.append('budget',           budget.toLowerCase())
      if (dims.width)   fd.append('width',          dims.width)
      if (dims.length)  fd.append('length',         dims.length)
      if (dims.ceiling) fd.append('ceiling_height', dims.ceiling)
      const r = await generateEmptyRoom(fd)
      setResults(r)
    } catch (e) {
      const msg = e.response?.data?.detail ?? e.message
      setError(typeof msg === 'string' ? msg : 'Generation failed')
      toast.error('Generation failed')
    } finally { setGenerating(false) }
  }

  const handleNext = () => step < STEPS.length - 1 ? setStep(s => s + 1) : generate()

  if (results && !generating) {
    return <WizardResults results={results} roomType={roomType} style={style} onReset={() => { setResults(null); setStep(0) }} />
  }

  if (generating) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ padding: '5rem 0', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, margin: '0 auto 1.5rem', position: 'relative' }}>
          <motion.div style={{ width: 48, height: 48, border: '1px solid #111111', position: 'absolute' }}
            animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
          <Wand2 size={18} strokeWidth={1.5} style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)', color: '#111111',
          }} />
        </div>
        <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
          fontSize: '1.1rem', color: '#111111', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
          Generating your design…
        </p>
        <p style={{ fontSize: 12, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>
          SegFormer → MiDaS → ANN → Stable Diffusion
        </p>
      </motion.div>
    )
  }

  const STEP_CONTENT = [
    /* 0 Room type */
    <div key="room">
      <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '1.4rem',
        color: '#111111', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>What kind of room?</h3>
      <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', margin: '0 0 1.75rem' }}>
        Choose the space you want to design.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {ROOM_TYPES.map(r => <Chip key={r} label={r} active={roomType === r} onClick={() => setRoomType(r)} />)}
      </div>
    </div>,

    /* 1 Dimensions */
    <div key="dims">
      <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '1.4rem',
        color: '#111111', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>Room dimensions</h3>
      <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', margin: '0 0 1.75rem' }}>
        Optional — helps with spatial proportions.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[['width','Width (m)','4.5'],['length','Length (m)','6.0'],['ceiling','Ceiling (m)','2.7']].map(([k,label,ph]) => (
          <div key={k}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666666',
              fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</label>
            <input type="number" min="0" step="0.1" value={dims[k] || ''} placeholder={ph}
              onChange={e => setDims(d => ({ ...d, [k]: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, fontFamily: 'Inter, sans-serif',
                color: '#111111', background: '#FAFAF8', border: '1px solid #E5E5E5', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#111111'}
              onBlur={e => e.target.style.borderColor = '#E5E5E5'} />
          </div>
        ))}
      </div>
    </div>,

    /* 2 Prompt */
    <div key="prompt">
      <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '1.4rem',
        color: '#111111', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>Describe your vision</h3>
      <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', margin: '0 0 1.25rem' }}>
        Include materials, colours, mood, and furniture style.
      </p>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
        placeholder="A calm Scandinavian bedroom with light oak furniture, linen curtains, and soft morning light…"
        style={{ width: '100%', padding: '12px 14px', fontSize: 13, fontFamily: 'Inter, sans-serif',
          color: '#111111', background: '#FAFAF8', border: '1px solid #E5E5E5', outline: 'none',
          resize: 'vertical', lineHeight: 1.7, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
        onFocus={e => e.target.style.borderColor = '#111111'}
        onBlur={e => e.target.style.borderColor = '#E5E5E5'} />
      <p style={{ fontSize: 11, color: '#888882', fontFamily: 'Inter, sans-serif', margin: '1rem 0 0.625rem',
        fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick presets</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {PRESETS.map((p, i) => (
          <button key={i} onClick={() => setPrompt(p)} style={{
            textAlign: 'left', padding: '8px 12px', fontSize: 12,
            fontFamily: 'Inter, sans-serif', color: prompt === p ? '#111111' : '#666666',
            cursor: 'pointer', border: '1px solid',
            borderColor: prompt === p ? '#111111' : '#E5E5E5',
            background: prompt === p ? '#F5F4F0' : 'transparent',
            transition: 'all 0.18s', lineHeight: 1.5,
          }}>{p}</button>
        ))}
      </div>
    </div>,

    /* 3 Style */
    <div key="style">
      <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '1.4rem',
        color: '#111111', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>Choose a style</h3>
      <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', margin: '0 0 1.75rem' }}>
        Guides the visual language of the generated design.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
        {STYLES.map(s => (
          <button key={s} onClick={() => setStyle(s)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.125rem', textAlign: 'left', cursor: 'pointer', border: '1px solid',
            borderColor: style === s ? '#111111' : '#E5E5E5',
            background: style === s ? '#111111' : '#FAFAF8',
            transition: 'all 0.18s',
          }}>
            <span style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500,
              color: style === s ? '#FAFAF8' : '#111111' }}>{s}</span>
            {style === s && <Check size={13} style={{ color: '#FAFAF8', flexShrink: 0 }} />}
          </button>
        ))}
      </div>
    </div>,

    /* 4 Colour */
    <div key="colour">
      <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '1.4rem',
        color: '#111111', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>Colour palette</h3>
      <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', margin: '0 0 1.75rem' }}>
        Dominant colour direction for the space.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
        {COLORS.map(c => (
          <button key={c.name} onClick={() => setColorPref(c.name)} style={{
            padding: '0.875rem', cursor: 'pointer', border: '1px solid',
            borderColor: colorPref === c.name ? '#111111' : '#E5E5E5',
            background: colorPref === c.name ? '#F5F4F0' : '#FAFAF8',
            transition: 'all 0.18s', display: 'flex', flexDirection: 'column', gap: '0.625rem', alignItems: 'flex-start',
          }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {c.palette.map((col, i) => (
                <div key={i} style={{ width: 20, height: 20, background: col, border: '1px solid rgba(0,0,0,0.08)' }} />
              ))}
            </div>
            <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif',
              fontWeight: colorPref === c.name ? 600 : 400,
              color: colorPref === c.name ? '#111111' : '#666666' }}>{c.name}</span>
          </button>
        ))}
      </div>
    </div>,

    /* 5 Budget */
    <div key="budget">
      <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '1.4rem',
        color: '#111111', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>Budget range</h3>
      <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', margin: '0 0 1.75rem' }}>
        Shapes furniture quality and finish level.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {BUDGETS.map(b => <Chip key={b} label={b} active={budget === b} onClick={() => setBudget(b)} />)}
      </div>
    </div>,

    /* 6 Controls */
    <div key="controls">
      <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '1.4rem',
        color: '#111111', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>Generation controls</h3>
      <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', margin: '0 0 1.75rem' }}>
        Fine-tune how the AI renders your brief.
      </p>
      {/* Strength */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#111111', fontWeight: 500 }}>Creativity strength</label>
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#888882' }}>{strength}%</span>
        </div>
        <input type="range" min={10} max={100} value={strength} onChange={e => setStrength(+e.target.value)}
          style={{ width: '100%', accentColor: '#111111' }} />
      </div>
      {/* Density */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#111111', fontWeight: 500 }}>Furniture density</label>
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#888882' }}>
            {['','Minimal','Moderate','Dense'][density]}
          </span>
        </div>
        <input type="range" min={1} max={3} step={1} value={density} onChange={e => setDensity(+e.target.value)}
          style={{ width: '100%', accentColor: '#111111' }} />
      </div>
      {/* Lighting */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontFamily: 'Inter, sans-serif',
          color: '#111111', fontWeight: 500, marginBottom: '0.75rem' }}>Lighting mood</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {LIGHTINGS.map(l => <Chip key={l} label={l} active={lighting === l} onClick={() => setLighting(l)} />)}
        </div>
      </div>
    </div>,
  ]

  return (
    <div style={{ maxWidth: 620 }}>
      <StepProgress current={step} total={STEPS.length} />

      <AnimatePresence mode="wait">
        <motion.div key={step}
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2, ease }}>
          {STEP_CONTENT[step]}
        </motion.div>
      </AnimatePresence>

      {error && (
        <div style={{ marginTop: '1.5rem', padding: '12px 14px', background: '#FEF2F1',
          border: '1px solid #F5C6C3', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <X size={13} style={{ color: '#B42318', marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#B42318', fontFamily: 'Inter, sans-serif', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2.5rem' }}>
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, visibility: step === 0 ? 'hidden' : 'visible' }}>
          <ArrowLeft size={12} /> Back
        </button>

        <button onClick={handleNext} disabled={!canNext()} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', fontSize: 13 }}>
          {step === STEPS.length - 1
            ? <><Wand2 size={13} strokeWidth={1.5} /> Generate</>
            : <>Continue <ArrowRight size={13} /></>
          }
        </button>
      </div>

      {/* Step breadcrumb */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '1.25rem' }}>
        {STEPS.map((label, i) => (
          <button key={i} onClick={() => i < step && setStep(i)}
            style={{
              padding: '3px 8px', fontSize: 10, fontFamily: 'Inter, sans-serif', background: 'none', border: 'none',
              cursor: i < step ? 'pointer' : 'default',
              color: i === step ? '#111111' : i < step ? '#1F4E79' : '#CCCCCC',
              fontWeight: i === step ? 600 : 400,
            }}>
            {i < step && <Check size={8} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />}
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   FREE PLAN USAGE BANNER
───────────────────────────────────────────────────────────────────────── */
function UsageBanner({ remaining, limit, limitReached }) {
  if (limitReached) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.75rem',
        padding: '1rem 1.25rem', marginBottom: '1.75rem',
        background: '#FEF2F1', border: '1px solid #F5C6C3',
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#B42318',
            fontFamily: 'Inter, sans-serif', margin: '0 0 2px' }}>
            Free plan limit reached
          </p>
          <p style={{ fontSize: 12, color: '#C5352A', fontFamily: 'Inter, sans-serif', margin: 0 }}>
            You've used all {limit} free generations. Upgrade to Pro for 100/month.
          </p>
        </div>
        <Link to="/pricing" style={{
          fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500,
          color: '#FAFAF8', background: '#B42318', border: '1px solid #B42318',
          padding: '8px 18px', textDecoration: 'none', flexShrink: 0,
          transition: 'background 0.2s',
        }}>
          Upgrade to Pro
        </Link>
      </div>
    )
  }

  const pct = ((limit - remaining) / limit) * 100

  return (
    <div style={{
      padding: '0.875rem 1.25rem', marginBottom: '1.75rem',
      background: remaining <= 3 ? '#FFF8F0' : '#F5F4F0',
      border: `1px solid ${remaining <= 3 ? '#F0D9C0' : '#E5E5E5'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#111111', fontFamily: 'Inter, sans-serif' }}>
          Free plan · {remaining} generation{remaining !== 1 ? 's' : ''} remaining
        </span>
        <Link to="/pricing" style={{
          fontSize: 11, color: '#1F4E79', fontFamily: 'Inter, sans-serif',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Upgrade for more <ArrowRight size={10} />
        </Link>
      </div>
      <div style={{ height: 2, background: '#E5E5E5', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: remaining <= 3 ? '#A36A00' : '#1F4E79',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   NOT LOGGED IN GATE
───────────────────────────────────────────────────────────────────────── */
function AuthGate() {
  return (
    <PublicLayout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '5rem clamp(1.5rem,4vw,3rem)',
        textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <span className="eyebrow">AI Design Studio</span>
        <h1 style={{
          fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
          fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', letterSpacing: '-0.02em',
          color: '#111111', margin: 0, lineHeight: 1.0,
        }}>
          Sign in to start designing.
        </h1>
        <p style={{ fontSize: 14, color: '#666666', fontFamily: 'Inter, sans-serif',
          lineHeight: 1.75, margin: 0, maxWidth: 400 }}>
          Create a free account to access the full AI design studio —
          image redesign, empty room generation, and adaptive preference learning.
          Free plan includes 10 generations.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/register" className="btn-primary"
            style={{ fontSize: 13, padding: '13px 28px', display: 'flex', alignItems: 'center', gap: 8 }}>
            Create free account <ArrowRight size={13} />
          </Link>
          <Link to="/login" className="btn-outline" style={{ fontSize: 13, padding: '12px 24px' }}>
            Sign in
          </Link>
        </div>
        <p style={{ fontSize: 11, color: '#AAAAAA', fontFamily: 'Inter, sans-serif', margin: 0 }}>
          No credit card required · 10 free generations included
        </p>
      </div>
    </PublicLayout>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────────────── */
export default function DesignPage() {
  const [mode, setMode] = useState('redesign') // 'redesign' | 'empty'
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 10))
  const { user, loading: authLoading, genRemaining, genLimitReached, isFreePlan, FREE_LIMIT, checkAndIncrementGeneration } = useAuth()

  // Show nothing while auth resolves
  if (authLoading) return null

  // Not logged in — show gate
  if (!user) return <AuthGate />

  return (
    <PublicLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '3rem clamp(1.5rem,4vw,3rem) 6rem' }}>

        {/* Page header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>AI Design Studio</span>
          <h1 style={{
            fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
            fontSize: 'clamp(2rem, 3.2vw, 2.8rem)', letterSpacing: '-0.022em',
            color: '#111111', margin: '0 0 0.75rem', lineHeight: 0.98,
          }}>
            Design your space.
          </h1>
          <p style={{ fontSize: 14, color: '#666666', fontFamily: 'Inter, sans-serif',
            lineHeight: 1.65, margin: 0, maxWidth: 520 }}>
            Redesign a room from a photo, or generate a space entirely from scratch.
            Powered by SegFormer, MiDaS, and Stable Diffusion.
          </p>
        </div>

        {/* Free plan usage banner */}
        {isFreePlan && (
          <UsageBanner
            remaining={genRemaining}
            limit={FREE_LIMIT}
            limitReached={genLimitReached}
          />
        )}

        {/* Limit reached — block tabs */}
        {genLimitReached ? (
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#888882', fontFamily: 'Inter, sans-serif',
              marginBottom: '1.5rem' }}>
              Upgrade your plan to continue generating designs.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/pricing" className="btn-primary" style={{ fontSize: 13, padding: '12px 28px' }}>
                View plans
              </Link>
              <Link to="/history" className="btn-outline" style={{ fontSize: 13, padding: '11px 24px' }}>
                View your history
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Mode tabs */}
            <ModeTabs mode={mode} setMode={setMode} />

            {/* Content */}
            <AnimatePresence mode="wait">
              {mode === 'redesign' ? (
                <motion.div key="redesign"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease }}>
                  <GenerationWorkspace
                    sessionId={sessionId}
                    onTrainComplete={() => {}}
                    onBeforeGenerate={checkAndIncrementGeneration}
                  />
                </motion.div>
              ) : (
                <motion.div key="empty"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease }}>
                  <EmptyRoomWizard onBeforeGenerate={checkAndIncrementGeneration} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </PublicLayout>
  )
}
