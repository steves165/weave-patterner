import { type Draft, MAX_TREADLES, parseDraft } from './weave'

/** Shafts lifted on each pick (0-based), from the tie-up and treadling. */
export const liftsPerPick = (d: Draft): number[][] =>
  d.treadling.map((pressed) =>
    Array.from({ length: d.shafts }, (_, s) => s).filter((s) => pressed.some((on, t) => on && d.tieup[s][t])),
  )

/** True when treadle n lifts exactly shaft n: the treadling is then a lift plan. */
export const isDirectTieup = (d: Draft) =>
  d.treadles === d.shafts && d.tieup.every((row, s) => row.every((on, t) => on === (s === t)))

/** Converts to a lift plan: one treadle per shaft with a straight tie-up, so each pick names its shafts. */
export function toLiftplan(d: Draft): Draft {
  const lifts = liftsPerPick(d)
  return parseDraft({
    ...d,
    treadles: d.shafts,
    tieup: Array.from({ length: d.shafts }, (_, s) => Array.from({ length: d.shafts }, (_, t) => s === t)),
    treadling: lifts.map((ss) => Array.from({ length: d.shafts }, (_, s) => ss.includes(s))),
  })
}

/**
 * Converts a draft (typically a lift plan) to a tie-up and treadling. Fails if that needs more than `maxTreadles`.
 *
 * With `before`, the same pattern as it was on treadles (before switching to a lift plan), its tie-up is kept: picks
 * whose shed hasn't changed keep the treadles they had, a new shed uses a treadle that already lifts it, and only a
 * shed no treadle lifts gets a new one. Without it, each different shed becomes one treadle, in order of first use.
 */
export function toTreadling(d: Draft, maxTreadles = MAX_TREADLES, before?: Draft): Draft {
  const lifts = liftsPerPick(d)
  const key = (shafts: number[]) => shafts.join(',')
  // Each treadle's shafts; the earlier tie-up's to start with, cut or padded to this draft's shafts.
  const sheds: number[][] = before
    ? Array.from({ length: before.treadles }, (_, t) =>
        before.tieup.flatMap((row, s) => (row[t] && s < d.shafts ? [s] : [])),
      )
    : []
  const earlier = before ? liftsPerPick(before).map((ss) => key(ss.filter((s) => s < d.shafts))) : []
  const treadling = lifts.map((ss, pick) => {
    if (ss.length === 0) return [] as number[]
    if (before && earlier[pick] === key(ss)) return before.treadling[pick].flatMap((on, t) => (on ? [t] : []))
    let t = sheds.findIndex((shed) => key(shed) === key(ss))
    if (t < 0) t = sheds.push(ss) - 1
    return [t]
  })
  if (sheds.length > maxTreadles)
    throw new Error(
      before
        ? `This pattern needs ${sheds.length} treadles for its sheds; a tie-up can only have ${maxTreadles}`
        : `This pattern uses ${sheds.length} different sheds; a tie-up can only have ${maxTreadles} treadles`,
    )
  const treadles = Math.max(2, sheds.length)
  return parseDraft({
    ...d,
    treadles,
    tieup: Array.from({ length: d.shafts }, (_, s) =>
      Array.from({ length: treadles }, (_, t) => sheds[t]?.includes(s) ?? false),
    ),
    treadling: treadling.map((pressed) => Array.from({ length: treadles }, (_, t) => pressed.includes(t))),
  })
}
