/** Owner — private payment dashboard (#/owner). The OWNER_KEY is typed here and kept only in this tab. */
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import * as api from '../services/api'

const box = { border: '1px solid #E5E5E5', background: '#fff', padding: '1rem', marginBottom: 10, fontFamily: 'Inter, sans-serif', fontSize: 13 }

export default function Owner() {
  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [status, setStatus] = useState('pending')
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState(null)
  const [proof, setProof] = useState({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (k, st) => {
    setBusy(true)
    try {
      const [s, p] = await Promise.all([api.ownerStats(k), api.ownerPayments(k, st)])
      setStats(s); setRows(p.payments); setAuthed(true)
    } catch (e) { toast.error(e.message); setAuthed(false) } finally { setBusy(false) }
  }, [])

  const decide = async (id, approve) => {
    const note = approve ? '' : (window.prompt('Reason for rejecting (shown to the user):') ?? null)
    if (note === null) return
    try { await api.ownerDecide(key, id, approve, note); toast.success(approve ? 'Approved — Pro activated' : 'Rejected'); load(key, status) }
    catch (e) { toast.error(e.message) }
  }
  const showProof = async (id) => {
    try { const r = await api.ownerProof(key, id); setProof((p) => ({ ...p, [id]: r.proof })) } catch (e) { toast.error(e.message) }
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '2.5rem clamp(1.5rem,4vw,3rem) 5rem' }}>
      <span className="eyebrow">Owner</span>
      <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '2rem', margin: '4px 0 1.5rem' }}>Payments</h1>
      {!authed ? (
        <form onSubmit={(e) => { e.preventDefault(); load(key, status) }} style={{ display: 'flex', gap: 8, maxWidth: 420 }}>
          <input className="input-field" type="password" placeholder="Owner key" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          <button className="btn-primary" disabled={busy || key.length < 8}>{busy ? <Loader2 size={14} className="animate-spin-cw" /> : 'Open'}</button>
        </form>
      ) : (<>
        {stats && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {Object.entries(stats).filter(([, v]) => typeof v !== 'object').map(([k, v]) => (
              <div key={k} style={{ ...box, marginBottom: 0, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '.08em' }}>{k.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{String(v)}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
          {['pending', 'approved', 'rejected'].map((s) => (
            <button key={s} className={status === s ? 'btn-primary' : 'btn-outline'} onClick={() => { setStatus(s); load(key, s) }}>{s}</button>
          ))}
        </div>
        {rows.length === 0 && <p style={{ color: '#888', fontFamily: 'Inter, sans-serif' }}>Nothing here.</p>}
        {rows.map((p) => (
          <div key={p.id} style={box}>
            <div><b>PKR {p.amount}</b> · {p.method || 'easypaisa'} · TID <code>{p.tx_id}</code></div>
            <div style={{ color: '#666', margin: '4px 0' }}>{p.name} &lt;{p.email}&gt; · ref {p.reference} · from {p.sender || '—'}</div>
            {p.has_proof && (proof[p.id]
              ? <img src={proof[p.id]} alt="Payment screenshot" style={{ maxWidth: 260, display: 'block', margin: '8px 0' }} />
              : <button className="btn-ghost" onClick={() => showProof(p.id)}>View screenshot</button>)}
            {p.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn-primary" onClick={() => decide(p.id, true)}>Approve</button>
                <button className="btn-outline" onClick={() => decide(p.id, false)}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </>)}
    </div>
  )
}
