import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp, ThumbsDown, SlidersHorizontal, CheckCircle2, XCircle } from 'lucide-react'
import { sendFeedback } from '../services/api'
import toast from 'react-hot-toast'

export default function FeedbackButtons({
  sessionId, imageIndex, seed, roomType, style, density,
  strength, numImages, generationTime, usedAiRecommendation,
  promptText, preferenceScore,
}) {
  const [rated,      setRated]      = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [aesthetic,  setAesthetic]  = useState(0.5)
  const [realism,    setRealism]    = useState(0.5)

  const submit = async (rating) => {
    if (loading || rated) return
    setLoading(true)
    try {
      await sendFeedback({
        session_id: sessionId, image_index: imageIndex, rating,
        seed: seed ?? 0, room_type: roomType ?? '', style: style ?? '',
        density: density ?? 'moderate', strength: strength ?? 0.6,
        num_images: numImages ?? 3, generation_time: generationTime ?? 0,
        used_ai_recommendation: usedAiRecommendation ?? false,
        aesthetic_score: aesthetic, realism_score: realism,
        prompt_text: promptText ?? '',
      })
      setRated(rating)
      toast(rating === 1 ? 'Rating recorded — preference model will update' : 'Feedback recorded',
        { duration: 2200, icon: rating === 1 ? '✓' : undefined })
    } catch {
      toast.error('Failed to record feedback')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2.5 relative">
      {/* Preference score row */}
      {preferenceScore != null && !rated && (
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-ink-100" />
          <span className="label-xs">Preference score</span>
          <span className="text-xs font-bold tabular-nums text-accent-500">
            {(preferenceScore * 100).toFixed(0)}%
          </span>
          <div className="h-px flex-1 bg-ink-100" />
        </div>
      )}

      {/* Rating row */}
      {!rated ? (
        <div className="flex items-center gap-2">
          {[
            { r: 1,  Icon: ThumbsUp,   label: 'Helpful' },
            { r: -1, Icon: ThumbsDown, label: 'Not helpful' },
          ].map(({ r, Icon, label }) => (
            <button key={r}
              onClick={() => submit(r)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-ink-100 bg-surface text-ink-600 hover:border-ink-200 transition-colors duration-150"
            >
              <Icon size={12} />
              {label}
            </button>
          ))}

          <button
            onClick={() => setShowDetail(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150 border"
            style={{
              background: showDetail ? '#FBF3E9' : '#FAFAF9',
              borderColor: showDetail ? '#B3654A' : '#E2DFDA',
              color: showDetail ? '#B3654A' : '#5B564E',
            }}
            title="Detailed scoring"
          >
            <SlidersHorizontal size={11} />
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs border"
          style={{
            background: rated === 1 ? '#F1F4EE' : '#F7EAE5',
            borderColor: rated === 1 ? '#C9D4C2' : '#E5C4BC',
            color: rated === 1 ? '#5C7355' : '#A23E2E',
          }}
        >
          {rated === 1
            ? <><CheckCircle2 size={12} />Recorded · preference model updating</>
            : <><XCircle size={12} />Noted · will refine recommendations</>
          }
        </motion.div>
      )}

      {/* Detail sliders */}
      <AnimatePresence>
        {showDetail && !rated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 pt-3 border-t border-ink-100">
              {[
                { label: 'Aesthetic quality', val: aesthetic, set: setAesthetic },
                { label: 'Spatial realism',   val: realism,   set: setRealism   },
              ].map(({ label, val, set }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="label-xs shrink-0" style={{ width: 96 }}>{label}</span>
                  <input type="range" min="0" max="1" step="0.05" value={val}
                    onChange={e => set(parseFloat(e.target.value))} className="flex-1" />
                  <span className="text-xs tabular-nums font-medium shrink-0 w-9 text-right text-ink-600"
                    style={{ fontFamily: 'JetBrains Mono,monospace' }}>
                    {(val * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
              <p className="label-xs text-center">
                Scores contribute to ANN preference model training
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
