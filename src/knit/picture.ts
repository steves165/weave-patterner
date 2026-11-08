import { mainColors, type Pixels } from '../image'

/**
 * A picture as colourwork: its `count` main colours, and for each square of a cols × rows chart the colour nearest
 * the picture's average there. Rows come back bottom first, as charts are numbered.
 */
export function pictureColors(
  px: Pixels,
  cols: number,
  rows: number,
  count: number,
): { colors: string[]; grid: number[][] } {
  const colors = mainColors(px, count)
  const rgb = colors.map((hex) => {
    const n = Number.parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  })
  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const sum = [0, 0, 0]
      let n = 0
      const y0 = Math.floor((r * px.height) / rows)
      const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * px.height) / rows))
      const x0 = Math.floor((c * px.width) / cols)
      const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * px.width) / cols))
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = (y * px.width + x) * 4
          sum[0] += px.data[i]
          sum[1] += px.data[i + 1]
          sum[2] += px.data[i + 2]
          n++
        }
      const avg = sum.map((v) => v / Math.max(1, n))
      let best = 0
      rgb.forEach((col, i) => {
        const d = (a: number[]) => (a[0] - avg[0]) ** 2 + (a[1] - avg[1]) ** 2 + (a[2] - avg[2]) ** 2
        if (d(col) < d(rgb[best])) best = i
      })
      return best
    }),
  ).reverse()
  return { colors, grid }
}

/**
 * Rows for a picture `stitches` wide, so it keeps its shape when knitted at the gauge (stitches are wider than rows
 * are tall), kept between 1 and `max`.
 */
export function pictureRows(
  px: { width: number; height: number },
  stitches: number,
  gauge: { stitches: number; rows: number },
  max: number,
): number {
  const rows = Math.round((stitches * (px.height / px.width) * gauge.rows) / gauge.stitches)
  return Math.max(1, Math.min(max, rows))
}

/**
 * Tidies stray stitches: a square whose neighbours above, below and either side (those on the chart, at least
 * two) are all one other colour takes that colour, as a lone stitch of colour is fiddly to knit and hardly shows.
 */
export function tidyColors(grid: number[][]): number[][] {
  return grid.map((row, r) =>
    row.map((v, c) => {
      const around = [grid[r - 1]?.[c], grid[r + 1]?.[c], row[c - 1], row[c + 1]].filter(
        (x): x is number => x !== undefined,
      )
      return around.length >= 2 && around.every((x) => x === around[0]) && around[0] !== v ? around[0] : v
    }),
  )
}
