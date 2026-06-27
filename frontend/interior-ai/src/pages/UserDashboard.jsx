/**
 * UserDashboard.jsx — Account overview page.
 * Uses AccountLayout (PublicNav + account tab bar, no sidebar).
 * All API calls to GET /dashboard/me preserved.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Heart, Clock, Compass, RefreshCw } from 'lucide-react'
import AccountLayout from '../components/AccountLayout'
import { useAuth }   from '../context/AuthContext'
import { getUserDashboard } from '../services/api'

const ease = [0.16, 1, 0.3, 1]
const API  = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/* ── Stat card ──────────────────────────────────────────────────────────── */
function Stat({ label, value, sub, delay = 0, accent }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease }}
      style={{
        padding: '1.5rem', background: '#F5F4F0',
        border: '1px solid #E5E5E5',
      }}>
      <div style={{
        fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
        fontSize: 'clamp(1.8rem, 2.5vw, 2.4rem)', letterSpacing: '-0.02em',
        color: accent ?? '#111111', lineHeight: 1, marginBottom: 8,
      }}>{value ?? '—'}</div>
      <p style={{ fontSize: 12, fontWeight: 500, color: '#111111', fontFamily: 'Inter, sans-serif', margin: '0 0 3px' }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>{sub}</p>}
    </motion.div>
  )
}

/* ── Style affinity bar ─────────────────────────────────────────────────── */
function AffinityBar({ style: s, count, max, i }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '9px 0', borderBottom: '1px solid #F0EFEB' }}>
      <span style={{ fontSize: 12, color: '#111111', fontFamily: 'Inter, sans-serif', fontWeight: 500,
        textTransform: 'capitalize', flexShrink: 0, width: 120 }}>
        {s}
      </span>
      <div style={{ flex: 1, height: 1, background: '#EEEDE9', position: 'relative', overflow: 'hidden' }}>
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.7, delay: i * 0.06, ease }}
          style={{ position: 'absolute', inset: 0, background: '#1F4E79', transformOrigin: 'left' }} />
      </div>
      <span style={{ fontSize: 11, color: '#888882', fontFamily: 'JetBrains Mono, monospace', width: 24, textAlign: 'right' }}>
        {count}
      </span>
    </div>
  )
}

/* ── Activity item ──────────────────────────────────────────────────────── */
// recent_activity from backend has: generation_id, generation_type, room_type,
// style, is_favorite, created_at  — NO output_image_urls (not fetched for perf)
const STYLE_COLORS = {
  modern: '#D5CFC7', luxury: '#C9BC9F', scandinavian: '#E8E2DA',
  japandi: '#DDD5C8', industrial: '#C8C3BC', minimalist: '#F2EDE6',
  contemporary: '#D9CCBA', bohemian: '#D9CFBC', default: '#E0D8CF',
}
function ActivityItem({ item }) {
  const bg   = STYLE_COLORS[item.style?.toLowerCase()] ?? STYLE_COLORS.default
  const date = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'
  const initial = (item.style ?? 'D')[0].toUpperCase()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '10px 0', borderBottom: '1px solid #F0EFEB' }}>
      {/* Style initial swatch */}
      <div style={{ width: 44, height: 44, flexShrink: 0, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#888882',
          fontFamily: 'Playfair Display, Georgia, serif' }}>{initial}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#111111', fontFamily: 'Inter, sans-serif',
          textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 2px' }}>
          {item.style} {item.room_type}
          <span style={{ color: '#888882', fontWeight: 400 }}> · {item.generation_type === 'empty_room' ? 'Empty Room' : 'Redesign'}</span>
        </p>
        <p style={{ fontSize: 10, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>{date}</p>
      </div>
      {item.is_favorite && <Heart size={11} style={{ color: '#1F4E79', fill: '#1F4E79', flexShrink: 0 }} />}
    </div>
  )
}

