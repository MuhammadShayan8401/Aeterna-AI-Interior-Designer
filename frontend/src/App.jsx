/** Home — landing page. No sign-up, no pricing: straight to the Studio. */
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { useT } from './i18n'
import LandingHero         from './components/landing/LandingHero'
import LandingBeforeAfter  from './components/landing/LandingBeforeAfter'
import LandingFeatures     from './components/landing/LandingFeatures'
import LandingHowItWorks   from './components/landing/LandingHowItWorks'
import LandingStyleGallery from './components/landing/LandingStyleGallery'
import Faq from './components/landing/Faq'

const W = 'clamp(1.5rem, 4vw, 3rem)'

export default function Home() {
  const { user } = useAuth()
  const { t } = useT()
  return (
    <>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: `0 ${W}` }}>
        <LandingHero />
        <LandingBeforeAfter />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingStyleGallery />
        <Faq />
      </div>
      <section style={{ borderTop: '1px solid #E5E5E5', background: '#111', color: '#FAFAF8' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: `4.5rem ${W}`, textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
            fontSize: 'clamp(1.9rem, 3.4vw, 3rem)', letterSpacing: '-0.02em', margin: '0 0 1.5rem' }}>
            {t('Ready to see your room differently?')}
          </h2>
          <Link to={user ? '/studio' : '/register'} style={{ display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 30px', background: '#FAFAF8', color: '#111', fontSize: 13, fontWeight: 500,
            textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
            {t(user ? 'Open the Studio' : 'Create your free account')} <ArrowRight size={14} />
          </Link>
          <p style={{ fontSize: 12, color: 'rgba(250,250,248,0.5)', margin: '1.25rem 0 0',
            fontFamily: 'Inter, sans-serif' }}>{t('Free · takes ten seconds')}</p>
        </div>
      </section>
    </>
  )
}
