import { Github } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandLockup } from './landing/Brand'

const SECTIONS = [
  {
    title: 'Product',
    links: [
      { label: 'Design Studio',    to: '/design-room' },
      { label: 'Design Room',      to: '/design-room'      },
      { label: 'Style Gallery',    scroll: 'style-gallery' },
      { label: 'How It Works',     scroll: 'how-it-works'  },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'System Status',    scroll: 'system-status' },
      { label: 'AI Architecture',  scroll: 'architecture'  },
      { label: 'About',            to: '/about'            },
      { label: 'Pricing',          to: '/pricing'          },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign In',          to: '/login'            },
      { label: 'Register',         to: '/register'         },
      { label: 'Dashboard',        to: '/dashboard'        },
      { label: 'History',          to: '/history'          },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'GitHub',           href: 'https://github.com/MuhammadShayan8401', external: true },
      { label: 'Contact',          href: 'mailto:contact@aeterna.ai',             external: true },
    ],
  },
]

export default function Footer({ onOpenAnalytics, onOpenANNPerf }) {
  const scroll = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const linkStyle = {
    fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#888882',
    textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer',
    padding: 0, lineHeight: 1.5, display: 'block', transition: 'color 0.2s',
  }

  return (
    <footer style={{ borderTop: '1px solid #E5E5E5', background: '#F5F4F0' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '4rem clamp(1.5rem, 4vw, 3rem) 2.5rem' }}>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2.5rem', marginBottom: '3rem' }}
          className="sm:grid-cols-5">

          {/* Brand */}
          <div className="sm:col-span-1" style={{ gridColumn: 'span 2' }}>
            <BrandLockup size={17} />
            <p style={{ fontSize: 12, color: '#888882', fontFamily: 'Inter, sans-serif', lineHeight: 1.7,
              margin: '1.125rem 0', maxWidth: 220 }}>
              An AI-powered interior design platform — precise, adaptive, and grounded in real spatial understanding.
            </p>
            <a href="https://github.com/MuhammadShayan8401" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
                color: '#888882', textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#111111'}
              onMouseLeave={e => e.currentTarget.style.color = '#888882'}>
              <Github size={12} /> MuhammadShayan8401
            </a>
          </div>

          {/* Link columns */}
          {SECTIONS.map(section => (
            <div key={section.title}>
              <span className="eyebrow" style={{ display: 'block', marginBottom: '0.875rem' }}>
                {section.title}
              </span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {section.links.map(link => (
                  <li key={link.label}>
                    {link.external ? (
                      <a href={link.href} target="_blank" rel="noreferrer" style={linkStyle}
                        onMouseEnter={e => e.currentTarget.style.color = '#111111'}
                        onMouseLeave={e => e.currentTarget.style.color = '#888882'}>
                        {link.label}
                      </a>
                    ) : link.to ? (
                      <Link to={link.to} style={linkStyle}
                        onMouseEnter={e => e.currentTarget.style.color = '#111111'}
                        onMouseLeave={e => e.currentTarget.style.color = '#888882'}>
                        {link.label}
                      </Link>
                    ) : (
                      <button onClick={() => scroll(link.scroll)} style={linkStyle}
                        onMouseEnter={e => e.currentTarget.style.color = '#111111'}
                        onMouseLeave={e => e.currentTarget.style.color = '#888882'}>
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: '#E5E5E5', margin: '0 0 1.75rem' }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <p style={{ fontSize: 11, color: '#AAAAAA', fontFamily: 'Inter, sans-serif', margin: 0 }}>
            © {new Date().getFullYear()} Aeterna Studio · Final Year Project · SSUET, Karachi
          </p>
          <p style={{ fontSize: 11, color: '#AAAAAA', fontFamily: 'Inter, sans-serif', margin: 0 }}>
            SegFormer · MiDaS · Stable Diffusion v1.5 · Preference ANN
          </p>
        </div>
      </div>
    </footer>
  )
}
