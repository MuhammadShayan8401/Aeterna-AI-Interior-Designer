/** Pricing — Free vs Pro. Pro is paid by Easypaisa transfer and confirmed by the site owner. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useT } from '../i18n'
import { track } from '../services/track'
import * as api from '../services/api'

const BADGE = {
  awaiting: { bg: '#EEF2F7', fg: '#35506F', label: 'Awaiting payment' },
  pending:  { bg: '#FFF6E0', fg: '#8A6400', label: 'Waiting for review' },
  approved: { bg: '#E6F2EC', fg: '#2F6F57', label: 'Approved' },
  rejected: { bg: '#FDECEA', fg: '#B42318', label: 'Rejected' },
}
const date = (t) => new Date(t * 1000).toLocaleDateString(undefined, { dateStyle: 'medium' })

function Plan({ name, price, note, perks, highlight, children }) {
  return (
    <div style={{ padding: '1.75rem', background: highlight ? '#111' : '#F5F4F0', color: highlight ? '#FAFAF8' : '#111', border: `1px solid ${highlight ? '#111' : '#E5E5E5'}` }}>
      <p className="eyebrow" style={{ color: highlight ? 'rgba(255,255,255,.5)' : undefined, margin: '0 0 6px' }}>{name}</p>
      <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '2.2rem', margin: '0 0 2px', letterSpacing: '-0.02em' }}>{price}</p>
      <p style={{ fontSize: 12, margin: '0 0 1.25rem', opacity: 0.6, fontFamily: 'Inter, sans-serif' }}>{note}</p>
      {perks.map((p) => (
        <p key={p} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, margin: '0 0 8px', fontFamily: 'Inter, sans-serif', opacity: 0.85 }}>
          <Check size={13} /> {p}
        </p>
      ))}
      <div style={{ marginTop: '1.25rem' }}>{children}</div>
    </div>
  )
}

function Copyable({ value }) {
  return (
    <button onClick={() => { navigator.clipboard?.writeText(value); toast.success('Copied') }} title="Copy"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#111', padding: 0 }}>
      {value} <Copy size={12} color="#888" />
    </button>
  )
}

function PayPanel({ info, reload }) {
  const { t } = useT()
  const [tid, setTid] = useState('')
  const opts = info.options || { month: { price: info.price, days: info.days } }
  const [plan, setPlan] = useState('month')
  const opt = opts[plan] || opts.month
  const [amount, setAmount] = useState(opt.price)
  useEffect(() => { setAmount(opt.price) }, [opt.price])
  const [sender, setSender] = useState('')
  const [proof, setProof] = useState('')
  const methods = info.methods?.length ? info.methods : [{ id: 'easypaisa', label: 'Easypaisa', ...info.easypaisa }]
  const [mid, setMid] = useState(methods[0].id)
  const m = methods.find((x) => x.id === mid) || methods[0]
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const { reload: reloadUser } = useAuth()

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      await api.billingSubmit(tid, amount, sender, mid, proof, plan); track('payment_submitted', { plan, method: mid })
      toast.success('Thanks! We will confirm your payment soon.')
      setTid(''); setSender(''); setProof(''); await reload(); reloadUser().catch(() => {})
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ marginTop: '2.5rem', border: '1px solid #E5E5E5', background: '#fff', padding: '1.75rem' }}>
      <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '1.5rem', margin: '0 0 .25rem' }}>{t('Get Pro')}</h2>
      {info.plan.active && (
        <p style={{ fontSize: 13, color: '#2F6F57', fontFamily: 'Inter, sans-serif', margin: '0 0 1rem' }}>
          Pro is active until <b>{date(info.plan.until)}</b>. Paying again extends it by {opt.days} days.
        </p>
      )}
      {info.configured && Object.keys(opts).length > 1 && (
        <div role="group" aria-label="Plan length" style={{ display: 'flex', gap: 6, margin: '1rem 0 0' }}>
          {Object.entries(opts).map(([id, o]) => (
            <button key={id} type="button" onClick={() => setPlan(id)} aria-pressed={plan === id}
              style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${plan === id ? '#111' : '#E0DDD6'}`, background: plan === id ? '#111' : '#fff', color: plan === id ? '#FAFAF8' : '#555' }}>
              {id === 'week' ? t('Weekly') : t('Monthly')} · PKR {o.price} / {o.days} {t('days')}
            </button>
          ))}
        </div>
      )}
      {!info.configured ? (
        <p style={{ fontSize: 13, color: '#777', fontFamily: 'Inter, sans-serif' }}>Payments are not open yet. Check back soon.</p>
      ) : (<>
        {info.gateway?.enabled && (
          <div style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #E5E5E5', background: '#FBFAF8' }}>
            <p style={{ margin: '0 0 .6rem', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
              <b>{t('Pay online')}</b> {t('with')} {info.gateway.label} — {t('Pro switches on automatically.')}</p>
            <button className="btn-primary" disabled={busy} onClick={async () => {
              setBusy(true); setErr('')
              try { track('pay_online_click', { plan }); const r = await api.billingPayStart(plan); window.location.assign(r.url) }
              catch (e) { setErr(e.message); setBusy(false) }
            }}>{busy ? <Loader2 size={14} className="animate-spin-cw" /> : `${t('Pay PKR')} ${opt.price} ${t('online')}`}</button>
            {info.methods?.length > 0 && <p style={{ margin: '.8rem 0 0', fontSize: 12, color: '#888', fontFamily: 'Inter, sans-serif' }}>{t('Or pay by transfer below.')}</p>}
          </div>
        )}
        {info.methods?.length > 0 && (<><ol style={{ fontSize: 14, lineHeight: 1.9, color: '#444', fontFamily: 'Inter, sans-serif', paddingLeft: '1.2rem', margin: '1rem 0' }}>
          <li>Open {m.label} and send <b>PKR {opt.price}</b> to <Copyable value={m.number} /> {m.name && <span style={{ color: '#888' }}>({m.name})</span>}</li>
          <li>In the note/reason, write your reference: <Copyable value={info.reference} /></li>
          <li>Copy the <b>Transaction ID</b> from the receipt and enter it below.</li>
          <li>We check it and switch Pro on — usually within a day. You'll get an email.</li>
        </ol>
        {methods.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0 0 1rem' }}>
            {methods.map((x) => (
              <button key={x.id} type="button" onClick={() => setMid(x.id)} aria-pressed={mid === x.id}
                style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${mid === x.id ? '#111' : '#E0DDD6'}`, background: mid === x.id ? '#111' : '#fff', color: mid === x.id ? '#FAFAF8' : '#555' }}>{x.label}</button>
            ))}
          </div>
        )}
        <form onSubmit={submit} style={{ display: 'grid', gap: 10, maxWidth: 380 }}>
          <input className="input-field" placeholder={t("Transaction ID")} value={tid} onChange={(e) => { setTid(e.target.value); setErr('') }} autoComplete="off" />
          <input className="input-field" type="number" min={opt.price} placeholder="Amount paid (PKR)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input className="input-field" placeholder="Number you paid from (optional) 03XXXXXXXXX" value={sender} onChange={(e) => setSender(e.target.value)} inputMode="tel" />
          <label style={{ fontSize: 12, color: '#777', fontFamily: 'Inter, sans-serif' }}>
            Payment screenshot (optional, speeds up approval)
            <input type="file" accept="image/*" style={{ display: 'block', marginTop: 4, fontSize: 12 }}
              onChange={(e) => { const f = e.target.files?.[0]; if (!f) return setProof(''); const r = new FileReader(); r.onload = () => setProof(String(r.result)); r.readAsDataURL(f) }} />
          </label>
          <div aria-live="polite">{err && <span style={{ fontSize: 13, color: '#B42318' }}>{err}</span>}</div>
          <button className="btn-primary" disabled={busy || tid.trim().length < 6}>{busy ? <Loader2 size={14} className="animate-spin-cw" /> : t('I have paid')}</button>
        </form>
        </>)}
      </>)}

      {info.payments.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <span className="eyebrow">Your payments</span>
          {info.payments.map((p) => {
            const b = BADGE[p.status] ?? BADGE.pending
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F0EFEB', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
                <span><b>PKR {p.amount}</b> · <span className="mono" style={{ fontSize: 12 }}>{p.tx_id}</span> · <span style={{ color: '#999' }}>{date(p.created)}</span>
                  {p.note && <span style={{ color: '#999' }}> — {p.note}</span>}</span>
                <span style={{ background: b.bg, color: b.fg, padding: '3px 10px', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>{b.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Pricing() {
  const { user } = useAuth()
  const [plans, setPlans] = useState(null)
  const [info, setInfo] = useState(null)
  const [err, setErr] = useState('')

  const loadInfo = () => api.billingInfo().then(setInfo).catch((e) => setErr(e.message))
  useEffect(() => { api.billingPlans().then(setPlans).catch((e) => setErr(e.message)) }, [])
  useEffect(() => { if (user) loadInfo(); else setInfo(null) }, [user?.id]) // eslint-disable-line

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem clamp(1.5rem,4vw,3rem) 5rem' }}>
      <span className="eyebrow">Plans</span>
      <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: 'clamp(2rem,4vw,3rem)', letterSpacing: '-0.02em', margin: '6px 0 2rem' }}>Simple pricing.</h1>
      {err && <p style={{ color: '#B42318', fontSize: 13 }}>{err}</p>}
      {!plans ? <Loader2 className="animate-spin-cw" /> : (
        <div style={{ display: 'grid', gap: '1.25rem' }} className="md:grid-cols-2">
          <Plan name="Free" price="PKR 0" note="forever" perks={[`${plans.free_limit} designs a day`, 'Both design modes', 'Saved history and favourites', 'Learns your taste']}>
            {!user && <Link to="/register" className="btn-outline" style={{ width: '100%' }}>Create free account</Link>}
          </Plan>
          <Plan highlight name="Pro" price={`PKR ${plans.price}`} note={`for ${plans.days} days · pay with Easypaisa`}
            perks={[`${plans.pro_limit} designs a day`, 'Everything in Free', 'Priority support']}>
            {!user && <Link to="/register" style={{ display: 'flex', justifyContent: 'center', padding: '12px', background: '#FAFAF8', color: '#111', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>Sign up to upgrade</Link>}
          </Plan>
        </div>
      )}
      {user && info && <PayPanel info={info} reload={loadInfo} />}
    </div>
  )
}
