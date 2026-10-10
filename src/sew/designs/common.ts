import { type Bodice, Outline } from '../draft'
import { add, type Pt, polyline, pt, type Seg, scale } from '../geometry'
import type { Option, Options, Piece, Sketch } from '../pattern'

export const num = (o: Options, id: string) => Number(o[id])
export const str = (o: Options, id: string) => String(o[id])

export const LENGTH_ADJUST: Option = {
  id: 'lengthAdjust',
  label: 'Lengthen or shorten',
  type: 'number',
  unit: 'cm',
  min: -15,
  max: 25,
  step: 0.5,
  default: 0,
  help: 'Added at the hem (or taken off): for a taller or shorter figure, or just the length you like.',
}

export const SLEEVES = (dflt: string, none = true): Option => ({
  id: 'sleeves',
  label: 'Sleeves',
  type: 'choice',
  default: dflt,
  choices: [
    ...(none ? [{ value: 'none', label: 'Sleeveless' }] : []),
    { value: 'short', label: 'Short' },
    { value: 'elbow', label: 'Elbow' },
    { value: 'threeQuarter', label: 'Three-quarter' },
    { value: 'long', label: 'Long' },
  ],
})

/** A sleeve's length from the top of the cap, for the choice. */
export function sleeveLength(choice: string, armLength: number): number {
  return (
    {
      none: 0,
      short: Math.max(16, armLength * 0.34),
      elbow: armLength * 0.55,
      threeQuarter: armLength * 0.78,
      long: armLength + 1,
    }[choice] ?? armLength * 0.34
  )
}

/** The points of a piece's sewing line from its start up to (and including) segment `upto`. */
export function outlineTo(p: Piece, upto: number, step = 0.6): Pt[] {
  return polyline(p.start, p.segs.slice(0, upto + 1), step)
}

/** The index of the first segment ending at the centre (x = 0). */
export const toCentre = (p: Piece) => p.segs.findIndex((s) => Math.abs(s.to.x) < 0.01)

