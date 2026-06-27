/**
 * AIArchitecture.jsx
 * Pipeline visualization: Room Image → SegFormer → MiDaS → ANN → Stable Diffusion → Outputs
 */
import { motion } from 'framer-motion'
import { ImagePlus, ScanLine, Layers, BrainCircuit, Wand2, LayoutGrid, ChevronRight } from 'lucide-react'

const NODES = [
  { id: 'input',     label: 'Room Image',          sub: 'Source photograph',        Icon: ImagePlus,   color: '#948D81' },
  { id: 'segformer', label: 'SegFormer',            sub: 'Semantic segmentation',    Icon: ScanLine,     color: '#B3654A' },
  { id: 'midas',     label: 'MiDaS',                sub: 'Depth estimation',         Icon: Layers,       color: '#0F766E' },
  { id: 'ann',       label: 'ANN Engine',           sub: 'Preference inference',     Icon: BrainCircuit, color: '#946A33' },
  { id: 'sd',        label: 'Stable Diffusion',     sub: 'img2img generation',       Icon: Wand2,        color: '#5C7355' },
  { id: 'output',    label: 'Redesigned Outputs',   sub: 'Ranked by preference',     Icon: LayoutGrid,   color: '#1A1815' },
]

export default function AIArchitecture({ activeStep = -1 }) {
  return (
    <section id="architecture" className="scroll-mt-20 space-y-6">
      <div className="flex items-center gap-3">
        <span className="label-xs text-ink-200">03</span>
        <span className="label-xs">AI Pipeline Architecture</span>
        <div className="flex-1 h-px bg-ink-100" />
      </div>

      {/* Desktop horizontal layout */}
      <div className="hidden lg:flex items-center justify-between rounded-xl p-6 overflow-x-auto bg-surface border border-ink-100">
        {NODES.map((node, i) => {
          const { Icon, label, sub, color, id } = node
          const isActive = activeStep === i
          return (
            <div key={id} className="flex items-center">
              <div className="flex flex-col items-center gap-2.5 relative" style={{ minWidth: 90 }}>
                {/* Icon box */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 border"
                  style={{
                    background: isActive ? `${color}14` : '#FFFFFF',
                    borderColor: isActive ? color : '#E2DFDA',
                  }}
                >
                  <Icon size={18} color={color} />
                </div>

                {/* Labels */}
                <div className="text-center">
                  <p className="text-xs font-semibold text-ink-900" style={{ fontSize: 11 }}>{label}</p>
                  <p className="label-xs mt-0.5" style={{ fontSize: 9 }}>{sub}</p>
                </div>
              </div>

              {/* Connector arrow between nodes */}
              {i < NODES.length - 1 && (
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: 28 }}>
                  <div className="h-px flex-1 bg-ink-100" />
                  <ChevronRight size={10} className="text-ink-200 flex-shrink-0" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile vertical layout */}
      <div className="lg:hidden rounded-xl p-5 space-y-3 bg-surface border border-ink-100">
        {NODES.map(({ Icon, label, sub, color, id }, i) => (
          <div key={id}>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-ink-100">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border"
                style={{ background: `${color}10`, borderColor: `${color}40` }}>
                <Icon size={15} color={color} />
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-900">{label}</p>
                <p className="label-xs mt-0.5">{sub}</p>
              </div>
              <span className="ml-auto label-xs px-2 py-0.5 rounded-md border"
                style={{ color, borderColor: `${color}40` }}>
                Stage {i+1}
              </span>
            </div>
            {i < NODES.length - 1 && (
              <div className="flex justify-center py-1">
                <div className="w-px h-4 bg-ink-100" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detail rows */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Input Format',    value: 'JPG · PNG · WEBP image' },
          { label: 'Segmentation',    value: '150-class ADE20K scene parsing' },
          { label: 'Depth Output',    value: 'Per-pixel relative depth [0,1]' },
          { label: 'ANN Input',       value: '32-dimensional feature vector' },
          { label: 'SD Scheduler',    value: 'DPM-Solver++ · 30 steps · CFG 7.5' },
          { label: 'Output Ranking',  value: 'ANN preference score ordering' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg px-3.5 py-3 bg-surface border border-ink-100">
            <p className="label-xs mb-1">{label}</p>
            <p className="text-xs text-ink-600">{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
