/**
 * Pattern pieces as drawings: lines, dots and text in centimetres, which the app's view (SVG), the PDFs and the DXF
 * export all draw the same way.
 */
import { add, area, type Box, bounds, dist, lerp, type Pt, pt, scale, sub } from './geometry'
import { type Allowances, cutNote, FABRIC_NAMES, outlines, type Piece } from './pattern'

/** What a line is, which decides how it's drawn. */
export type Style = 'cut' | 'sew' | 'mark' | 'fold' | 'grain' | 'guide' | 'size' | 'frame'

export type Item =
  | { t: 'line'; pts: Pt[]; closed?: boolean; style: Style; colour?: string }
  | { t: 'dot'; at: Pt; r: number; style: Style; filled?: boolean }
  | {
      t: 'text'
      at: Pt
      text: string
      /** Height in cm. */
      size: number
      bold?: boolean
      /** Turned by this many radians (clockwise on screen). */
      angle?: number
      anchor?: 'start' | 'middle' | 'end'
      colour?: string
    }

/** Colours for nested sizes' cutting lines, in order. */
export const SIZE_COLOURS = [
  '#1565C0',
  '#C62828',
  '#2E7D32',
  '#6A1B9A',
  '#EF6C00',
  '#00838F',
  '#AD1457',
  '#4E342E',
  '#283593',
  '#558B2F',
]

const unit = (a: Pt): Pt => {
  const l = Math.hypot(a.x, a.y) || 1
  return pt(a.x / l, a.y / l)
}

/** An arrow head at `tip`, pointing along `dir`. */
function head(tip: Pt, dir: Pt, size: number): Pt[] {
  const d = unit(dir)
  const n = pt(-d.y, d.x)
  return [
    add(add(tip, scale(d, -size)), scale(n, size * 0.5)),
    tip,
    add(add(tip, scale(d, -size)), scale(n, -size * 0.5)),
  ]
}

/** The nearest point on a closed outline, and the outward direction there. */
function nearest(poly: Pt[], p: Pt): { at: Pt; out: Pt; along: Pt } {
  const turn = area(poly) >= 0 ? 1 : -1
  let best = { d: Infinity, at: p, out: pt(0, -1), along: pt(1, 0) }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const ab = sub(b, a)
    const l2 = ab.x * ab.x + ab.y * ab.y
    const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2)) : 0
    const q = lerp(a, b, t)
    const d = dist(q, p)
    if (d < best.d) {
      const dir = unit(ab)
      best = { d, at: q, out: pt(dir.y * turn, -dir.x * turn), along: dir }
    }
  }
  return best
}

export interface PieceLabel {
  /** The design and size, as "T-shirt · UK 12". */
  title?: string
  /** Extra sizes' cutting lines, nested under this one: their outlines, in the piece's own coordinates. */
  nested?: { name: string; cut: Pt[]; colour: string }[]
}

