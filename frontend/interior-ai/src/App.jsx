/**
 * App.jsx — Home page (/).
 * Landing sections + gated design CTA + technical architecture appendix.
 * GenerationWorkspace removed — design only available after login.
 */
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Wand2, Compass, Lock } from 'lucide-react'

import PublicLayout        from './components/PublicLayout'
import LandingHero         from './components/landing/LandingHero'
import LandingFeatures     from './components/landing/LandingFeatures'
import LandingBeforeAfter  from './components/landing/LandingBeforeAfter'
import LandingHowItWorks   from './components/landing/LandingHowItWorks'
import LandingStyleGallery from './components/landing/LandingStyleGallery'
import AIArchitecture      from './components/AIArchitecture'
import SystemStatus        from './components/SystemStatus'
import { useAuth }         from './context/AuthContext'

const W = 'clamp(1.5rem, 4vw, 3rem)'

/* ── Design CTA — gated by auth ─────────────────────────────────────────── */
function DesignCTA() {
  const { user } = useAuth()

  if (user) {
    return (
      <div style={{ borderTop: '1px solid #E5E5E5' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: `5rem ${W}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '2rem', textAlign: 'center' }}>
          <span className="eyebrow">Your Studio</span>
          <h2 style={{
            fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
            fontSize: 'clamp(1.75rem, 3vw, 2.6rem)', letterSpacing: '-0.02em',
            color: '#111111', margin: 0, lineHeight: 0.98,
          }}>
            Ready to design, {user.full_name?.split(' ')[0] ?? 'there'}.
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/design-room" className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '13px 28px' }}>
              <Wand2 size={14} strokeWidth={1.5} /> Open Design Studio
            </Link>
            <Link to="/history" className="btn-outline" style={{ fontSize: 13, padding: '12px 24px' }}>
              View History
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid #E5E5E5' }}>
      <div style={{
        maxWidth: 1440, margin: '0 auto', padding: `5rem ${W}`,
        display: 'grid', gridTemplateColumns: '1fr', gap: '4rem',
      }} className="lg:grid-cols-2">

        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.75rem' }}>
          <div>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 12 }}>AI Design Studio</span>
            <h2 style={{
              fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
              fontSize: 'clamp(2rem, 3.2vw, 3rem)', letterSpacing: '-0.022em',
              color: '#111111', margin: '0 0 1rem', lineHeight: 0.98,
            }}>
              Start designing<br />your space.
            </h2>
            <p style={{ fontSize: 14, color: '#666666', fontFamily: 'Inter, sans-serif',
              lineHeight: 1.75, margin: 0, maxWidth: 440 }}>
              Upload a room photo or describe a space. The four-stage AI pipeline
              redesigns it in seconds and learns your aesthetic with every rating.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { icon: Wand2,   text: 'Image redesign — upload any room photo' },
              { icon: Compass, text: 'Empty room generation — text only' },
              { icon: Lock,    text: 'Adaptive preferences — improves with every rating' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, background: '#F5F4F0',
                  border: '1px solid #E5E5E5', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={12} strokeWidth={1.5} style={{ color: '#888882' }} />
                </div>
                <span style={{ fontSize: 13, color: '#444444', fontFamily: 'Inter, sans-serif' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '13px 28px' }}>
              Create free account <ArrowRight size={13} />
            </Link>
            <Link to="/login" className="btn-outline" style={{ fontSize: 13, padding: '12px 24px' }}>
              Sign in
            </Link>
          </div>

          <p style={{ fontSize: 11, color: '#AAAAAA', fontFamily: 'Inter, sans-serif', margin: 0 }}>
            Free plan includes 10 generations · No credit card required
          </p>
        </div>

        {/* Right — plan cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
          {[
            {
              name: 'Free', price: '$0', note: 'forever', highlight: false,
              perks: ['10 generations', 'Both design modes', '7-day history', 'Preference learning'],
            },
            {
              name: 'Pro', price: '$19', note: 'per month', highlight: true,
              perks: ['100 generations / month', 'HD 1024px output', 'Unlimited history', 'Priority GPU'],
            },
          ].map(plan => (
            <div key={plan.name} style={{
              padding: '1.5rem',
              background: plan.highlight ? '#111111' : '#F5F4F0',
              border: `1px solid ${plan.highlight ? '#111111' : '#E5E5E5'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em',
                    textTransform: 'uppercase', fontFamily: 'Inter, sans-serif',
                    color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#888882', margin: '0 0 4px' }}>
                    {plan.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
                      fontSize: '1.6rem', color: plan.highlight ? '#FAFAF8' : '#111111', letterSpacing: '-0.02em' }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: 11, color: plan.highlight ? 'rgba(255,255,255,0.4)' : '#888882',
                      fontFamily: 'Inter, sans-serif' }}>/ {plan.note}</span>
                  </div>
                </div>
                <Link to={plan.highlight ? '/register?plan=pro' : '/register'}
                  style={{
                    fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                    padding: '7px 16px', border: '1px solid',
                    borderColor: plan.highlight ? 'rgba(255,255,255,0.3)' : '#111111',
                    color: plan.highlight ? '#FAFAF8' : '#111111',
                    background: 'transparent', textDecoration: 'none', display: 'inline-block',
                    transition: 'all 0.2s',
                  }}>
                  {plan.highlight ? 'Upgrade' : 'Get started'}
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plan.perks.map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
                      background: plan.highlight ? 'rgba(255,255,255,0.35)' : '#CCCCCC' }} />
                    <span style={{ fontSize: 12, color: plan.highlight ? 'rgba(255,255,255,0.65)' : '#666666',
                      fontFamily: 'Inter, sans-serif' }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Link to="/pricing"
            style={{ fontSize: 12, color: '#888882', fontFamily: 'Inter, sans-serif',
              textDecoration: 'none', textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = '#111111'}
            onMouseLeave={e => e.currentTarget.style.color = '#888882'}>
            View full plan comparison <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <PublicLayout>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: `0 ${W}` }}>
        <LandingHero />
        <LandingFeatures />
        <LandingBeforeAfter />
        <LandingHowItWorks />
        <LandingStyleGallery />
      </div>

      <DesignCTA />

      {/* Technical appendix — collapsed, clean */}
      <div style={{ borderTop: '1px solid #E5E5E5', background: '#F5F4F0' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: `4rem ${W}` }}>
          <span className="eyebrow" style={{ display: 'block', marginBottom: '2rem' }}>
            Technical Architecture
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <SystemStatus />
            <AIArchitecture activeStep={-1} />
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
