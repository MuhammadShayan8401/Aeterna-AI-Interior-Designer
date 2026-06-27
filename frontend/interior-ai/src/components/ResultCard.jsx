import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Expand, SplitSquareHorizontal, Download, X, ArrowLeftRight, Sparkles } from 'lucide-react'
import FeedbackButtons from './FeedbackButtons'
import { LABELS } from '../utils/constants'

const b64src = b => `data:image/png;base64,${b}`

function CompareModal({ original, generated, label, onClose }) {
  const [split, setSplit] = useState(50)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,24,21,0.92)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.18 }}
        className="w-full max-w-3xl rounded-xl overflow-hidden border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative select-none" style={{ aspectRatio: '4/3' }}>
          <img src={generated} alt="Generated" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
            <img src={original} alt="Original" className="absolute inset-0 object-cover"
              style={{ width: `${100 / split * 100}%`, maxWidth: 'none' }} />
          </div>
          <div className="absolute top-0 bottom-0 w-0.5"
            style={{ left: `${split}%`, transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.8)' }}>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md cursor-ew-resize">
              <ArrowLeftRight size={12} className="text-ink-900" />
            </div>
          </div>
          <div className="absolute top-3 left-3 bg-ink-900 px-2.5 py-1 rounded-lg label-xs text-white/80">Before</div>
          <div className="absolute top-3 right-3 bg-ink-900 px-2.5 py-1 rounded-lg label-xs text-white">After</div>
          <input type="range" min="5" max="95" value={split} onChange={e => setSplit(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-ink-900 border-t border-white/10">
          <span className="label-xs text-white/60">{label} · drag divider to compare</span>
          <div className="flex gap-2">
            <a href={generated} download={`${label}.png`} className="text-xs flex items-center gap-1.5 text-white/80 hover:text-white px-3 py-1.5 rounded-lg border border-white/15 transition-colors">
              <Download size={11} /> Download
            </a>
            <button onClick={onClose} className="text-white/80 hover:text-white w-8 h-8 rounded-lg border border-white/15 flex items-center justify-center transition-colors"><X size={13} /></button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Lightbox({ src, label, onClose, onCompare, hasOriginal }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,24,21,0.94)' }}
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.18 }}
        className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}
      >
        <img src={src} alt={label} className="w-full rounded-xl" />
        <div className="absolute top-4 right-4 flex gap-2">
          {hasOriginal && (
            <button onClick={onCompare} className="bg-ink-900 border border-white/15 px-3 py-2 rounded-lg label-xs text-white/80 hover:text-white transition-colors flex items-center gap-1.5">
              <SplitSquareHorizontal size={11} /> Compare
            </button>
          )}
          <a href={src} download={`${label}.png`} className="bg-ink-900 border border-white/15 px-3 py-2 rounded-lg label-xs text-white/80 hover:text-white transition-colors flex items-center gap-1.5">
            <Download size={11} /> Download
          </a>
          <button onClick={onClose} className="bg-ink-900 border border-white/15 w-9 h-9 rounded-lg flex items-center justify-center text-white/80 hover:text-white transition-colors"><X size={13} /></button>
        </div>
        <div className="absolute bottom-4 left-4">
          <span className="bg-ink-900 label-xs px-3 py-1.5 rounded-lg text-white">{label}</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ResultCard({ b64, index, seed, settings, sessionId, originalPreview, isTop, preferenceScore, generationTime, aiAssisted, promptText }) {
  const [lightbox, setLightbox] = useState(false)
  const [compare,  setCompare]  = useState(false)
  const [loaded,   setLoaded]   = useState(false)
  const src   = b64src(b64)
  const label = `Output ${index + 1}`

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="group rounded-xl overflow-hidden flex flex-col card-hover bg-white"
        style={{ border: isTop ? '1px solid #B3654A' : '1px solid #E2DFDA' }}
      >
        {/* Recommended badge */}
        {isTop && (
          <div className="flex items-center justify-center gap-1.5 py-1.5 bg-accent-500"
            style={{ fontSize: 10, fontFamily: 'JetBrains Mono,monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', fontWeight: 500 }}
          >
            <Sparkles size={9} /> {LABELS.aiTopPick}
          </div>
        )}

        {/* Image */}
        <div className="relative overflow-hidden aspect-[4/3] cursor-zoom-in flex-shrink-0 bg-surface"
          onClick={() => setLightbox(true)}
        >
          <AnimatePresence>
            {!loaded && <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 skeleton" />}
          </AnimatePresence>

          <motion.img
            src={src} alt={label} onLoad={() => setLoaded(true)} loading="lazy"
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }} animate={{ opacity: loaded ? 1 : 0 }} transition={{ duration: 0.3 }}
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-end p-3"
            style={{ background: 'linear-gradient(to top,rgba(26,24,21,0.55) 0%,transparent 50%)' }}>
            <div className="flex gap-1.5">
              {originalPreview && (
                <button onClick={e => { e.stopPropagation(); setLightbox(false); setCompare(true) }}
                  className="bg-ink-900 label-xs px-2 py-1 rounded-lg text-white/85 hover:text-white transition-colors flex items-center gap-1">
                  <SplitSquareHorizontal size={10} /> Compare
                </button>
              )}
              <span className="bg-ink-900 label-xs px-2 py-1 rounded-lg text-white/85 flex items-center gap-1">
                <Expand size={10} /> Expand
              </span>
            </div>
          </div>

          {/* Variation label */}
          <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="bg-ink-900 label-xs px-2 py-1 rounded-md text-white">{label}</span>
          </div>

          {/* Preference score */}
          {preferenceScore != null && (
            <div className="absolute top-3 right-3 bg-white border border-ink-100 px-2 py-1.5 rounded-lg text-center">
              <div className="text-xs font-bold tabular-nums text-accent-500">{(preferenceScore * 100).toFixed(0)}%</div>
              <div className="label-xs mt-0.5">score</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink-900">{label}</p>
              {seed != null && <p className="label-xs mt-0.5">seed {seed}</p>}
            </div>
            <a href={src} download={`interior_${settings?.style || 'design'}_output_${index+1}.png`}
              className="btn-ghost text-xs flex items-center gap-1.5 flex-shrink-0">
              <Download size={11} /> Save
            </a>
          </div>

          <FeedbackButtons
            sessionId={sessionId} imageIndex={index} seed={seed}
            roomType={settings?.room_type} style={settings?.style}
            density={settings?.density} strength={settings?.strength}
            numImages={settings?.num_images} generationTime={generationTime}
            usedAiRecommendation={aiAssisted} promptText={promptText}
            preferenceScore={preferenceScore}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {lightbox && <Lightbox src={src} label={label} onClose={() => setLightbox(false)}
          onCompare={() => { setLightbox(false); setCompare(true) }} hasOriginal={!!originalPreview} />}
        {compare && originalPreview && <CompareModal original={originalPreview} generated={src}
          label={label} onClose={() => setCompare(false)} />}
      </AnimatePresence>
    </>
  )
}
