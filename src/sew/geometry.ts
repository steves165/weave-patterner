/**
 * Sewing pattern geometry, in centimetres with y pointing down (as on screen and paper). A piece's outline is the
 * sewing line, made of straight and curved (cubic) segments; each segment says what happens along it (sewn, on the
 * fold, hemmed), which decides the allowance added outside it for the cutting line.
 */

export interface Pt {
  x: number
  y: number
}

/** What an edge of a piece is: sewn to another piece, placed on the fold, hemmed, or cut as it is (bound edges). */
export type EdgeKind = 'seam' | 'fold' | 'hem' | 'raw'

/** One segment of an outline, from the end of the one before: a straight line, or a cubic curve with c1 and c2. */
export interface Seg {
  to: Pt
  c1?: Pt
  c2?: Pt
  kind: EdgeKind
}

export const pt = (x: number, y: number): Pt => ({ x, y })
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k })
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const unit = (a: Pt): Pt => {
  const l = Math.hypot(a.x, a.y) || 1
  return { x: a.x / l, y: a.y / l }
}
/** The point `d` along from a towards b. */
export const toward = (a: Pt, b: Pt, d: number): Pt => add(a, scale(unit(sub(b, a)), d))

/** A point on a cubic curve. */
export function bezier(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  }
}

/** A segment as points (its start left out), curves cut into short straight pieces. */
export function flattenSeg(from: Pt, s: Seg, step = 0.5): Pt[] {
  if (!s.c1 || !s.c2) return [s.to]
  const rough = dist(from, s.c1) + dist(s.c1, s.c2) + dist(s.c2, s.to)
  const n = Math.max(4, Math.min(200, Math.ceil(rough / step)))
  const out: Pt[] = []
  for (let i = 1; i <= n; i++) out.push(bezier(from, s.c1, s.c2, s.to, i / n))
  return out
}

/** The length of a run of segments (a seam, say), from `from`. */
export function pathLength(from: Pt, segs: Seg[]): number {
  let len = 0
  let at = from
  for (const s of segs) {
    let prev = at
    for (const p of flattenSeg(at, s, 0.1)) {
      len += dist(prev, p)
      prev = p
    }
    at = s.to
  }
  return len
}

/** Points along segments from `from`, including it. */
export function polyline(from: Pt, segs: Seg[], step = 0.5): Pt[] {
  const out = [from]
  let at = from
  for (const s of segs) {
    out.push(...flattenSeg(at, s, step))
    at = s.to
  }
  return out
}

