/**
 * Homographies: the mapping of a flat page to a photo or scan of it, taken at any angle. Four points on the page and
 * where they appear in the picture fix the mapping for every other point.
 */

export interface Point {
  x: number
  y: number
}

/** A 3 × 3 matrix, row by row, with the last entry 1. */
export type Homography = number[]

/** Solves A x = b by Gaussian elimination with partial pivoting; null when A is singular. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let pivot = c
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r
    if (Math.abs(m[pivot][c]) < 1e-12) return null
    ;[m[c], m[pivot]] = [m[pivot], m[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = m[r][c] / m[c][c]
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]
    }
  }
  return m.map((row, i) => row[n] / row[i])
}

/** The homography taking each of `from` (four points) to the matching one of `to`, or null if they're degenerate. */
export function homography(from: Point[], to: Point[]): Homography | null {
  const a: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i]
    const { x: u, y: v } = to[i]
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }
  const h = solve(a, b)
  return h ? [...h, 1] : null
}

/** Where a point goes under a homography. */
export function project(h: Homography, p: Point): Point {
  const w = h[6] * p.x + h[7] * p.y + h[8]
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w }
}

/** The inverse homography. */
export function invert(h: Homography): Homography {
  const [a, b, c, d, e, f, g, i, j] = h
  const m = [
    e * j - f * i,
    c * i - b * j,
    b * f - c * e,
    f * g - d * j,
    a * j - c * g,
    c * d - a * f,
    d * i - e * g,
    b * g - a * i,
    a * e - b * d,
  ]
  return m.map((v) => v / m[8])
}

/**
 * The homography that best fits any number (four or more) of matching points, by least squares: with more than four,
 * small errors in each point average out.
 */
export function fitHomography(from: Point[], to: Point[]): Homography | null {
  if (from.length === 4) return homography(from, to)
  // The normal equations, AᵀA h = Aᵀb.
  const ata = Array.from({ length: 8 }, () => Array<number>(8).fill(0))
  const atb = Array<number>(8).fill(0)
  const add = (row: number[], v: number) => {
    for (let i = 0; i < 8; i++) {
      atb[i] += row[i] * v
      for (let j = 0; j < 8; j++) ata[i][j] += row[i] * row[j]
    }
  }
  for (let i = 0; i < from.length; i++) {
    const { x, y } = from[i]
    const { x: u, y: v } = to[i]
    add([x, y, 1, 0, 0, 0, -u * x, -u * y], u)
    add([0, 0, 0, x, y, 1, -v * x, -v * y], v)
  }
  const h = solve(ata, atb)
  return h ? [...h, 1] : null
}
