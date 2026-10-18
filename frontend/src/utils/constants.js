export const ROOM_TYPES = [
  'living room', 'bedroom', 'kitchen', 'bathroom',
  'dining room', 'home office', 'nursery', 'studio apartment',
]

export const STYLES = [
  { id: 'modern',       label: 'Modern' },
  { id: 'contemporary', label: 'Contemporary' },
  { id: 'minimalist',   label: 'Minimalist' },
  { id: 'scandinavian', label: 'Scandinavian' },
  { id: 'japandi',      label: 'Japandi' },
  { id: 'industrial',   label: 'Industrial' },
  { id: 'luxury',       label: 'Luxury' },
]

export const DENSITIES = [
  { id: 'minimal',  label: 'Minimal' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'full',     label: 'Full' },
]

export const CHANGE_LEVELS = [
  { id: 'subtle',   label: 'Subtle',   hint: 'Keeps your layout and furniture' },
  { id: 'balanced', label: 'Balanced', hint: 'Restyles, keeps the room recognisable' },
  { id: 'bold',     label: 'Bold',     hint: 'Big changes, only the structure stays' },
]

export const LIGHTINGS = ['natural', 'warm', 'bright', 'evening', 'golden hour', 'overcast']

export const PALETTES = [
  { id: 'neutral', label: 'Neutral', swatch: ['#F5F0E8', '#D4C5AD', '#8A7766'] },
  { id: 'warm',    label: 'Warm',    swatch: ['#F2DFD0', '#C4895E', '#6B3A2A'] },
  { id: 'cool',    label: 'Cool',    swatch: ['#D8E4EC', '#7BA7BC', '#2A4E6B'] },
  { id: 'earth',   label: 'Earth',   swatch: ['#E8E0D5', '#A0956E', '#4A3F2F'] },
  { id: 'mono',    label: 'Mono',    swatch: ['#F0F0F0', '#888888', '#222222'] },
  { id: 'forest',  label: 'Forest',  swatch: ['#DDE8D8', '#6A9973', '#2D4D35'] },
]

export const MAX_UPLOAD_MB = 10
