/**
 * Drawing the paper sheet: the corner marks, QR code, title, instructions, scale, grid and colour strips. It draws
 * through a small Painter, so the same drawing goes to a canvas (the preview, and tests) and to a PDF (to print).
 */
import qrcode from 'qrcode-generator'
import { encodeSpec, type SheetLayout } from './layout'

/** Drawing in millimetres. */
export interface Painter {
  fillRect(x: number, y: number, w: number, h: number, colour: string): void
  line(x1: number, y1: number, x2: number, y2: number, colour: string, width: number): void
  text(
    text: string,
    x: number,
    y: number,
    size: number,
    opts?: { bold?: boolean; colour?: string; align?: 'left' | 'center' | 'right' },
  ): void
}

/** The QR code's modules for a layout: dark or light, row by row. */
export function qrModules(l: SheetLayout): boolean[][] {
  const qr = qrcode(0, 'M')
  qr.addData(encodeSpec(l.spec), 'Byte')
  qr.make()
  const n = qr.getModuleCount()
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)))
}

const INK = '#000000'
const LINE = '#9a9a9a'
const HEAVY = '#555555'
const SOFT = '#555555'

/** Draws the whole sheet. */
export function drawSheet(p: Painter, l: SheetLayout) {
  const { spec, grid } = l
  const cell = grid.cell
  p.fillRect(0, 0, l.page.w, l.page.h, '#ffffff')
  for (const m of l.marks) p.fillRect(m.x, m.y, m.w, m.h, INK)

  const modules = qrModules(l)
  const size = l.qr.w / modules.length
  for (const [r, row] of modules.entries())
    // A hair wider, so neighbouring modules join without seams.
    for (const [c, dark] of row.entries())
      if (dark) p.fillRect(l.qr.x + c * size, l.qr.y + r * size, size + 0.02, size + 0.02, INK)

  const { x, y } = l.title
  p.text(spec.name, x, y + 4, 6, { bold: true })
  p.text(`${spec.ends} ends × ${spec.picks} picks · Weave Patterner`, x, y + 10.5, 3.6, { colour: SOFT })
  const lines = [
    'Fill in each square where the warp shows on top; leave the weft squares blank.',
    'Colour the strip above the grid with each end’s warp colour, and the strip on the',
    'right with each pick’s weft colour (or leave them blank). Keep the corners and the',
    'QR code clean, then scan or photograph the whole page, flat and well lit.',
  ]
  lines.forEach((t, i) => p.text(t, x, y + 16.5 + i * 4.2, 3.1, { colour: SOFT }))

  // The scale: 100 mm in centimetres, to check the print came out at full size.
  const s = l.scale
  p.line(s.x, s.y, s.x + s.length, s.y, INK, 0.3)
  for (let k = 0; k <= 10; k++)
    p.line(s.x + k * 10, s.y - (k % 5 ? 1.2 : 2), s.x + k * 10, s.y + (k % 5 ? 1.2 : 2), INK, 0.3)
  p.text('10 cm: measure this to check the print is at full size', s.x + s.length + 4, s.y + 1.2, 3, { colour: SOFT })

  // Numbers along the top and left, every 4.
  const every = cell < 5 ? 8 : 4
  for (let c = 0; c < spec.ends; c++)
    if ((c + 1) % every === 0 || c === 0)
      p.text(String(c + 1), grid.x + (c + 0.5) * cell, l.warpStrip.y - 1.5, Math.min(3, cell * 0.7), {
        colour: SOFT,
        align: 'center',
      })
  for (let r = 0; r < spec.picks; r++)
    if ((r + 1) % every === 0 || r === 0)
      p.text(String(r + 1), grid.x - 1.2, grid.y + (r + 0.5) * cell + 1, Math.min(3, cell * 0.7), {
        colour: SOFT,
        align: 'right',
      })

  const box = (bx: number, by: number, w: number, h: number, every4 = true) => {
    for (let c = 0; c <= w; c++)
      p.line(
        bx + c * cell,
        by,
        bx + c * cell,
        by + h * cell,
        every4 && c % 4 === 0 ? HEAVY : LINE,
        every4 && c % 4 === 0 ? 0.25 : 0.12,
      )
    for (let r = 0; r <= h; r++)
      p.line(
        bx,
        by + r * cell,
        bx + w * cell,
        by + r * cell,
        every4 && r % 4 === 0 ? HEAVY : LINE,
        every4 && r % 4 === 0 ? 0.25 : 0.12,
      )
  }
  box(grid.x, grid.y, spec.ends, spec.picks)
  box(l.warpStrip.x, l.warpStrip.y, spec.ends, 1, false)
  box(l.weftStrip.x, l.weftStrip.y, 1, spec.picks, false)
}

/** A Painter for a canvas, at `k` canvas units to the millimetre. */
export function canvasPainter(ctx: CanvasRenderingContext2D, k: number): Painter {
  return {
    fillRect(x, y, w, h, colour) {
      ctx.fillStyle = colour
      ctx.fillRect(x * k, y * k, w * k, h * k)
    },
    line(x1, y1, x2, y2, colour, width) {
      ctx.strokeStyle = colour
      ctx.lineWidth = Math.max(0.5, width * k)
      ctx.beginPath()
      ctx.moveTo(x1 * k, y1 * k)
      ctx.lineTo(x2 * k, y2 * k)
      ctx.stroke()
    },
    text(t, x, y, size, opts = {}) {
      ctx.fillStyle = opts.colour ?? INK
      ctx.font = `${opts.bold ? '700 ' : ''}${size * k}px sans-serif`
      ctx.textAlign = opts.align ?? 'left'
      ctx.fillText(t, x * k, y * k)
    },
  }
}
