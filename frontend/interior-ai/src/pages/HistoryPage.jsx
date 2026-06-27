/**
 * HistoryPage.jsx — Project archive. Uses AccountLayout (no sidebar).
 * All API calls preserved: GET /history, PATCH favourite, DELETE, POST regenerate.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Heart, Trash2, RefreshCw, Download, X, ChevronDown } from 'lucide-react'
import AccountLayout from '../components/AccountLayout'
import { useAuth }   from '../context/AuthContext'
import { getHistory, setFavorite, deleteHistoryItem, regenerateFromHistory } from '../services/api'
import toast from 'react-hot-toast'

const ease = [0.16, 1, 0.3, 1]
const API  = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const PAGE  = 12
const STYLES = ['modern','scandinavian','japandi','industrial','luxury','minimalist','contemporary']

/* ── Filter bar ─────────────────────────────────────────────────────────── */
function FilterBar({ search, setSearch, typeFilter, setTypeFilter, favOnly, setFavOnly, sortBy, setSortBy, onReset, hasFilters }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '1.75rem', alignItems: 'center' }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: '1 1 200px' }}>
        <Search size={12} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#AAAAAA', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search style or room…"
          style={{
            width: '100%', paddingLeft: 30, paddingRight: search ? 30 : 12, padding: '9px 12px 9px 30px',
            fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#111111',
            background: '#FAFAF8', border: '1px solid #E5E5E5', outline: 'none',
            boxSizing: 'border-box', transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#111111'}
          onBlur={e => e.target.style.borderColor = '#E5E5E5'}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#AAAAAA', display: 'flex' }}>
            <X size={11} />
          </button>
        )}
      </div>

      {/* Type */}
      <div style={{ position: 'relative' }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ appearance: 'none', padding: '9px 28px 9px 12px', fontSize: 11,
            fontFamily: 'Inter, sans-serif', color: '#111111',
            background: '#FAFAF8', border: '1px solid #E5E5E5', outline: 'none', cursor: 'pointer' }}>
          <option value="">All Types</option>
          <option value="redesign">Redesign</option>
          <option value="empty_room">Empty Room</option>
        </select>
        <ChevronDown size={10} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: '#AAAAAA', pointerEvents: 'none' }} />
      </div>

      {/* Sort */}
      <div style={{ position: 'relative' }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ appearance: 'none', padding: '9px 28px 9px 12px', fontSize: 11,
            fontFamily: 'Inter, sans-serif', color: '#111111',
            background: '#FAFAF8', border: '1px solid #E5E5E5', outline: 'none', cursor: 'pointer' }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="favorites">Favourites first</option>
        </select>
        <ChevronDown size={10} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: '#AAAAAA', pointerEvents: 'none' }} />
      </div>

      {/* Favourites toggle */}
      <button onClick={() => setFavOnly(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
          fontSize: 11, fontFamily: 'Inter, sans-serif', cursor: 'pointer', border: '1px solid',
          borderColor: favOnly ? '#1F4E79' : '#E5E5E5',
          background: favOnly ? '#EEF3F8' : '#FAFAF8',
          color: favOnly ? '#1F4E79' : '#888882',
          transition: 'all 0.2s',
        }}>
        <Heart size={11} fill={favOnly ? '#1F4E79' : 'none'} stroke={favOnly ? '#1F4E79' : '#AAAAAA'} />
        Saved only
      </button>

      {hasFilters && (
        <button onClick={onReset}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
            color: '#888882', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = '#111111'}
          onMouseLeave={e => e.currentTarget.style.color = '#888882'}>
          <X size={10} /> Reset
        </button>
      )}
    </div>
  )
}