/** A sketch of a top or dress from its bodice: the whole front, the inside of the back neck, sleeves if any. */
export function topSketch(
  b: Bodice,
  opts: {
    sleeve?: { length: number; hem: number; cap: number }
    hemStitch?: boolean
    band?: boolean
    zip?: boolean
    buttons?: number
  },
): Sketch {
  const f = b.front
  const side = outlineTo(f, toCentre(f))
  const back = polyline(pt(0, b.key.backNeck.y), b.key.neckSegsBack, 0.6)
  const whole = [
    ...side,
    ...side
      .slice()
      .reverse()
      .map((p) => pt(-p.x, p.y)),
    ...back
      .slice()
      .reverse()
      .map((p) => pt(-p.x, p.y)),
    ...back,
  ]
  const front = polyline(b.key.frontNeck, b.key.neckSegsFront, 0.6)
  const neckHole = [
    ...front,
    ...back.slice().reverse(),
    ...back.map((p) => pt(-p.x, p.y)),
    ...front
      .slice()
      .reverse()
      .map((p) => pt(-p.x, p.y)),
  ]
  const s: Sketch = { shapes: [], lines: [], dots: [] }
  if (opts.sleeve) {
    const { length, hem, cap } = opts.sleeve
    for (const dir of [1, -1]) {
      const sp = pt(b.key.sp.x * dir, b.key.sp.y)
      const angle = dir > 0 ? (48 * Math.PI) / 180 : Math.PI - (48 * Math.PI) / 180
      const d = pt(Math.cos(angle), Math.sin(angle))
      const n = pt(-d.y * dir, d.x * dir)
      const outerEnd = add(sp, scale(d, length))
      const innerEnd = add(outerEnd, scale(n, hem / 2))
      // The sleeve runs back up the armhole curve to the shoulder, so it meets the body with no gap.
      const near = (q: Pt) =>
        side.reduce(
          (m, x, i) => (Math.hypot(x.x - q.x, x.y - q.y) < Math.hypot(side[m].x - q.x, side[m].y - q.y) ? i : m),
          0,
        )
      const armhole = side.slice(near(b.key.sp), near(b.key.ua) + 1).map((q) => pt(q.x * dir, q.y))
      const pts = [sp, outerEnd, innerEnd, ...armhole.slice().reverse()]
      s.shapes.push({ pts })
      if (length > cap + 3) {
        const hs = [add(outerEnd, scale(d, -2)), add(innerEnd, scale(d, -2))]
        s.lines.push({ pts: hs, dash: true })
      }
    }
  }
  s.shapes.push({ pts: whole })
  s.shapes.push({ pts: neckHole, fill: 'lining' })
  const neckLine = [
    ...front
      .slice()
      .reverse()
      .map((p) => pt(-p.x, p.y)),
    ...front,
  ]
  s.lines.push({ pts: neckLine })
  if (opts.band) s.lines.push({ pts: neckLine.map((p) => pt(p.x * 1.0, p.y + 1.6)) })
  if (opts.hemStitch !== false) {
    const hy = b.key.hem.y - 2
    s.lines.push({ pts: [pt(-b.hemHalf + 0.3, hy), pt(b.hemHalf - 0.3, hy)], dash: true })
  }
  for (const d of b.front.darts ?? []) {
    s.lines.push({ pts: [d.a, d.tip] })
    s.lines.push({ pts: [pt(-d.a.x, d.a.y), pt(-d.tip.x, d.tip.y)] })
    if (d.tip2) {
      s.lines.push({ pts: [d.tip, pt((d.a.x + d.b.x) / 2, d.a.y), d.tip2] })
      s.lines.push({ pts: [pt(-d.tip.x, d.tip.y), pt(-(d.a.x + d.b.x) / 2, d.a.y), pt(-d.tip2.x, d.tip2.y)] })
    }
  }
  if (opts.buttons) {
    const top = b.key.frontNeck.y + 1.5
    const gap = (b.key.hem.y - 6 - top) / Math.max(1, opts.buttons - 1)
    for (let i = 0; i < opts.buttons; i++) s.dots?.push(pt(0, top + i * gap))
    s.lines.push({ pts: [pt(1.5, b.key.frontNeck.y), pt(1.5, b.key.hem.y)] })
  }
  return s
}

/** Segments of a piece of a given kind, for measuring. */
export const segsOf = (segs: Seg[], kind: Seg['kind']) => segs.filter((s) => s.kind === kind)

/** An in-seam pocket bag: its straight edge goes on the side seam between the notches. */
export function pocketBag(): Piece {
  const o = new Outline(pt(0, 0))
    .line(pt(9, 0))
    .curve(pt(15, 0), pt(18, 6), pt(18, 13))
    .curve(pt(18, 22), pt(12, 27), pt(6, 27))
    .curve(pt(2, 27), pt(0, 24), pt(0, 20))
    .line(pt(0, 0))
  return {
    id: 'pocket',
    name: 'Pocket bag',
    start: o.start,
    segs: o.segs,
    cut: 4,
    pair: true,
    fabric: 'main',
    grain: [pt(9, 5), pt(9, 21)],
    notches: [{ at: pt(0, 2) }, { at: pt(0, 17) }],
    labelAt: pt(9, 13),
  }
}

/** Where a piece's outline crosses the level y furthest right: on its side seam. */
export function sideAt(p: Piece, y: number): Pt {
  const pts = polyline(p.start, p.segs, 0.3)
  let best = Number.NEGATIVE_INFINITY
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) best = Math.max(best, a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x))
  }
  return pt(Number.isFinite(best) ? best : 0, y)
}

/** Notches on the side seam for an in-seam pocket, its top `from` down from the waist at `waistY`. */
export const pocketNotches = (p: Piece, waistY: number, from = 3) => [
  { at: sideAt(p, waistY + from) },
  { at: sideAt(p, waistY + from + 15) },
]
