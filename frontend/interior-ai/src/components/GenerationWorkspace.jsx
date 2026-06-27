/**
 * GenerationWorkspace.jsx — The core product experience.
 *
 * Two modes:
 *   MODE 1 — Image Redesign  (img2img: upload → style → generate)
 *   MODE 2 — Empty Room      (txt2img: describe → generate, no photo needed)
 *
 * Three panel layout:
 *   [Upload / Prompt]  |  [Settings]  →  [Results]
 *
 * All existing AI pipeline functionality (SegFormer → MiDaS → ANN →
 * Stable Diffusion) is fully preserved — only the presentation of the
 * controls changes. The API calls are identical to before.
 */
import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ImagePlus, RefreshCw, Wand2, Sparkles, Loader2, X, Download, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

import WorkspaceStylePicker from './landing/WorkspaceStylePicker'
import ANNStatusPanel       from './ANNStatusPanel'
import FeedbackButtons      from './FeedbackButtons'
import { generateDesigns, generateEmptyRoom, getRecommendations } from '../services/api'
import { ROOM_TYPES, LABELS, MAX_UPLOAD_MB } from '../utils/constants'

const LIGHTING = ['natural', 'warm', 'bright', 'evening', 'golden hour', 'overcast']
const DENSITIES = ['minimal', 'moderate', 'dense']
const ease = [0.16, 1, 0.3, 1]

// ── Sub-components ────────────────────────────────────────────────────────────

function ModeTab({ id, label, active, onClick, description }) {
  return (
    <button onClick={onClick}
      className="relative flex-1 text-left px-5 py-4 transition-colors duration-300 border-r border-stone-100 last:border-r-0"
      style={{ background: active ? '#FFFFFF' : '#FAFAF9' }}
    >
      {active && (
        <motion.div layoutId="workspace-tab" className="absolute inset-x-0 top-0 h-0.5 bg-charcoal"
          transition={{ duration: 0.3, ease }} />
      )}
      <p className="text-sm font-semibold text-charcoal mb-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
        {label}
      </p>
      <p className="label-xs leading-normal">{description}</p>
    </button>
  )
}

function DropZone({ file, preview, onFileSelect, isGenerating }) {
  const [dragging, setDragging] = useState(false)

  const validate = f => {
    if (!['image/jpeg','image/png','image/webp'].includes(f.type)) { toast.error('Accepted: JPG, PNG, WEBP'); return false }
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) { toast.error(`Max ${MAX_UPLOAD_MB} MB`); return false }
    return true
  }
  const onDrop  = e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f && validate(f)) onFileSelect(f) }
  const onInput = e => { const f = e.target.files[0]; if (f && validate(f)) onFileSelect(f) }

  return (
    <div className="relative overflow-hidden transition-colors duration-300"
      style={{
        border: `2px dashed ${dragging ? '#1F1D1A' : preview ? '#D5CCBE' : '#E7E0D5'}`,
        background: preview ? 'transparent' : '#FAFAF9',
        minHeight: 220,
      }}
      onDrop={onDrop}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
    >
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative min-h-[220px]">
            <img src={preview} alt="Room" className="w-full h-full object-cover" style={{ minHeight: 220 }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(31,29,26,0.5) 0%,transparent 50%)' }} />
            <div className="absolute top-2.5 left-2.5">
              <span className="eyebrow px-2.5 py-1 bg-white/85">Source</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
              <div>
                <p className="text-xs text-white font-medium truncate max-w-[10rem]"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}>{file?.name}</p>
                <p className="text-xs text-white/55 mt-0.5">{((file?.size ?? 0)/1024).toFixed(0)} KB</p>
              </div>
              <label className="flex items-center gap-1.5 text-xs bg-white text-charcoal/70 hover:text-charcoal px-2.5 py-1.5 cursor-pointer transition-colors">
                <RefreshCw size={10} /> Replace
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onInput} />
              </label>
            </div>
          </motion.div>
        ) : (
          <motion.label key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-4 p-8 cursor-pointer select-none min-h-[220px]">
            <div className="w-12 h-12 flex items-center justify-center border transition-colors duration-300"
              style={{ background: dragging ? '#F2EAE0' : '#FFFFFF', borderColor: dragging ? '#1F1D1A' : '#E7E0D5' }}>
              {dragging
                ? <Upload size={18} className="text-charcoal" strokeWidth={1.5} />
                : <ImagePlus size={18} className="text-stone-400" strokeWidth={1.5} />
              }
            </div>
            <div className="text-center">
              <p className="text-sm text-charcoal font-medium mb-1">
                {dragging ? 'Release to upload' : 'Drop your room photo here'}
              </p>
              <p className="text-xs text-stone-400">or <span className="underline underline-offset-2">browse files</span></p>
              <p className="label-xs mt-3">JPG · PNG · WEBP · max {MAX_UPLOAD_MB} MB</p>
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onInput} />
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  )
}

