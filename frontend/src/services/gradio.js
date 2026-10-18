/**
 * gradio.js — low-level connection to the Gradio backend on a Hugging Face Space.
 * VITE_SPACE can be "username/space-name" or a full URL (e.g. http://localhost:7860).
 * Free Spaces sleep when idle; `ensureAwake` pokes them and waits until they are running.
 */
import { Client } from '@gradio/client'

const SPACE = (import.meta.env.VITE_SPACE || 'http://localhost:7860').trim()
const isUrl = /^https?:\/\//i.test(SPACE)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function ensureAwake(onStatus) {
  if (isUrl) return
  const runtime = `https://huggingface.co/api/spaces/${SPACE}/runtime`
  const host = `https://${SPACE.replace('/', '-').replace(/[_.]/g, '-').toLowerCase()}.hf.space`
  for (let i = 0; i < 90; i++) {                       // up to ~6 minutes
    let stage = 'UNKNOWN'
    try {
      const r = await fetch(runtime)
      if (r.ok) stage = (await r.json()).stage
    } catch { return }                                  // can't tell — just try to connect
    if (stage === 'RUNNING' || stage === 'UNKNOWN') return
    if (stage.endsWith('ERROR') || stage === 'NO_APP_FILE') {
      throw new Error('The design server is down right now. Please try again later.')
    }
    onStatus?.({ stage: 'waking' })
    if (['SLEEPING', 'STOPPED', 'PAUSED'].includes(stage)) fetch(host, { mode: 'no-cors' }).catch(() => {})
    await wait(4000)
  }
  throw new Error('The design server is taking too long to start. Please try again in a minute.')
}

let clientPromise = null
export function getClient(onStatus) {
  if (!clientPromise) {
    clientPromise = (async () => { await ensureAwake(onStatus); return Client.connect(SPACE) })()
      .catch((e) => { clientPromise = null; throw e })
  }
  return clientPromise
}

const friendly = (m) => {
  const s = String(m ?? '')
  if (!s) return 'Something went wrong. Please try again.'
  if (/queue is full/i.test(s)) return 'The server is busy right now. Please try again in a minute.'
  if (/failed to fetch|networkerror|load failed/i.test(s)) return 'Could not reach the server. Check your connection and try again.'
  return s
}

/** Fast (non-queued) call. Resolves with the endpoint's first output. */
export async function predict(endpoint, args, onStatus) {
  const client = await getClient(onStatus)
  try {
    const res = await client.predict(endpoint, args)
    return res.data[0]
  } catch (e) { throw new Error(friendly(e?.message)) }
}

/** Queued call with progress events (used for image generation). */
export async function submit(endpoint, args, onStatus) {
  onStatus?.({ stage: 'connecting' })
  const client = await getClient(onStatus)
  let out = null
  try {
    for await (const msg of client.submit(endpoint, args)) {
      if (msg.type === 'status') {
        if (msg.stage === 'error') throw new Error(msg.message || 'Something went wrong on the server.')
        onStatus?.({
          stage: msg.stage, position: msg.position, queueSize: msg.queue_size,
          desc: msg.progress_data?.[0]?.desc, index: msg.progress_data?.[0]?.index, length: msg.progress_data?.[0]?.length,
        })
      } else if (msg.type === 'data') out = msg.data[0]
    }
  } catch (e) { throw new Error(friendly(e?.message)) }
  if (!out) throw new Error('The server returned nothing. Please try again.')
  if (out.error) throw new Error(friendly(out.error))     // generation endpoints return {error} (see guard_soft in app.py)
  return out
}
