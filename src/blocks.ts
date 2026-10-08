import { type Draft, parseDraft } from './weave'

/** Shafts (and treadles) each block uses in turned twill. */
export const UNIT = 4
/** Most blocks (and block treadles): 6 × 4 = 24 shafts. */
export const MAX_BLOCKS = 6

export interface Profile {
  /** Block (1-based) for each profile unit across the warp. */
  threading: number[]
  /** Block treadle (1-based) for each profile unit along the weft. */
  treadling: number[]
  /** tieup[block][blockTreadle]: true where that block weaves pattern (warp-faced) on that treadle. */
  tieup: boolean[][]
}

/**
 * Block substitution into turned twill: each profile unit becomes 4 ends (a straight draw on the block's own 4
 * shafts) or 4 picks (the block treadle's own 4 treadles). Where the profile tie-up is on, the block weaves 3/1
 * (warp-faced) twill; elsewhere 1/3 (weft-faced). Up to 6 blocks, so up to 24 shafts and treadles.
 */
export function turnedTwill(profile: Profile, warpColors: string[], weftColors: string[]): Draft {
  const blocks = profile.tieup.length
  const blockTreadles = profile.tieup[0]?.length ?? 0
  if (blocks < 1 || blocks > MAX_BLOCKS || blockTreadles < 1 || blockTreadles > MAX_BLOCKS)
    throw new Error(`Use 1 to ${MAX_BLOCKS} blocks and 1 to ${MAX_BLOCKS} block treadles`)
  const bad =
    profile.threading.find((b) => b < 1 || b > blocks) ?? profile.treadling.find((t) => t < 1 || t > blockTreadles)
  if (bad !== undefined) throw new Error(`Block ${bad} isn't in the profile tie-up`)
  if (profile.threading.length === 0 || profile.treadling.length === 0) throw new Error('Add at least one profile unit')

  const shafts = blocks * UNIT
  const treadles = blockTreadles * UNIT
  const threading = profile.threading.flatMap((b) => Array.from({ length: UNIT }, (_, i) => (b - 1) * UNIT + i))
  const treadling = profile.treadling.flatMap((k) =>
    Array.from({ length: UNIT }, (_, i) => Array.from({ length: treadles }, (_, t) => t === (k - 1) * UNIT + i)),
  )
  // Within a block, treadle j of a group lifts shafts j, j+1, j+2 (3/1) or just j (1/3), wrapping inside the block.
  const tieup = Array.from({ length: shafts }, (_, s) =>
    Array.from({ length: treadles }, (_, t) => {
      const [b, i] = [Math.floor(s / UNIT), s % UNIT]
      const [k, j] = [Math.floor(t / UNIT), t % UNIT]
      const offset = (i - j + UNIT) % UNIT
      return profile.tieup[b][k] ? offset < 3 : offset === 0
    }),
  )
  const ends = threading.length
  const picks = treadling.length
  if (ends > 400 || picks > 400) throw new Error('That profile is too long: keep it under 100 units')
  const cycle = (colors: string[], n: number) => Array.from({ length: n }, (_, i) => colors[i % colors.length])
  return parseDraft({
    shafts,
    treadles,
    ends,
    picks,
    threading,
    tieup,
    treadling,
    warpColors: cycle(warpColors, ends),
    weftColors: cycle(weftColors, picks),
  })
}
