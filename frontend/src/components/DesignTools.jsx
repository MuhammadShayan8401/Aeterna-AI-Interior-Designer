/**
 * DesignTools — actions for one generated image: download (HD), share link, PKR budget, mood board (PDF),
 * and "tweak" (more like this / change style or colours).
 */
import { useState } from 'react'
import { Download, Share2, Wallet, FileText, SlidersHorizontal, Loader2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import * as api from '../services/api'
import { useT } from '../i18n'
import { downloadImage, printMoodBoard } from '../services/export'
import { STYLES, PALETTES, CHANGE_LEVELS } from '../utils/constants'

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const money = (n) => 'PKR ' + Number(n).toLocaleString('en-PK')
const Chip = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} aria-pressed={active}
    style={{ padding: '6px 12px', fontSize: 12, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
      border: `1px solid ${active ? '#111' : '#E0DDD6'}`, background: active ? '#111' : '#fff', color: active ? '#FAFAF8' : '#555' }}>{children}</button>
)
const tool = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', fontSize: 12, fontFamily: 'Inter, sans-serif',
  border: '1px solid #E5E5E5', background: '#fff', color: '#444', cursor: 'pointer' }

export function shareUrl(id) {
  return `${location.origin}${location.pathname}#/s/${id}`
}

export default function DesignTools({ itemId, index, src, all, before, settings, onResult, onBusy }) {
  const { t } = useT()
  const [modal, setModal] = useState(null)        // 'budget' | 'tweak' | 'share'
  const [budget, setBudget] = useState(null)
  const [shareId, setShareId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [tw, setTw] = useState({ style: settings.style, palette: settings.palette || 'neutral', change: 'subtle', extra: '' })

  const loadBudget = async () => {
    if (budget) return budget
    const b = await api.budgetEstimate(settings.room_type, settings.style, settings.density || 'balanced')
    setBudget(b); return b
  }
  const run = async (fn) => { setBusy(true); try { await fn() } catch (e) { toast.error(e.message) } finally { setBusy(false) } }

  const openBudget = () => run(async () => { await loadBudget(); setModal('budget') })
  const openShare = () => run(async () => { const r = await api.shareCreate(itemId, index); setShareId(r.id); setModal('share') })
  const mood = () => run(async () => {
    const b = await loadBudget().catch(() => null)
    printMoodBoard({ title: `${cap(settings.style)} ${settings.room_type}`, settings, images: all, before, budget: b })
  })
  const tweak = () => run(async () => {
    setModal(null); onBusy?.(true)
    try {
      const payload = await api.variation(itemId, index, { ...tw, count: 2 }, () => {})
      onResult?.(payload, src)
    } finally { onBusy?.(false) }
  })

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 6 }}>
        <button style={tool} onClick={() => downloadImage(src, `aeterna-design-${index + 1}-hd.jpg`, 2)} title="Download 2× size"><Download size={13} /> {t('HD')}</button>
        <button style={tool} onClick={openShare} disabled={busy}><Share2 size={13} /> {t('Share')}</button>
        <button style={tool} onClick={openBudget} disabled={busy}><Wallet size={13} /> {t('Budget')}</button>
        <button style={tool} onClick={mood} disabled={busy}><FileText size={13} /> {t('Mood board')}</button>
        <button style={tool} onClick={() => setModal('tweak')} disabled={busy}><SlidersHorizontal size={13} /> {t('More like this')}</button>
        {busy && <Loader2 size={14} className="animate-spin-cw" style={{ alignSelf: 'center' }} />}
      </div>

      {modal === 'budget' && budget && (
        <Modal title={t("Estimated budget")} onClose={() => setModal(null)}>
          <table style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {budget.items.map((r) => (
                <tr key={r.name} style={{ borderBottom: '1px solid #EEE' }}>
                  <td style={{ padding: '8px 0' }}>{r.name}</td>
                  <td style={{ textAlign: 'right', color: '#555' }}>{money(r.low)} – {money(r.high)}</td>
                </tr>
              ))}
              <tr><td style={{ padding: '10px 0', fontWeight: 600 }}>{t('Estimated total')}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{money(budget.total_low)} – {money(budget.total_high)}</td></tr>
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>{budget.note}</p>
        </Modal>
      )}

      {modal === 'share' && shareId && (
        <Modal title={t("Share this design")} onClose={() => setModal(null)}>
          <p style={{ fontSize: 13, color: '#555', fontFamily: 'Inter, sans-serif', margin: '0 0 .75rem' }}>
            Anyone with this link can see the before/after. Only this image is shared, never your account.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly className="input-field" value={shareUrl(shareId)} onFocus={(e) => e.target.select()} aria-label="Share link" />
            <button className="btn-primary" onClick={() => { navigator.clipboard?.writeText(shareUrl(shareId)); toast.success('Link copied') }}><Copy size={13} /> {t('Copy')}</button>
          </div>
        </Modal>
      )}

      {modal === 'tweak' && (
        <Modal title={t("More like this")} onClose={() => setModal(null)}>
          <p style={{ fontSize: 13, color: '#555', fontFamily: 'Inter, sans-serif', margin: '0 0 1rem' }}>
            Keeps this design as the starting point. Change the style or colours, or just ask for another take. Uses 2 of your daily designs.</p>
          <div className="eyebrow" style={{ margin: '0 0 6px' }}>Style</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STYLES.map((o) => <Chip key={o.id} active={tw.style === o.id} onClick={() => setTw({ ...tw, style: o.id })}>{o.label}</Chip>)}
          </div>
          <div className="eyebrow" style={{ margin: '1rem 0 6px' }}>Colours</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PALETTES.map((o) => <Chip key={o.id} active={tw.palette === o.id} onClick={() => setTw({ ...tw, palette: o.id })}>{o.label}</Chip>)}
          </div>
          <div className="eyebrow" style={{ margin: '1rem 0 6px' }}>How different</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {CHANGE_LEVELS.map((o) => <Chip key={o.id} active={tw.change === o.id} onClick={() => setTw({ ...tw, change: o.id })}>{o.label}</Chip>)}
          </div>
          <input className="input-field" style={{ marginTop: '1rem' }} maxLength={200} placeholder="Anything else? e.g. more plants, a darker sofa"
            value={tw.extra} onChange={(e) => setTw({ ...tw, extra: e.target.value })} />
          <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={tweak}>{t('Create variations')}</button>
        </Modal>
      )}
    </>
  )
}
