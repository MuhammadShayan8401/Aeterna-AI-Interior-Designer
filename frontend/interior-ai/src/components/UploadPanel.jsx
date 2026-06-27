import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ImagePlus, RefreshCw, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { MAX_UPLOAD_MB, LABELS } from '../utils/constants'

export default function UploadPanel({ file, preview, onFileSelect, settings, onGenerate, isGenerating }) {
  const [dragging, setDragging] = useState(false)

  const validate = useCallback(f => {
    if (!['image/jpeg','image/png','image/webp'].includes(f.type)) { toast.error('Accepted: JPG, PNG, WEBP'); return false }
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) { toast.error(`Max ${MAX_UPLOAD_MB} MB`); return false }
    return true
  }, [])

  const onDrop  = useCallback(e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f && validate(f)) onFileSelect(f) }, [onFileSelect, validate])
  const onInput = useCallback(e => { const f = e.target.files[0]; if (f && validate(f)) onFileSelect(f) }, [onFileSelect, validate])

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className="relative overflow-hidden transition-colors duration-300"
        style={{
          border: `2px dashed ${dragging ? '#1F1D1A' : preview ? '#D5CCBE' : '#E7E0D5'}`,
          minHeight: 320,
          background: preview ? 'transparent' : '#FAFAF9',
        }}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
      >
        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="relative h-full min-h-[320px]">
              <img src={preview} alt="Room" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(31,29,26,0.5) 0%,transparent 40%)' }} />

              <div className="absolute top-3 left-3">
                <span className="eyebrow px-2.5 py-1 bg-white/90 text-charcoal/50">Source image</span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-white font-medium truncate max-w-[12rem]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}>{file?.name}</p>
                  <p className="text-xs text-white/60 mt-0.5">{((file?.size ?? 0)/1024).toFixed(0)} KB</p>
                </div>
                <label className="flex items-center gap-1.5 text-xs bg-white text-charcoal/70 hover:text-charcoal px-3 py-1.5 cursor-pointer transition-colors duration-300 border border-charcoal/10">
                  <RefreshCw size={10} /> Replace
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onInput} />
                </label>
              </div>
            </motion.div>
          ) : (
            <motion.label key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[320px] gap-5 p-10 cursor-pointer select-none">
              <div className="w-14 h-14 flex items-center justify-center border border-stone-200 bg-white transition-colors duration-300"
                style={{ background: dragging ? '#F2EAE0' : '#FFFFFF', borderColor: dragging ? '#1F1D1A' : '#E7E0D5' }}>
                {dragging
                  ? <Upload size={20} className="text-charcoal" strokeWidth={1.5} />
                  : <ImagePlus size={20} className="text-stone-400" strokeWidth={1.5} />
                }
              </div>
              <div className="text-center">
                <p className="text-sm text-charcoal font-medium mb-1">
                  {dragging ? 'Release to upload' : 'Drop your room photo here'}
                </p>
                <p className="text-xs text-stone-400">
                  or <span className="underline underline-offset-2 cursor-pointer">browse files</span>
                </p>
                <p className="label-xs mt-4">JPG · PNG · WEBP · max {MAX_UPLOAD_MB} MB</p>
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onInput} />
            </motion.label>
          )}
        </AnimatePresence>
      </div>

      {/* Settings summary + generate */}
      <div className="border border-stone-100 bg-ivory p-5">
        <p className="label-xs mb-4">Generation Parameters</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            { label: 'Room',    value: settings.roomType },
            { label: 'Style',   value: settings.style },
            { label: 'Density', value: settings.density },
            { label: 'Strength',value: `${Math.round(settings.strength * 100)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-stone-100">
              <span className="label-xs">{label}</span>
              <span className="text-xs text-charcoal capitalize font-medium">{value}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating || !file}
          className="w-full btn-charcoal disabled:opacity-30 gap-2"
        >
          {isGenerating
            ? <><span className="w-3.5 h-3.5 border-2 border-white/25 border-t-white rounded-full animate-spin-cw" />Generating…</>
            : <><Wand2 size={13} strokeWidth={1.5} />{LABELS.generateBtn}</>
          }
        </button>
      </div>
    </div>
  )
}
