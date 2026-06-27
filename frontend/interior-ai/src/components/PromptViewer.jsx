import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Copy, CheckCheck, MessageSquare } from 'lucide-react'

export default function PromptViewer({ prompt, negativePrompt }) {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(prompt ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl overflow-hidden bg-surface border border-ink-100">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 label-xs hover:text-ink-600 transition-colors select-none">
        <MessageSquare size={11} className="text-ink-400" />
        <span>Diffusion Prompt</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="ml-auto">
          <ChevronDown size={13} className="text-ink-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-ink-100">
            <div className="p-5 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="label-xs">Positive prompt</p>
                  <button onClick={copy}
                    className="flex items-center gap-1.5 label-xs transition-colors"
                    style={{ color: copied ? '#5C7355' : '#5B564E' }}>
                    {copied ? <CheckCheck size={10} /> : <Copy size={10} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-xs text-ink-600 leading-relaxed p-3.5 rounded-lg bg-white border border-ink-100"
                  style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {prompt}
                </pre>
              </div>
              {negativePrompt && (
                <div>
                  <p className="label-xs mb-2">Negative prompt</p>
                  <pre className="leading-relaxed p-3.5 rounded-lg bg-white border border-ink-100 text-ink-400"
                    style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {negativePrompt}
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
