/** store.js — small client-side helpers (history and taste now live on the server, per user). */

/** Shrinks a photo before upload (faster, and the server only uses ~512px anyway). */
export function downscale(file, maxSide = 1024, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, maxSide / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob((blob) => blob ? resolve({
        blob, dataUrl: c.toDataURL('image/jpeg', 0.8), width: c.width, height: c.height,
      }) : reject(new Error('Could not read that image.')), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')) }
    img.src = url
  })
}

/** Style the user has liked most (needs at least one net like). */
export function topStyle(taste = {}) {
  const best = Object.entries(taste).sort((a, b) => b[1] - a[1])[0]
  return best && best[1] > 0 ? best[0] : null
}
