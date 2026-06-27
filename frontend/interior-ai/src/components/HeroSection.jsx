/**
 * HeroSection.jsx — Cinematic editorial hero, not a SaaS landing block.
 *
 * Imagery: the two visual blocks below are warm-toned placeholder
 * compositions (CSS gradient + grain, no stock photography hotlinked —
 * avoids both copyright risk and dependency on third-party CDNs).
 * Replace `--hero-image-a` / `--hero-image-b` background declarations
 * with your own editorial photography before launch; everything else
 * (layout, typography, motion) is final.
 */
import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'

function PlaceholderFrame({ className, style, label }) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(155deg, #EFE7DA 0%, #E2D6C3 55%, #D8C9B2 100%)',
        ...style,
      }}
    >
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27/%3E%3C/filter%3E%3Crect width=%27120%27 height=%27120%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
      }} />
      <span className="absolute bottom-3 right-4 text-[10px] tracking-wide text-charcoal/30 font-sans">
        {label}
      </span>
    </div>
  )
}

export default function HeroSection() {
  return (
    <section className="relative pt-6">
      {/* Eyebrow */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
        className="eyebrow mb-8"
      >
        Aeterna — Interior Design
      </motion.div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Headline + copy + CTA */}
        <div className="col-span-12 lg:col-span-7">
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="display-1 text-charcoal"
            style={{ fontSize: 'clamp(3.2rem, 7vw, 6.4rem)' }}
          >
            Reimagine
            <br />
            every space.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.8 }}
            className="body-editorial mt-8 max-w-md"
            style={{ fontSize: 15 }}
          >
            Upload a room. Walk away with a fully reimagined interior —
            considered, photoreal, and entirely your own.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.8 }}
            className="mt-10"
          >
            <a href="#generate" className="btn-charcoal">
              Start Your Project
            </a>
          </motion.div>
        </div>

        {/* Primary hero image */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 1.1 }}
          className="col-span-12 lg:col-span-5"
        >
          <PlaceholderFrame className="aspect-[4/5]" label="Editorial photography placeholder" />
        </motion.div>
      </div>

      {/* Secondary image strip + credibility line + scroll cue */}
      <div className="grid grid-cols-12 gap-6 items-end mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.9 }}
          className="col-span-12 sm:col-span-7 lg:col-span-6"
        >
          <PlaceholderFrame className="aspect-[16/9]" label="Transformation photography placeholder" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.8 }}
          className="col-span-12 sm:col-span-5 lg:col-span-5 lg:col-start-8 flex items-center justify-between"
        >
          <p className="body-editorial max-w-[15rem]" style={{ fontSize: 13 }}>
            Considered design, generated in moments — refined by what you respond to.
          </p>
          <a href="#generate" className="flex-shrink-0 w-11 h-11 rounded-full border border-charcoal/20
            flex items-center justify-center hover:border-charcoal transition-colors duration-500">
            <ArrowDown size={14} className="text-charcoal" strokeWidth={1.5} />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
