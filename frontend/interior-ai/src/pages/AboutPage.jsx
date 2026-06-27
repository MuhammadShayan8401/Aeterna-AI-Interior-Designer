/**
 * AboutPage.jsx — Mission, AI pipeline diagram, tech stack, roadmap, team.
 */
import { motion } from 'framer-motion'
import { Github } from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'

const ease = [0.16, 1, 0.3, 1]

const PIPELINE = [
  {
    n: '01', name: 'SegFormer',
    role: 'Semantic Segmentation',
    detail: 'nvidia/segformer-b2-finetuned-ade-512-512',
    inputs: 'RGB room photograph (any resolution)',
    outputs: '150-class ADE20K pixel mask',
    body: 'SegFormer reads the input photograph at pixel level, assigning each region to one of 150 ADE20K scene categories — floor, wall, ceiling, sofa, window, door. The resulting mask tells the diffusion stage exactly which surfaces are structural and which are furnishings.',
    color: '#1F4E79',
  },
  {
    n: '02', name: 'MiDaS',
    role: 'Monocular Depth Estimation',
    detail: 'intel-isl/MiDaS v3.1 DPT-Large',
    inputs: 'RGB photograph',
    outputs: 'Per-pixel relative depth map',
    body: 'MiDaS estimates the relative depth of every pixel from a single camera — no stereo pair, no LiDAR. The depth map ensures generated furniture respects the room\'s actual spatial logic: objects further from the camera appear correctly scaled and occluded.',
    color: '#A36A00',
  },
  {
    n: '03', name: 'Preference ANN',
    role: 'Style & Strength Prediction',
    detail: '5-head MLP trained on user feedback',
    inputs: '32-dimensional user feature vector',
    outputs: 'Style, density, strength, satisfaction score',
    body: 'A 32-dimensional feature vector encoding room type, style, density, strength, and past rating signals is fed through a 3-layer MLP with LayerNorm. Five output heads predict preferred style, density, transformation strength, satisfaction probability, and aesthetic score. The model improves continuously as users rate results.',
    color: '#2F6F57',
  },
  {
    n: '04', name: 'Stable Diffusion v1.5',
    role: 'Image Generation',
    detail: 'runwayml/stable-diffusion-v1-5 · DPM-Solver++ · 30 steps · CFG 7.5',
    inputs: 'Engineered prompt + source image (img2img) or text only (empty room)',
    outputs: '1024px × 1024px design renders',
    body: 'The auto-built prompt and source image are passed to the SD v1.5 pipeline. DPM-Solver++ produces high-quality outputs in 30 denoising steps — roughly 5× faster than DDPM at equivalent quality. Multiple seeds are run in batch; the ANN ranks results by predicted preference score.',
    color: '#111111',
  },
]

const STACK = {
  Frontend:  ['React 18', 'Vite', 'Framer Motion', 'React Router', 'Tailwind CSS'],
  Backend:   ['FastAPI', 'Python 3.11', 'Motor (async MongoDB)', 'JWT Auth'],
  'AI / ML': ['SegFormer (HuggingFace)', 'MiDaS v3.1', 'Stable Diffusion v1.5', 'Custom ANN Engine', 'PyTorch'],
  Database:  ['MongoDB', 'GridFS (image storage)'],
}

const ROADMAP = [
  { q: 'Q1 2025', done: true,  items: ['Multi-room project support', 'Furniture detection model (DETR)', 'WebP output + thumbnail service'] },
  { q: 'Q2 2025', done: false, items: ['Stable Diffusion XL upgrade', 'ControlNet inpainting for targeted edits', 'Team workspaces'] },
  { q: 'Q3 2025', done: false, items: ['Real-time generation preview', 'Furniture catalogue integration', 'Mobile app (iOS / Android)'] },
  { q: 'Q4 2025', done: false, items: ['3D scene reconstruction', 'AR placement preview', 'REST API general availability'] },
]

