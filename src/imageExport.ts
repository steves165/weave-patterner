/** Image export of the draft, reusing the print layout's SVG (rendered hidden in the page). */

const XMLNS = 'http://www.w3.org/2000/svg'

/** Standalone SVG markup for the print-layout draft, with an explicit size and white background. */
export function draftSvg(scale = 2): string {
  const svg = document.querySelector<SVGSVGElement>('.print-draft')
  if (!svg) throw new Error('The draft image is not available')
  const copy = svg.cloneNode(true) as SVGSVGElement
  const width = Number(svg.dataset.width) * scale
  const height = Number(svg.dataset.height) * scale
  copy.setAttribute('xmlns', XMLNS)
  copy.setAttribute('width', String(width))
  copy.setAttribute('height', String(height))
  copy.removeAttribute('class')
  const [x, y, w, h] = (svg.getAttribute('viewBox') ?? '0 0 0 0').split(' ')
  const bg = document.createElementNS(XMLNS, 'rect')
  for (const [k, v] of Object.entries({ x, y, width: w, height: h, fill: '#ffffff' })) bg.setAttribute(k, v)
  copy.insertBefore(bg, copy.firstChild)
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copy)}`
}

/** Rasterises the SVG to a PNG blob via a canvas. */
export async function draftPng(scale = 2): Promise<Blob> {
  const markup = draftSvg(scale)
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    ctx.drawImage(img, 0, 0)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the PNG'))), 'image/png'),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
