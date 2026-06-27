/**
 * PublicLayout.jsx — Shell for all public pages (Home, Design, Pricing, About).
 * Renders PublicNav at the top + Footer at the bottom.
 * Children slot in the body. paddingTop accounts for the 60px fixed nav.
 */
import PublicNav from './PublicNav'
import Footer    from './Footer'

export default function PublicLayout({ children, noFooter = false }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', flexDirection: 'column' }}>
      <PublicNav />
      <main style={{ flex: 1, paddingTop: 60 }}>
        {children}
      </main>
      {!noFooter && <Footer />}
    </div>
  )
}
