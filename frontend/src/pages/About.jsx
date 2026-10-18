/** About — short and honest. */
import { Link } from 'react-router-dom'
import { Github } from 'lucide-react'

const H = { fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 500, letterSpacing: '-0.015em' }
const P = { fontSize: 14, lineHeight: 1.75, color: '#555', fontFamily: 'Inter, sans-serif', margin: '0 0 1rem' }

export default function About() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem clamp(1.5rem,4vw,3rem) 5rem' }}>
      <span className="eyebrow">About</span>
      <h1 style={{ ...H, fontSize: 'clamp(2rem,4vw,3rem)', margin: '6px 0 1.5rem', lineHeight: 1.05 }}>
        Interior ideas, in minutes.
      </h1>
      <p style={P}>
        Aeterna is a deep learning project from Sir Syed University of Engineering &amp; Technology, Karachi.
        It helps you picture a room in a new style before you spend anything on it.
      </p>

      <h2 style={{ ...H, fontSize: '1.4rem', margin: '2.25rem 0 .75rem' }}>What it does</h2>
      <p style={P}><b>Redesign a photo.</b> Aeterna finds the furniture in your picture and restyles the room while keeping its layout.
        Choose how much changes: subtle, balanced or bold.</p>
      <p style={P}><b>Design from scratch.</b> Pick a room, style, lighting and colours and get new concepts from text alone.</p>
      <p style={P}><b>Learn your taste.</b> Likes and dislikes are saved to your account and used to suggest styles you tend to prefer.</p>

      <h2 style={{ ...H, fontSize: '1.4rem', margin: '2.25rem 0 .75rem' }}>Good to know</h2>
      <p style={P}>Designs come from an AI image model, so details can look odd — treat them as inspiration, not a floor plan.
        Generation runs on a free shared server, so it takes a minute or two and may be busy at peak times.</p>
      <p style={P}>You need a free account to generate designs. Passwords are stored as Argon2 hashes, never in clear text. Your photos are used only to generate your designs and are not kept — your history keeps the generated images and a small copy of the photo for the before/after view.</p>

      <h2 style={{ ...H, fontSize: '1.4rem', margin: '2.25rem 0 .75rem' }}>Under the hood</h2>
      <p style={P}>React front end · Gradio API on Hugging Face Spaces · Stable Diffusion 1.5 with LCM-LoRA for fast generation ·
        SegFormer for spotting furniture.</p>

      <div style={{ display: 'flex', gap: 10, marginTop: '2rem', flexWrap: 'wrap' }}>
        <Link to="/studio" className="btn-primary">Open Studio</Link>
        <a className="btn-outline" href="https://github.com/MuhammadShayan8401" target="_blank" rel="noreferrer"><Github size={14} /> GitHub</a>
      </div>
    </div>
  )
}
