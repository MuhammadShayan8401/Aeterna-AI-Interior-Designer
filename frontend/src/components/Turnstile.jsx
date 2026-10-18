/** Cloudflare Turnstile widget. Renders nothing unless VITE_TURNSTILE_SITEKEY is set. */
import { useEffect, useRef } from 'react'

const KEY = import.meta.env.VITE_TURNSTILE_SITEKEY || ''
export const TURNSTILE_ON = Boolean(KEY)

export default function Turnstile({ onToken }) {
  const box = useRef(null)
  useEffect(() => {
    if (!KEY) return
    let id, dead = false
    const mount = () => {
      if (dead || !box.current || !window.turnstile) return
      id = window.turnstile.render(box.current, { sitekey: KEY, callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onToken('') })
    }
    if (window.turnstile) mount()
    else {
      let s = document.querySelector('script[data-turnstile]')
      if (!s) {
        s = document.createElement('script'); s.dataset.turnstile = '1'; s.async = true
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; document.head.appendChild(s)
      }
      s.addEventListener('load', mount)
    }
    return () => { dead = true; try { id != null && window.turnstile?.remove(id) } catch { /* ignore */ } }
  }, [onToken])
  return KEY ? <div ref={box} style={{ margin: '0 0 1rem' }} /> : null
}
