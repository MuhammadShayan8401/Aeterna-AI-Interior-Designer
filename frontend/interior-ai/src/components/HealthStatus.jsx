import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, RefreshCw, Cpu } from 'lucide-react'
import { checkHealth } from '../services/api'

const COLORS = { ok: '#5C7355', error: '#A23E2E', loading: '#946A33' }

export default function HealthStatus() {
  const [status, setStatus] = useState('loading')
  const [info,   setInfo]   = useState(null)
  const [spin,   setSpin]   = useState(false)

  const check = async () => {
    setSpin(true)
    try {
      const d = await checkHealth()
      setInfo(d); setStatus('ok')
    } catch {
      setStatus('error'); setInfo(null)
    } finally {
      setSpin(false)
    }
  }

  useEffect(() => { check() }, [])

  const dotColor = COLORS[status]

  return (
    <div className="flex items-center gap-3 py-2 px-3.5 rounded-lg bg-surface border border-ink-100">
      <div className="flex items-center gap-2">
        <motion.span className="w-1.5 h-1.5 rounded-full"
          style={{ background: dotColor }}
          animate={{ opacity: status === 'loading' ? [1,0.35,1] : 1 }}
          transition={{ duration: 1.4, repeat: status === 'loading' ? Infinity : 0 }}
        />
        <Activity size={11} color={dotColor} />
        <span className="label-xs" style={{ color: dotColor }}>
          {status === 'ok' ? 'API Connected' : status === 'error' ? 'API Unavailable' : 'Connecting…'}
        </span>
      </div>
      {info && (
        <div className="flex items-center gap-2 ml-1">
          <div className="w-px h-3 bg-ink-100" />
          <Cpu size={10} color={info.gpu ? '#5C7355' : '#946A33'} />
          <span className="label-xs" style={{ color: info.gpu ? '#5C7355' : '#946A33' }}>
            {info.gpu ? 'GPU Active' : 'CPU Fallback'}
          </span>
        </div>
      )}
      <button onClick={check} className="ml-auto text-ink-400 hover:text-ink-600 transition-colors">
        <RefreshCw size={11} className={spin ? 'animate-spin-cw' : ''} />
      </button>
    </div>
  )
}
