import { colorLetter, isRightSide, type KnitChart, rowsOf, widthOf } from './chart'

export interface IntarsiaRow {
  /** 1-based. */
  row: number
  /** The areas of colour in the order they're worked: the colour, and how many stitches. */
  areas: { color: number; stitches: number }[]
  /** Colour changes in the row, each needing the yarns twisted. */
  twists: number
}

export interface Intarsia {
  /** Separate bobbins (or lengths of yarn) needed: one for each area of colour, by colour. */
  bobbins: { color: number; count: number }[]
  total: number
  rows: IntarsiaRow[]
}

/**
 * Intarsia: each area of colour is worked with its own bobbin, the yarns twisted where colours meet so no holes
 * form. Areas are the squares of one colour joined side by side or above and below; "no stitch" squares are left
 * out. Each row lists its areas in the order they're worked (from the right on right-side rows).
 */
export function intarsia(k: KnitChart): Intarsia {
  const [rows, w] = [rowsOf(k), widthOf(k)]
  const seen = Array.from({ length: rows }, () => Array<boolean>(w).fill(false))
  const counts = new Map<number, number>()
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < w; c++) {
      if (seen[r][c] || k.stitch[r][c] === 'none') continue
      const color = k.color[r][c]
      counts.set(color, (counts.get(color) ?? 0) + 1)
      // Fill the area this square belongs to.
      const stack = [[r, c]]
      seen[r][c] = true
      while (stack.length) {
        const [y, x] = stack.pop() as number[]
        for (const [dy, dx] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const [ny, nx] = [y + dy, x + dx]
          if (ny < 0 || nx < 0 || ny >= rows || nx >= w || seen[ny][nx]) continue
          if (k.stitch[ny][nx] === 'none' || k.color[ny][nx] !== color) continue
          seen[ny][nx] = true
          stack.push([ny, nx])
        }
      }
    }
  const bobbins = [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([color, count]) => ({ color, count }))
  const out: IntarsiaRow[] = k.stitch.map((row, r) => {
    const order = isRightSide(k, r) ? [...row.keys()].reverse() : [...row.keys()]
    const areas: { color: number; stitches: number }[] = []
    for (const c of order) {
      if (row[c] === 'none') continue
      const color = k.color[r][c]
      const last = areas[areas.length - 1]
      if (last?.color === color) last.stitches++
      else areas.push({ color, stitches: 1 })
    }
    return { row: r + 1, areas, twists: Math.max(0, areas.length - 1) }
  })
  return { bobbins, total: bobbins.reduce((n, b) => n + b.count, 0), rows: out }
}

/** "A 10, B 4, A 10". */
export const areasText = (row: IntarsiaRow) => row.areas.map((a) => `${colorLetter(a.color)} ${a.stitches}`).join(', ')
