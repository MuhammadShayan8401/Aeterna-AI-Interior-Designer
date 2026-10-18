/** ErrorBoundary — shows a friendly page instead of a blank screen, and reports to Sentry when it is configured. */
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error, info) {
    console.error(error)
    if (import.meta.env.VITE_SENTRY_DSN) import('@sentry/browser').then((S) => S.captureException(error, { extra: { componentStack: info?.componentStack } })).catch(() => {})
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" style={{ maxWidth: 520, margin: '18vh auto', padding: '0 1.5rem', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500 }}>Something went wrong</h1>
        <p style={{ color: '#666', fontSize: 14 }}>The page hit an unexpected problem. Reloading usually fixes it.</p>
        <button className="btn-primary" onClick={() => location.reload()}>Reload</button>
      </div>
    )
  }
}
