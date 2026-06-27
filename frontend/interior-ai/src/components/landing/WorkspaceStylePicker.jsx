/**
 * WorkspaceStylePicker.jsx — Visual style selection grid for the workspace.
 * Each style shows a warm editorial tone block instead of text buttons,
 * making the choice feel like picking a design direction, not a dropdown.
 */
import { motion } from 'framer-motion'

const STYLES = [
  { id: 'modern',       label: 'Modern',        img: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=200&q=70&auto=format&fit=crop' },
  { id: 'luxury',       label: 'Luxury',        img: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=200&q=70&auto=format&fit=crop' },
  { id: 'scandinavian', label: 'Scandinavian',  img: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&q=70&auto=format&fit=crop' },
  { id: 'japandi',      label: 'Japandi',       img: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=200&q=70&auto=format&fit=crop' },
  { id: 'contemporary', label: 'Contemporary',  img: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=200&q=70&auto=format&fit=crop' },
  { id: 'industrial',   label: 'Industrial',    img: 'https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=200&q=70&auto=format&fit=crop' },
  { id: 'minimalist',   label: 'Minimalist',    img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=200&q=70&auto=format&fit=crop' },
]

export default function WorkspaceStylePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {STYLES.map(style => {
        const active = value === style.id
        return (
          <motion.button
            key={style.id}
            onClick={() => onChange(style.id)}
            whileTap={{ scale: 0.97 }}
            className="relative overflow-hidden text-left"
            style={{
              border: active ? '1.5px solid #1F1D1A' : '1px solid #E7E0D5',
              outline: 'none',
            }}
          >
            <div
              style={{
                height: 44,
                background: '#E8E2DA',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <img
                src={style.img}
                alt={style.label}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div
              className="px-2 py-1.5"
              style={{ background: active ? '#1F1D1A' : '#FAFAF9' }}
            >
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#FFFFFF' : '#6B6256',
                  letterSpacing: '0.01em',
                  display: 'block',
                  textAlign: 'center',
                }}
              >
                {style.label}
              </span>
            </div>
          </motion.button>
        )
      })}

      {/* Empty slot for grid alignment when 7 items in 4 cols */}
      <div />
    </div>
  )
}
