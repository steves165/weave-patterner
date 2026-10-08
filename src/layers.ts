import { computeDrawdown, type Draft } from './weave'

/** One square of the cloth as seen from one side: whether a warp end shows, and its colour. */
export interface Square {
  warp: boolean
  color: string
}

export type Side = 'face' | 'back'

/**
 * Windows of nearby threads used to decide layers: 4 threads (a repeat of double plain weave) and 8 (double 2/2
 * twill), each starting at, centred on or ending at the thread.
 */
const WINDOWS = [4, 8].flatMap((span) => [0, -span / 2, -(span - 1)].map((offset) => ({ span, offset })))
/** How far to look for a visible square to stand in for a hidden one. */
const SEARCH = 4
/** How far a thread's lift rate must stand out from its neighbours' to count as being in another layer. */
const MARGIN = 0.15

/** Sliding-window averages along one axis of a grid, wrapping round the edges (drafts are usually repeats). */
function windowMean(values: number[][], alongRows: boolean, { span: want, offset }: (typeof WINDOWS)[number]) {
  const size = alongRows ? (values[0]?.length ?? 0) : values.length
  const span = Math.min(want, size)
  return values.map((row, r) =>
    row.map((_, c) => {
      let sum = 0
      for (let d = 0; d < span; d++) {
        const i = ((alongRows ? c : r) + offset + d + size * want) % size
        sum += alongRows ? values[r][i] : values[i][c]
      }
      return sum / span
    }),
  )
}

/**
 * The cloth as seen from one side, allowing for layers (double cloth). Over nearby picks, an end lifted much less
 * often than an end beside it is in the lower layer; likewise a pick with many more ends lifted over it than a pick
 * beside it. Where a lower-layer end crosses a lower-layer pick, the crossing is hidden under the upper layer, so the
 * square takes the colour of the nearest visible square in the same end, or failing that the same pick. Single-layer
 * cloth looks just like the drawdown (from the back, the other side of each crossing).
 *
 * "Nearby" is a window of 4 or 8 threads after, around or before each square; each square uses whichever shows the
 * clearest difference between neighbours, so that where blocks meet, a window that stays inside one block wins.
 *
 * The back is drawn as if seen through the cloth, so its columns still line up with the threading.
 */
export function clothView(d: Draft, side: Side, drawdown: boolean[][] = computeDrawdown(d)): Square[][] {
  const { ends, picks } = d
  // From the back, a lifted end is underneath, so everything turns over.
  const up = drawdown.map((row) => row.map((v) => (side === 'face' ? v : !v)))
  const lift = up.map((row) => row.map((v) => (v ? 1 : 0)))
  // How often each end is up over nearby picks, and how many nearby ends are up on each pick, for each window.
  const endRates = WINDOWS.map((w) => windowMean(lift, false, w))
  const pickRates = WINDOWS.map((w) => windowMean(lift, true, w))
  const wrap = (n: number, size: number) => (n + size) % size

  /** Layers alternate thread by thread, so compare a thread with the ones either side of it. */
  const isLower = (rates: number[][][], p: number, e: number, alongEnds: boolean) => {
    let best = -1
    let lower = false
    for (const grid of rates) {
      const own = grid[p][e]
      const [a, b] = alongEnds
        ? [grid[p][wrap(e - 1, ends)], grid[p][wrap(e + 1, ends)]]
        : [grid[wrap(p - 1, picks)][e], grid[wrap(p + 1, picks)][e]]
      const contrast = Math.abs(own - (a + b) / 2)
      if (contrast > best) {
        best = contrast
        // Lower ends are lifted less than a neighbour; lower picks have more ends lifted over them than a neighbour.
        lower = alongEnds ? own < Math.max(a, b) - MARGIN : own > Math.min(a, b) + MARGIN
      }
    }
    return lower
  }
  const hidden = up.map((row, p) => row.map((_, e) => isLower(endRates, p, e, true) && isLower(pickRates, p, e, false)))

  const square = (p: number, e: number): Square =>
    up[p][e] ? { warp: true, color: d.warpColors[e] } : { warp: false, color: d.weftColors[p] }
  return up.map((row, p) =>
    row.map((_, e) => {
      if (!hidden[p][e]) return square(p, e)
      for (let k = 1; k <= SEARCH; k++)
        for (const pp of [p - k, p + k]) if (pp >= 0 && pp < picks && !hidden[pp][e]) return square(pp, e)
      for (let k = 1; k <= SEARCH; k++)
        for (const ee of [e - k, e + k]) if (ee >= 0 && ee < ends && !hidden[p][ee]) return square(p, ee)
      return square(p, e)
    }),
  )
}
