/** export.js — client-side download helpers (no server round trip). */

const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })

/** Saves a data-URL image. `scale` > 1 upsamples smoothly for a bigger print/wallpaper-size file. */
export async function downloadImage(src, name, scale = 1) {
  let href = src
  if (scale > 1) {
    const img = await load(src)
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'
    g.drawImage(img, 0, 0, c.width, c.height)
    href = c.toDataURL('image/jpeg', 0.95)
  }
  const a = document.createElement('a'); a.href = href; a.download = name; a.click()
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const money = (n) => 'PKR ' + Number(n).toLocaleString('en-PK')

/** Opens a print-ready mood board; the user picks "Save as PDF" in the print dialog. */
export function printMoodBoard({ title, settings, images, before, budget }) {
  const w = window.open('', '_blank')
  if (!w) throw new Error('Allow pop-ups to open the mood board.')
  const rows = (budget?.items ?? []).map((r) => `<tr><td>${esc(r.name)}</td><td>${money(r.low)} – ${money(r.high)}</td></tr>`).join('')
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(title)}</title>
<style>
 body{font-family:Georgia,serif;color:#111;margin:32px auto;max-width:900px;padding:0 20px}
 h1{font-weight:500;margin:0 0 4px} .sub{font-family:Arial,sans-serif;font-size:12px;color:#777;margin-bottom:22px}
 .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px} img{width:100%;display:block}
 figcaption{font:11px Arial;color:#888;margin-top:4px} figure{margin:0}
 table{width:100%;border-collapse:collapse;font:13px Arial;margin-top:22px} td{padding:7px 4px;border-bottom:1px solid #ddd}
 td:last-child{text-align:right} .tot td{font-weight:700;border-top:2px solid #111}
 .note{font:11px Arial;color:#888;margin-top:12px} @media print{body{margin:0}}
</style>
<h1>${esc(title)}</h1>
<div class="sub">${esc(settings.density)} furnishing · ${esc(settings.palette || 'neutral')} palette · created with Aeterna</div>
<div class="grid">${before ? `<figure><img src="${before}"><figcaption>Original</figcaption></figure>` : ''}
${images.map((s, i) => `<figure><img src="${s}"><figcaption>Design ${i + 1}</figcaption></figure>`).join('')}</div>
${budget ? `<table>${rows}<tr class="tot"><td>Estimated total</td><td>${money(budget.total_low)} – ${money(budget.total_high)}</td></tr></table>
<p class="note">${esc(budget.note)}</p>` : ''}
<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script>`)
  w.document.close()
}
