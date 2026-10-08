import { castOn, castOnFor, type KnitChart, repeatStitches } from './chart'
import { yarnNeeded } from './yarn'

/** A size of the piece: its name and finished width and length in cm. */
export type Size = NonNullable<KnitChart['sizes']>[number]

export interface SizePlan extends Size {
  /** Stitches to cast on: whole repeats plus any edge stitches. */
  castOn: number
  repeats: number
  /** The width the cast-on actually gives, in cm. */
  actualWidth: number
  rows: number
  /** Yarn in metres, all colours together. */
  metres: number
}

/** What each size takes: the cast-on in whole repeats nearest its width, the rows for its length, and the yarn. */
export function sizePlans(k: KnitChart, sizes: Size[]): SizePlan[] {
  const boxed = repeatStitches(k)
  const unit = boxed?.repeat ?? castOn(k)
  const edges = boxed?.edges ?? 0
  return sizes.map((s) => {
    const cast = castOnFor(s.width, k.gauge.stitches, unit, edges)
    const actualWidth = (cast * 10) / k.gauge.stitches
    return {
      ...s,
      castOn: cast,
      repeats: Math.round((cast - edges) / Math.max(1, unit)),
      actualWidth,
      rows: Math.round((s.length * k.gauge.rows) / 10),
      metres: yarnNeeded(k, actualWidth, s.length).reduce((n, y) => n + y.metres, 0),
    }
  })
}

/** "(k8, k2tog) 4 times" or "k8, k2tog" or "k2tog". */
const group = (knits: number, action: string, times: number) => {
  const unit = knits > 0 ? `k${knits}, ${action}` : action
  if (times === 1) return unit
  return knits > 0
    ? `(${unit}) ${times === 2 ? 'twice' : `${times} times`}`
    : `${action} ${times === 2 ? 'twice' : `${times} times`}`
}

/**
 * Spreads `change` increases (positive) or decreases (negative) evenly across a row of `stitches`: "(k8, k2tog) 4
 * times, (k7, k2tog) 2 times". Decreases are k2tog (each takes 2 stitches); increases m1. The row is split into as
 * many groups as there are changes, the larger groups first, each ending with its decrease or increase.
 */
export function spreadEvenly(stitches: number, change: number): { text: string; after: number } | { error: string } {
  const n = Math.round(stitches)
  const d = Math.round(Math.abs(change))
  if (n < 1) return { error: 'Give the stitches on the needle.' }
  if (d === 0) return { error: 'Give how many to increase or decrease.' }
  if (change < 0) {
    if (d * 2 > n) return { error: `You can decrease at most ${Math.floor(n / 2)} stitches in one row of ${n}.` }
    const base = Math.floor(n / d)
    const extra = n % d
    const parts = [...(extra ? [group(base + 1 - 2, 'k2tog', extra)] : []), group(base - 2, 'k2tog', d - extra)]
    return { text: parts.join(', '), after: n - d }
  }
  if (d > n) return { error: `That's more than one increase per stitch: at most ${n}.` }
  const base = Math.floor(n / d)
  const extra = n % d
  const parts = [...(extra ? [group(base + 1, 'm1', extra)] : []), group(base, 'm1', d - extra)]
  return { text: parts.join(', '), after: n + d }
}
