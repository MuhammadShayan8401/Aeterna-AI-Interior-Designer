/**
 * ProcessSection.jsx — "How it works," as editorial numerals rather than
 * icon-and-card process steps. Maps directly to the real product flow
 * (upload → analyze → generate → download) — presentation only changes.
 */
import { motion } from 'framer-motion'

const STEPS = [
  { n: '01', title: 'Upload', body: 'A single photograph of the room as it stands today — no preparation required.' },
  { n: '02', title: 'Analyze', body: 'Structure, depth, and your own taste are read together before anything is generated.' },
  { n: '03', title: 'Generate', body: 'Several considered variations are produced, each weighed against what you tend to prefer.' },
  { n: '04', title: 'Take it with you', body: 'Download the redesign in full resolution — yours to keep, share, or build from.' },
]

export default function ProcessSection() {
  return (
    <section id="process" className="scroll-mt-16 py-8">
      <div className="mb-16">
        <span className="eyebrow">The Process</span>
        <h2 className="display-2 text-charcoal mt-4" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>
          Four steps. No friction.
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.n}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="step-numeral text-6xl block mb-6">{step.n}</span>
            <div className="rule w-10 mb-6" />
            <h3 className="text-xl text-charcoal mb-3" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
              {step.title}
            </h3>
            <p className="body-editorial" style={{ fontSize: 14 }}>
              {step.body}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
