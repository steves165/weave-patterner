import { textOn } from '../colors'
import { cablesIn, colorLetter, isRightSide, type KnitChart, rowsOf, usedColors, widthOf } from './chart'
import { STITCH_IDS, STITCHES, type StitchId } from './stitches'

export const NO_STITCH = '#9e9e9e'

/** Darker or lighter shade of a colour, for shading yarn: amount −1 (black) to 1 (white). */
export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount),
  )
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** A cable's crossing: which way it leans, and how many stitches cross in front and pass behind. */
export function crossing(id: StitchId): { right: boolean; front: number; back: number; purlBack: boolean } {
  const s = STITCHES[id]
  const width = s.cable ?? 2
  const front = s.front ?? width / 2
  return { right: s.cross !== 'left', front, back: width - front, purlBack: Boolean(s.purlBack) }
}

/**
 * The crossing of a cable, drawn over its squares: two bands of stitches swapping places, the front one on top. A
 * right cross brings the stitches on the left over to the right in front; a left cross the opposite. Purl-backed
 * crosses mark the back band with purl dots, at `dots`.
 */
export function cablePaths(
  id: StitchId,
  w: number,
  h: number,
): { back: string; front: string; dots: [number, number][] } {
  const { right, front, back, purlBack } = crossing(id)
  const u = w / (front + back)
  // A band from columns [a, a + n) at the bottom to [b, b + n) at the top.
  const band = (a: number, b: number, n: number) =>
    `M ${a * u} ${h} L ${b * u} 0 L ${(b + n) * u} 0 L ${(a + n) * u} ${h} Z`
  const [frontPath, backPath] = right
    ? [band(0, back, front), band(front, 0, back)]
    : [band(back, 0, front), band(0, front, back)]
  // Purl dots along the back band, where it shows either side of the front one.
  const dots: [number, number][] = []
  if (purlBack)
    for (let i = 0; i < back; i++) {
      const [bottom, top] = right ? [front + i, i] : [i, front + i]
      dots.push([(bottom + 0.5) * u, h * 0.82], [(top + 0.5) * u, h * 0.18])
    }
  return { back: backPath, front: frontPath, dots }
}

interface ChartDrawing {
  cell: number
  /** Height of a square (shorter than wide when drawn to gauge). */
  cellH: number
  /** Draw the key to the symbols and colours below the chart (default true). */
  legend?: boolean
}

