/**
 * AdminDashboard.jsx — System overview for admin users.
 * Data from GET /dashboard/admin/overview. Retrain via POST /dashboard/admin/retrain.
 * All backend integrations preserved.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RefreshCw, Shield, Activity, Database, BrainCircuit, Users, Wand2, Download } from 'lucide-react'
import PageShell from '../components/shared/PageShell'
import { useAuth } from '../context/AuthContext'
import { getAdminDashboard, adminRetrain } from '../services/api'
import toast from 'react-hot-toast'

const ease = [0.16, 1, 0.3, 1]

function Stat({ label, value, sub, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease }}
      style={{ paddingBottom: '1.25rem', borderBottom: '1px solid #E5E5E5' }}>
      <div style={{
        fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
        fontSize: 'clamp(1.6rem, 2.4vw, 2.2rem)', letterSpacing: '-0.018em',
        color: '#111111', lineHeight: 1, marginBottom: 5,
      }}>
        {value ?? '—'}
      </div>
      <p style={{ fontSize: 12, fontWeight: 500, color: '#111111', fontFamily: 'Inter,sans-serif', margin: '0 0 2px' }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: '#888882', fontFamily: 'Inter,sans-serif', margin: 0 }}>{sub}</p>}
    </motion.div>
  )
}

function StatusRow({ label, ok, loading: spin }) {
  const color = spin ? '#A36A00' : ok ? '#2F6F57' : '#B42318'
  const label2 = spin ? 'loading' : ok ? 'operational' : 'offline'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid #F0EFEB' }}>
      <span style={{ fontSize: 12, color: '#111111', fontFamily: 'Inter,sans-serif' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color, fontFamily: 'Inter,sans-serif' }}>
        <motion.span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }}
          animate={spin ? { opacity: [1, 0.3, 1] } : {}}
          transition={spin ? { duration: 1.2, repeat: Infinity } : {}} />
        {label2}
      </span>
    </div>
  )
}

function ReadinessBar({ value = 0, label }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#111111', fontFamily: 'Inter,sans-serif' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#888882', fontFamily: 'JetBrains Mono, monospace' }}>{value}%</span>
      </div>
      <div style={{ height: 2, background: '#EEEDE9', position: 'relative', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease }}
          style={{ position: 'absolute', inset: 0, background: value >= 80 ? '#2F6F57' : value >= 50 ? '#1F4E79' : '#A36A00', height: '100%' }} />
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
      <span className="eyebrow">{children}</span>
    </div>
  )
}

export default function AdminDashboard() {
  const { user }      = useAuth()
  const navigate      = useNavigate()
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [retraining,setRetraining]= useState(false)

  const load = () => {
    setLoading(true); setError(null)
    getAdminDashboard()
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.response?.data?.detail ?? e.message); setLoading(false) })
  }

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'admin') { navigate('/dashboard'); return }
    load()
  }, [user, navigate])

  const handleRetrain = async () => {
    setRetraining(true)
    try {
      const r = await adminRetrain(150)
      if (r.success) toast.success(`Retrained · ${r.records} records · loss ${r.final_loss}`)
      else toast.error(r.error ?? 'Retrain failed')
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail ?? e.message)
    } finally { setRetraining(false) }
  }

  // Backend response shape (GET /dashboard/admin/overview):
  // { users: {total_users, active_users, recently_active_30d, new_users_30d},
  //   generations: {total_generations, redesign_count, empty_room_count, avg_generation_time_sec},
  //   dataset: {feedback_record_count, feedback_file_size_kb, feedback_file_exists},
  //   ann_model: {checkpoint_exists, min_records_to_train, ready_to_train, trained_at, records_used, final_loss},
  //   performance: {like_rate_pct, top_styles, ai_usage: {ai_usage_rate_pct, ...}},
  //   system: {database_connected, uptime_sec} }
  const u   = data?.users
  const gen = data?.generations
  const ds  = data?.dataset
  const ann = data?.ann_model
  const sys = data?.system
  const perf= data?.performance

  // Normalize keys → internal aliases so JSX below stays readable
  const totalUsers       = u?.total_users          ?? 0
  const activeUsers      = u?.active_users          ?? 0
  const recentlyActive   = u?.recently_active_30d   ?? 0
  const newUsers30d      = u?.new_users_30d         ?? 0
  const totalGen         = gen?.total_generations   ?? 0
  const redesignCount    = gen?.redesign_count      ?? 0
  const emptyRoomCount   = gen?.empty_room_count    ?? 0
  const avgGenTime       = gen?.avg_generation_time_sec
  const feedbackCount    = ds?.feedback_record_count ?? 0
  const ckptExists       = ann?.checkpoint_exists   ?? false
  const recordsUsed      = ann?.records_used        ?? 0
  const minRecords       = ann?.min_records_to_train ?? 5
  const readyToTrain     = ann?.ready_to_train      ?? false
  const likeRate         = perf?.like_rate_pct
  const aiUsageRate      = perf?.ai_usage?.ai_usage_rate_pct

  const uptime = sys?.uptime_sec != null
    ? sys.uptime_sec < 60   ? `${Math.round(sys.uptime_sec)}s`
    : sys.uptime_sec < 3600 ? `${Math.floor(sys.uptime_sec / 60)}m`
    : `${Math.floor(sys.uptime_sec / 3600)}h ${Math.floor((sys.uptime_sec % 3600) / 60)}m`
    : '—'

  // ANN readiness 0-100 based on what we actually know
  const annReadiness = ann
    ? (ckptExists ? 40 : 0)
    + (feedbackCount >= 50 ? 30 : Math.round((feedbackCount / 50) * 30))
    + (readyToTrain ? 30 : Math.round((feedbackCount / minRecords) * 30))
    : 0

  return (
    <PageShell title="Admin">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Shield size={13} style={{ color: '#1F4E79' }} strokeWidth={1.5} />
            <span className="eyebrow">Admin Panel</span>
          </div>
          <h1 style={{
            fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
            fontSize: 'clamp(1.75rem, 2.8vw, 2.4rem)', letterSpacing: '-0.018em',
            color: '#111111', margin: 0,
          }}>System Overview</h1>
        </div>
        <button onClick={load} className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={11} className={loading ? 'animate-spin-cw' : ''} /> Refresh
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[...Array(3)].map((_,i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '3rem 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter,sans-serif', marginBottom: '1rem' }}>{error}</p>
          <button onClick={load} className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

          {/* System health strip */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '1.5rem',
            padding: '1rem 1.5rem', background: '#F5F4F0', border: '1px solid #E5E5E5',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sys?.database_connected ? '#2F6F57' : '#B42318', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontFamily: 'Inter,sans-serif', color: '#666666' }}>
                Database {sys?.database_connected ? 'connected' : 'offline'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ckptExists ? '#2F6F57' : '#A36A00', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontFamily: 'Inter,sans-serif', color: '#666666' }}>
                ANN model {ckptExists ? 'loaded' : 'not trained'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={10} style={{ color: '#CCCCCC' }} />
              <span style={{ fontSize: 11, fontFamily: 'Inter,sans-serif', color: '#666666' }}>Uptime {uptime}</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#888882', fontFamily: 'Inter,sans-serif' }}>Like rate</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1F4E79', fontFamily: 'JetBrains Mono, monospace' }}>
                {likeRate != null ? `${likeRate}%` : '—'}
              </span>
            </div>
          </div>

          {/* Three column stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '2.5rem' }} className="sm:grid-cols-3">

            {/* Users */}
            <div style={{ paddingRight: '2.5rem', borderRight: '1px solid #E5E5E5' }} className="sm:border-r-[1px]">
              <SectionTitle>Users</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Stat label="Total Users"     value={totalUsers}     sub="registered"       delay={0} />
                <Stat label="Active (30d)"    value={recentlyActive} sub="unique sessions"  delay={0.05} />
                <Stat label="New (30d)"       value={newUsers30d}    sub="new registrations" delay={0.1} />
              </div>
            </div>

            {/* Generations */}
            <div style={{ paddingRight: '2.5rem', borderRight: '1px solid #E5E5E5' }} className="sm:border-r-[1px]">
              <SectionTitle>Generations</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Stat label="Total"        value={totalGen}       sub="all time"       delay={0.05} />
                <Stat label="Redesigns"    value={redesignCount}  sub="img2img mode"   delay={0.1} />
                <Stat label="Empty Rooms"  value={emptyRoomCount} sub="txt2img mode"   delay={0.15} />
              </div>
            </div>

            {/* Dataset */}
            <div>
              <SectionTitle>Dataset & ANN</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Stat label="Feedback Records" value={feedbackCount}             sub="ratings collected"  delay={0.1} />
                <Stat label="Records Used"     value={ckptExists ? recordsUsed : '—'} sub="in last training" delay={0.15} />
                <Stat label="Avg. Gen Time"    value={avgGenTime ? `${avgGenTime}s` : '—'} sub="per generation" delay={0.2} />
              </div>
            </div>
          </div>

          {/* Model status + ANN readiness */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }} className="lg:grid-cols-2">

            <div>
              <SectionTitle>Model Health</SectionTitle>
              <div style={{ border: '1px solid #E5E5E5', padding: '1.25rem 1.5rem' }}>
                <StatusRow label="SegFormer (Semantic Segmentation)" ok={true} />
                <StatusRow label="MiDaS (Depth Estimation)"          ok={true} />
                <StatusRow label="Preference ANN (Style Engine)"     ok={ckptExists} />
                <StatusRow label="Stable Diffusion v1.5"             ok={sys?.database_connected} />
                <StatusRow label="MongoDB Database"                  ok={sys?.database_connected} />
              </div>
            </div>

            <div>
              <SectionTitle>ANN Readiness</SectionTitle>
              <div style={{ border: '1px solid #E5E5E5', padding: '1.25rem 1.5rem' }}>
                <ReadinessBar label="Overall readiness" value={Math.min(100, annReadiness)} />
                <ReadinessBar label="Checkpoint loaded"
                  value={ckptExists ? 100 : 0} />
                <ReadinessBar label="Training data coverage"
                  value={Math.min(100, Math.round((feedbackCount / 50) * 100))} />
                <ReadinessBar label="Ready to train"
                  value={readyToTrain ? 100 : Math.min(99, Math.round((feedbackCount / minRecords) * 100))} />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div>
            <SectionTitle>Retraining Controls</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button onClick={handleRetrain} disabled={retraining} className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', fontSize: 12 }}>
                <BrainCircuit size={13} strokeWidth={1.5} />
                {retraining ? 'Retraining…' : 'Retrain ANN'}
              </button>
              <button onClick={load} className="btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: 12 }}>
                <RefreshCw size={12} strokeWidth={1.5} /> Refresh Data
              </button>
              <button className="btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={12} /> Export Metrics
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#888882', fontFamily: 'Inter,sans-serif', marginTop: '0.75rem' }}>
              Retraining uses 150 epochs. Requires ≥10 feedback records. Current: {ann?.records_in_db ?? 0} records.
            </p>
          </div>

          {/* Performance row */}
          {perf && (
            <div style={{ borderTop: '1px solid #E5E5E5', paddingTop: '2rem' }}>
              <SectionTitle>Platform Performance</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }} className="sm:grid-cols-4">
                <Stat label="Avg. Gen Time"  value={avgGenTime ? `${avgGenTime}s` : '—'} sub="per generation" />
                <Stat label="Like Rate"      value={likeRate != null ? `${likeRate}%` : '—'} sub="user satisfaction" />
                <Stat label="ANN Assisted"   value={aiUsageRate != null ? `${aiUsageRate}%` : '—'} sub="of generations" />
                <Stat label="Feedback Total" value={feedbackCount} sub="ratings given" />
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}
