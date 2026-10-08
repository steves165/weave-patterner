import type { Draft } from './weave'

/** One stretch of warp to wind in a single colour. */
export interface WindRun {
  color: string
  count: number
  /** 1-based ends this run covers. */
  from: number
  to: number
}

/** A bout (or chain) of warp, wound and taken off the board together. */
export interface Bout {
  number: number
  from: number
  to: number
  runs: WindRun[]
}

/** Consecutive ends of the same colour, from end 1. Unthreaded ends are still wound (they may be left out later). */
export function windingRuns(colors: string[], offset = 0): WindRun[] {
  const runs: WindRun[] = []
  colors.forEach((c, i) => {
    const color = c.toLowerCase()
    const last = runs[runs.length - 1]
    if (last && last.color === color) {
      last.count++
      last.to = offset + i + 1
    } else runs.push({ color, count: 1, from: offset + i + 1, to: offset + i + 1 })
  })
  return runs
}

/**
 * The warp winding plan: the ends split into bouts of at most `perBout` ends (all in one bout when 0), each listed
 * as runs of one colour in order, so a weaver can wind it on a board or mill.
 */
export function windingPlan(d: Draft, perBout = 0): Bout[] {
  const size = perBout > 0 ? perBout : d.ends
  const bouts: Bout[] = []
  for (let start = 0; start < d.ends; start += size) {
    const colors = d.warpColors.slice(start, start + size)
    bouts.push({
      number: bouts.length + 1,
      from: start + 1,
      to: start + colors.length,
      runs: windingRuns(colors, start),
    })
  }
  return bouts
}

/** Ends of each colour in the whole warp, most first. */
export function colorTotals(colors: string[]): { color: string; count: number }[] {
  const totals = new Map<string, number>()
  for (const c of colors) totals.set(c.toLowerCase(), (totals.get(c.toLowerCase()) ?? 0) + 1)
  return [...totals].map(([color, count]) => ({ color, count })).sort((a, b) => b.count - a.count)
}
