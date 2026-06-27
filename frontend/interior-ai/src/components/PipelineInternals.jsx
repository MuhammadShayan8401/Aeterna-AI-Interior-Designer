import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ScanLine, Layers } from 'lucide-react'

export default function PipelineInternals({ segMask, depthMap, metadata }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden bg-surface border border-ink-100">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 label-xs hover:text-ink-600 transition-colors select-none">
        <Layers size={11} className="text-ink-400" />
        <span>Pipeline Diagnostics</span>
        <span className="text-ink-200">· segmentation · depth · metadata</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="ml-auto">
          <ChevronDown size={13} className="text-ink-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-ink-100">
            <div className="p-5 grid grid-cols-2 gap-5">
              {segMask && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ScanLine size={10} className="text-ink-400" />
                    <p className="label-xs">Segmentation Map</p>
                  </div>
                  <img src={`data:image/png;base64,${segMask}`} className="rounded-lg w-full border border-ink-100" alt="seg" />
                </div>
              )}
              {depthMap && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Layers size={10} className="text-ink-400" />
                    <p className="label-xs">Depth Estimation</p>
                  </div>
                  <img src={`data:image/png;base64,${depthMap}`} className="rounded-lg w-full border border-ink-100" alt="depth" />
                </div>
              )}
              {metadata && (
                <div className="col-span-2">
                  <p className="label-xs mb-2">Metadata</p>
                  <pre className="label-xs p-3 rounded-lg overflow-auto bg-white border border-ink-100 text-ink-600"
                    style={{ fontFamily: 'JetBrains Mono,monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