/** Everything drawn for a piece, in its own coordinates. */
export function drawPiece(p: Piece, a: Allowances, label: PieceLabel = {}): Item[] {
  const items: Item[] = []
  const { sew, cut } = outlines(p, a)
  const box = bounds(cut)
  const big = Math.max(box.w, box.h)
  const text = Math.max(0.45, Math.min(1.1, big / 28))

  for (const n of label.nested ?? [])
    items.push({ t: 'line', pts: n.cut, closed: true, style: 'size', colour: n.colour })
  items.push({ t: 'line', pts: cut, closed: true, style: 'cut' })
  if (a.include) items.push({ t: 'line', pts: sew, closed: true, style: 'sew' })

  // Fold edges: a bracket with arrows pointing at the fold.
  let at = p.start
  for (const s of p.segs) {
    if (s.kind === 'fold' && dist(at, s.to) > 4) {
      const dir = unit(sub(s.to, at))
      const inward = scale(nearest(sew, lerp(at, s.to, 0.5)).out, -1)
      const len = dist(at, s.to)
      const a0 = add(at, scale(dir, Math.min(len * 0.15, 5)))
      const a1 = add(s.to, scale(dir, -Math.min(len * 0.15, 5)))
      const off = Math.min(2.5, box.w * 0.15)
      const b0 = add(a0, scale(inward, off))
      const b1 = add(a1, scale(inward, off))
      items.push({ t: 'line', pts: [a0, b0, b1, a1], style: 'fold' })
      items.push({ t: 'line', pts: head(a0, scale(inward, -1), 0.8), style: 'fold' })
      items.push({ t: 'line', pts: head(a1, scale(inward, -1), 0.8), style: 'fold' })
      const mid = lerp(b0, b1, 0.5)
      const angle = Math.atan2(dir.y, dir.x)
      const upright = angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle
      items.push({
        t: 'text',
        at: add(mid, scale(inward, text * 0.9)),
        text: 'PLACE ON FOLD',
        size: text * 0.6,
        bold: true,
        angle: upright,
        anchor: 'middle',
      })
    }
    at = s.to
  }

  // The grainline: a long arrow both ends (or across for the stretch, or at 45° on the bias).
  if (p.grain) {
    let [g0, g1] = p.grain
    if (p.bias) {
      const m = lerp(g0, g1, 0.5)
      const half = dist(g0, g1) / 2
      g0 = add(m, pt(-half * Math.SQRT1_2, -half * Math.SQRT1_2))
      g1 = add(m, pt(half * Math.SQRT1_2, half * Math.SQRT1_2))
    }
    const dir = sub(g1, g0)
    items.push({ t: 'line', pts: [g0, g1], style: 'grain' })
    items.push({ t: 'line', pts: head(g1, dir, 1), style: 'grain' })
    items.push({ t: 'line', pts: head(g0, scale(dir, -1), 1), style: 'grain' })
    const angle = Math.atan2(dir.y, dir.x)
    const upright = angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle
    const note = p.stretch ? 'Greatest stretch' : p.bias ? 'Bias' : 'Grainline'
    items.push({
      t: 'text',
      at: add(lerp(g0, g1, 0.5), scale(pt(-unit(dir).y, unit(dir).x), -text * 0.3)),
      text: note,
      size: text * 0.5,
      angle: upright,
      anchor: 'middle',
    })
  }

  for (const d of p.darts ?? []) {
    const pts = d.tip2 ? [d.a, d.tip, d.b, d.tip2] : [d.a, d.tip, d.b]
    items.push({ t: 'line', pts, closed: Boolean(d.tip2), style: 'mark' })
    items.push({ t: 'line', pts: [lerp(d.a, d.b, 0.5), d.tip], style: 'guide' })
    items.push({ t: 'dot', at: d.tip, r: 0.2, style: 'mark', filled: true })
  }

  for (const g of p.guides ?? []) {
    if (g.kind === 'adjust') {
      const dir = unit(sub(g.b, g.a))
      const n = pt(-dir.y, dir.x)
      items.push({ t: 'line', pts: [add(g.a, scale(n, -0.4)), add(g.b, scale(n, -0.4))], style: 'guide' })
      items.push({ t: 'line', pts: [add(g.a, scale(n, 0.4)), add(g.b, scale(n, 0.4))], style: 'guide' })
    } else items.push({ t: 'line', pts: [g.a, g.b], style: 'guide' })
    if (g.label)
      items.push({
        t: 'text',
        at: add(lerp(g.a, g.b, 0.04), pt(0, -0.7)),
        text: g.label,
        size: text * 0.45,
        anchor: 'start',
      })
  }

  // Notches: short cuts into the allowance, square to the edge.
  for (const n of p.notches ?? []) {
    const { at: on, out, along } = nearest(sew, n.at)
    const reach = (a.include ? Math.max(a.seam, 0.6) : 0) + 0.1
    const ticks = n.double ? [-0.3, 0.3] : [0]
    for (const k of ticks) {
      const base = add(on, scale(along, k))
      items.push({ t: 'line', pts: [add(base, scale(out, -0.5)), add(base, scale(out, reach))], style: 'mark' })
    }
  }

  for (const m of p.marks ?? []) {
    if (m.kind === 'buttonhole' && m.to) {
      const dir = unit(sub(m.to, m.at))
      const n = pt(-dir.y * 0.3, dir.x * 0.3)
      items.push({ t: 'line', pts: [m.at, m.to], style: 'mark' })
      items.push({ t: 'line', pts: [sub(m.at, n), add(m.at, n)], style: 'mark' })
      items.push({ t: 'line', pts: [sub(m.to, n), add(m.to, n)], style: 'mark' })
    } else if (m.kind === 'button') {
      items.push({ t: 'dot', at: m.at, r: 0.6, style: 'mark' })
      items.push({ t: 'line', pts: [add(m.at, pt(-0.4, -0.4)), add(m.at, pt(0.4, 0.4))], style: 'mark' })
      items.push({ t: 'line', pts: [add(m.at, pt(-0.4, 0.4)), add(m.at, pt(0.4, -0.4))], style: 'mark' })
    } else items.push({ t: 'dot', at: m.at, r: 0.3, style: 'mark', filled: true })
  }

  // The label: name, how many to cut, the fabric, the design and size.
  const c = p.labelAt ?? pt(box.x + box.w / 2, box.y + box.h / 2)
  const lines: [string, number, boolean][] = [
    [p.name, text, true],
    [cutNote(p), text * 0.62, false],
  ]
  if (p.fabric !== 'main') lines.push([FABRIC_NAMES[p.fabric], text * 0.55, false])
  if (p.interface) lines.push(['Interface', text * 0.55, false])
  if (label.title) lines.push([label.title, text * 0.5, false])
  let y = c.y - (lines.reduce((s, [, h]) => s + h * 1.25, 0) - lines[0][1]) / 2
  for (const [words, size, bold] of lines) {
    items.push({ t: 'text', at: pt(c.x, y), text: words, size, bold, anchor: 'middle' })
    y += size * 1.25 + (bold ? size * 0.15 : 0)
  }
  for (const n of label.nested ?? []) {
    // Name each nested size at the bottom of its outline.
    const low = n.cut.reduce((m, q) => (q.y > m.y ? q : m), n.cut[0])
    items.push({
      t: 'text',
      at: pt(low.x - 0.5, low.y - 0.3),
      text: n.name,
      size: text * 0.42,
      anchor: 'end',
      colour: n.colour,
    })
  }
  return items
}

