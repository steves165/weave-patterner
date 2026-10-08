import { blankChart, type KnitChart, MAX_ROWS, rowsOf, widthOf } from './chart'
import type { StitchId } from './stitches'

export interface MosaicResult {
  chart: KnitChart
  /** Squares where the design couldn't be followed: mosaic can only show the other colour where it was knitted. */
  missed: number
  /** Stitches slipped over two or more row pairs running, which pull the fabric up. */
  longSlips: number
}

/**
 * A two-colour design (each square's colour: the first colour, or any other as the second) as mosaic knitting:
 * each chart row becomes a pair of rows, a right-side row and a wrong-side row worked back over it, in one colour
 * only, alternating A and B from the bottom. Squares meant to be that colour are knitted (and purled back, or
 * knitted back for garter ridges); the others are slipped with the yarn held behind the work, so the stitch below,
 * in the other colour, shows through.
 *
 * A slipped stitch shows the colour it was last knitted in, so a square can only be the other colour if it was
 * knitted in that colour in the pair below (or slipped again, which pulls). Those that can't are counted.
 */
export function mosaic(design: KnitChart, garter = true): MosaicResult {
  const w = widthOf(design)
  const pairs = Math.min(rowsOf(design), Math.floor(MAX_ROWS / 2))
  const colors = [design.colors[0], design.colors[1] ?? '#2e5e8c']
  const out = blankChart(w, pairs * 2, colors)
  const stitch: StitchId[][] = []
  const color: number[][] = []
  // What each column shows, and how many pairs it's been slipped over.
  const shows = Array<number>(w).fill(0)
  const slipped = Array<number>(w).fill(0)
  let missed = 0
  let longSlips = 0
  for (let r = 0; r < pairs; r++) {
    const yarn = r % 2
    const rs: StitchId[] = []
    const ws: StitchId[] = []
    const rowColors: number[] = []
    for (let c = 0; c < w; c++) {
      const want = design.color[r][c] === 0 ? 0 : 1
      if (want === yarn || design.stitch[r][c] === 'none') {
        rs.push('k')
        ws.push(garter ? 'p' : 'k')
        shows[c] = yarn
        slipped[c] = 0
      } else {
        rs.push('sl')
        ws.push('sl')
        slipped[c]++
        if (slipped[c] === 2) longSlips++
        if (shows[c] !== want) missed++
      }
      rowColors.push(shows[c])
    }
    stitch.push(rs, ws)
    color.push(rowColors, [...rowColors])
  }
  return {
    chart: { ...out, mode: 'flat', gauge: design.gauge, floatLimit: design.floatLimit, stitch, color },
    missed,
    longSlips,
  }
}
