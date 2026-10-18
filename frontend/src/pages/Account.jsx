/** Account — profile, usage, password, delete account, sign out. */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'

const Card = ({ title, children }) => (
  <section style={{ border: '1px solid #E5E5E5', background: '#fff', padding: '1.5rem', marginBottom: '1.5rem' }}>
    <span className="eyebrow" style={{ display: 'block', marginBottom: '1rem' }}>{title}</span>
    {children}
  </section>
)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export default function Account() {
  const { user, quota, taste, logout } = useAuth()
  const nav = useNavigate()
  const [oldPw, setOld] = useState('')
  const [newPw, setNew] = useState('')
  const [busy, setBusy] = useState(false)
  const [delPw, setDelPw] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const pct = quota ? Math.min(100, (quota.used / quota.limit) * 100) : 0
  const liked = Object.entries(taste).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const change = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await api.changePassword(oldPw, newPw); setOld(''); setNew(''); toast.success('Password updated — other devices were signed out') }
    catch (e2) { toast.error(e2.message) } finally { setBusy(false) }
  }
  const remove = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await api.deleteAccount(delPw); toast.success('Account deleted'); nav('/', { replace: true }) }
    catch (e2) { toast.error(e2.message); setBusy(false) }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem clamp(1.5rem,4vw,3rem) 5rem' }}>
      <span className="eyebrow">Account</span>
      <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '2rem', letterSpacing: '-0.02em', margin: '4px 0 1.75rem' }}>{user.name}</h1>

      <Card title="Profile">
        <p style={{ margin: 0, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>{user.email}</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#999', fontFamily: 'Inter, sans-serif' }}>
          Member since {new Date(user.created * 1000).toLocaleDateString(undefined, { dateStyle: 'long' })}
        </p>
      </Card>

      <Card title="Plan">
        <p style={{ margin: 0, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
          {user.plan?.active ? <><b>Pro</b> · active until {new Date(user.plan.until * 1000).toLocaleDateString(undefined, { dateStyle: 'long' })}</> : <><b>Free</b> · <Link to="/pricing" style={{ color: '#111' }}>See Pro</Link></>}
        </p>
        {user.verification_required && !user.verified && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#8A6400' }}>Email not confirmed yet.</p>}
      </Card>

      <Card title="Today's designs">
        {quota ? (<>
          <p style={{ margin: '0 0 8px', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
            <b>{quota.remaining}</b> of {quota.limit} left <span style={{ color: '#999' }}>· resets at midnight UTC</span>
          </p>
          <div style={{ height: 4, background: '#EEEDE9' }}><div style={{ width: `${pct}%`, height: 4, background: '#111' }} /></div>
        </>) : <p style={{ margin: 0, color: '#999', fontSize: 13 }}>Loading …</p>}
      </Card>

      <Card title="Invite friends">
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#666', fontFamily: 'Inter, sans-serif' }}>
          Each friend who joins with your link gives you both extra designs every day.
          {user.referrals > 0 && <> {user.referrals} joined so far.</>}
        </p>
        {user.ref && (() => { const link = `${location.origin}${location.pathname}#/register?ref=${user.ref}`
          return (<div style={{ display: 'flex', gap: 8 }}>
            <input readOnly className="input-field" value={link} onFocus={(e) => e.target.select()} aria-label="Invite link" />
            <button className="btn-outline" type="button" onClick={() => { navigator.clipboard?.writeText(link); toast.success('Invite link copied') }}>Copy</button>
          </div>) })()}
      </Card>

      <Card title="Your taste">
        {liked.length ? (
          <p style={{ margin: 0, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
            {liked.map(([s, v]) => `${cap(s)} (${v})`).join(' · ')}
          </p>
        ) : <p style={{ margin: 0, fontSize: 13, color: '#999', fontFamily: 'Inter, sans-serif' }}>Like a few designs in the Studio and your favourite styles show up here.</p>}
      </Card>

      <Card title="Change password">
        <form onSubmit={change} style={{ display: 'grid', gap: 10, maxWidth: 360 }}>
          <input className="input-field" type="password" placeholder="Current password" value={oldPw} onChange={(e) => setOld(e.target.value)} autoComplete="current-password" />
          <input className="input-field" type="password" placeholder="New password (8+ characters)" value={newPw} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" />
          <button className="btn-outline" disabled={busy || !oldPw || newPw.length < 8}>Update password</button>
        </form>
      </Card>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        <button className="btn-ghost" onClick={async () => { await logout(); nav('/', { replace: true }) }}><LogOut size={13} /> Sign out</button>
      </div>

      <Card title="Delete account">
        <p style={{ margin: '0 0 1rem', fontSize: 13, color: '#666', fontFamily: 'Inter, sans-serif' }}>
          Permanently removes your account, saved designs and history. This cannot be undone.
        </p>
        {!confirmDel ? (
          <button className="btn-ghost" style={{ color: '#B42318', borderColor: '#F1C7C1' }} onClick={() => setConfirmDel(true)}>Delete my account …</button>
        ) : (
          <form onSubmit={remove} style={{ display: 'grid', gap: 10, maxWidth: 360 }}>
            <input className="input-field" type="password" placeholder="Confirm with your password" value={delPw} onChange={(e) => setDelPw(e.target.value)} autoComplete="current-password" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" type="button" onClick={() => { setConfirmDel(false); setDelPw('') }}>Cancel</button>
              <button className="btn-primary" style={{ background: '#B42318', borderColor: '#B42318' }} disabled={busy || !delPw}>Delete forever</button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
