/**
 * Capabilities.jsx — "Our Services," reimagined as visual narrative.
 *
 * Replaces a feature-grid treatment of the AI pipeline (segmentation,
 * depth, style prediction, generation) with alternating editorial rows —
 * each capability gets room to breathe rather than competing for space
 * in identical cards. The underlying technical pipeline is unchanged
 * (see AIArchitecture.jsx for the literal diagram, now linked quietly
 * from the footer rather than sitting in the main scroll).
 */
import { motion } from 'framer-motion'

function Placeholder({ label }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden" style={{
      background: 'linear-gradient(160deg, #F1EAE0 0%, #E2D6C3 100%)',
    }}>
      <span className="absolute bottom-3 right-4 text-[10px] tracking-wide text-charcoal/30 font-sans">
        {label}
      </span>
    </div>
  )
}

const ROWS = [
  {
    index: '01',
    title: 'Understanding the room',
    body: 'Every photograph is read at the level of architecture — walls, openings, structural lines — before a single design decision is made. Nothing is generated blind.',
    imageLabel: 'Segmentation — placeholder',
  },
  {
    index: '02',
    title: 'Reading depth and proportion',
    body: 'Spatial relationships are mapped so new furnishings sit the room correctly — proportion, scale, and perspective considered, not assumed.',
    imageLabel: 'Depth analysis — placeholder',
  },
  {
    index: '03',
    title: 'A style that learns you',
    body: 'Preferences are inferred from what you respond to, not a fixed questionnaire — each rating refines what comes next, quietly, in the background.',
    imageLabel: 'Style prediction — placeholder',
  },
  {
    index: '04',
    title: 'The redesign, realized',
    body: 'A photoreal reimagining of your space, generated in moments and refined until it feels considered rather than computed.',
    imageLabel: 'Generation — placeholder',
  },
]

export default function Capabilities() {
  return (
    <section id="capabilities" className="scroll-mt-16 py-8">
      <div className="flex items-end justify-between mb-16">
        <h2 className="display-2 text-charcoal" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>
          How the room
          <br />
          comes together.
        </h2>
        <div className="hidden sm:block w-20 rule" />
      </div>

      <div className="space-y-24">
        {ROWS.map((row, i) => (
          <motion.div
            key={row.index}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className={`grid grid-cols-12 gap-8 items-center ${i % 2 === 1 ? 'lg:[direction:rtl]' : ''}`}
          >
            <div className="col-span-12 lg:col-span-5" style={{ direction: 'ltr' }}>
              <Placeholder label={row.imageLabel} />
            </div>
            <div className="col-span-12 lg:col-span-6 lg:col-start-7" style={{ direction: 'ltr' }}>
              <span className="step-numeral text-5xl">{row.index}</span>
              <h3 className="display-2 text-charcoal mt-4 mb-5" style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)' }}>
                {row.title}
              </h3>
              <p className="body-editorial max-w-md" style={{ fontSize: 15 }}>
                {row.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
