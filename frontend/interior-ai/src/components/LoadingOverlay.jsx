import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Upload, ScanLine, Boxes, BrainCircuit, Wand2, BarChart3, CheckCircle2, Cpu } from 'lucide-react'
import { PIPELINE_STAGES } from '../utils/constants'

const ICONS = [Upload, ScanLine, Boxes, BrainCircuit, Wand2, BarChart3]

function ProgressRing({ progress, size = 72, stroke = 3, color = '#B3654A' }) {
  const r = (size - stroke * 2) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - progress)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

export default function LoadingOverlay({ step = 0, aiAssisted = false }) {
  const [elapsed, setElapsed] = useState(0)
  const progress = Math.min((step + 1) / PIPELINE_STAGES.length, 1)

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(26,24,21,0.7)' }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm mx-4 rounded-xl p-8 bg-white"
      >
        {/* Spinner + ring */}
        <div className="flex justify-center mb-7 relative">
          <ProgressRing progress={progress} size={76} color="#B3654A" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-11 h-11">
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-500 animate-spin-cw" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Wand2 size={14} className="text-accent-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-1">
          <h3 className="text-base font-semibold text-ink-900 tracking-tight">
            {aiAssisted ? 'Adaptive Mode Generation' : 'Generating Designs'}
          </h3>
          <p className="mt-1 font-mono text-ink-400" style={{ fontSize: 11 }}>
            {Math.round(progress * 100)}% · {elapsed}s elapsed
          </p>
        </div>

        {/* Progress bar */}
        <div className="my-5 h-0.5 rounded-full overflow-hidden bg-ink-100">
          <motion.div className="h-full rounded-full bg-accent-500"
            initial={{ width: '0%' }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* Stage list */}
        <div className="space-y-2">
          {PIPELINE_STAGES.map((stage, i) => {
            const StageIcon = ICONS[i] || Cpu
            const isDone    = i < step
            const isActive  = i === step
            const isPending = i > step
            return (
              <motion.div key={stage.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                className="flex items-center gap-3"
              >
                {/* Icon cell */}
                <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors duration-300 border"
                  style={{
                    background: isDone ? '#FBF3E9' : isActive ? `${stage.color}10` : '#FAFAF9',
                    borderColor: isDone ? '#E8D2B0' : isActive ? `${stage.color}40` : '#E2DFDA',
                  }}
                >
                  {isDone
                    ? <CheckCircle2 size={12} className="text-accent-500" />
                    : <StageIcon size={12} color={isActive ? stage.color : '#CBC7C0'} />
                  }
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-none transition-colors duration-300"
                    style={{ color: isDone ? '#948D81' : isActive ? '#1A1815' : '#CBC7C0', fontWeight: isActive ? 500 : 400, textDecoration: isDone ? 'line-through' : 'none' }}>
                    {stage.label}
                  </p>
                  {isActive && (
                    <p className="font-mono mt-0.5 truncate text-ink-400" style={{ fontSize: 10 }}>
                      {stage.sub}
                    </p>
                  )}
                </div>

                {isDone && (
                  <span className="flex-shrink-0 font-mono text-ink-200" style={{ fontSize: 9 }}>done</span>
                )}
              </motion.div>
            )
          })}
        </div>

        <p className="text-center mt-6 font-mono text-ink-200" style={{ fontSize: 10 }}>
          Estimated 30–90 s depending on GPU
        </p>
      </motion.div>
    </motion.div>
  )
}
