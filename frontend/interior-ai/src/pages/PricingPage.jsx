/**
 * PricingPage.jsx — Three-tier pricing with full feature comparison table.
 * Editorial layout. No cards with glows. Static — no backend.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Minus, ChevronDown } from 'lucide-react'
import PublicLayout from '../components/PublicLayout'

const ease = [0.16, 1, 0.3, 1]

const PLANS = [
  {
    id: 'free', name: 'Free', price: '$0', period: 'forever',
    cta: 'Start free', ctaHref: '/register', highlight: false,
    desc: 'For exploring the platform.',
  },
  {
    id: 'pro', name: 'Pro', price: '$19', period: 'per month',
    cta: 'Upgrade to Pro', ctaHref: '/register?plan=pro', highlight: true,
    desc: 'For designers who generate regularly.',
  },
  {
    id: 'studio', name: 'Studio', price: 'Custom', period: 'contact us',
    cta: 'Contact sales', ctaHref: 'mailto:contact@aeterna.ai', highlight: false,
    desc: 'For studios, teams, and API access.',
  },
]

const FEATURES = [
  { category: 'Usage',        label: 'Generations per month',       free: '5',       pro: '100',        studio: 'Unlimited' },
  { category: 'Usage',        label: 'Output resolution',           free: '512 px',  pro: 'HD 1024 px', studio: 'HD 1024 px+' },
  { category: 'Usage',        label: 'Variations per run',          free: 'Up to 2', pro: 'Up to 4',    studio: 'Up to 4' },
  { category: 'Core AI',      label: 'AI Room Redesign (img2img)',  free: true,      pro: true,         studio: true },
  { category: 'Core AI',      label: 'Empty Room Generation',       free: true,      pro: true,         studio: true },
  { category: 'Core AI',      label: 'Adaptive preference model',   free: true,      pro: true,         studio: true },
  { category: 'Core AI',      label: 'Before / After comparison',   free: true,      pro: true,         studio: true },
  { category: 'Storage',      label: 'Generation history',          free: '7 days',  pro: 'Unlimited',  studio: 'Unlimited' },
  { category: 'Storage',      label: 'Saved / favourited designs',  free: 'Up to 10',pro: 'Unlimited',  studio: 'Unlimited' },
  { category: 'Performance',  label: 'Priority GPU queue',          free: false,     pro: true,         studio: true },
  { category: 'Performance',  label: 'Full-resolution download',    free: false,     pro: true,         studio: true },
  { category: 'Performance',  label: 'Batch generation',            free: false,     pro: false,        studio: true },
  { category: 'Team',         label: 'Team member seats',           free: false,     pro: false,        studio: true },
  { category: 'Developer',    label: 'REST API access',             free: false,     pro: false,        studio: true },
  { category: 'Developer',    label: 'Custom pipeline config',      free: false,     pro: false,        studio: true },
  { category: 'Support',      label: 'Priority support + SLA',      free: false,     pro: false,        studio: true },
]

const FAQS = [
  {
    q: 'What AI models power the platform?',
    a: 'Aeterna uses a four-stage pipeline: SegFormer for semantic segmentation, MiDaS for monocular depth estimation, a custom-trained preference ANN for personalisation, and Stable Diffusion v1.5 for final generation. All models run server-side — nothing is installed on your device.',
  },
  {
    q: 'What counts as a "generation"?',
    a: 'Each time you click Generate, that counts as one generation, regardless of how many variations are produced in that run. Regenerating from history counts as a new generation.',
  },
  {
    q: 'Can I cancel my plan at any time?',
    a: 'Yes. Pro plans are month-to-month. Cancel anytime and you retain access until the end of your billing period. Studio plans are negotiated separately.',
  },
  {
    q: 'How does the adaptive preference model work?',
    a: 'Each time you like or dislike a result, the system records the design parameters. A 5-head MLP is trained on your feedback history and begins predicting your style, density, and lighting preferences to improve future generations automatically.',
  },
  {
    q: 'Do I need to upload a photo to use Aeterna?',
    a: 'No. The Empty Room Designer lets you generate interior designs from scratch — just describe the room and select a style. No photograph required.',
  },
  {
    q: 'Is my data private?',
    a: 'Your uploaded images and generation history are stored securely and are only accessible to you when authenticated. We do not use your images to train public models.',
  },
]

function Cell({ val, planId }) {
  if (val === true)  return <span style={{ display: 'flex', justifyContent: 'center' }}><Check size={13} style={{ color: planId === 'pro' ? '#1F4E79' : '#2F6F57' }} /></span>
  if (val === false) return <span style={{ display: 'flex', justifyContent: 'center' }}><Minus size={12} style={{ color: '#DDDDDD' }} /></span>
  return (
    <span style={{ fontSize: 11, color: '#111111', fontFamily: 'Inter,sans-serif',
      fontWeight: planId === 'pro' ? 600 : 400, display: 'block', textAlign: 'center' }}>
      {val}
    </span>
  )
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #E5E5E5' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          width: '100%', padding: '1.125rem 0', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', gap: '1rem',
        }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#111111', fontFamily: 'Inter,sans-serif', lineHeight: 1.4 }}>{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          style={{ flexShrink: 0, color: '#888882', display: 'flex', marginTop: 1 }}>
          <ChevronDown size={14} />
        </motion.span>
      </button>
      <AnimateHeight open={open}>
        <p style={{ fontSize: 13, color: '#666666', fontFamily: 'Inter,sans-serif', lineHeight: 1.7,
          paddingBottom: '1.125rem', margin: 0 }}>
          {a}
        </p>
      </AnimateHeight>
    </div>
  )
}

function AnimateHeight({ open, children }) {
  return (
    <motion.div
      initial={false}
      animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.25, ease }}
      style={{ overflow: 'hidden' }}>
      {children}
    </motion.div>
  )
}

export default function PricingPage() {
  const categories = [...new Set(FEATURES.map(f => f.category))]

  return (
    <PublicLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '4rem clamp(1.5rem,4vw,3rem) 6rem' }}>

      {/* Header */}
      <div style={{ maxWidth: 560, marginBottom: '3.5rem' }}>
        <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>Pricing</span>
        <h1 style={{
          fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
          fontSize: 'clamp(2rem, 3.5vw, 3rem)', letterSpacing: '-0.022em',
          color: '#111111', margin: '0 0 1rem', lineHeight: 0.98,
        }}>
          Design without limits.
        </h1>
        <p style={{ fontSize: 14, color: '#666666', fontFamily: 'Inter,sans-serif', lineHeight: 1.72, margin: 0 }}>
          Every plan includes the full AI pipeline — SegFormer, MiDaS, and Stable Diffusion.
          Start free and upgrade as your projects grow.
        </p>
      </div>

      {/* Plan headers */}
      <div style={{ overflowX: 'auto', marginLeft: '-1.5rem', marginRight: '-1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        <div style={{ minWidth: 600 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 0, marginBottom: '2rem', alignItems: 'end' }}>
            <div />
            {PLANS.map((plan, i) => (
              <motion.div key={plan.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4, ease }}
                style={{
                  padding: '1.5rem 1rem',
                  background: plan.highlight ? '#111111' : '#F5F4F0',
                  borderTop: `2px solid ${plan.highlight ? '#111111' : '#E5E5E5'}`,
                  marginLeft: plan.highlight ? -1 : 0,
                  marginRight: plan.highlight ? -1 : 0,
                  position: 'relative', zIndex: plan.highlight ? 2 : 1,
                }}>
                <p style={{
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.14em',
                  textTransform: 'uppercase', fontFamily: 'Inter,sans-serif',
                  color: plan.highlight ? 'rgba(255,255,255,0.55)' : '#888882',
                  margin: '0 0 6px',
                }}>
                  {plan.name}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
                    fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', letterSpacing: '-0.02em',
                    color: plan.highlight ? '#FAFAF8' : '#111111',
                  }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: 11, color: plan.highlight ? 'rgba(255,255,255,0.45)' : '#888882', fontFamily: 'Inter,sans-serif' }}>
                    {plan.period !== 'forever' ? `/ ${plan.period}` : plan.period}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#888882',
                  fontFamily: 'Inter,sans-serif', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                  {plan.desc}
                </p>
                <Link to={plan.ctaHref}
                  style={{
                    display: 'block', textAlign: 'center', padding: '9px 0', fontSize: 12,
                    fontFamily: 'Inter,sans-serif', fontWeight: 500, textDecoration: 'none',
                    border: '1px solid',
                    borderColor: plan.highlight ? 'rgba(255,255,255,0.3)' : '#111111',
                    color: plan.highlight ? '#FAFAF8' : '#111111',
                    background: plan.highlight ? 'rgba(255,255,255,0.1)' : 'transparent',
                    transition: 'all 0.25s',
                  }}
                  onMouseEnter={e => {
                    if (plan.highlight) e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                    else { e.currentTarget.style.background = '#111111'; e.currentTarget.style.color = '#FAFAF8' }
                  }}
                  onMouseLeave={e => {
                    if (plan.highlight) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                    else { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#111111' }
                  }}>
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Comparison table */}
          {categories.map(cat => (
            <div key={cat} style={{ marginBottom: '2rem' }}>
              {/* Category label */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderTop: '1px solid #E5E5E5', paddingTop: '0.75rem', paddingBottom: '0.5rem' }}>
                <span className="eyebrow">{cat}</span>
                <span /><span /><span />
              </div>

              {FEATURES.filter(f => f.category === cat).map((feature, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  borderBottom: '1px solid #F0EFEB',
                  background: i % 2 === 0 ? 'transparent' : '#F9F8F6',
                }}>
                  <div style={{ padding: '0.75rem 0', fontSize: 12, color: '#111111', fontFamily: 'Inter,sans-serif' }}>
                    {feature.label}
                  </div>
                  {PLANS.map(plan => (
                    <div key={plan.id} style={{ padding: '0.75rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Cell val={feature[plan.id]} planId={plan.id} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: '4rem', maxWidth: 680 }}>
        <span className="eyebrow" style={{ display: 'block', marginBottom: '1.5rem' }}>Frequently Asked</span>
        <div style={{ borderTop: '1px solid #E5E5E5' }}>
          {FAQS.map((faq, i) => <FAQ key={i} {...faq} />)}
        </div>
      </div>

      {/* CTA footer */}
      <div style={{
        marginTop: '4rem', padding: '2.5rem', background: '#111111',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1.5rem',
      }}>
        <div>
          <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '1.25rem',
            color: '#FAFAF8', letterSpacing: '-0.015em', margin: '0 0 4px' }}>
            Ready to start designing?
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter,sans-serif', margin: 0 }}>
            No credit card required on the free plan.
          </p>
        </div>
        <Link to="/register" className="btn-primary"
          style={{ background: '#FAFAF8', color: '#111111', borderColor: '#FAFAF8', fontSize: 12, padding: '11px 28px' }}>
          Get started free
        </Link>
      </div>
    </div>
    </PublicLayout>
  )
}
