export const ROOM_TYPES = [
  'living room','bedroom','kitchen','bathroom',
  'dining room','home office','nursery','studio apartment',
]
export const STYLES = [
  'modern','minimalist','scandinavian','industrial','bohemian',
  'mid-century modern','traditional','japandi','coastal','art deco',
]
export const MAX_UPLOAD_MB = 10

// ── Professional terminology ────────────────────────────────────────────────
export const LABELS = {
  aiAssistedMode:      'Adaptive Recommendation Mode',
  aiTopPick:           'Recommended Output',
  useSuggestions:      'Apply Intelligent Recommendations',
  retrainANN:          'Update Preference Model',
  analytics:           'Performance Analytics',
  aiScore:             'Preference Score',
  aiPrefAnalysis:      'Intelligent Preference Analysis',
  generateBtn:         'Generate Designs',
  aiAssistedGenBadge:  'Adaptive Mode Active',
  rankedBadge:         'Ranked by Preference Model',
}

export const PIPELINE_STAGES = [
  { id: 'upload',   label: 'Uploading Image',            sub: 'Transferring to processing server',    color: '#B3654A' },
  { id: 'segment',  label: 'Analyzing Room Layout',       sub: 'SegFormer semantic segmentation',       color: '#B3654A' },
  { id: 'depth',    label: 'Detecting Furniture & Structure', sub: 'MiDaS monocular depth estimation', color: '#B3654A' },
  { id: 'ann',      label: 'Computing AI Recommendations', sub: 'ANN preference inference engine',      color: '#946A33' },
  { id: 'diffuse',  label: 'Generating Interior Variations', sub: 'Stable Diffusion v1.5 img2img',     color: '#5C7355' },
  { id: 'rank',     label: 'Ranking Generated Outputs',   sub: 'Sorting by predicted preference score', color: '#1A1815' },
]
