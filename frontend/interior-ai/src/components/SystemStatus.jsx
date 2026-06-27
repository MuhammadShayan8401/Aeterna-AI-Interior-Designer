/**
 * SystemStatus.jsx
 * Live system status panel showing backend API health, model states,
 * latency, and pipeline readiness. Polls GET /health every 30 seconds.
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Server, BrainCircuit, Wand2, Cpu,
  RefreshCw, ChevronDown, ChevronUp, Clock, Wifi, WifiOff,
} from 'lucide-react'
import { checkHealth, getANNFeedbackStatus } from '../services/api'

const POLL_INTERVAL = 30_000

function StatusDot({ state }) {
  const cls = state === 'online' ? 'status-dot-green' : state === 'loading' ? 'status-dot-amber' : state === 'offline' ? 'status-dot-red' : 'status-dot-slate'
  if (state === 'loading') {
    return <motion.span className={cls} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
  }
  return <span className={cls} />
}

function ServiceRow({ Icon, name, state, detail }) {
  const color = state === 'online' ? '#5C7355' : state === 'loading' ? '#946A33' : state === 'offline' ? '#A23E2E' : '#948D81'
  const stateLabel = { online: 'Operational', loading: 'Loading', offline: 'Offline', unknown: 'Unknown' }[state] ?? state
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-ink-100 last:border-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-ink-100">
        <Icon size={13} color={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ink-900 truncate">{name}</p>
        {detail && <p className="label-xs mt-0.5 truncate">{detail}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusDot state={state} />
        <span className="label-xs" style={{ color }}>{stateLabel}</span>
      </div>
    </div>
  )
}

export default function SystemStatus() {
  const [health,    setHealth]    = useState(null)
  const [latency,   setLatency]   = useState(null)
  const [lastPoll,  setLastPoll]  = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [expanded,  setExpanded]  = useState(false)
  const [error,     setError]     = useState(false)
  const [annStatus, setAnnStatus] = useState(null)

  const poll = useCallback(async () => {
    setLoading(true)
    const t0 = Date.now()
    try {
      const [data, ann] = await Promise.allSettled([checkHealth(), getANNFeedbackStatus()])
      if (data.status === 'fulfilled') { setHealth(data.value); setLatency(Date.now()-t0); setLastPoll(new Date()); setError(false) }
      else { setError(true); setHealth(null) }
      if (ann.status === 'fulfilled') setAnnStatus(ann.value)
    } catch {
      setError(true)
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    poll()
    const id = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [poll])

  const apiState    = error ? 'offline' : health ? 'online' : 'unknown'
  const gpuState    = health?.gpu ? 'online' : health ? 'loading' : 'unknown'
  const sdState     = health ? 'online' : 'unknown'
  const annState    = annStatus?.checkpoint ? 'online' : annStatus ? 'loading' : health ? 'loading' : 'unknown'

  return (
    <div className="rounded-xl overflow-hidden bg-surface border border-ink-100">

      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors duration-150 hover:bg-muted"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <StatusDot state={apiState} />
            <span className="label-xs">System Status</span>
          </div>
          {latency != null && (
            <div className="flex items-center gap-1 label-xs text-ink-400">
              <Clock size={9} />
              {latency}ms
            </div>
          )}
          {health?.device && (
            <span className="label-xs truncate max-w-28 text-ink-400">
              {health.device}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); poll() }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-600 transition-colors"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin-cw' : ''} />
          </button>
          {expanded ? <ChevronUp size={13} className="text-ink-400" /> : <ChevronDown size={13} className="text-ink-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 border-t border-ink-100">
              <div className="pt-2">
                <ServiceRow
                  Icon={error ? WifiOff : Wifi}
                  name="Backend API"
                  state={apiState}
                  detail={health ? `Aeterna v${health.version ?? '2.0'}` : error ? 'Connection failed' : 'Connecting…'}
                />
                <ServiceRow
                  Icon={Server}
                  name="Compute Device"
                  state={gpuState}
                  detail={health?.device ?? (health ? 'CPU fallback' : '—')}
                />
                <ServiceRow
                  Icon={Cpu}
                  name="SegFormer + MiDaS"
                  state={health ? 'online' : 'unknown'}
                  detail="Semantic segmentation · depth estimation"
                />
                <ServiceRow
                  Icon={BrainCircuit}
                  name="ANN Preference Model"
                  state={annState}
                  detail={annStatus
                    ? annStatus.checkpoint
                      ? `v1.0 · trained on ${annStatus.records_used ?? '?'} records`
                      : annStatus.record_count >= 5
                      ? `${annStatus.record_count} ratings · ready to train`
                      : `${annStatus.record_count} ratings · need ${Math.max(0,5-annStatus.record_count)} more`
                    : 'Adaptive recommendation engine'
                  }
                />
                <ServiceRow
                  Icon={Wand2}
                  name="Stable Diffusion v1.5"
                  state={sdState}
                  detail="img2img · DPM-Solver++ · 30 steps"
                />
              </div>

              {/* Last polled */}
              {lastPoll && (
                <div className="flex items-center gap-1.5 pt-2">
                  <Activity size={9} className="text-ink-200" />
                  <span className="label-xs">
                    Last checked {lastPoll.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    &nbsp;· refreshes every 30 s
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