/** Items moved by (dx, dy). */
export function moveItems(items: Item[], dx: number, dy: number): Item[] {
  const d = pt(dx, dy)
  return items.map((it) =>
    it.t === 'line' ? { ...it, pts: it.pts.map((q) => add(q, d)) } : { ...it, at: add(it.at, d) },
  )
}

/** The box round some items. */
export function itemBounds(items: Item[]): Box {
  const pts: Pt[] = []
  for (const it of items) {
    if (it.t === 'line') pts.push(...it.pts)
    else if (it.t === 'dot') pts.push(add(it.at, pt(-it.r, -it.r)), add(it.at, pt(it.r, it.r)))
  }
  return bounds(pts)
}

export interface Placed {
  piece: Piece
  /** Where the piece's own (0, 0) goes. */
  dx: number
  dy: number
  box: Box
}

/**
 * Pieces arranged in rows across a width (cm), tallest first, `gap` apart: for the screen and for printing. Pieces
 * wider than the width get a row of their own.
 */
export function arrange(
  pieces: { piece: Piece; box: Box }[],
  width: number,
  gap = 2,
): { placed: Placed[]; w: number; h: number } {
  const order = pieces.slice().sort((a, b) => b.box.h - a.box.h)
  const placed: Placed[] = []
  let x = 0
  let y = 0
  let rowH = 0
  let maxW = 0
  for (const { piece, box } of order) {
    if (x > 0 && x + box.w > width) {
      x = 0
      y += rowH + gap
      rowH = 0
    }
    placed.push({ piece, dx: x - box.x, dy: y - box.y, box: { x, y, w: box.w, h: box.h } })
    x += box.w + gap
    rowH = Math.max(rowH, box.h)
    maxW = Math.max(maxW, x - gap)
  }
  return { placed, w: maxW, h: y + rowH }
}

/** Items as SVG markup (cm units), for exporting and the static pages. Colours: ink for lines, accent for marks. */
export function svgItems(items: Item[], ink = '#222', accent = '#C2185B'): string {
  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const f = (n: number) => Math.round(n * 1000) / 1000
  const strokes: Record<Style, string> = {
    cut: `stroke="${ink}" stroke-width="0.06"`,
    sew: `stroke="${ink}" stroke-width="0.03" stroke-dasharray="0.4 0.25"`,
    mark: `stroke="${accent}" stroke-width="0.04"`,
    fold: `stroke="${ink}" stroke-width="0.04"`,
    grain: `stroke="${ink}" stroke-width="0.04"`,
    guide: `stroke="${ink}" stroke-width="0.025" stroke-dasharray="0.15 0.15"`,
    size: 'stroke-width="0.04"',
    frame: `stroke="${ink}" stroke-width="0.02"`,
  }
  return items
    .map((it) => {
      if (it.t === 'line') {
        const pts = it.pts.map((q) => `${f(q.x)},${f(q.y)}`).join(' ')
        const colour = it.colour ? ` stroke="${it.colour}"` : ''
        return `<${it.closed ? 'polygon' : 'polyline'} points="${pts}" fill="none" ${strokes[it.style]}${colour} stroke-linejoin="round"/>`
      }
      if (it.t === 'dot')
        return `<circle cx="${f(it.at.x)}" cy="${f(it.at.y)}" r="${f(it.r)}" ${it.filled ? `fill="${accent}"` : 'fill="none"'} ${strokes[it.style]}/>`
      const rot = it.angle ? ` transform="rotate(${f((it.angle * 180) / Math.PI)} ${f(it.at.x)} ${f(it.at.y)})"` : ''
      return `<text x="${f(it.at.x)}" y="${f(it.at.y)}" font-size="${f(it.size)}" text-anchor="${it.anchor ?? 'start'}"${it.bold ? ' font-weight="700"' : ''} fill="${it.colour ?? ink}" dominant-baseline="middle"${rot}>${e(it.text)}</text>`
    })
    .join('\n')
}