/** Signed area of a closed polygon: positive when it runs clockwise on screen (y down). */
export function area(pts: Pt[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export function bounds(pts: Pt[]): Box {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of pts) {
    x0 = Math.min(x0, p.x)
    y0 = Math.min(y0, p.y)
    x1 = Math.max(x1, p.x)
    y1 = Math.max(y1, p.y)
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Where lines (a, a + da) and (b, b + db) cross, or null when they're (nearly) parallel. */
function cross(a: Pt, da: Pt, b: Pt, db: Pt): Pt | null {
  const det = da.x * db.y - da.y * db.x
  if (Math.abs(det) < 1e-9 * Math.hypot(da.x, da.y) * Math.hypot(db.x, db.y) || Math.abs(det) < 1e-12) return null
  const t = ((b.x - a.x) * db.y - (b.y - a.y) * db.x) / det
  return add(a, scale(da, t))
}

/**
 * The cutting line: the outline moved out by each edge's allowance, corners meeting where the moved edges
 * cross (cut off square when that's far out, as at a sharp point). Edges with no allowance (folds) stay where they are.
 */
export function offsetOutline(start: Pt, segs: Seg[], allowance: (kind: EdgeKind) => number): Pt[] {
  // Each short straight piece of the outline, with the allowance of the edge it belongs to.
  const pieces: { a: Pt; b: Pt; d: number }[] = []
  let at = start
  for (const s of segs) {
    const d = allowance(s.kind)
    let prev = at
    for (const p of flattenSeg(at, s, 0.4)) {
      if (dist(prev, p) > 1e-6) pieces.push({ a: prev, b: p, d })
      prev = p
    }
    at = s.to
  }
  const n = pieces.length
  if (n < 3) return []
  // Outward is to the left of the direction of travel for a clockwise outline on screen (y down); either way works.
  const turn = area(pieces.map((p) => p.a)) >= 0 ? 1 : -1
  const moved = pieces.map(({ a, b, d }) => {
    const dir = unit(sub(b, a))
    const out = { x: dir.y * turn, y: -dir.x * turn }
    return { a: add(a, scale(out, d)), b: add(b, scale(out, d)), dir, out, d }
  })
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const p = moved[(i + n - 1) % n]
    const q = moved[i]
    const corner = pieces[i].a
    const meet = cross(p.a, p.dir, q.a, q.dir)
    const far = 3 * Math.max(p.d, q.d, 0.3)
    if (meet && dist(meet, corner) <= far) pts.push(meet)
    else if (!meet) pts.push(add(corner, scale(q.out, q.d)))
    else {
      // A sharp point: square it off rather than run far out.
      pts.push(add(p.b, scale(p.dir, Math.min(far, p.d))), add(q.a, scale(q.dir, -Math.min(far, q.d))))
    }
  }
  return removeLoops(pts)
}

/** Takes out the little loops an offset makes inside tight inward curves. */
function removeLoops(pts: Pt[]): Pt[] {
  const out = pts.slice()
  // Only nearby segments can loop back on each other here, so look a short way ahead.
  for (let i = 0; i < out.length - 1; i++) {
    for (let j = i + 2; j < Math.min(out.length - 1, i + 24); j++) {
      const hit = segmentsCross(out[i], out[i + 1], out[j], out[j + 1])
      if (hit) {
        out.splice(i + 1, j - i, hit)
        break
      }
    }
  }
  return out
}

function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const r = sub(b, a)
  const s = sub(d, c)
  const det = r.x * s.y - r.y * s.x
  if (Math.abs(det) < 1e-12) return null
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / det
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / det
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9 ? add(a, scale(r, t)) : null
}

/** A copy of segments moved, mirrored or turned by a function of each point. */
export function mapSegs(segs: Seg[], f: (p: Pt) => Pt): Seg[] {
  return segs.map((s) => ({ ...s, to: f(s.to), ...(s.c1 && s.c2 ? { c1: f(s.c1), c2: f(s.c2) } : {}) }))
}

/** Segments run backwards, from their end to `start`. */
export function reverseSegs(start: Pt, segs: Seg[]): Seg[] {
  const starts = [start, ...segs.map((s) => s.to)]
  return segs
    .map((s, i) => ({ to: starts[i], kind: s.kind, ...(s.c1 && s.c2 ? { c1: s.c2, c2: s.c1 } : {}) }))
    .reverse()
}

/** Cubic curves for a circular arc around `c` of radius r from angle a0 to a1 (radians, y down), in quarter turns. */
export function arc(c: Pt, r: number, a0: number, a1: number, kind: EdgeKind): Seg[] {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2) - 1e-9))
  const step = (a1 - a0) / n
  const k = (4 / 3) * Math.tan(step / 4) * r
  const at = (a: number) => pt(c.x + r * Math.cos(a), c.y + r * Math.sin(a))
  const segs: Seg[] = []
  for (let i = 0; i < n; i++) {
    const s = a0 + i * step
    const e = s + step
    const p0 = at(s)
    const p3 = at(e)
    segs.push({
      to: p3,
      c1: pt(p0.x - k * Math.sin(s), p0.y + k * Math.cos(s)),
      c2: pt(p3.x + k * Math.sin(e), p3.y - k * Math.cos(e)),
      kind,
    })
  }
  return segs
}

/** The point and direction a distance along a polyline (clamped to its ends). */
export function along(pts: Pt[], d: number): { p: Pt; dir: Pt } {
  let left = Math.max(0, d)
  for (let i = 1; i < pts.length; i++) {
    const l = dist(pts[i - 1], pts[i])
    if (left <= l || i === pts.length - 1) {
      const t = l > 0 ? Math.min(1, left / l) : 0
      return { p: lerp(pts[i - 1], pts[i], t), dir: unit(sub(pts[i], pts[i - 1])) }
    }
    left -= l
  }
  return { p: pts[0] ?? pt(0, 0), dir: pt(1, 0) }
}

export function polyLength(pts: Pt[]): number {
  let l = 0
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i])
  return l
}

/** Whether a point is inside a polygon. */
export function inside(p: Pt, poly: Pt[]): boolean {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit
  }
  return hit
}
