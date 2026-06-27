/**
 * Sidebar.jsx — Generation settings panel.
 *
 * Previously a position:fixed, full-viewport-height left rail present
 * on every screen — the single most "SaaS app shell" element on the
 * page. Now an in-flow panel that lives only inside the Generate
 * section (see App.jsx), next to UploadPanel, like the rest of the
 * editorial layout. Same functionality, no longer pinned chrome.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, Compass, ChevronDown, Loader2, Trash2 } from 'lucide-react'
import AIAssistedToggle from './AIAssistedToggle'
import ANNStatusPanel   from './ANNStatusPanel'
import { getRecommendations } from '../services/api'
import { ROOM_TYPES, STYLES, LABELS } from '../utils/constants'

const DENSITIES = ['minimal','moderate','dense']

const TIPS = {
  strength: 'Controls transformation intensity. Lower values preserve the original layout; higher values allow bolder reimagining.',
  density:  'Furniture quantity in the generated design. Minimal is open and airy; dense creates a layered, curated look.',
}

function Tip({ text }) {
  return (
    <span className="tooltip-trigger ml-auto cursor-help">
      <Info size={11} className="text-stone-400 hover:text-stone-600 transition-colors" />
      <span className="tooltip-box">{text}</span>
    </span>
  )
}

function FieldLabel({ children, tip }) {
  return (
    <div className="flex items-center gap-1.5 mb-2.5 select-none">
      <span className="label-xs">{children}</span>
      {tip && <Tip text={tip} />}
    </div>
  )
}

export default function Sidebar({ settings, setSettings, aiAssisted, onToggleAI, annRecommendation, onGenerate, isGenerating, hasImage, onClear, hasResults, sessionId, onTrainComplete }) {
  const [fetchingRec, setFetchingRec] = useState(false)
  const aiRec = annRecommendation

  useEffect(() => {
    if (!aiAssisted) return
    setFetchingRec(true)
    getRecommendations({ room_type: settings.roomType, style: settings.style, density: settings.density, strength: settings.strength, session_id: sessionId })
      .then(rec => { if (rec.success) setSettings(s => ({ ...s, style: rec.recommended_style, density: rec.recommended_density, strength: rec.suggested_strength })) })
      .catch(() => {})
      .finally(() => setFetchingRec(false))
  }, [aiAssisted])

  const isRec = (f, v) => aiAssisted && aiRec && (f === 'style' ? v === aiRec.recommended_style : v === aiRec.recommended_density)
  const pct   = Math.round(settings.strength * 100)

  return (
    <aside className="flex flex-col bg-white border border-stone-100">

      {/* Content */}
      <div className="px-6 py-6 space-y-6">

        <AIAssistedToggle enabled={aiAssisted} onToggle={onToggleAI} confidence={aiRec?.confidence} />

        {/* ANN status + Update Preference Model button */}
        <ANNStatusPanel onTrainComplete={onTrainComplete} />

        <AnimatePresence>
          {fetchingRec && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 py-0.5">
              <Loader2 size={11} className="text-clay animate-spin-cw" />
              <span className="label-xs text-clay">Fetching recommendations…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Room type */}
        <div>
          <FieldLabel>Room Type</FieldLabel>
          <div className="relative">
            <select value={settings.roomType}
              onChange={e => setSettings(s => ({ ...s, roomType: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm text-charcoal bg-ivory border border-stone-100 appearance-none focus:outline-none focus:border-charcoal transition-colors duration-300 cursor-pointer"
            >
              {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
          </div>
        </div>

        {/* Style grid */}
        <div>
          <div className="flex items-center mb-2.5">
            <span className="label-xs">Design Style</span>
            {aiAssisted && aiRec && (
              <span className="ml-auto text-clay font-medium" style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>
                Model: {aiRec.recommended_style}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {STYLES.map(s => {
              const active = settings.style === s
              const rec    = isRec('style', s)
              return (
                <button key={s}
                  onClick={() => setSettings(p => ({ ...p, style: s }))}
                  className="relative px-2.5 py-1.5 text-xs font-medium capitalize transition-colors duration-300 text-left border"
                  style={{
                    background: active ? '#F7EAE4' : rec ? '#FBF3E9' : '#FAF7F2',
                    borderColor: active ? '#B3654A' : rec ? '#E8D2B0' : '#E7E0D5',
                    color: active ? '#B3654A' : rec ? '#946A33' : '#6B6256',
                  }}
                >
                  <span>{s}</span>
                  {rec && <span className="absolute top-1 right-1.5 label-xs" style={{ fontSize: 8, color: '#946A33' }}>AI</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Density */}
        <div>
          <FieldLabel tip={TIPS.density}>Furniture Density</FieldLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {DENSITIES.map(d => {
              const active = settings.density === d
              const rec    = isRec('density', d)
              return (
                <button key={d}
                  onClick={() => setSettings(p => ({ ...p, density: d }))}
                  className="py-2 text-xs font-medium capitalize relative transition-colors duration-300 border"
                  style={{
                    background: active ? '#F7EAE4' : rec ? '#FBF3E9' : '#FAF7F2',
                    borderColor: active ? '#B3654A' : rec ? '#E8D2B0' : '#E7E0D5',
                    color: active ? '#B3654A' : rec ? '#946A33' : '#6B6256',
                  }}
                >
                  {d}
                  {rec && <span className="block label-xs mt-0.5" style={{ fontSize: 8, color: '#946A33' }}>Model</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Strength */}
        <div>
          <div className="flex items-center mb-2.5">
            <span className="label-xs">Transformation Strength</span>
            <Tip text={TIPS.strength} />
            <span className="ml-2 text-xs font-semibold text-charcoal tabular-nums">{pct}%</span>
          </div>
          <input type="range" min="0.3" max="0.9" step="0.05"
            value={settings.strength}
            onChange={e => setSettings(s => ({ ...s, strength: parseFloat(e.target.value) }))}
            className="w-full"
          />
          <div className="flex justify-between mt-1.5 px-0.5">
            {['Subtle','Balanced','Bold'].map(t => (
              <span key={t} className="label-xs">{t}</span>
            ))}
          </div>
          <AnimatePresence>
            {aiAssisted && aiRec && (
              <motion.div initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#946A33' }} />
                <span className="label-xs" style={{ fontSize: 9, color: '#946A33' }}>
                  Model recommends {Math.round(aiRec.suggested_strength * 100)}%
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Variations */}
        <div>
          <FieldLabel>Output Variations</FieldLabel>
          <div className="grid grid-cols-4 gap-1.5">
            {[1,2,3,4].map(n => (
              <button key={n}
                onClick={() => setSettings(s => ({ ...s, numImages: n }))}
                className="py-2 text-sm font-semibold transition-colors duration-300 border"
                style={{
                  background: settings.numImages === n ? '#F7EAE4' : '#FAF7F2',
                  borderColor: settings.numImages === n ? '#B3654A' : '#E7E0D5',
                  color: settings.numImages === n ? '#B3654A' : '#A39A8B',
                }}
              >{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-6 space-y-2 border-t border-stone-100">
        <button
          onClick={onGenerate}
          disabled={!hasImage || isGenerating}
          className="w-full btn-charcoal disabled:opacity-30"
          style={{ width: '100%' }}
        >
          {isGenerating
            ? <><Loader2 size={14} className="animate-spin-cw" />{LABELS.generateBtn}</>
            : <><Compass size={13} strokeWidth={1.5} />{LABELS.generateBtn}</>
          }
        </button>

        <AnimatePresence>
          {hasResults && (
            <motion.button
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              onClick={onClear}
              className="w-full py-2.5 text-xs flex items-center justify-center gap-1.5 border border-stone-100 text-stone-400 hover:text-charcoal hover:bg-ivory transition-colors duration-300"
            >
              <Trash2 size={11} />
              Clear results
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}
