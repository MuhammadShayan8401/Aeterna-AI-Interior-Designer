import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, ChevronUp, ChevronDown, CheckCircle2, Wand2, LayoutDashboard, Zap } from 'lucide-react'
import { LABELS } from '../utils/constants'

function ConfidenceRing({ value = 0, size = 52, label, color = '#B3654A' }) {
  const r = (size - 4.5) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(1, value)))
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2DFDA" strokeWidth="3.5" />
          <motion.circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold tabular-nums" style={{ color, fontFamily: 'JetBrains Mono,monospace' }}>
            {(value * 100).toFixed(0)}
          </span>
        </div>
      </div>
      <span className="label-xs">{label}</span>
    </div>
  )
}

function AffinityBar({ label, value, index }) {
  return (
    <div className="flex items-center gap-3">
      <span className="label-xs capitalize shrink-0" style={{ width: 116 }}>{label}</span>
      <div className="flex-1 h-1 rounded-full overflow-hidden bg-ink-100">
        <motion.div className="h-full rounded-full bg-accent-500"
          initial={{ width: 0 }}
          animate={{ width: `${(value * 100).toFixed(1)}%` }}
          transition={{ duration: 0.7, ease: [0.22,1,0.36,1], delay: 0.05 + index * 0.03 }}
        />
      </div>
      <span className="label-xs tabular-nums w-7 text-right shrink-0">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  )
}

export default function AIRecommendationPanel({ recommendation, onApply }) {
  const [applied,  setApplied]  = useState(false)
  const [expanded, setExpanded] = useState(true)

  if (!recommendation) return null

  const {
    recommended_style, recommended_density, suggested_strength,
    satisfaction_prob, aesthetic_score, confidence,
    style_affinities, prompt_boost,
  } = recommendation

  const topStyles = Object.entries(style_affinities || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const handleApply = () => {
    onApply({ style: recommended_style, density: recommended_density, strength: suggested_strength })
    setApplied(true)
    setTimeout(() => setApplied(false), 3000)
  }

  return (
    <div className="rounded-xl overflow-hidden bg-accent-50 border border-accent-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: expanded ? '1px solid #E8D2B0' : 'none' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border border-accent-100">
            <BrainCircuit size={14} className="text-accent-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900">
              {LABELS.aiPrefAnalysis}
            </h3>
            <p className="label-xs mt-0.5">
              {(confidence * 100).toFixed(0)}% model confidence · ANN inference
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleApply}
            className="text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors duration-150 border"
            style={applied
              ? { background: '#F1F4EE', borderColor: '#C9D4C2', color: '#5C7355' }
              : { background: '#B3654A', borderColor: '#B3654A', color: '#fff' }
            }
          >
            {applied
              ? <span className="flex items-center gap-1.5"><CheckCircle2 size={11} />Applied</span>
              : LABELS.useSuggestions
            }
          </button>
          <button onClick={() => setExpanded(v => !v)} className="btn-icon">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-5 space-y-5">

              {/* Confidence rings */}
              <div className="flex items-center justify-around py-1">
                <ConfidenceRing value={satisfaction_prob} label="Satisfaction" color="#5C7355" />
                <ConfidenceRing value={aesthetic_score}   label="Aesthetic"   color="#946A33" />
                <ConfidenceRing value={confidence}        label="Confidence"  color="#B3654A" />
              </div>

              {/* Recommendation chips */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { Icon: Wand2,          label: 'Style',      value: recommended_style },
                  { Icon: LayoutDashboard,label: 'Density',    value: recommended_density },
                  { Icon: Zap,            label: 'Strength',   value: `${(suggested_strength*100).toFixed(0)}%` },
                ].map(({ Icon, label, value }) => (
                  <div key={label}
                    className="rounded-lg p-3 text-center bg-white border border-ink-100"
                  >
                    <div className="flex justify-center mb-1.5">
                      <Icon size={13} className="text-ink-400" />
                    </div>
                    <div className="text-xs font-semibold text-ink-900 capitalize truncate">{value}</div>
                    <div className="label-xs mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Style affinity bars */}
              {topStyles.length > 0 && (
                <div>
                  <p className="label-xs mb-3">Style Affinities</p>
                  <div className="space-y-2">
                    {topStyles.map(([style, val], i) => (
                      <AffinityBar key={style} label={style} value={val} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt boost */}
              {prompt_boost && (
                <div className="rounded-lg p-3 bg-white border border-ink-100">
                  <p className="label-xs mb-1.5">Prompt enhancement applied</p>
                  <p className="text-xs text-ink-400 italic leading-relaxed"
                    style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11 }}>
                    "{prompt_boost.slice(0, 110)}{prompt_boost.length > 110 ? '…' : ''}"
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
