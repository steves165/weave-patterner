import { type KnitChart, rowsOf, widthOf } from './chart'
import type { StitchId } from './stitches'

/** How much more yarn a square takes than a plain knit stitch. */
const FACTOR: Partial<Record<StitchId, number>> = {
  yo: 0.7,
  yo2: 1.4,
  m1l: 0.8,
  m1r: 0.8,
  m1p: 0.8,
  kfb: 2,
  k2tog: 1.1,
  ssk: 1.1,
  k3tog: 1.15,
  sssk: 1.15,
  cdd: 1.15,
  ktbl: 1.05,
  mb: 6,
  nupp: 4,
  rc1: 1.05,
  lc1: 1.05,
  rt: 1.05,
  lt: 1.05,
  rc2: 1.1,
  lc2: 1.1,
  rc3: 1.12,
  lc3: 1.12,
  rc21: 1.08,
  lc21: 1.08,
  rpc21: 1.08,
  lpc21: 1.08,
  rpc2: 1.1,
  lpc2: 1.1,
  none: 0,
  rest: 0,
}

/** Extra allowed on top of the estimate: for the swatch, seams and weaving in. */
export const ALLOWANCE = 0.1

/**
 * Yarn per colour, in metres, for a piece `widthCm` × `lengthCm` knitted in the chart's pattern at its gauge.
 *
 * A stitch's loop takes about 2.2 × (its width + its height) of yarn, the usual rule of thumb for stockinette; other
 * stitches take more or less (a bobble about six stitches' worth, a yarn over less). Slipped stitches take only the
 * yarn carried past them. In rows knitted in two or more colours, each colour is carried behind the stitches of the
 * others, between its first and last stitch in the row (a stranded float); in intarsia nothing is carried. Includes 10% extra.
 */
export function yarnNeeded(k: KnitChart, widthCm: number, lengthCm: number): { color: number; metres: number }[] {
  const w = 10 / k.gauge.stitches
  const h = 10 / k.gauge.rows
  const loop = 2.2 * (w + h)
  const perChart = new Map<number, number>()
  const add = (color: number, cm: number) => perChart.set(color, (perChart.get(color) ?? 0) + cm)
  k.stitch.forEach((row, r) => {
    const colors = row.flatMap((s, c) => (s === 'none' || s === 'rest' || s === 'sl' ? [] : [k.color[r][c]]))
    row.forEach((s, c) => {
      if (s === 'none' || s === 'rest') return
      // A slipped stitch takes only the yarn carried past it: the row's working yarn.
      if (s === 'sl') add(colors[0] ?? k.color[r][c], w)
      else add(k.color[r][c], loop * (FACTOR[s] ?? 1))
    })
    // Stranded floats: each colour runs behind the others' stitches between its first and last stitch.
    const used = [...new Set(colors)]
    if (used.length > 1 && k.colorwork !== 'intarsia')
      for (const color of used) {
        const first = colors.indexOf(color)
        const last = colors.lastIndexOf(color)
        let behind = 0
        for (let i = first; i <= last; i++) if (colors[i] !== color) behind++
        add(color, behind * w)
      }
  })
  // The chart repeats across the width and up the length.
  const across = (widthCm * k.gauge.stitches) / 10 / Math.max(1, widthOf(k))
  const up = (lengthCm * k.gauge.rows) / 10 / Math.max(1, rowsOf(k))
  return [...perChart.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([color, cm]) => ({ color, metres: (cm * across * up * (1 + ALLOWANCE)) / 100 }))
}
