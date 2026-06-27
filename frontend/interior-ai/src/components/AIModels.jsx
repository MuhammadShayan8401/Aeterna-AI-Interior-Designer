/**
 * AIModels.jsx
 * Professional SaaS-style cards explaining each AI model in the pipeline.
 * SegFormer · MiDaS · ANN · Stable Diffusion
 */
import { motion } from 'framer-motion'
import { ScanLine, Layers, BrainCircuit, Wand2, ChevronRight } from 'lucide-react'

const MODELS = [
  {
    key:    'segformer',
    Icon:   ScanLine,
    color:  '#B3654A',
    name:   'SegFormer',
    role:   'Semantic Segmentation',
    badge:  'Computer Vision',
    description:
      'Transformer-based encoder-decoder that assigns a semantic class label to every pixel in the room image. Identifies walls, floors, ceilings, furniture, windows, and 147 additional ADE20K indoor scene categories — building a complete structural map of the space.',
    specs: [
      { label: 'Architecture',  value: 'Mix Transformer (MiT-B0)' },
      { label: 'Dataset',       value: 'ADE20K — 150 classes' },
      { label: 'Output',        value: 'Pixel-wise segmentation map' },
      { label: 'Role in pipeline', value: 'Scene understanding & furniture detection' },
    ],
  },
  {
    key:    'midas',
    Icon:   Layers,
    color:  '#0F766E',
    name:   'MiDaS',
    role:   'Monocular Depth Estimation',
    badge:  'Spatial Intelligence',
    description:
      'Estimates per-pixel relative depth from a single RGB image with no stereo camera or lidar sensor required. The resulting depth map encodes the 3-D spatial structure of the room, guiding the generative model to preserve perspective, proportions, and spatial coherence during redesign.',
    specs: [
      { label: 'Architecture',  value: 'DPT / Vision Transformer' },
      { label: 'Training data', value: 'Multi-dataset mixing strategy' },
      { label: 'Output',        value: 'Relative depth map [0, 1]' },
      { label: 'Role in pipeline', value: 'Spatial structure & perspective preservation' },
    ],
  },
  {
    key:    'ann',
    Icon:   BrainCircuit,
    color:  '#946A33',
    name:   'ANN Recommendation Engine',
    role:   'Adaptive Preference Learning',
    badge:  'Locally Trained',
    description:
      'A locally trained multi-task Artificial Neural Network that learns individual user taste from rated generations. It processes a 32-dimensional feature vector encoding room type, design style, depth statistics, and session feedback history to predict optimal style, furniture density, transformation strength, satisfaction probability, and aesthetic quality score.',
    specs: [
      { label: 'Architecture',  value: 'MLP · 32 → 64 → 64 · 5 output heads' },
      { label: 'Training data', value: 'User feedback sessions' },
      { label: 'Outputs',       value: 'Style, density, strength, satisfaction, aesthetic' },
      { label: 'Role in pipeline', value: 'Parameter optimisation & prompt enhancement' },
    ],
  },
  {
    key:    'sd',
    Icon:   Wand2,
    color:  '#5C7355',
    name:   'Stable Diffusion v1.5',
    role:   'Generative Image Synthesis',
    badge:  'Latent Diffusion Model',
    description:
      'Performs img2img transformation — conditioning on the original room photo to preserve structural layout while reimagining the aesthetic according to the ANN-enhanced text prompt. DPM-Solver++ multistep scheduler achieves high-quality outputs in 30 inference steps. Multiple seeds produce design variations ranked by predicted preference score.',
    specs: [
      { label: 'Architecture',  value: 'Latent Diffusion Model (LDM)' },
      { label: 'Scheduler',     value: 'DPM-Solver++ · 30 steps' },
      { label: 'Guidance',      value: 'CFG scale 7.5 · img2img pipeline' },
      { label: 'Role in pipeline', value: 'Photorealistic interior generation' },
    ],
  },
]

export default function AIModels() {
  return (
    <section id="ai-models" className="scroll-mt-20 space-y-6">
      {/* Heading */}
      <div className="flex items-center gap-3">
        <span className="label-xs text-ink-200">04</span>
        <span className="label-xs">AI Models</span>
        <div className="flex-1 h-px bg-ink-100" />
        <span className="label-xs">4 components</span>
      </div>

      <p className="text-sm text-ink-600 max-w-2xl leading-relaxed">
        Each stage of the Aeterna pipeline is powered by a specialised deep learning model.
        Together they form an end-to-end system that understands, reasons about, and redesigns interior spaces.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {MODELS.map(({ key, Icon, color, name, role, badge, description, specs }, i) => (
          <div
            key={key}
            className="rounded-xl p-5 flex flex-col gap-4 transition-shadow duration-200 cursor-default bg-white border border-ink-100 card-hover"
          >
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border"
                  style={{ background: `${color}10`, borderColor: `${color}35` }}>
                  <Icon size={17} color={color} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">{name}</h3>
                  <p className="label-xs mt-0.5">{role}</p>
                </div>
              </div>
              <span className="label-xs px-2 py-1 rounded-lg flex-shrink-0 border"
                style={{ borderColor: `${color}35`, color }}>
                {badge}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-ink-600 leading-relaxed">
              {description}
            </p>

            {/* Spec grid */}
            <div className="grid grid-cols-1 gap-2 pt-1 border-t border-ink-100">
              {specs.map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <span className="label-xs flex-shrink-0">{label}</span>
                  <span className="text-xs text-right text-ink-900 font-medium" style={{ fontSize: 11 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
