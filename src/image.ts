import type { Profile } from './blocks'

/** RGBA pixels, as from a canvas. */
export interface Pixels {
  data: Uint8ClampedArray | number[]
  width: number
  height: number
}

const luminance = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

/** Average lightness (0 black – 1 white) of each cell when the image is cut into `cols` × `rows`. */
export function lightnessGrid(px: Pixels, cols: number, rows: number): number[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const [x0, x1] = [Math.floor((c * px.width) / cols), Math.max(Math.floor(((c + 1) * px.width) / cols), 1)]
      const [y0, y1] = [Math.floor((r * px.height) / rows), Math.max(Math.floor(((r + 1) * px.height) / rows), 1)]
      let sum = 0
      let n = 0
      for (let y = y0; y < Math.max(y1, y0 + 1); y++)
        for (let x = x0; x < Math.max(x1, x0 + 1); x++) {
          const i = (y * px.width + x) * 4
          sum += luminance(px.data[i], px.data[i + 1], px.data[i + 2])
          n++
        }
      return sum / n
    }),
  )
}

/**
 * A starting threshold halfway between the darkest and lightest cells, so a picture that is mostly dark (or mostly
 * light) still splits into its two tones.
 */
export function midLightness(grid: number[][]): number {
  const all = grid.flat()
  if (all.length === 0) return 0.5
  return (Math.min(...all) + Math.max(...all)) / 2
}

/** Cells darker than `threshold` become pattern (true). */
export const twoTone = (grid: number[][], threshold: number) => grid.map((row) => row.map((v) => v < threshold))

const hamming = (a: boolean[], b: boolean[]) => a.reduce((n, v, i) => n + (v !== b[i] ? 1 : 0), 0)

/**
 * Groups identical lines, then repeatedly merges the two most alike groups (by a majority vote, weighted by how
 * many lines each holds) until at most `max` remain. Returns the group of each line and each group's pattern.
 */
function groupLines(lines: boolean[][], max: number): { groupOf: number[]; patterns: boolean[][] } {
  const groups: { pattern: boolean[]; members: number[] }[] = []
  lines.forEach((line, i) => {
    const same = groups.find((g) => hamming(g.pattern, line) === 0)
    if (same) same.members.push(i)
    else groups.push({ pattern: [...line], members: [i] })
  })
  while (groups.length > max) {
    let best: [number, number, number] = [0, 1, Number.POSITIVE_INFINITY]
    for (let a = 0; a < groups.length; a++)
      for (let b = a + 1; b < groups.length; b++) {
        // Cost: cells that would change, so merging small groups is cheaper.
        const cost =
          hamming(groups[a].pattern, groups[b].pattern) * Math.min(groups[a].members.length, groups[b].members.length)
        if (cost < best[2]) best = [a, b, cost]
      }
    const [a, b] = best
    const [ga, gb] = [groups[a], groups[b]]
    const weight = [ga.members.length, gb.members.length]
    ga.pattern = ga.pattern.map((v, i) => {
      const votes = (v ? weight[0] : 0) + (gb.pattern[i] ? weight[1] : 0)
      return votes * 2 >= weight[0] + weight[1]
    })
    ga.members.push(...gb.members)
    groups.splice(b, 1)
  }
  const groupOf = Array<number>(lines.length)
  groups.forEach((g, gi) => {
    for (const m of g.members) groupOf[m] = gi
  })
  return { groupOf, patterns: groups.map((g) => g.pattern) }
}

/**
 * Turns a two-tone picture into a block profile: each column of the picture becomes a profile unit across the
 * warp and each row a unit along the weft. Columns that are alike share a block, and rows that are alike share a
 * block treadle, so the picture fits in at most `maxBlocks` blocks and `maxTreadles` block treadles. `match` is the
 * share of the picture's cells the profile reproduces exactly.
 */
export function pictureProfile(
  picture: boolean[][],
  maxBlocks: number,
  maxTreadles: number,
): { profile: Profile; match: number } {
  const rows = picture.length
  const cols = picture[0]?.length ?? 0
  if (rows === 0 || cols === 0) throw new Error('The picture is empty')
  const columns = Array.from({ length: cols }, (_, c) => picture.map((row) => row[c]))
  const blocks = groupLines(columns, maxBlocks)
  // Rows, read through the merged columns: one value per block.
  const rowsByBlock = picture.map((_, r) => blocks.patterns.map((pattern) => pattern[r]))
  const treadles = groupLines(rowsByBlock, maxTreadles)
  const tieup = blocks.patterns.map((_, b) => treadles.patterns.map((pattern) => pattern[b]))
  let same = 0
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) if (tieup[blocks.groupOf[c]][treadles.groupOf[r]] === picture[r][c]) same++
  return {
    profile: {
      threading: blocks.groupOf.map((b) => b + 1),
      treadling: treadles.groupOf.map((t) => t + 1),
      tieup,
    },
    match: same / (rows * cols),
  }
}

/**
 * The `k` main colours of an image, by k-means clustering of a sample of its pixels, started from well-spread
 * colours so the result is repeatable. Sorted dark to light.
 */
export function mainColors(px: Pixels, k: number, sample = 4000): string[] {
  const step = Math.max(1, Math.floor((px.width * px.height) / sample))
  const points: [number, number, number][] = []
  for (let i = 0; i < px.width * px.height; i += step) {
    const j = i * 4
    if ((px.data[j + 3] ?? 255) < 128) continue // skip transparent pixels
    points.push([px.data[j], px.data[j + 1], px.data[j + 2]])
  }
  if (points.length === 0) return []
  const dist = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  // Start from the darkest point, then each next start is the point farthest from those chosen.
  const centres = [points.reduce((a, b) => (a[0] + a[1] + a[2] <= b[0] + b[1] + b[2] ? a : b))]
  while (centres.length < Math.min(k, points.length)) {
    const far = points.reduce((best, p) =>
      Math.min(...centres.map((c) => dist(c, p))) > Math.min(...centres.map((c) => dist(c, best))) ? p : best,
    )
    centres.push(far)
  }
  for (let iter = 0; iter < 12; iter++) {
    const sums = centres.map(() => [0, 0, 0, 0])
    for (const p of points) {
      let best = 0
      for (let c = 1; c < centres.length; c++) if (dist(centres[c], p) < dist(centres[best], p)) best = c
      sums[best][0] += p[0]
      sums[best][1] += p[1]
      sums[best][2] += p[2]
      sums[best][3]++
    }
    sums.forEach((s, c) => {
      if (s[3] > 0) centres[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]
    })
  }
  const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
  return centres.sort((a, b) => luminance(a[0], a[1], a[2]) - luminance(b[0], b[1], b[2])).map(hex)
}