/* ── History card ───────────────────────────────────────────────────────── */
function HistoryCard({ doc, onFavorite, onDelete, onRegenerate }) {
  const [deleting, setDeleting] = useState(false)
  const [hovered,  setHovered]  = useState(false)
  const [fav,      setFav]      = useState(doc.is_favorite)

  const imgSrc   = doc.output_image_urls?.[0] ? `${API}${doc.output_image_urls[0]}` : null
  const inputSrc = doc.input_image_url ? `${API}${doc.input_image_url}` : null
  const date = doc.created_at
    ? new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  const handleDelete = async () => {
    if (!window.confirm('Delete this generation? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteHistoryItem(doc._id)
      onDelete(doc._id)
      toast('Deleted')
    } catch (e) {
      toast.error(e.response?.data?.detail ?? e.message)
      setDeleting(false)
    }
  }

  const handleFav = async () => {
    try {
      await setFavorite(doc._id, !fav)
      setFav(v => !v)
      onFavorite(doc._id, !fav)
    } catch { toast.error('Failed to update') }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease }}
      style={{ border: '1px solid #E5E5E5', overflow: 'hidden', background: '#FAFAF8',
        transition: 'border-color 0.22s' }}
      onMouseEnter={e => { setHovered(true); e.currentTarget.style.borderColor = '#111111' }}
      onMouseLeave={e => { setHovered(false); e.currentTarget.style.borderColor = '#E5E5E5' }}>

      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: '#EEEDE9' }}>
        {imgSrc
          ? <img src={imgSrc} alt="" loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover',
                transition: 'transform 0.55s ease',
                transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#E8E2D9,#D5CEC5)' }} />
        }

        {/* Type badge */}
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <span style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 500,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'rgba(250,250,248,0.9)', color: '#666666', padding: '2px 8px' }}>
            {doc.generation_type === 'empty_room' ? 'Empty Room' : 'Redesign'}
          </span>
        </div>

        {/* Fav button */}
        <button onClick={handleFav}
          style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(250,250,248,0.9)', border: 'none', cursor: 'pointer' }}>
          <Heart size={12} fill={fav ? '#1F4E79' : 'none'} stroke={fav ? '#1F4E79' : '#888882'} />
        </button>

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', bottom: 0, insetInline: 0, padding: '0.5rem',
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(to top, rgba(17,17,17,0.65), transparent)',
              }}>
              {imgSrc && (
                <a href={imgSrc} download={`aeterna_${doc.style}_${doc._id}.png`}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
                    background: 'rgba(250,250,248,0.9)', color: '#111111',
                    padding: '5px 10px', textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
                  <Download size={10} /> Save
                </a>
              )}
              <button onClick={() => onRegenerate(doc)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, marginLeft: 'auto',
                  background: 'rgba(250,250,248,0.9)', color: '#111111',
                  padding: '5px 10px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                <RefreshCw size={10} /> Redo
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(250,250,248,0.9)', border: 'none', cursor: 'pointer',
                  color: '#666666', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#B42318'}
                onMouseLeave={e => e.currentTarget.style.color = '#666666'}>
                <Trash2 size={11} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {inputSrc && (
          <img src={inputSrc} alt="source"
            style={{ width: 32, height: 32, objectFit: 'cover', flexShrink: 0, border: '1px solid #E5E5E5' }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#111111', fontFamily: 'Inter, sans-serif',
            textTransform: 'capitalize', margin: '0 0 2px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.style} {doc.room_type}
          </p>
          <p style={{ fontSize: 10, color: '#888882', fontFamily: 'Inter, sans-serif', margin: 0 }}>{date}</p>
        </div>
        {doc.generation_time && (
          <span style={{ fontSize: 10, color: '#888882', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
            {doc.generation_time}s
          </span>
        )}
      </div>
    </motion.div>
  )
}

/* ── Regenerate modal ───────────────────────────────────────────────────── */
function RegenModal({ doc, onClose }) {
  const [style,    setStyle]    = useState(doc.style || 'modern')
  const [density,  setDensity]  = useState(doc.density || 'moderate')
  const [lighting, setLighting] = useState(doc.lighting || 'natural')
  const [loading,  setLoading]  = useState(false)

  const handleRegen = async () => {
    setLoading(true)
    try {
      const r = await regenerateFromHistory(doc._id, { style, density, lighting })
      if (r.success !== false) { toast.success('Regenerated'); onClose() }
      else toast.error(r.error ?? 'Failed')
    } catch (e) {
      toast.error(e.response?.data?.detail ?? e.message)
    } finally { setLoading(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(17,17,17,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease }}
        style={{ background: '#FAFAF8', width: '100%', maxWidth: 440, padding: '2rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
            fontSize: '1.2rem', color: '#111111', margin: 0, letterSpacing: '-0.015em' }}>
            Regenerate Design
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888882', display: 'flex' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Style chips */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666666',
              fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em', marginBottom: 8 }}>Style</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STYLES.map(s => (
                <button key={s} onClick={() => setStyle(s)}
                  style={{ padding: '6px 14px', fontSize: 11, fontFamily: 'Inter, sans-serif',
                    textTransform: 'capitalize', cursor: 'pointer', border: '1px solid',
                    borderColor: style === s ? '#111111' : '#E5E5E5',
                    background: style === s ? '#111111' : 'transparent',
                    color: style === s ? '#FAFAF8' : '#666666', transition: 'all 0.18s' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666666',
              fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em', marginBottom: 8 }}>Furniture Density</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['minimal','moderate','dense'].map(d => (
                <button key={d} onClick={() => setDensity(d)}
                  style={{ flex: 1, padding: '7px 0', fontSize: 11, fontFamily: 'Inter, sans-serif',
                    textTransform: 'capitalize', cursor: 'pointer', border: '1px solid',
                    borderColor: density === d ? '#111111' : '#E5E5E5',
                    background: density === d ? '#111111' : 'transparent',
                    color: density === d ? '#FAFAF8' : '#666666', transition: 'all 0.18s' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Lighting */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#666666',
              fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em', marginBottom: 8 }}>Lighting</label>
            <div style={{ position: 'relative' }}>
              <select value={lighting} onChange={e => setLighting(e.target.value)}
                style={{ appearance: 'none', width: '100%', padding: '9px 28px 9px 12px', fontSize: 12,
                  fontFamily: 'Inter, sans-serif', color: '#111111',
                  background: '#FAFAF8', border: '1px solid #E5E5E5', outline: 'none', cursor: 'pointer' }}>
                {['natural','warm','bright','evening','golden hour','overcast'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <ChevronDown size={11} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: '#AAAAAA', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button onClick={handleRegen} disabled={loading} className="btn-primary"
            style={{ flex: 2, justifyContent: 'center', padding: '11px 0' }}>
            {loading ? 'Generating…' : 'Regenerate'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function HistoryPage() {
  const { user }           = useAuth()
  const [searchParams]     = useSearchParams()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [favOnly,    setFavOnly]    = useState(searchParams.get('favorites') === 'true')
  const [sortBy,     setSortBy]     = useState('newest')
  const [regenDoc,   setRegenDoc]   = useState(null)

  const hasFilters = !!(search || typeFilter || favOnly || sortBy !== 'newest')

  const load = useCallback((pg = 1) => {
    setLoading(true); setError(null)
    // Backend uses: page (1-based), page_size, generation_type, favorites_only
    // sort/search are not backend params — we sort client-side for now
    const params = {
      page: pg,
      page_size: PAGE,
      ...(typeFilter && { generation_type: typeFilter }),
      ...(favOnly    && { favorites_only: true }),
    }
    getHistory(params)
      .then(d => {
        // Backend returns: { success, total, page, page_size, has_more, results: [...] }
        const items = d.results ?? d.items ?? []
        setItems(pg === 1 ? items : prev => [...prev, ...items])
        setTotal(d.total ?? 0)
        setLoading(false)
      })
      .catch(e => { setError(e.response?.data?.detail ?? e.message); setLoading(false) })
  }, [typeFilter, favOnly])

  useEffect(() => { if (user) { setPage(1); load(1) } }, [user, typeFilter, favOnly])

  const handleFav    = (id, v) => setItems(p => p.map(i => i._id === id ? { ...i, is_favorite: v } : i))
  const handleDelete = (id)    => { setItems(p => p.filter(i => i._id !== id)); setTotal(t => t - 1) }
  const loadMore     = ()      => { const pg = page + 1; setPage(pg); load(pg) }
  const reset        = ()      => { setSearch(''); setTypeFilter(''); setFavOnly(false); setSortBy('newest') }

  return (
    <AccountLayout title="Your Designs" subtitle="Design History">

      <FilterBar
        search={search} setSearch={setSearch}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        favOnly={favOnly} setFavOnly={setFavOnly}
        sortBy={sortBy} setSortBy={setSortBy}
        onReset={reset} hasFilters={hasFilters}
      />

      {/* Count */}
      {total > 0 && (
        <p style={{ fontSize: 11, color: '#888882', fontFamily: 'JetBrains Mono, monospace', marginBottom: '1.25rem' }}>
          {total} generation{total !== 1 ? 's' : ''}
        </p>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ padding: '3rem 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter, sans-serif', marginBottom: '1rem' }}>{error}</p>
          <button onClick={() => load(1)} className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div style={{ padding: '4rem 0', textAlign: 'center', border: '1px dashed #E5E5E5' }}>
          <p style={{ fontSize: 14, color: '#111111', fontFamily: 'Inter, sans-serif', fontWeight: 500, marginBottom: 8 }}>
            {hasFilters ? 'No designs match your filters' : 'No generations yet'}
          </p>
          <p style={{ fontSize: 12, color: '#888882', fontFamily: 'Inter, sans-serif', marginBottom: '1.5rem' }}>
            {hasFilters ? 'Try adjusting your search.' : 'Generate your first design to get started.'}
          </p>
          {hasFilters
            ? <button onClick={reset} className="btn-ghost">Clear filters</button>
            : <a href="/" className="btn-primary" style={{ fontSize: 12, padding: '10px 24px' }}>Start designing</a>
          }
        </div>
      )}

      {/* Grid */}
      {items.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}
            className="sm:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence>
              {items.map(doc => (
                <HistoryCard key={doc._id} doc={doc}
                  onFavorite={handleFav}
                  onDelete={handleDelete}
                  onRegenerate={setRegenDoc}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Loading more skeletons */}
          {loading && page > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginTop: '1.25rem' }}
              className="sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '4/3' }} />)}
            </div>
          )}

          {/* Load more */}
          {items.length < total && !loading && (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <button onClick={loadMore} className="btn-outline" style={{ fontSize: 12, padding: '10px 32px' }}>
                Load more
              </button>
            </div>
          )}
        </>
      )}

      {/* Initial skeleton */}
      {loading && page === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}
          className="sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '4/3' }} />)}
        </div>
      )}

      <AnimatePresence>
        {regenDoc && <RegenModal doc={regenDoc} onClose={() => setRegenDoc(null)} />}
      </AnimatePresence>
    </AccountLayout>
  )
}
