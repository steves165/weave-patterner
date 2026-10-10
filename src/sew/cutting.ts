/**
 * Cutting layouts: the pieces placed on the fabric with their grainlines along its length, on the fold or folded in
 * half (selvedge to selvedge) when they'll fit, otherwise on a single layer. Pieces are packed by their shapes (on a
 * centimetre grid), so sleeves tuck in beside bodices; the length used is the fabric to buy.
 */
import { bounds, inside, type Pt, pt } from './geometry'
import { type Allowances, type Fabric, outlines, type Piece } from './pattern'

export interface Placement {
  piece: Piece
  /** The cutting line on the fabric: x along the length, y across from the fold (or selvedge). */
  pts: Pt[]
  /** Turned round (one-way fabrics never are), or flipped over to cut the other of a pair on a single layer. */
  turned: boolean
  flipped: boolean
}

export interface CutLayout {
  fabric: Fabric
  /** The fabric's width, cm. */
  width: number
  /** Folded selvedge to selvedge (cutting two layers at once), or a single layer. */
  folded: boolean
  /** The length used, cm. */
  length: number
  placements: Placement[]
  /** Pieces too big for this fabric at all. */
  missing: Piece[]
}

const CELL = 1

type Grid = { w: number; h: number; cells: Uint8Array }

/** The cells a polygon covers (its edges included), at offset 0. */
function rasterise(pts: Pt[]): { grid: Grid; ox: number; oy: number } {
  const b = bounds(pts)
  const ox = Math.floor(b.x)
  const oy = Math.floor(b.y)
  const w = Math.ceil(b.x + b.w) - ox + 1
  const h = Math.ceil(b.y + b.h) - oy + 1
  const cells = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (inside(pt(ox + x + 0.5, oy + y + 0.5), pts)) cells[y * w + x] = 1
  // The edges too, so pieces never quite touch.
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const c = pts[(i + 1) % pts.length]
    const n = Math.ceil(Math.hypot(c.x - a.x, c.y - a.y) / 0.3) + 1
    for (let k = 0; k <= n; k++) {
      const x = Math.floor(a.x + ((c.x - a.x) * k) / n) - ox
      const y = Math.floor(a.y + ((c.y - a.y) * k) / n) - oy
      if (x >= 0 && y >= 0 && x < w && y < h) cells[y * w + x] = 1
    }
  }
  return { grid: { w, h, cells }, ox, oy }
}

/** The piece's cutting line on the fabric for an orientation: its grain (y) runs along the fabric's length (x). */
function orient(cut: Pt[], turned: boolean, flipped: boolean, quarter: boolean): Pt[] {
  return cut.map((q) => {
    let x = q.y
    let y = q.x
    if (quarter) [x, y] = [q.x, -q.y]
    if (flipped) y = -y
    if (turned) {
      x = -x
      y = -y
    }
    return pt(x, y)
  })
}

/** The cutting line of a piece cut on the fold, opened out: mirrored across its fold (x = 0). */
function unfold(cut: Pt[]): Pt[] {
  const right = cut.filter((q) => q.x >= -0.01)
  // Start at the top of the fold, so the outline runs round the piece and back down the fold.
  let start = 0
  for (let i = 0; i < right.length; i++)
    if (Math.abs(right[i].x) < 0.05 && (Math.abs(right[start].x) >= 0.05 || right[i].y < right[start].y)) start = i
  const ordered = [...right.slice(start), ...right.slice(0, start)]
  return [
    ...ordered,
    ...ordered
      .slice()
      .reverse()
      .map((q) => pt(-q.x, q.y)),
  ]
}

/** Turns a piece so its grainline runs down it (y), for pieces whose grain runs across. */
function alongGrain(cut: Pt[], p: Piece): Pt[] {
  if (!p.grain || p.bias) return cut
  const [a, b] = p.grain
  const angle = Math.atan2(b.y - a.y, b.x - a.x)
  const turn = Math.PI / 2 - angle
  if (Math.abs(Math.sin(turn)) < 1e-6 && Math.cos(turn) > 0) return cut
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  return cut.map((q) => pt(q.x * c - q.y * s, q.x * s + q.y * c))
}

/** Turns a bias piece's cutting line 45°, so its grain is diagonal on the fabric. */
const bias = (cut: Pt[]) => cut.map((q) => pt((q.x - q.y) * Math.SQRT1_2, (q.x + q.y) * Math.SQRT1_2))

/** How many times to place each piece, and how. */
function plan(p: Piece, folded: boolean): { count: number; fold: boolean } {
  if (p.onFold) return { count: p.cut, fold: folded }
  return { count: folded ? Math.ceil(p.cut / 2) : p.cut, fold: false }
}

export interface LayoutOptions {
  /** One-way fabric (a nap or print with a direction): every piece the same way up. */
  oneWay: boolean
  /** Lay out on a single layer even when folding would do. */
  single?: boolean
}