function SettingsRow({ label, children }) {
  return (
    <div className="py-4 border-b border-stone-100 last:border-0">
      <p className="label-xs mb-2.5">{label}</p>
      {children}
    </div>
  )
}

function ResultsArea({ results, uploadedPreview, aiAssisted, sessionId, onClear }) {
  const images = results?.generated_images || []
  const b64src = b => `data:image/png;base64,${b}`

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[360px] border border-dashed border-stone-200 bg-ivory">
        <div className="text-center max-w-xs">
          <div className="w-12 h-12 border border-stone-200 flex items-center justify-center mx-auto mb-5">
            <Wand2 size={18} className="text-stone-300" strokeWidth={1.25} />
          </div>
          <p className="text-sm text-charcoal font-medium mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            Your design will appear here
          </p>
          <p className="label-xs leading-relaxed">
            Configure settings and upload a room photo, then click Generate to start.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="eyebrow block mb-1">Results</span>
          <p className="text-xs text-stone-400">
            {images.length} variation{images.length !== 1 ? 's' : ''} ·{' '}
            {results.generation_time}s · {results.settings?.style}
          </p>
        </div>
        <button onClick={onClear} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-charcoal transition-colors">
          <X size={11} /> Clear
        </button>
      </div>

      {/* Image grid */}
      <div className={`grid gap-4 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'}`}>
        {images.map((img, i) => {
          const src = b64src(img)
          const isTop = i === 0 && images.length > 1
          const score = results.preference_scores?.[i]
          return (
            <motion.div key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.5, ease }}
              className="relative group overflow-hidden"
              style={{ border: isTop ? '1.5px solid #1F1D1A' : '1px solid #E7E0D5' }}
            >
              {isTop && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal">
                  <Sparkles size={9} className="text-white/70" />
                  <span className="label-xs text-white/80">{LABELS.aiTopPick}</span>
                </div>
              )}
              <div className="relative aspect-[4/3] overflow-hidden cursor-zoom-in bg-ivory">
                <img src={src} alt={`Output ${i+1}`} className="w-full h-full object-cover" loading="lazy" />
                {score != null && (
                  <div className="absolute top-2.5 right-2.5 bg-white border border-stone-100 px-2 py-1 text-center">
                    <div className="text-xs font-semibold tabular-nums text-clay"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}>{(score*100).toFixed(0)}%</div>
                    <div className="label-xs" style={{ fontSize: 8 }}>score</div>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-end p-2.5"
                  style={{ background: 'linear-gradient(to top,rgba(31,29,26,0.55) 0%,transparent 50%)' }}>
                  <a href={src} download={`aeterna_${results.settings?.style || 'output'}_${i+1}.png`}
                    className="flex items-center gap-1.5 text-xs bg-white text-charcoal px-2.5 py-1.5 border border-white/20"
                    onClick={e => e.stopPropagation()}>
                    <Download size={10} /> Save
                  </a>
                </div>
              </div>
              <div className="p-3 border-t border-stone-100 bg-white">
                <FeedbackButtons
                  sessionId={sessionId} imageIndex={i}
                  seed={results.seeds?.[i] ?? 0} roomType={results.settings?.room_type}
                  style={results.settings?.style} density={results.settings?.density}
                  strength={results.settings?.strength} numImages={images.length}
                  generationTime={results.generation_time} usedAiRecommendation={aiAssisted}
                  promptText={results.prompt} preferenceScore={score}
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Prompt viewer */}
      {results.prompt && (
        <details className="border border-stone-100 bg-ivory">
          <summary className="px-4 py-3 label-xs cursor-pointer hover:text-charcoal transition-colors flex items-center gap-2 select-none">
            Diffusion Prompt
            <span className="text-stone-300">· auto-generated + enhanced</span>
          </summary>
          <div className="px-4 pb-4 pt-2 border-t border-stone-100">
            <pre className="text-xs text-stone-600 leading-relaxed p-3 bg-white border border-stone-100"
              style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {results.prompt}
            </pre>
            {results.furniture_detected?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                <span className="label-xs mr-1">Detected</span>
                {results.furniture_detected.map(f => (
                  <span key={f} className="label-xs px-2 py-0.5 capitalize bg-white border border-stone-100">{f}</span>
                ))}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

// ── Main workspace ─────────────────────────────────────────────────────────────

export default function GenerationWorkspace({ sessionId, onTrainComplete, onBeforeGenerate }) {
  const [mode,            setMode]            = useState('redesign')  // 'redesign' | 'empty'
  const [file,            setFile]            = useState(null)
  const [preview,         setPreview]         = useState(null)
  const [results,         setResults]         = useState(null)
  const [isGenerating,    setIsGenerating]    = useState(false)
  const [aiAssisted,      setAiAssisted]      = useState(false)
  const [promptEnhance,   setPromptEnhance]   = useState('')

  // Settings shared across modes
  const [style,    setStyle]    = useState('modern')
  const [roomType, setRoomType] = useState('living room')
  const [density,  setDensity]  = useState('moderate')
  const [strength, setStrength] = useState(0.6)
  const [numImages,setNumImages]= useState(3)
  // Empty room only
  const [lighting, setLighting] = useState('natural')

  const stepTimers = useRef([])

  const handleFileSelect = useCallback(f => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResults(null)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (mode === 'redesign' && !file) { toast.error('Upload a room photo first'); return }
    // Check free plan limit
    if (onBeforeGenerate) {
      const check = onBeforeGenerate()
      if (!check.allowed) {
        if (check.reason === 'not_logged_in') toast.error('Please sign in to generate designs')
        else toast.error('Free plan limit reached — upgrade to continue generating')
        return
      }
    }
    setIsGenerating(true)
    setResults(null)

    try {
      let data
      if (mode === 'redesign') {
        const form = new FormData()
        form.append('image',       file)
        form.append('room_type',   roomType)
        form.append('style',       style)
        form.append('density',     density)
        form.append('num_images',  numImages)
        form.append('strength',    strength)
        form.append('ai_assisted', aiAssisted)
        form.append('session_id',  sessionId)
        form.append('like_ratio',  0.5)
        if (promptEnhance.trim()) form.append('prompt_enhancement', promptEnhance.trim())
        data = await generateDesigns(form)
      } else {
        const form = new FormData()
        form.append('room_type',   roomType)
        form.append('style',       style)
        form.append('density',     density)
        form.append('lighting',    lighting)
        form.append('num_images',  numImages)
        form.append('ai_assisted', aiAssisted)
        form.append('session_id',  sessionId)
        form.append('like_ratio',  0.5)
        data = await generateEmptyRoom(form)
      }
      if (data.success) {
        setResults(data)
        toast.success('Generation complete', { duration: 3000 })
      } else {
        throw new Error(data.error || 'Generation failed')
      }
    } catch (e) {
      const msg = e.code === 'ECONNABORTED'
        ? 'Request timed out — model may be starting, try again in a moment'
        : e.response?.data?.error ?? e.message
      toast.error(msg, { duration: 5000 })
    } finally {
      setIsGenerating(false)
    }
  }, [mode, file, roomType, style, density, numImages, strength, lighting, aiAssisted, sessionId, promptEnhance])

  return (
    <section id="generate" className="scroll-mt-16">
      {/* Section header */}
      <div className="mb-8">
        <span className="eyebrow block mb-3">Studio Workspace</span>
        <h2 className="display-2 text-charcoal" style={{ fontSize: 'clamp(2rem, 3.2vw, 2.8rem)' }}>
          Start your project.
        </h2>
      </div>

      {/* Mode switcher */}
      <div className="flex border border-stone-100 mb-6 overflow-hidden">
        <ModeTab id="redesign" label="Image Redesign"
          description="Upload a room · reimagine its interior · preserve structure"
          active={mode === 'redesign'} onClick={() => { setMode('redesign'); setResults(null) }} />
        <ModeTab id="empty" label="Empty Room Generation"
          description="Generate from scratch · no photo needed · text-driven"
          active={mode === 'empty'} onClick={() => { setMode('empty'); setResults(null) }} />
      </div>

      {/* Three-column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Left: Upload + Prompt ─────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">

          <AnimatePresence mode="wait">
            {mode === 'redesign' ? (
              <motion.div key="redesign-upload"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease }}
              >
                <DropZone file={file} preview={preview} onFileSelect={handleFileSelect} isGenerating={isGenerating} />
              </motion.div>
            ) : (
              <motion.div key="empty-info"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease }}
                className="p-5 bg-ivory border border-stone-100"
                style={{ minHeight: 120 }}
              >
                <p className="label-xs mb-2">Empty Room Mode</p>
                <p className="text-sm text-charcoal font-medium mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  No photo required
                </p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Describe the room you want, choose a style, and the system generates it from scratch using Stable Diffusion txt2img.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prompt enhancement */}
          <div>
            <p className="label-xs mb-2">
              {mode === 'redesign' ? 'Prompt Enhancement' : 'Room Description'}
            </p>
            <textarea
              value={promptEnhance}
              onChange={e => setPromptEnhance(e.target.value)}
              placeholder={mode === 'redesign'
                ? 'e.g. warm oak flooring, large plants, reading nook...'
                : 'e.g. luxury hotel suite with floor-to-ceiling windows, warm evening light...'
              }
              rows={mode === 'redesign' ? 3 : 5}
              className="w-full text-sm text-charcoal border border-stone-100 bg-white resize-none focus:outline-none focus:border-charcoal transition-colors duration-300 p-3"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.6 }}
            />
            <p className="label-xs mt-1.5">
              {mode === 'redesign'
                ? 'Appended to AI-generated prompt — be specific about materials, lighting, or objects you want kept or added.'
                : 'The more specific, the better — describe materials, lighting mood, architectural details.'
              }
            </p>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (mode === 'redesign' && !file)}
            className="w-full btn-charcoal disabled:opacity-30 gap-2 py-4"
          >
            {isGenerating
              ? <><Loader2 size={14} className="animate-spin-cw" />Generating…</>
              : <><Wand2 size={13} strokeWidth={1.5} />Generate Design <ArrowRight size={13} /></>
            }
          </button>
        </div>

        {/* ── Middle: Settings ──────────────────────────────────────────── */}
        <div className="lg:col-span-3 border-l border-stone-100 pl-5 space-y-0">

          {/* AI-Assisted toggle */}
          <div className="py-4 border-b border-stone-100">
            <button onClick={() => setAiAssisted(v => !v)}
              className="w-full flex items-center justify-between gap-3 text-left">
              <div>
                <p className="text-xs font-medium text-charcoal mb-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>Adaptive Mode</p>
                <p className="label-xs">ANN-guided style &amp; strength selection</p>
              </div>
              <div className="relative flex-shrink-0 rounded-full transition-colors duration-300"
                style={{ height: 20, width: 36, background: aiAssisted ? '#1F1D1A' : '#D5CCBE' }}>
                <motion.div className="absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm"
                  animate={{ left: aiAssisted ? 19 : 3 }} transition={{ type: 'spring', stiffness: 520, damping: 32 }} />
              </div>
            </button>
          </div>

          <SettingsRow label="Room Type">
            <div className="relative">
              <select value={roomType} onChange={e => setRoomType(e.target.value)}
                className="w-full px-3 py-2 text-xs text-charcoal border border-stone-100 bg-ivory appearance-none focus:outline-none focus:border-charcoal transition-colors">
                {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </SettingsRow>

          <SettingsRow label="Density">
            <div className="grid grid-cols-3 gap-1.5">
              {DENSITIES.map(d => (
                <button key={d} onClick={() => setDensity(d)}
                  className="py-1.5 text-xs capitalize transition-colors duration-200 border"
                  style={{
                    background: density === d ? '#1F1D1A' : '#FAFAF9',
                    borderColor: density === d ? '#1F1D1A' : '#E7E0D5',
                    color: density === d ? '#FFFFFF' : '#6B6256',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: density === d ? 500 : 400,
                  }}>
                  {d}
                </button>
              ))}
            </div>
          </SettingsRow>

          {mode === 'redesign' ? (
            <SettingsRow label={`Strength — ${Math.round(strength * 100)}%`}>
              <input type="range" min="0.3" max="0.9" step="0.05"
                value={strength} onChange={e => setStrength(parseFloat(e.target.value))} className="w-full" />
              <div className="flex justify-between mt-1">
                <span className="label-xs">Subtle</span>
                <span className="label-xs">Bold</span>
              </div>
            </SettingsRow>
          ) : (
            <SettingsRow label="Lighting">
              <div className="grid grid-cols-2 gap-1.5">
                {LIGHTING.map(l => (
                  <button key={l} onClick={() => setLighting(l)}
                    className="py-1.5 text-xs capitalize transition-colors duration-200 border"
                    style={{
                      background: lighting === l ? '#1F1D1A' : '#FAFAF9',
                      borderColor: lighting === l ? '#1F1D1A' : '#E7E0D5',
                      color: lighting === l ? '#FFFFFF' : '#6B6256',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                    {l}
                  </button>
                ))}
              </div>
            </SettingsRow>
          )}

          <SettingsRow label="Variations">
            <div className="grid grid-cols-4 gap-1.5">
              {[1,2,3,4].map(n => (
                <button key={n} onClick={() => setNumImages(n)}
                  className="py-1.5 text-xs font-semibold transition-colors duration-200 border"
                  style={{
                    background: numImages === n ? '#1F1D1A' : '#FAFAF9',
                    borderColor: numImages === n ? '#1F1D1A' : '#E7E0D5',
                    color: numImages === n ? '#FFFFFF' : '#A39A8B',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </SettingsRow>

          <div className="pt-4">
            <ANNStatusPanel onTrainComplete={onTrainComplete} />
          </div>
        </div>

        {/* ── Right: Style picker + Results ────────────────────────────── */}
        <div className="lg:col-span-5 border-l border-stone-100 pl-5 space-y-5">

          {/* Style picker */}
          <div>
            <p className="label-xs mb-3">Design Style</p>
            <WorkspaceStylePicker value={style} onChange={setStyle} />
          </div>

          {/* Results */}
          <div>
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center border border-dashed border-stone-200 bg-ivory"
                  style={{ minHeight: 280 }}
                >
                  <div className="text-center space-y-4">
                    <Loader2 size={22} className="animate-spin-cw text-clay mx-auto" strokeWidth={1.25} />
                    <div>
                      <p className="text-sm text-charcoal font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Generating your design
                      </p>
                      <p className="label-xs mt-1.5">
                        {mode === 'redesign'
                          ? 'SegFormer → MiDaS → ANN → Stable Diffusion'
                          : 'Prompt → Stable Diffusion txt2img'}
                      </p>
                    </div>
                    <p className="label-xs text-stone-300">30–90 s on GPU</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="results"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ResultsArea
                    results={results}
                    uploadedPreview={preview}
                    aiAssisted={aiAssisted}
                    sessionId={sessionId}
                    onClear={() => { setResults(null); setFile(null); setPreview(null); setPromptEnhance('') }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
