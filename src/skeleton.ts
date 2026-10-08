import { isDirectTieup, liftsPerPick } from './liftplan'
import { type Draft, parseDraft } from './weave'

const key = (s: number[]) => s.join(',')
const union = (a: number[], b: number[]) => [...new Set([...a, ...b])].sort((x, y) => x - y)
const isSubset = (a: number[], b: number[]) => a.every((v) => b.includes(v))

/**
 * A skeleton tie-up: fewer treadles, with some picks made by pressing two treadles at once (their lifts add up, on
 * a rising-shed loom). Picks greedily the treadles that make the most of the sheds the draft needs, from the
 * sheds themselves, single shafts, and the overlaps and differences between sheds. Returns null when it can't
 * save a treadle, or for a lift plan, which has no tie-up to trim.
 */
export function skeletonTieup(d: Draft): { draft: Draft; pressedTogether: number } | null {
  const lifts = liftsPerPick(d)
  const needed = [...new Map(lifts.filter((l) => l.length > 0).map((l) => [key(l), l])).values()]
  // A lift plan is already the barest skeleton: one treadle per shaft, pressed together as needed.
  if (isDirectTieup(d) || needed.length < 3) return null
  const current = d.treadles

  // Candidate treadles: every shed, each single shaft, and the overlaps and differences of pairs of sheds.
  const candidates = new Map<string, number[]>()
  const add = (s: number[]) => s.length > 0 && candidates.set(key(s), s)
  for (const s of needed) add(s)
  for (let shaft = 0; shaft < d.shafts; shaft++) add([shaft])
  for (const a of needed)
    for (const b of needed) {
      add(a.filter((v) => b.includes(v)))
      add(a.filter((v) => !b.includes(v)))
    }

  /** How a shed is made from the chosen treadles: one treadle, two together, or not at all. */
  const make = (shed: number[], chosen: number[][]): number[] | null => {
    const one = chosen.findIndex((c) => key(c) === key(shed))
    if (one >= 0) return [one]
    const parts = chosen.map((c, i) => [c, i] as const).filter(([c]) => isSubset(c, shed))
    for (const [a, i] of parts) for (const [b, j] of parts) if (i < j && key(union(a, b)) === key(shed)) return [i, j]
    return null
  }

  const chosen: number[][] = []
  while (needed.some((s) => !make(s, chosen))) {
    let best: number[] | null = null
    let bestScore = [-1, -1]
    for (const c of candidates.values()) {
      if (chosen.some((x) => key(x) === key(c))) continue
      // Sheds it completes now, then how many sheds it could be part of later.
      const score = [needed.filter((s) => make(s, [...chosen, c])).length, needed.filter((s) => isSubset(c, s)).length]
      if (score[0] > bestScore[0] || (score[0] === bestScore[0] && score[1] > bestScore[1]))
        [best, bestScore] = [c, score]
    }
    if (!best) return null
    chosen.push(best)
    if (chosen.length >= current) return null
  }
  // No better than before (e.g. it's already a skeleton tie-up).
  if (chosen.length >= current) return null

  const ways = lifts.map((l) => (l.length === 0 ? [] : (make(l, chosen) as number[])))
  return {
    draft: parseDraft({
      ...d,
      treadles: chosen.length,
      tieup: Array.from({ length: d.shafts }, (_, s) => chosen.map((c) => c.includes(s))),
      treadling: ways.map((w) => chosen.map((_, t) => w.includes(t))),
    }),
    pressedTogether: ways.filter((w) => w.length === 2).length,
  }
}