/** Pieces of one fabric laid out on fabric `width` cm wide. */
export function cuttingLayout(
  pieces: Piece[],
  a: Allowances,
  fabric: Fabric,
  width: number,
  o: LayoutOptions,
): CutLayout {
  const these = pieces.filter((p) => p.fabric === fabric || (fabric === 'interfacing' && p.interface))
  const cuts = new Map(these.map((p) => [p, alongGrain(outlines(p, a).cut, p)]))
  const isFree = (p: Piece) => Boolean(p.freeGrain) || (!p.grain && !p.onFold)
  // Folded unless something is too wide for half the fabric.
  const fitsFolded = these.every((p) => {
    const b = bounds(cuts.get(p) ?? [])
    const across = p.onFold ? b.x + b.w : b.w
    return across <= width / 2 || (isFree(p) && !p.onFold && b.h <= width / 2)
  })
  const folded = !o.single && fitsFolded
  const across = Math.floor((folded ? width / 2 : width) / CELL)
  const maxLen = 5000
  const used = new Uint8Array(maxLen * across)
  const placements: Placement[] = []
  const missing: Piece[] = []
  let length = 0

  const jobs = these
    .flatMap((p) => {
      const { count, fold } = plan(p, folded)
      return Array.from({ length: count }, (_, i) => ({ p, fold, flip: !folded && Boolean(p.pair) && i % 2 === 1 }))
    })
    .map((j) => {
      const cut = cuts.get(j.p) ?? []
      const shape = j.p.onFold && !j.fold ? unfold(cut) : cut
      const b = bounds(shape)
      return { ...j, shape: j.p.bias ? bias(shape) : shape, area: b.w * b.h }
    })
    .sort((x, y) => Number(y.fold) - Number(x.fold) || y.area - x.area)

  for (const job of jobs) {
    const free = isFree(job.p) && !job.fold
    const ways: { turned: boolean; quarter: boolean }[] = [{ turned: false, quarter: false }]
    if (!o.oneWay && !job.fold) ways.push({ turned: true, quarter: false })
    if (free) ways.push({ turned: false, quarter: true })
    let best: { x: number; y: number; pts: Pt[]; turned: boolean; end: number } | null = null
    for (const way of ways) {
      const pts = orient(job.shape, way.turned, job.flip, way.quarter)
      const { grid, ox, oy } = rasterise(pts)
      if (grid.h > across) continue
      const ys = job.fold ? [0] : Array.from({ length: across - grid.h + 1 }, (_, i) => i)
      // The fold edge (x = 0 on the piece) sits on the fabric's fold (y = 0).
      const foldShift = job.fold ? -oy : 0
      found: for (let x = 0; x + grid.w <= maxLen; x++) {
        if (best && x + grid.w >= best.end) break
        for (const y of ys) {
          let clash = false
          for (let gy = 0; gy < grid.h && !clash; gy++) {
            const row = (y + gy) * maxLen
            for (let gx = 0; gx < grid.w; gx++)
              if (grid.cells[gy * grid.w + gx] && used[row + x + gx]) {
                clash = true
                break
              }
          }
          if (!clash) {
            const dx = x - ox
            const dy = job.fold ? foldShift : y - oy
            best = { x, y, pts: pts.map((q) => pt(q.x + dx, q.y + dy)), turned: way.turned, end: x + grid.w }
            break found
          }
        }
      }
    }
    if (!best) {
      if (!missing.includes(job.p)) missing.push(job.p)
      continue
    }
    const { grid } = rasterise(best.pts)
    const b = bounds(best.pts)
    const gx0 = Math.floor(b.x)
    const gy0 = Math.floor(b.y)
    for (let gy = 0; gy < grid.h; gy++)
      for (let gx = 0; gx < grid.w; gx++)
        if (grid.cells[gy * grid.w + gx]) {
          const yy = gy0 + gy
          const xx = gx0 + gx
          if (yy >= 0 && yy < across && xx >= 0 && xx < maxLen) used[yy * maxLen + xx] = 1
        }
    placements.push({ piece: job.p, pts: best.pts, turned: best.turned, flipped: job.flip })
    length = Math.max(length, b.x + b.w)
  }
  return { fabric, width, folded, length: placements.length ? length + 2 : 0, placements, missing }
}

/** The fabrics a pattern needs, main first. */
export function fabricsOf(pieces: Piece[]): Fabric[] {
  const order: Fabric[] = ['main', 'contrast', 'lining', 'interfacing']
  return order.filter((f) => pieces.some((p) => p.fabric === f || (f === 'interfacing' && p.interface)))
}

/** Common fabric widths, cm: 90 (interfacing), 115 (quilting cotton), 140 and 150. */
export const FABRIC_WIDTHS = [90, 115, 140, 150]
