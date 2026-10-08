import type { Pixels } from './image'

/** Reads an image file's pixels in the browser, scaled down so its longer side is at most `maxSide`. */
export async function readImagePixels(file: Blob, maxSide = 240): Promise<Pixels> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('This browser cannot read images')
    ctx.drawImage(img, 0, 0, width, height)
    return { data: ctx.getImageData(0, 0, width, height).data, width, height }
  } catch (e) {
    throw new Error(
      e instanceof Error && e.message.includes('browser')
        ? e.message
        : "That file isn't a picture this browser can read",
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
