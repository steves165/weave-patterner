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
