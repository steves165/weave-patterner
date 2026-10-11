/**
 * Pictures of filled-in paper sheets, for tests: a sheet as printed and coloured in, and a photo of it taken at an
 * angle in uneven light. (Node only: it draws with @napi-rs/canvas.)
 */
import { createCanvas } from '@napi-rs/canvas'
import { homography, invert, project } from './homography'
import { cellCentre, type SheetSpec, sheetLayout, warpStripCentre, weftStripCentre } from './layout'
import { canvasPainter, drawSheet } from './render'
import type { Picture } from './scan'

/** Pixels to the millimetre of the "printed" sheet. */
const K = 6

export interface Filling {
  /** The colour inked in grid square (row, col), or null to leave it blank. */
  cell: (row: number, col: number) => string | null
  warp?: (col: number) => string | null
  weft?: (row: number) => string | null
}

/** A sheet as printed, then coloured in like a felt-tip pen (most of each square, a little ragged). */
export function filledSheet(spec: SheetSpec, fill: Filling): Picture {
  const l = sheetLayout(spec)
  const canvas = createCanvas(Math.round(l.page.w * K), Math.round(l.page.h * K))
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
  drawSheet(canvasPainter(ctx, K), l)
  const ink = (centre: { x: number; y: number }, colour: string | null | undefined, seed: number) => {
    if (!colour) return
    const s = l.grid.cell * (0.72 + ((seed * 37) % 10) / 100)
    ctx.fillStyle = colour
    ctx.fillRect((centre.x - s / 2) * K, (centre.y - s / 2) * K, s * K, s * K)
  }
  for (let r = 0; r < spec.picks; r++)
    for (let c = 0; c < spec.ends; c++) ink(cellCentre(l, r, c), fill.cell(r, c), r * 31 + c)
  for (let c = 0; c < spec.ends; c++) ink(warpStripCentre(l, c), fill.warp?.(c), c)
  for (let r = 0; r < spec.picks; r++) ink(weftStripCentre(l, r), fill.weft?.(r), r)
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { data: img.data, width: img.width, height: img.height }
}

/**
 * The sheet photographed: seen at an angle (the page's corners land on `quad`), on a grey table, lit unevenly (darker
 * to one side) and with a little noise, in a `w` × `h` picture.
 */
export function photograph(sheet: Picture, quad: { x: number; y: number }[], w: number, h: number, seed = 1): Picture {
  const corners = [
    { x: 0, y: 0 },
    { x: sheet.width, y: 0 },
    { x: sheet.width, y: sheet.height },
    { x: 0, y: sheet.height },
  ]
  const toPhoto = homography(corners, quad)
  if (!toPhoto) throw new Error('bad quad')
  const back = invert(toPhoto)
  const data = new Uint8ClampedArray(w * h * 4)
  let n = seed
  const noise = () => {
    n = (n * 1103515245 + 12345) % 2147483648
    return ((n / 2147483648) * 2 - 1) * 7
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = project(back, { x: x + 0.5, y: y + 0.5 })
      const sx = Math.floor(s.x)
      const sy = Math.floor(s.y)
      const o = (y * w + x) * 4
      const light = 0.78 + 0.22 * (x / w)
      for (let ch = 0; ch < 3; ch++) {
        const v =
          sx >= 0 && sy >= 0 && sx < sheet.width && sy < sheet.height
            ? sheet.data[(sy * sheet.width + sx) * 4 + ch]
            : 110
        data[o + ch] = v * light + noise()
      }
      data[o + 3] = 255
    }
  return { data, width: w, height: h }
}