/** The chart as a picture, with row and stitch numbers, for saving as an image or printing. */
export function drawChart(ctx: CanvasRenderingContext2D, k: KnitChart, { cell, cellH, legend = true }: ChartDrawing) {
  const rows = rowsOf(k)
  const w = widthOf(k)
  const margin = cell * 2
  const key = legend ? keyLayout(ctx, k, cell, cellH) : null
  ctx.canvas.width = Math.max(w * cell + margin * 2, key?.width ?? 0)
  ctx.canvas.height = rows * cellH + margin * 2 + (key?.height ?? 0)
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
      const { back, front, dots } = cablePaths(cable.id, cable.width * cell, cellH)
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
      ctx.fillStyle = textOn(bg)
      for (const [x, y] of dots) {
        ctx.beginPath()
        ctx.arc(x, y, Math.max(1, cell * 0.08), 0, Math.PI * 2)
        ctx.fill()
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
  // The pattern repeat, outlined in red.
  if (k.repeat) {
    ctx.strokeStyle = '#d32f2f'
    ctx.lineWidth = Math.max(2, cell * 0.14)
    ctx.strokeRect(margin + k.repeat.from * cell, margin, (k.repeat.to - k.repeat.from + 1) * cell, rows * cellH)
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
  if (key) key.draw(margin, rows * cellH + margin * 2)
}

/** A stitch's sample square (or squares, for a cable) for the key, at (x, y). */
function drawSample(ctx: CanvasRenderingContext2D, id: StitchId, x: number, y: number, cell: number, cellH: number) {
  const s = STITCHES[id]
  const width = (s.cable ?? 1) * cell
  ctx.fillStyle = id === 'none' ? NO_STITCH : '#ffffff'
  ctx.fillRect(x, y, width, cellH)
  if (s.cable) {
    const { back, front, dots } = cablePaths(id, width, cellH)
    ctx.save()
    ctx.translate(x, y)
    for (const [d, fill] of [
      [back, '#bdbdbd'],
      [front, '#ffffff'],
    ] as const) {
      const path = new Path2D(d)
      ctx.fillStyle = fill
      ctx.fill(path)
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.stroke(path)
    }
    ctx.fillStyle = '#333'
    for (const [dx, dy] of dots) {
      ctx.beginPath()
      ctx.arc(dx, dy, Math.max(1, cell * 0.08), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  } else if (s.symbol) {
    ctx.fillStyle = '#222'
    ctx.font = `${s.symbol.length > 1 ? cell * 0.42 : cell * 0.7}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(s.symbol, x + cell / 2, y + cellH / 2 + 1)
  }
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, cellH - 1)
}

/**
 * The key below an exported or printed chart: each stitch used, with its symbol and what to do on right- and
 * wrong-side rows; the colours, by letter; and the red repeat box. Laid out in as many columns as fit.
 */
function keyLayout(ctx: CanvasRenderingContext2D, k: KnitChart, cell: number, cellH: number) {
  const font = Math.max(11, Math.round(cell * 0.62))
  ctx.font = `${font}px system-ui, sans-serif`
  const used = new Set(k.stitch.flat())
  const flat = k.mode === 'flat'
  type Entry = { draw: (x: number, y: number) => void; swatch: number; text: string }
  const entries: Entry[] = []
  for (const id of STITCH_IDS) {
    if (!used.has(id)) continue
    const s = STITCHES[id]
    const words = s.rs ? `${s.rs}${flat && s.ws !== s.rs ? ` (WS: ${s.ws})` : ''}` : ''
    entries.push({
      draw: (x, y) => drawSample(ctx, id, x, y, cell, cellH),
      swatch: (s.cable ?? 1) * cell,
      text: words ? `${s.name}: ${words}` : s.name,
    })
  }
  const colors = usedColors(k)
  if (colors.length > 1)
    for (const c of colors)
      entries.push({
        draw: (x, y) => {
          ctx.fillStyle = k.colors[c]
          ctx.fillRect(x, y, cell, cellH)
          ctx.strokeStyle = '#888'
          ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cellH - 1)
        },
        swatch: cell,
        text: `Colour ${colorLetter(c)} (${k.colors[c]})`,
      })
  if (k.repeat)
    entries.push({
      draw: (x, y) => {
        ctx.strokeStyle = '#d32f2f'
        ctx.lineWidth = Math.max(2, cell * 0.14)
        ctx.strokeRect(x + 1, y + 1, cell * 2 - 2, cellH - 2)
      },
      swatch: cell * 2,
      text: 'Pattern repeat: work as many times as the width needs',
    })
  const gap = Math.round(font * 0.8)
  const colW = Math.max(...entries.map((e) => e.swatch + gap + ctx.measureText(e.text).width)) + gap * 2
  const margin = cell * 2
  const chartW = widthOf(k) * cell + margin * 2
  const cols = Math.max(1, Math.min(2, Math.floor((Math.max(chartW, 2 * colW + margin * 2) - margin * 2) / colW)))
  const lineH = Math.max(cellH, font) + gap
  const heading = font * 2.2
  const height = heading + Math.ceil(entries.length / cols) * lineH + margin
  return {
    width: cols * colW + margin * 2,
    height,
    draw: (x0: number, y0: number) => {
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#222'
      ctx.font = `600 ${Math.round(font * 1.15)}px system-ui, sans-serif`
      ctx.fillText('Key', x0, y0 + heading / 2)
      entries.forEach((e, i) => {
        const x = x0 + (i % cols) * colW
        const y = y0 + heading + Math.floor(i / cols) * lineH
        e.draw(x, y + (lineH - gap - cellH) / 2)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#222'
        ctx.font = `${font}px system-ui, sans-serif`
        ctx.fillText(e.text, x + e.swatch + gap, y + (lineH - gap) / 2)
      })
    },
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
  if (s === 'yo2') {
    // A large eyelet.
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.5, h * 0.58, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.3, h * 0.36, 0, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (s === 'mb' || s === 'nupp') {
    // A bobble (or smaller nupp) standing out from the fabric.
    const r = s === 'mb' ? 0.62 : 0.46
    const g = ctx.createRadialGradient(x + w * 0.4, y + h * 0.35, w * 0.05, x + w / 2, y + h / 2, w * r)
    g.addColorStop(0, shade(color, 0.3))
    g.addColorStop(1, shade(color, -0.25))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, w * r, h * r * 0.9, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    return
  }
  if (s === 'bead') {
    leg(x + w * 0.3, -0.45)
    leg(x + w * 0.7, 0.45)
    ctx.fillStyle = '#d4af37'
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h * 0.45, Math.min(w, h) * 0.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.beginPath()
    ctx.arc(x + w * 0.45, y + h * 0.38, Math.min(w, h) * 0.07, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (s === 'p' || s === 'm1p') {
    // A purl bump: the loop's back, lying across the stitch.
    ctx.fillStyle = shade(color, -0.08)
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.55, h * 0.38, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    return
  }
  // A knit V; decreases lean, twisted stitches cross their legs, slipped stitches are long.
  const tilt = s === 'k2tog' || s === 'k3tog' ? 0.5 : s === 'ssk' || s === 'sssk' ? -0.5 : lean
  const twist = s === 'ktbl' ? 0.12 : 0
  ctx.fillStyle = shade(color, 0.08)
  leg(x + w * (0.3 + twist) + tilt * w * 0.2, -0.45 + tilt * 0.4)
  ctx.fillStyle = shade(color, -0.04)
  leg(x + w * (0.7 - twist) + tilt * w * 0.2, 0.45 + tilt * 0.4)
  if (s === 'cdd' || s === 'm1l' || s === 'm1r' || s === 'k3tog' || s === 'sssk' || s === 'kfb') {
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
          const { right, front, back, purlBack } = crossing(cable.id)
          const color = k.colors[k.color[r][cable.start]]
          // Each band drawn midway between where its stitches start (the bottom) and end up (the top).
          const bands = right
            ? [
                { from: front, n: back, shift: -front / 2, isFront: false },
                { from: 0, n: front, shift: back / 2, isFront: true },
              ]
            : [
                { from: 0, n: back, shift: front / 2, isFront: false },
                { from: back, n: front, shift: -back / 2, isFront: true },
              ]
          for (const { from, n, shift, isFront } of bands)
            for (let i = 0; i < n; i++)
              drawStitch(
                ctx,
                !isFront && purlBack ? 'p' : 'k',
                shade(color, isFront ? 0.12 : -0.45),
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