/* ── Recent project tile ────────────────────────────────────────────────── */
function ProjectTile({ item }) {
  // recent_activity has no output_image_urls — link to history for full view
  const bg   = STYLE_COLORS[item.style?.toLowerCase()] ?? STYLE_COLORS.default
  const date = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'
  const initial = (item.style ?? 'D')[0].toUpperCase()

  return (
    <Link to="/history" style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{ border: '1px solid #E5E5E5', overflow: 'hidden', transition: 'border-color 0.25s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#111111'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E5E5'}>
        {/* Style swatch placeholder */}
        <div style={{ aspectRatio: '4/3', background: bg, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 'clamp(1.5rem,4vw,2.5rem)', fontWeight: 400,
            color: 'rgba(0,0,0,0.15)', fontFamily: 'Playfair Display, Georgia, serif',
            userSelect: 'none' }}>{initial}</span>
          {item.is_favorite && (
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              <Heart size={11} style={{ color: '#1F4E79', fill: '#1F4E79' }} />
            </div>
          )}
        </div>
        <div style={{ padding: '0.625rem 0.75rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#111111', fontFamily: 'Inter, sans-serif',
            textTransform: 'capitalize', margin: '0 0 2px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.style} {item.room_type}
          </p>
          <p style={{ fontSize: 10, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>{date}</p>
        </div>
      </div>
    </Link>
  )
}

/* ── Quick action ───────────────────────────────────────────────────────── */
function QuickAction({ label, sub, Icon, to }) {
  return (
    <Link to={to} style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '1rem 1.25rem', border: '1px solid #E5E5E5',
        transition: 'border-color 0.2s, background 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#111111'; e.currentTarget.style.background = '#F5F4F0' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.background = 'transparent' }}>
        <Icon size={15} strokeWidth={1.5} style={{ color: '#CCCCCC', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#111111', fontFamily: 'Inter, sans-serif', margin: '0 0 2px' }}>{label}</p>
          <p style={{ fontSize: 11, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>{sub}</p>
        </div>
        <ArrowRight size={12} style={{ color: '#CCCCCC', flexShrink: 0 }} />
      </div>
    </Link>
  )
}

/* ── Section header ─────────────────────────────────────────────────────── */
function SectionHead({ label, linkTo, linkLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
      <span className="eyebrow">{label}</span>
      {linkTo && (
        <Link to={linkTo} style={{ fontSize: 11, color: '#888882', textDecoration: 'none', fontFamily: 'Inter, sans-serif',
          display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111111'}
          onMouseLeave={e => e.currentTarget.style.color = '#888882'}>
          {linkLabel} <ArrowRight size={10} />
        </Link>
      )}
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function UserDashboard() {
  const { user } = useAuth()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = () => {
    setLoading(true); setError(null)
    getUserDashboard()
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.response?.data?.detail ?? e.message); setLoading(false) })
  }

  useEffect(() => { if (user) load() }, [user])

  const gen   = data?.generation_stats
  const prefs = data?.preference_analytics
  const fb    = data?.feedback_given
  const acts  = data?.recent_activity ?? []
  const topStyles = prefs?.top_styles ?? []
  const maxCount  = Math.max(...topStyles.map(s => s.count), 1)
  const first     = user?.full_name?.split(' ')[0] ?? 'there'

  return (
    <AccountLayout
      title={`Welcome back, ${first}.`}
      subtitle="Your Studio">

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }} className="sm:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110 }} />)}
          </div>
          <div className="skeleton" style={{ height: 220 }} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', marginBottom: '1rem' }}>{error}</p>
          <button onClick={load} className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* Content */}
      {data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }} className="sm:grid-cols-4">
            <Stat label="Total Generations" value={gen?.total ?? 0} sub="all time" delay={0} />
            <Stat label="Saved Designs"     value={gen?.favorites_count ?? 0} sub="favourited" delay={0.06} accent="#1F4E79" />
            <Stat label="Feedback Given"    value={fb?.total ?? 0} sub={`${fb?.likes ?? 0} helpful`} delay={0.12} />
            <Stat label="AI Usage Rate"     value={`${gen?.ai_usage?.ai_usage_rate_pct ?? 0}%`} sub="assisted" delay={0.18} accent="#2F6F57" />
          </div>

          {/* Mode bar */}
          {(gen?.total ?? 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: 11, color: '#888882', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>Redesigns {gen.redesign_count}</span>
              <div style={{ flex: 1, height: 2, background: '#EEEDE9', position: 'relative', overflow: 'hidden' }}>
                <motion.div
                  style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: '#111111' }}
                  initial={{ width: 0 }}
                  animate={{ width: gen.total > 0 ? `${(gen.redesign_count / gen.total) * 100}%` : 0 }}
                  transition={{ duration: 0.8, ease }} />
              </div>
              <span style={{ fontSize: 11, color: '#1F4E79', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>Empty Rooms {gen.empty_room_count}</span>
            </div>
          )}

          {/* Two-col: affinity + activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }} className="lg:grid-cols-2">

            <div>
              <SectionHead label="Style Affinity" linkTo="/history" linkLabel="View all" />
              {topStyles.length > 0
                ? topStyles.map((s, i) => <AffinityBar key={s.value} style={s.value} count={s.count} max={maxCount} i={i} />)
                : (
                  <div style={{ padding: '2rem', border: '1px dashed #E5E5E5', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                      Generate designs to see your style profile
                    </p>
                  </div>
                )
              }
            </div>

            <div>
              <SectionHead label="Recent Activity" linkTo="/history" linkLabel="Full history" />
              {acts.length > 0
                ? acts.slice(0, 8).map((item, i) => <ActivityItem key={i} item={item} />)
                : (
                  <div style={{ padding: '2rem', border: '1px dashed #E5E5E5', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>
                      No activity yet
                    </p>
                  </div>
                )
              }
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <SectionHead label="Quick Actions" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.625rem' }} className="sm:grid-cols-3">
              <QuickAction label="Design a Room"   sub="Start the empty room wizard"  Icon={Compass} to="/design-room" />
              <QuickAction label="Browse History"  sub="All past generations"         Icon={Clock}   to="/history" />
              <QuickAction label="Saved Designs"   sub="Favourited results"           Icon={Heart}   to="/history?favorites=true" />
            </div>
          </div>

          {/* Recent projects grid */}
          {acts.length > 0 && (
            <div>
              <SectionHead label="Recent Projects" linkTo="/history" linkLabel="View all" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }} className="sm:grid-cols-4">
                {acts.slice(0, 4).map((item, i) => <ProjectTile key={i} item={item} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state (no data and no error) */}
      {!data && !loading && !error && (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', marginBottom: '1.5rem' }}>
            Nothing yet — start by designing a room.
          </p>
          <Link to="/design-room" className="btn-primary" style={{ fontSize: 12, padding: '11px 28px' }}>
            Design your first room
          </Link>
        </div>
      )}
    </AccountLayout>
  )
}
