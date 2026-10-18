import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider, RequireAuth } from './context/AuthContext'
import Home from './App'
import Studio from './pages/Studio'
import History from './pages/History'
import About from './pages/About'
import AuthPage from './pages/AuthPage'
import Account from './pages/Account'
import Verify from './pages/Verify'
import Forgot from './pages/Forgot'
import Reset from './pages/Reset'
import Pricing from './pages/Pricing'
import Legal from './pages/Legal'
import Share from './pages/Share'
import { LangProvider } from './i18n'
import './index.css'

// Remember a referral code from any link (#/register?ref=abcd1234 or ?ref=… before the hash).
try {
  const r = (location.hash + location.search).match(/[?&]ref=([a-f0-9]{4,8})/i)
  if (r) localStorage.setItem('aeterna.ref', r[1].toLowerCase())
} catch { /* storage unavailable */ }

// Optional privacy-friendly analytics (Plausible) and error reporting hooks — only when configured.
const PLAUSIBLE = import.meta.env.VITE_PLAUSIBLE_DOMAIN
if (PLAUSIBLE) {
  const s = document.createElement('script'); s.defer = true; s.dataset.domain = PLAUSIBLE
  s.src = 'https://plausible.io/js/script.js'; document.head.appendChild(s)
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments) }
}

const SENTRY = import.meta.env.VITE_SENTRY_DSN
if (SENTRY) {
  import('@sentry/browser').then((S) => S.init({ dsn: SENTRY, tracesSampleRate: 0, sendDefaultPii: false, release: import.meta.env.VITE_RELEASE }))
    .catch(() => { /* reporting is best-effort */ })
}

// HashRouter: works on any static host (no server rewrites needed).
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
   <ErrorBoundary>
    <HashRouter>
      <LangProvider>
      <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/studio" element={<RequireAuth><Studio /></RequireAuth>} />
          <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/s/:id" element={<Share />} />
          <Route path="/terms" element={<Legal doc="terms" />} />
          <Route path="/privacy" element={<Legal doc="privacy" />} />
          <Route path="/refunds" element={<Legal doc="refunds" />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      </AuthProvider>
      </LangProvider>
      <Toaster position="bottom-right" toastOptions={{ style: {
        background: '#111', color: '#FAFAF8', borderRadius: 0, fontSize: 12, fontFamily: 'Inter,sans-serif' } }} />
    </HashRouter>
   </ErrorBoundary>
  </React.StrictMode>
)
