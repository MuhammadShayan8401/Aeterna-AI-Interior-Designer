import { motion } from 'framer-motion'
import ResultCard from './ResultCard'
import PromptViewer from './PromptViewer'
import PipelineInternals from './PipelineInternals'

export default function ResultGrid({ results, sessionId }) {
  const { generated_images = [], seeds = [], settings = {}, description, prompt, furniture_detected = [], segmentation_mask, depth_map, metadata } = results

  return (
    <section className="space-y-8">
      {/* Section header */}
      <div>
        <div className="label-xs flex items-center gap-3 mb-4">
          <span className="text-ink-200">02</span> Results
          <span className="flex-1 h-px bg-ink-100" />
          <span>{generated_images.length} variation{generated_images.length !== 1 ? 's' : ''}</span>
        </div>

        {description && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-xl text-ink-600 italic leading-relaxed"
          >
            "{description}"
          </motion.p>
        )}
      </div>

      {/* Furniture badges */}
      {furniture_detected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="label-xs self-center mr-1">Detected</span>
          {furniture_detected.map(item => (
            <span key={item} className="border border-ink-100 bg-surface text-xs text-ink-600 px-3 py-1 rounded-full capitalize hover:border-accent-500 hover:text-accent-500 transition-colors"
              style={{ fontFamily: 'JetBrains Mono,monospace' }}>
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Image grid */}
      <div className={`grid gap-4 ${generated_images.length === 1 ? 'grid-cols-1 max-w-lg' : generated_images.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {generated_images.map((b64, i) => (
          <ResultCard
            key={i}
            b64={b64}
            index={i}
            seed={seeds[i]}
            settings={settings}
            sessionId={sessionId}
          />
        ))}
      </div>

      {/* Prompt viewer */}
      {(prompt || description) && (
        <PromptViewer prompt={prompt} description={description} />
      )}

      {/* Pipeline internals */}
      {(segmentation_mask || depth_map) && (
        <PipelineInternals
          segMask={segmentation_mask}
          depthMap={depth_map}
          metadata={metadata}
        />
      )}
    </section>
  )
}
