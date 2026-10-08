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
 * Converts a draft (typically a lift plan) to a tie-up and single-treadle treadling: each different combination
 * of lifted shafts becomes one treadle, in order of first use. Fails if that needs more than `maxTreadles`.
 */
export function toTreadling(d: Draft, maxTreadles = MAX_TREADLES): Draft {
  const lifts = liftsPerPick(d)
  const combos: string[] = []
  for (const ss of lifts) {
    const key = ss.join(',')
    if (ss.length > 0 && !combos.includes(key)) combos.push(key)
  }
  if (combos.length > maxTreadles)
    throw new Error(
      `This pattern uses ${combos.length} different sheds; a tie-up can only have ${maxTreadles} treadles`,
    )
  const treadles = Math.max(2, combos.length)
  const sets = combos.map((k) => k.split(',').map(Number))
  return parseDraft({
    ...d,
    treadles,
    tieup: Array.from({ length: d.shafts }, (_, s) =>
      Array.from({ length: treadles }, (_, t) => sets[t]?.includes(s) ?? false),
    ),
    treadling: lifts.map((ss) => {
      const t = combos.indexOf(ss.join(','))
      return Array.from({ length: treadles }, (_, i) => i === t)
    }),
  })
}
