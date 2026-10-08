import { textOn } from '../colors'
import { cablesIn, isRightSide, type KnitChart, rowsOf, widthOf } from './chart'
import { STITCHES, type StitchId } from './stitches'

export const NO_STITCH = '#9e9e9e'

/** Darker or lighter shade of a colour, for shading yarn: amount −1 (black) to 1 (white). */
export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount),
  )
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * The crossing of a cable, drawn over its squares: two bands of stitches swapping places, the front one on top.
 * A right cross (held at the back) brings the left stitches to the right in front; a left cross the opposite.
 */
export function cablePaths(id: StitchId, w: number, h: number): { back: string; front: string } {
  const right = id.startsWith('rc')
  const half = w / 2
  // A band half the cable wide, from the bottom on one side to the top on the other.
  const band = (fromLeft: boolean) =>
    fromLeft ? `M 0 ${h} L ${half} 0 L ${w} 0 L ${half} ${h} Z` : `M ${half} ${h} L 0 0 L ${half} 0 L ${w} ${h} Z`
  return right ? { back: band(false), front: band(true) } : { back: band(true), front: band(false) }
}

interface ChartDrawing {
  cell: number
  /** Height of a square (shorter than wide when drawn to gauge). */
  cellH: number
  /** Draw the key to the symbols and colours below the chart (default true). */
  legend?: boolean
}

/** The chart as a picture, with row and stitch numbers, for saving as an image or printing. */
export function drawChart(ctx: CanvasRenderingContext2D, k: KnitChart, { cell, cellH }: ChartDrawing) {
  const rows = rowsOf(k)
  const w = widthOf(k)
  const margin = cell * 2
  ctx.canvas.width = w * cell + margin * 2
  ctx.canvas.height = rows * cellH + margin * 2
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const top = (r: number) => margin + (rows - 1 - r) * cellH
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < w; c++) {
      const s = k.stitch[r][c]
      const bg = s === 'none' ? NO_STITCH : k.colors[k.color[r][c]]
      ctx.fillStyle = bg
      ctx.fillRect(margin + c * cell, top(r), cell, cellH)
      const symbol = STITCHES[s].symbol
      if (symbol) {
        ctx.fillStyle = textOn(bg)
        ctx.font = `${symbol.length > 1 ? cell * 0.42 : cell * 0.7}px system-ui, sans-serif`
        ctx.fillText(symbol, margin + c * cell + cell / 2, top(r) + cellH / 2 + 1)
      }
    }
    for (const cable of cablesIn(k.stitch[r])) {
      const { back, front } = cablePaths(cable.id, cable.width * cell, cellH)
      ctx.save()
      ctx.translate(margin + cable.start * cell, top(r))
      const bg = k.colors[k.color[r][cable.start]]
      for (const [d, fill] of [
        [back, shade(bg, -0.25)],
        [front, shade(bg, 0.25)],
      ] as const) {
        const path = new Path2D(d)
        ctx.fillStyle = fill
        ctx.fill(path)
        ctx.strokeStyle = textOn(bg)
        ctx.lineWidth = 1
        ctx.stroke(path)
      }
      ctx.restore()
    }
  }
  // Grid lines, heavier every 10.
  for (let c = 0; c <= w; c++) {
    ctx.fillStyle = (w - c) % 10 === 0 ? '#555' : '#bbb'
    ctx.fillRect(margin + c * cell - 0.5, margin, 1, rows * cellH)
  }
  for (let r = 0; r <= rows; r++) {
    ctx.fillStyle = r % 10 === 0 ? '#555' : '#bbb'
    ctx.fillRect(margin, top(r) + cellH - 0.5, w * cell, 1)
  }
  // Row numbers beside where each row starts; stitch numbers along the bottom from the right.
  ctx.fillStyle = '#333'
  ctx.font = `${Math.max(8, cell * 0.5)}px system-ui, sans-serif`
  for (let r = 0; r < rows; r++) {
    const x = isRightSide(k, r) ? margin + w * cell + margin / 2 : margin / 2
    ctx.fillText(String(r + 1), x, top(r) + cellH / 2)
  }
  for (let c = 0; c < w; c++) {
    const n = w - c
    if (n === 1 || n % 5 === 0)
      ctx.fillText(String(n), margin + c * cell + cell / 2, margin + rows * cellH + margin / 2)
  }
}

