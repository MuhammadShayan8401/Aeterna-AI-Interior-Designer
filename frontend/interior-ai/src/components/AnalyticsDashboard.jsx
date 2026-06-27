/**
 * AnalyticsDashboard.jsx — "Performance Analytics," recomposed.
 *
 * Same real data, same Feedback endpoint — but presented as a quiet
 * editorial report (slide-in panel, serif figures, hairline rules)
 * rather than a SaaS dashboard (centered modal, icon-boxed metric
 * cards, colored badge grid). No chart type or data was removed —
 * only the composition changed.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react'
import { getFeedbackAnalytics } from '../services/api'

function AnimatedNumber({ to, suffix = '', decimals = 0 }) {
  const [n, setN] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    const target = parseFloat(to) || 0
    let start = null
    const step = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 900, 1)
      setN(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [to])
  return <>{n.toFixed(decimals)}{suffix}</>
}

/* A figure in the editorial stats line — large serif number, quiet label.
   No icon, no colored box, no card — the antithesis of a dashboard widget. */
function Figure({ label, value, suffix, decimals = 0, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}>
      <div className="display-2 text-charcoal" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>
        <AnimatedNumber to={value} suffix={suffix} decimals={decimals} />
      </div>
      <div className="label-xs mt-2">{label}</div>
    </motion.div>
  )
}

function StyleBar({ style, rate, likes, total, delay }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div className="flex items-center gap-4 py-2.5">
      <span className="text-sm text-charcoal capitalize shrink-0" style={{ width: 140, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>{style}</span>
      <div className="flex-1 h-px bg-stone-100 relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <motion.div className="absolute top-0 left-0 h-px bg-clay"
          initial={{ width: 0 }} animate={{ width: `${rate}%` }}
          transition={{ duration: 0.8, ease: [0.16,1,0.3,1], delay }}
        />
        <AnimatePresence>
          {hovered && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute -top-8 left-0 bg-charcoal px-2.5 py-1 label-xs text-white whitespace-nowrap z-10">
              {likes} of {total} liked
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span className="text-xs tabular-nums shrink-0 w-10 text-right text-clay"
        style={{ fontFamily: 'JetBrains Mono,monospace' }}>{rate}%</span>
    </div>
  )
}

export default function AnalyticsDashboard({ onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getFeedbackAnalytics()
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(31,29,26,0.45)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '4%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '4%', opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
        className="w-full max-w-xl h-full overflow-y-auto bg-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-10 pt-10 pb-6 bg-white border-b border-stone-100">
          <div>
            <span className="eyebrow">Studio · Analytics</span>
            <h2 className="display-2 text-charcoal mt-3" style={{ fontSize: 28 }}>
              Performance
            </h2>
            {data && <p className="label-xs mt-2">{data.total} feedback records</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="btn-icon" title="Refresh">
              <RefreshCw size={12} className={loading ? 'animate-spin-cw' : ''} />
            </button>
            <button onClick={onClose} className="btn-icon"><X size={13} /></button>
          </div>
        </div>

        <div className="px-10 py-10 space-y-12">
          {loading && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-16" />)}
              </div>
              <div className="skeleton h-32" />
              <div className="skeleton h-48" />
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <p className="text-danger text-sm">{error}</p>
              <button onClick={load} className="btn-ghost text-xs mt-4">Retry</button>
            </div>
          )}

          {data && !loading && data.total === 0 && (
            <div className="text-center py-20">
              <p className="display-2 text-stone-200 mb-3" style={{ fontSize: 28 }}>No data yet</p>
              <p className="label-xs">Rate generated designs to populate analytics</p>
            </div>
          )}

          {data && !loading && data.total > 0 && (
            <>
              {/* Editorial stats line */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                <Figure label="Total Ratings"  value={data.total}                                          suffix=""  delay={0}    />
                <Figure label="Like Rate"       value={data.like_rate_pct ?? 0}                            suffix="%" decimals={1} delay={0.06} />
                <Figure label="Avg Aesthetic"   value={(data.satisfaction_metrics?.avg_aesthetic ?? 0)*100} suffix="%" delay={0.12} />
                <Figure label="AI Mode Uplift"  value={data.ai_usage?.like_rate_with_ai ?? 0}              suffix="%" decimals={1} delay={0.18} />
              </div>

              {/* Top styles */}
              {data.top_styles?.length > 0 && (
                <div>
                  <span className="eyebrow block mb-5">Top Performing Styles</span>
                  <div className="divide-y divide-stone-100">
                    {data.top_styles.map(({ style, success_rate }, i) => {
                      const d = data.by_style?.[style]
                      return <StyleBar key={style} style={style} rate={success_rate}
                        likes={d?.likes ?? 0} total={d?.total ?? 0} delay={0.06 * i} />
                    })}
                  </div>
                </div>
              )}

              {/* Breakdown table */}
              {Object.keys(data.by_style || {}).length > 0 && (
                <div>
                  <span className="eyebrow block mb-5">Style Breakdown</span>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-stone-100">
                        {['Style','Total','Positive','Negative','Success','Aesthetic'].map(h => (
                          <th key={h} className="py-2.5 text-left label-xs font-normal">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.by_style).map(([style, d]) => (
                        <tr key={style} className="border-b border-stone-100 last:border-0">
                          <td className="py-3 text-charcoal capitalize" style={{ fontWeight: 500 }}>{style}</td>
                          <td className="py-3 text-stone-400">{d.total}</td>
                          <td className="py-3 text-success">{d.likes}</td>
                          <td className="py-3 text-danger">{d.dislikes}</td>
                          <td className="py-3 tabular-nums text-clay" style={{ fontFamily: 'JetBrains Mono,monospace' }}>{d.success_rate}%</td>
                          <td className="py-3 tabular-nums text-warning" style={{ fontFamily: 'JetBrains Mono,monospace' }}>
                            {d.avg_aesthetic != null ? `${(d.avg_aesthetic*100).toFixed(0)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* AI mode comparison */}
              {data.ai_usage && (
                <div>
                  <span className="eyebrow block mb-5">Adaptive Mode</span>
                  <div className="grid grid-cols-2 gap-8">
                    {[
                      { label: 'Adaptive mode enabled', value: data.ai_usage.like_rate_with_ai },
                      { label: 'Standard mode',          value: data.ai_usage.like_rate_without_ai },
                    ].map(({ label, value }, i) => (
                      <div key={label} className={i === 0 ? 'pr-8 border-r border-stone-100' : ''}>
                        <div className="display-2 text-charcoal mb-2" style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)' }}>
                          <AnimatedNumber to={value} suffix="%" decimals={1} />
                        </div>
                        <p className="label-xs">{label} · like rate</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent ratings */}
              {data.trends?.length > 0 && (
                <div>
                  <span className="eyebrow block mb-5">Recent Ratings</span>
                  <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                    {data.trends.map((t, i) => (
                      <span key={i} className="text-xs capitalize flex items-center gap-1.5"
                        style={{ color: t.rating > 0 ? '#5C7355' : '#A23E2E' }}>
                        {t.rating > 0 ? <ThumbsUp size={10} /> : <ThumbsDown size={10} />}
                        {t.style}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
