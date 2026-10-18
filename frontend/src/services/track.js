/** track — funnel events for Plausible (no-op unless VITE_PLAUSIBLE_DOMAIN is set). Never sends personal data. */
export function track(name, props) {
  try { window.plausible?.(name, props ? { props } : undefined) } catch { /* analytics must never break the app */ }
}
