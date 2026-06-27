import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit } from 'lucide-react'
import { LABELS } from '../utils/constants'

export default function AIAssistedToggle({ enabled, onToggle, confidence }) {
  return (
    <div
      className="rounded-lg border p-3.5 cursor-pointer select-none transition-colors duration-150"
      onClick={onToggle}
      style={{ borderColor: enabled ? '#B3654A' : '#E2DFDA', background: enabled ? '#FBF3E9' : '#FAFAF9' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
            style={{ background: enabled ? '#E8D2B0' : '#F2F1EE', borderColor: enabled ? '#B3654A' : '#E2DFDA' }}
          >
            <BrainCircuit size={15} color={enabled ? '#B3654A' : '#948D81'} />
          </div>

          <div>
            <p className="text-xs font-semibold text-ink-900 leading-none mb-1">{LABELS.aiAssistedMode}</p>
            <p className="text-ink-400" style={{ fontSize: 10, lineHeight: 1 }}>
              {enabled
                ? confidence
                  ? `${(confidence * 100).toFixed(0)}% model confidence`
                  : 'Calibrating to preferences'
                : 'ANN preference inference'}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggle() }}
          className="relative flex-shrink-0 rounded-full focus:outline-none transition-colors duration-200"
          style={{ height: 22, width: 40, background: enabled ? '#B3654A' : '#CBC7C0' }}
        >
          <motion.div
            className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow"
            animate={{ left: enabled ? 20 : 3 }}
            transition={{ type: 'spring', stiffness: 520, damping: 32 }}
          />
        </button>
      </div>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 pt-2.5 border-t border-accent-100">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-accent-500" />
              <p className="text-accent-500" style={{ fontSize: 10, lineHeight: 1.5, opacity: 0.85 }}>
                Sidebar parameters driven by preference model · improves with ratings
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
