/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Editorial display face for headlines — the typography IS the
        // luxury signal, not an accent color or gradient.
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        // Clean grotesk for body copy / UI — quiet, doesn't compete with headlines.
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        // Reserved for the rare technical/data screens (ANN metrics) only —
        // never appears in the public marketing flow.
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Warm neutral palette — ivory/sand/stone/charcoal. No blue, no
        // purple, no "AI" accent color anywhere in the marketing surface.
        paper:   '#FFFFFF',
        ivory:   '#FAF7F2',
        sand:    '#F1EAE0',
        surface: '#FAF7F2',   // alias → ivory, for components built against the earlier token name
        muted:   '#F1EAE0',   // alias → sand
        stone: {
          DEFAULT: '#8C8478',
          100: '#E7E0D5',
          200: '#D5CCBE',
          400: '#A39A8B',
          600: '#6B6256',
        },
        charcoal: {
          DEFAULT: '#1F1D1A',
          900: '#15130F',
        },
        // Single muted clay accent — used sparingly (a rule, a hover
        // underline) — never as a gradient, never as a "brand AI" color.
        clay: '#B3654A',
        success: '#5C7355',
        warning: '#B3654A',
        danger:  '#A23E2E',
        // ── Backward-compatible aliases ──────────────────────────────────
        // A number of functional/tool components (Sidebar internals,
        // ResultCard, ANN dashboards, etc.) were built against an earlier
        // `ink`/`accent` token set. Rather than hand-edit every file's
        // Tailwind class names, alias them onto the new warm palette so
        // `text-ink-400`, `bg-accent-50`, etc. keep resolving instead of
        // silently dropping to unstyled (Tailwind doesn't error on
        // unknown color names — it just emits no CSS for them, which is
        // a worse failure mode than a slightly different shade).
        ink: {
          DEFAULT: '#1F1D1A',
          50:  '#FAF7F2',
          100: '#E7E0D5',
          200: '#D5CCBE',
          400: '#A39A8B',
          600: '#6B6256',
          900: '#1F1D1A',
        },
        accent: {
          50:  '#FBF3E9',
          100: '#E8D2B0',
          400: '#C17C5C',
          500: '#B3654A',
          600: '#946A33',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(31,29,26,0.04)',
        lifted: '0 24px 60px rgba(31,29,26,0.10)',
      },
      letterSpacing: {
        tightest: '-0.04em',
        wide2: '0.16em',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
