/**
 * ANNStatusPanel.jsx
 * Polls GET /feedback/ann-status every 10s.
 * Shows friendly state — no alarming "not operational" text.
 * States: loading → no_data → needs_more → ready (has checkpoint)
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, RefreshCw, CheckCircle2, Loader2, Info } from 'lucide-react'
import { getANNFeedbackStatus, trainANN } from '../services/api'

const MIN_RECORDS = 5

export default function ANNStatusPanel({ onTrainComplete }) {
  const [status,   setStatus]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [training, setTraining] = useState(false)
  const [trainMsg, setTrainMsg] = useState(null)
  const [fetchErr, setFetchErr] = useState(false)

  const poll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const d = await getANNFeedbackStatus()
      setStatus(d)
      setFetchErr(false)
    } catch {
      setFetchErr(true)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    poll()
    const id = setInterval(() => poll(true), 10_000)
    return () => clearInterval(id)
  }, [poll])

  const handleTrain = async () => {
    if (training) return
    setTraining(true)
    setTrainMsg(null)
    try {
      const r = await trainANN(150)
      if (r.success) {
        setTrainMsg({ type: 'success', text: `Trained · ${r.records} records · loss ${r.final_loss}` })
        await poll()
        onTrainComplete?.()
      } else {
        setTrainMsg({ type: 'error', text: r.error || 'Training failed' })
      }
    } catch (e) {
      setTrainMsg({ type: 'error', text: e.message })
    } finally {
      setTraining(false)
    }
  }

  // ── skeleton while first loading ──────────────────────────────────────────
  if (loading && !status) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        border: '1px solid #E5E5E5', background: '#FAFAF8' }}>
        <div className="skeleton" style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0 }} />
        <div className="skeleton" style={{ height: 10, flex: 1 }} />
      </div>
    )
  }

  // ── API unreachable (backend not running) — show quietly ──────────────────
  if (fetchErr || !status) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        border: '1px solid #E5E5E5', background: '#FAFAF8' }}>
        <Info size={11} style={{ color: '#AAAAAA', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: '#AAAAAA', fontFamily: 'Inter, sans-serif' }}>
          Preference model — offline
        </span>
        <button onClick={() => poll()} style={{ marginLeft: 'auto', background: 'none', border: 'none',
          cursor: 'pointer', color: '#CCCCCC', display: 'flex' }}>
          <RefreshCw size={10} />
        </button>
      </div>
    )
  }

  const count    = status.record_count ?? 0
  const hasModel = status.checkpoint === true
  const canTrain = count >= MIN_RECORDS

  // ── Determine display state ───────────────────────────────────────────────
  let stateColor, stateLabel, stateIcon, sub

  if (hasModel) {
    stateColor = '#2F6F57'
    stateLabel = 'Preference model active'
    stateIcon  = <CheckCircle2 size={11} style={{ color: stateColor, flexShrink: 0 }} />
    sub        = `Trained on ${status.records_used ?? count} ratings`
  } else if (count === 0) {
    stateColor = '#AAAAAA'
    stateLabel = 'Rate designs to activate'
    stateIcon  = <BrainCircuit size={11} style={{ color: stateColor, flexShrink: 0 }} />
    sub        = 'Like or dislike generated results to build your profile'
  } else if (!canTrain) {
    stateColor = '#A36A00'
    stateLabel = `${count} / ${MIN_RECORDS} ratings`
    stateIcon  = <BrainCircuit size={11} style={{ color: stateColor, flexShrink: 0 }} />
    sub        = `${MIN_RECORDS - count} more rating${MIN_RECORDS - count !== 1 ? 's' : ''} needed to train`
  } else {
    stateColor = '#1F4E79'
    stateLabel = 'Ready to personalise'
    stateIcon  = <BrainCircuit size={11} style={{ color: stateColor, flexShrink: 0 }} />
    sub        = `${count} ratings collected — click to train`
  }

  return (
    <div style={{ border: '1px solid #E5E5E5', background: '#FAFAF8' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        borderBottom: (canTrain || hasModel) ? '1px solid #F0EFEB' : 'none' }}>
        {stateIcon}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#111111', fontFamily: 'Inter, sans-serif',
            margin: '0 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stateLabel}
          </p>
          {sub && (
            <p style={{ fontSize: 10, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>
              {sub}
            </p>
          )}
        </div>
        <button onClick={() => poll(true)} style={{ background: 'none', border: 'none',
          cursor: 'pointer', color: '#CCCCCC', display: 'flex', flexShrink: 0 }}>
          <RefreshCw size={10} />
        </button>
      </div>

      {/* Progress bar (when collecting feedback) */}
      {!hasModel && count > 0 && count < MIN_RECORDS && (
        <div style={{ padding: '0 12px 10px' }}>
          <div style={{ height: 2, background: '#EEEDE9', marginTop: 8, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${(count / MIN_RECORDS) * 100}%` }}
              transition={{ duration: 0.6 }}
              style={{ height: '100%', background: '#A36A00' }} />
          </div>
        </div>
      )}

      {/* Train button */}
      {canTrain && !hasModel && (
        <div style={{ padding: '8px 12px' }}>
          <button onClick={handleTrain} disabled={training}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 0', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 500,
              color: '#FAFAF8', background: '#1F4E79', border: '1px solid #1F4E79',
              cursor: training ? 'not-allowed' : 'pointer', opacity: training ? 0.6 : 1,
              transition: 'background 0.2s',
            }}>
            {training
              ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Training…</>
              : <><BrainCircuit size={11} /> Train preference model</>
            }
          </button>
        </div>
      )}

      {/* Retrain when already trained */}
      {hasModel && canTrain && (
        <div style={{ padding: '8px 12px' }}>
          <button onClick={handleTrain} disabled={training}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '7px 0', fontSize: 10, fontFamily: 'Inter, sans-serif',
              color: '#2F6F57', background: 'transparent', border: '1px solid #C4D9CF',
              cursor: training ? 'not-allowed' : 'pointer', opacity: training ? 0.6 : 1,
            }}>
            {training ? <><Loader2 size={10} /> Updating…</> : <><RefreshCw size={10} /> Update with new ratings</>}
          </button>
        </div>
      )}

      {/* Train result message */}
      <AnimatePresence>
        {trainMsg && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
            <div style={{
              padding: '8px 12px', fontSize: 10, fontFamily: 'Inter, sans-serif',
              color: trainMsg.type === 'success' ? '#2F6F57' : '#B42318',
              borderTop: '1px solid #F0EFEB',
            }}>
              {trainMsg.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