function PipelineStage({ stage, i }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.1, duration: 0.5, ease }}
      style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>

      {/* Arrow connector (not for first) */}
      {i > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '3.5rem' }}>
          <div style={{ width: 1, height: 24, background: '#E5E5E5' }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Number */}
        <div style={{ paddingTop: 4 }}>
          <span style={{
            fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 400,
            fontSize: '2rem', color: '#E5E5E5', lineHeight: 1,
          }}>{stage.n}</span>
        </div>

        {/* Content */}
        <div style={{ borderLeft: `2px solid ${stage.color}`, paddingLeft: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', marginBottom: 6 }}>
            <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, fontSize: '1.125rem',
              color: '#111111', margin: 0, letterSpacing: '-0.012em' }}>
              {stage.name}
            </h3>
            <span style={{ fontSize: 11, color: stage.color, fontFamily: 'Inter,sans-serif', fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {stage.role}
            </span>
          </div>
          <p style={{ fontSize: 10, color: '#888882', fontFamily: 'JetBrains Mono, monospace', margin: '0 0 0.875rem' }}>
            {stage.detail}
          </p>
          <p style={{ fontSize: 13, color: '#666666', fontFamily: 'Inter,sans-serif', lineHeight: 1.7, margin: '0 0 0.875rem' }}>
            {stage.body}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div>
              <span style={{ fontSize: 10, fontFamily: 'Inter,sans-serif', fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.12em', color: '#888882', display: 'block', marginBottom: 4 }}>
                Input
              </span>
              <span style={{ fontSize: 11, color: '#111111', fontFamily: 'Inter,sans-serif' }}>{stage.inputs}</span>
            </div>
            <div>
              <span style={{ fontSize: 10, fontFamily: 'Inter,sans-serif', fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.12em', color: '#888882', display: 'block', marginBottom: 4 }}>
                Output
              </span>
              <span style={{ fontSize: 11, color: '#111111', fontFamily: 'Inter,sans-serif' }}>{stage.outputs}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function AboutPage() {
  return (
    <PublicLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '4rem clamp(1.5rem,4vw,3rem) 6rem' }}>

      {/* Hero split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem', marginBottom: '4rem' }}
        className="lg:grid-cols-2">
        <div>
          <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>About Aeterna</span>
          <h1 style={{
            fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
            fontSize: 'clamp(2rem, 3.2vw, 3rem)', letterSpacing: '-0.022em',
            color: '#111111', margin: '0 0 1.25rem', lineHeight: 0.98,
          }}>
            The AI behind<br />the redesign.
          </h1>
          <p style={{ fontSize: 14, color: '#666666', fontFamily: 'Inter,sans-serif', lineHeight: 1.75, margin: '0 0 0.875rem' }}>
            Aeterna is a final-year deep learning project built at Sir Syed University of Engineering & Technology, Karachi — a four-stage AI pipeline that reimagines interior spaces with structural precision and adaptive personal taste.
          </p>
          <p style={{ fontSize: 13, color: '#888882', fontFamily: 'Inter,sans-serif', lineHeight: 1.72, margin: '0 0 2rem' }}>
            The system chains semantic segmentation, monocular depth estimation, preference learning, and Stable Diffusion — not as a proof of concept, but as a production-quality platform with a real feedback loop that improves with use.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="https://github.com/MuhammadShayan8401" target="_blank" rel="noreferrer"
              className="btn-primary" style={{ fontSize: 12, padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Github size={13} /> View on GitHub
            </a>
            <Link to="/" className="btn-outline" style={{ fontSize: 12, padding: '9px 22px' }}>
              Try the Studio
            </Link>
          </div>
        </div>

        {/* Stats / mission panel */}
        <div style={{ background: '#111111', padding: '2.5rem' }}>
          <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 400, fontStyle: 'italic',
            fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.55, margin: '0 0 2rem',
            letterSpacing: '-0.01em' }}>
            "Good design is not about style — it is about understanding space, light, and how people want to live."
          </p>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', marginBottom: '2rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {[
              { n: '4', l: 'AI models in the pipeline' },
              { n: '150', l: 'ADE20K scene classes' },
              { n: '30', l: 'Diffusion steps per generation' },
              { n: '5×', l: 'Faster than DDPM baseline' },
            ].map(({ n, l }) => (
              <div key={l}>
                <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500,
                  fontSize: '2rem', color: '#FAFAF8', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>
                  {n}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter,sans-serif', margin: 0 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '2.5rem',
          paddingBottom: '1rem', borderBottom: '1px solid #E5E5E5' }}>
          <span className="eyebrow">AI Pipeline</span>
          <span style={{ fontSize: 12, color: '#888882', fontFamily: 'Inter,sans-serif' }}>Four-stage generation workflow</span>
        </div>
        <div style={{ maxWidth: 680 }}>
          {PIPELINE.map((stage, i) => <PipelineStage key={i} stage={stage} i={i} />)}
        </div>
      </div>

      {/* Tech stack */}
      <div style={{ marginBottom: '4rem' }}>
        <span className="eyebrow" style={{ display: 'block', marginBottom: '1.75rem' }}>Technology Stack</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}
          className="lg:grid-cols-4">
          {Object.entries(STACK).map(([cat, items]) => (
            <div key={cat}>
              <h4 style={{ fontSize: 11, fontWeight: 500, color: '#111111', fontFamily: 'Inter,sans-serif',
                letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 0.875rem',
                paddingBottom: '0.625rem', borderBottom: '1px solid #E5E5E5' }}>
                {cat}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {items.map(item => (
                  <li key={item} style={{ fontSize: 12, color: '#666666', fontFamily: 'Inter,sans-serif' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <div style={{ marginBottom: '3rem' }}>
        <span className="eyebrow" style={{ display: 'block', marginBottom: '1.75rem' }}>Quarterly Roadmap</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '0' }}
          className="sm:grid-cols-4">
          {ROADMAP.map((period, i) => (
            <div key={i} style={{
              borderLeft: '1px solid #E5E5E5', paddingLeft: '1.5rem', paddingBottom: '2rem',
              paddingRight: '1rem', position: 'relative',
            }}>
              <div style={{
                position: 'absolute', left: -4, top: 2,
                width: 7, height: 7, borderRadius: '50%',
                background: period.done ? '#2F6F57' : '#E5E5E5',
                border: `1px solid ${period.done ? '#2F6F57' : '#CCCCCC'}`,
              }} />
              <p style={{ fontSize: 11, fontWeight: 600, color: period.done ? '#2F6F57' : '#111111',
                fontFamily: 'Inter,sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase',
                margin: '0 0 0.875rem' }}>
                {period.q} {period.done && '✓'}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {period.items.map(item => (
                  <li key={item} style={{ fontSize: 12, color: period.done ? '#888882' : '#666666',
                    fontFamily: 'Inter,sans-serif', lineHeight: 1.45,
                    textDecoration: period.done ? 'line-through' : 'none' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Team credit */}
      <div style={{ background: '#F5F4F0', padding: '2rem', borderTop: '1px solid #E5E5E5' }}>
        <span className="eyebrow" style={{ display: 'block', marginBottom: '0.875rem' }}>Team</span>
        <p style={{ fontSize: 13, color: '#666666', fontFamily: 'Inter,sans-serif', lineHeight: 1.7, margin: 0 }}>
          Aeterna was designed and engineered by students at Sir Syed University of Engineering & Technology, Karachi,
          as a final-year deep learning capstone project. The system was built to demonstrate a complete, production-quality
          AI pipeline — from data ingestion and model fine-tuning to adaptive personalisation and generative imaging.
        </p>
      </div>
      </div>
    </PublicLayout>
  )
}