/** One stitch of knitted fabric seen from the right side, filling the box at (x, y) of size w × h. */
function drawStitch(
  ctx: CanvasRenderingContext2D,
  s: StitchId,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
  lean = 0,
) {
  const leg = (cx: number, angle: number) => {
    ctx.beginPath()
    ctx.ellipse(cx, y + h * 0.45, w * 0.24, h * 0.72, angle, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.strokeStyle = shade(color, -0.35)
  ctx.lineWidth = Math.max(0.5, w / 14)
  if (s === 'none') return
  if (s === 'yo') {
    // An eyelet: a hole ringed with yarn.
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.45, h * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.22, h * 0.26, 0, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (s === 'p') {
    // A purl bump: the loop's back, lying across the stitch.
    ctx.fillStyle = shade(color, -0.08)
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.55, h * 0.38, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    return
  }
  // A knit V; decreases lean, twisted stitches cross their legs, slipped stitches are long.
  const tilt = s === 'k2tog' ? 0.5 : s === 'ssk' ? -0.5 : lean
  const twist = s === 'ktbl' ? 0.12 : 0
  ctx.fillStyle = shade(color, 0.08)
  leg(x + w * (0.3 + twist) + tilt * w * 0.2, -0.45 + tilt * 0.4)
  ctx.fillStyle = shade(color, -0.04)
  leg(x + w * (0.7 - twist) + tilt * w * 0.2, 0.45 + tilt * 0.4)
  if (s === 'cdd' || s === 'm1l' || s === 'm1r') {
    ctx.fillStyle = shade(color, 0.15)
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h * 0.3, w * 0.18, h * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

/**
 * The knitted fabric, seen from the right side: each square becomes a knit V, purl bump, eyelet and so on, sized
 * to the gauge. Repeats the chart `across` × `up` times. Row 1 is at the bottom.
 */
export function drawFabric(ctx: CanvasRenderingContext2D, k: KnitChart, stitchW: number, across = 1, up = 1) {
  const rows = rowsOf(k)
  const w = widthOf(k)
  const stitchH = (stitchW * k.gauge.stitches) / k.gauge.rows
  ctx.canvas.width = Math.ceil(w * across * stitchW)
  ctx.canvas.height = Math.ceil(rows * up * stitchH)
  ctx.fillStyle = '#2a2a2a'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  // Draw from the top down, so each row's V legs overlap the row above, as stitches do.
  for (let u = up - 1; u >= 0; u--) {
    for (let r = rows - 1; r >= 0; r--) {
      const y = ((up - 1 - u) * rows + (rows - 1 - r)) * stitchH
      const row = k.stitch[r]
      const cables = cablesIn(row)
      const inCable = new Set(cables.flatMap((cable) => Array.from({ length: cable.width }, (_, i) => cable.start + i)))
      for (let a = 0; a < across; a++) {
        const x = (c: number) => (a * w + c) * stitchW
        for (let c = 0; c < w; c++) {
          if (!inCable.has(c)) drawStitch(ctx, row[c], k.colors[k.color[r][c]], x(c), y, stitchW, stitchH)
        }
        // A crossing: the stitches held at the back pass behind, shaded, and the others cross over them in front,
        // each half drawn midway to where it ends up.
        for (const cable of cables) {
          const half = cable.width / 2
          const right = cable.id.startsWith('rc')
          const color = k.colors[k.color[r][cable.start]]
          const halves = [
            { from: right ? half : 0, shift: right ? -half / 2 : half / 2, front: false },
            { from: right ? 0 : half, shift: right ? half / 2 : -half / 2, front: true },
          ]
          for (const { from, shift, front } of halves)
            for (let i = 0; i < half; i++)
              drawStitch(
                ctx,
                'k',
                shade(color, front ? 0.12 : -0.45),
                x(cable.start + from + i + shift),
                y,
                stitchW,
                stitchH,
                Math.sign(shift) * 0.7,
              )
        }
      }
    }
  }
}
