/**
 * Your own pieces, added to any pattern: rectangles (bands, ties, ruffles, pockets), circles, and shapes drawn point
 * by point with straight or smooth corners. They get allowances, grainlines and labels like the design's own pieces.
 */
import { circle, Outline, rect } from './draft'
import { area, type EdgeKind, type Pt, pt, type Seg } from './geometry'
import type { Fabric, Piece } from './pattern'

export interface ExtraPoint {
  x: number
  y: number
  /** A smooth curve through this point rather than a corner. */
  smooth?: boolean
}

export interface Extra {
  id: string
  name: string
  shape: 'rect' | 'circle' | 'drawn'
  /** Rectangle size, or the circle's diameter (w), cm. */
  w: number
  h: number
  /** A drawn piece's corners, cm. */
  points: ExtraPoint[]
  cut: number
  /** Cut on the fold, along the left edge (x = 0). */
  onFold: boolean
  /** Cut in mirror-image pairs. */
  pair: boolean
  bias: boolean
  fabric: Fabric
  /** What its edges get: a seam allowance, a hem, or none. */
  edges: EdgeKind
}

export const MAX_EXTRAS = 20

export const newExtra = (shape: Extra['shape'], n: number): Extra => ({
  id: `own-${Date.now().toString(36)}-${n}`,
  name: shape === 'circle' ? 'Circle' : shape === 'drawn' ? `Piece ${n}` : 'Rectangle',
  shape,
  w: shape === 'circle' ? 20 : 40,
  h: shape === 'rect' ? 10 : 20,
  points:
    shape === 'drawn'
      ? [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 25, y: 15, smooth: true },
          { x: 20, y: 30 },
          { x: 0, y: 30 },
        ]
      : [],
  cut: shape === 'rect' ? 2 : 1,
  onFold: false,
  pair: false,
  bias: false,
  fabric: 'main',
  edges: 'seam',
})

const num = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d

/** Pieces read back from a saved project, checked. */
export function parseExtras(x: unknown): Extra[] {
  if (!Array.isArray(x)) return []
  const fabrics: Fabric[] = ['main', 'contrast', 'lining', 'interfacing']
  const edges: EdgeKind[] = ['seam', 'hem', 'raw']
  return x
    .filter((e) => e && typeof e === 'object' && ['rect', 'circle', 'drawn'].includes(e.shape))
    .slice(0, MAX_EXTRAS)
    .map((e, i) => {
      const base = newExtra(e.shape, i + 1)
      const points = Array.isArray(e.points)
        ? e.points
            .filter((q: unknown) => q && typeof q === 'object')
            .slice(0, 100)
            .map((q: { x?: unknown; y?: unknown; smooth?: unknown }) => ({
              x: num(q.x, -500, 500, 0),
              y: num(q.y, -500, 500, 0),
              ...(q.smooth ? { smooth: true } : {}),
            }))
        : base.points
      return {
        id: typeof e.id === 'string' ? e.id : base.id,
        name: typeof e.name === 'string' && e.name.trim() ? e.name.slice(0, 60) : base.name,
        shape: e.shape,
        w: num(e.w, 1, 500, base.w),
        h: num(e.h, 1, 500, base.h),
        points: e.shape === 'drawn' && points.length < 3 ? base.points : points,
        cut: Math.round(num(e.cut, 1, 20, base.cut)),
        onFold: Boolean(e.onFold),
        pair: Boolean(e.pair),
        bias: Boolean(e.bias),
        fabric: fabrics.includes(e.fabric) ? e.fabric : 'main',
        edges: edges.includes(e.edges) ? e.edges : 'seam',
      }
    })
}

/**
 * A drawn outline: straight between corners, and through smooth points a curve (Catmull-Rom, as cubic segments) that
 * passes through each point.
 */
export function drawnSegs(points: ExtraPoint[], kind: EdgeKind, foldLeft: boolean): { start: Pt; segs: Seg[] } {
  const n = points.length
  const at = (i: number) => points[(i + n) % n]
  const segs: Seg[] = []
  for (let i = 0; i < n; i++) {
    const a = at(i)
    const b = at(i + 1)
    // An edge along x = 0 on a piece cut on the fold is the fold.
    const k: EdgeKind = foldLeft && Math.abs(a.x) < 0.01 && Math.abs(b.x) < 0.01 ? 'fold' : kind
    if (!a.smooth && !b.smooth) {
      segs.push({ to: pt(b.x, b.y), kind: k })
      continue
    }
    const p0 = at(i - 1)
    const p3 = at(i + 2)
    // A smooth point's tangent runs between its neighbours; a corner's along the edge itself.
    const t1 = a.smooth ? { x: (b.x - p0.x) / 6, y: (b.y - p0.y) / 6 } : { x: (b.x - a.x) / 3, y: (b.y - a.y) / 3 }
    const t2 = b.smooth ? { x: (p3.x - a.x) / 6, y: (p3.y - a.y) / 6 } : { x: (b.x - a.x) / 3, y: (b.y - a.y) / 3 }
    segs.push({ to: pt(b.x, b.y), c1: pt(a.x + t1.x, a.y + t1.y), c2: pt(b.x - t2.x, b.y - t2.y), kind: k })
  }
  return { start: pt(points[0].x, points[0].y), segs }
}

/** One of your pieces as a pattern piece. */
export function extraPiece(e: Extra): Piece {
  let shape: { start: Pt; segs: Seg[] }
  if (e.shape === 'circle') shape = circle(e.w / 2, e.edges)
  else if (e.shape === 'rect') shape = rect(e.w, e.h, [e.edges, e.edges, e.edges, e.onFold ? 'fold' : e.edges])
  else shape = drawnSegs(e.points, e.edges, e.onFold)
  const pts = [shape.start, ...shape.segs.map((s) => s.to)]
  const xs = pts.map((q) => q.x)
  const ys = pts.map((q) => q.y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  const onFold = e.onFold && shape.segs.some((s) => s.kind === 'fold')
  const outline = new Outline(shape.start).add(shape.segs)
  return {
    id: e.id,
    name: e.name,
    start: outline.start,
    segs: area(pts) === 0 ? shape.segs : outline.segs,
    cut: e.cut,
    pair: e.pair,
    onFold,
    fabric: e.fabric,
    bias: e.bias,
    freeGrain: e.shape === 'circle',
    grain: onFold || e.shape === 'circle' ? undefined : [pt(cx, y0 + (y1 - y0) * 0.2), pt(cx, y0 + (y1 - y0) * 0.8)],
    labelAt: pt(cx, (y0 + y1) / 2 + (y1 - y0) * 0.12),
  }
}
