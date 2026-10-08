import type { Profile } from './blocks'
import { MAX_THREADS } from './tools'
import { type Draft, MAX_SHAFTS, MAX_TREADLES, parseDraft } from './weave'

/**
 * Block structures a profile draft can be turned into.
 * - overshot: 4 blocks on 4 shafts sharing shafts (A 1–2, B 2–3, C 3–4, D 4–1); pattern picks alternate with tabby.
 * - crackle: 4 blocks of 3-shaft point-twill units (A 1-2-3-2 …), joined with incidentals; 2/2 twill tie-up and tabby.
 * - summer-winter: a unit weave on 2 tie-down shafts plus one pattern shaft per block (1-x-2-x), woven with tabby.
 * - bronson: Bronson lace, one pattern shaft per block (1-x-1-x-1-2), lace and plain blocks.
 * - ms-os: M's and O's, 2 blocks on 4 shafts (1-2-1-2-3-4-3-4 and 1-3-1-3-2-4-2-4), ribbed and plain blocks.
 * - damask: turned 5-end satin, 5 shafts per block: pattern blocks warp-faced, the ground weft-faced, as drawloom
 *   damask is woven (each profile unit, its découpure, is 5 ends and 5 picks).
 */
export type BlockWeave = 'overshot' | 'crackle' | 'summer-winter' | 'bronson' | 'ms-os' | 'damask'

export interface BlockColors {
  warp: string
  /** Pattern weft (the only weft for M's and O's). */
  pattern: string
  /** Tabby (ground) weft, between pattern picks. */
  tabby: string
}

interface Spec {
  name: string
  /** Most blocks (and block treadles). */
  maxBlocks: number
  /** Unit weaves can use any profile tie-up; block weaves weave each block on its own block treadle. */
  freeTieup: boolean
  tabby: boolean
}

export const BLOCK_WEAVES: Record<BlockWeave, Spec> = {
  overshot: { name: 'Overshot', maxBlocks: 4, freeTieup: false, tabby: true },
  crackle: { name: 'Crackle', maxBlocks: 4, freeTieup: false, tabby: true },
  'summer-winter': { name: 'Summer and winter', maxBlocks: 10, freeTieup: true, tabby: true },
  bronson: { name: 'Bronson lace', maxBlocks: 10, freeTieup: true, tabby: true },
  'ms-os': { name: "M's and O's", maxBlocks: 2, freeTieup: false, tabby: false },
  damask: { name: 'Damask', maxBlocks: 4, freeTieup: true, tabby: false },
}

/** One pick: the 0-based shafts it lifts, and whether it's a tabby pick. */
interface Pick {
  lift: number[]
  tabby: boolean
}

const CRACKLE_UNITS = [
  [1, 2, 3, 2],
  [2, 3, 4, 3],
  [3, 4, 1, 4],
  [4, 1, 2, 1],
]

/** Crackle threading: block units, dropping a repeated end or adding an incidental so odd and even shafts alternate. */
export function crackleThreading(blocks: number[]): number[] {
  const out: number[] = []
  let previous = -1
  for (const b of blocks) {
    let unit = CRACKLE_UNITS[b - 1]
    const last = out[out.length - 1]
    if (last !== undefined && b !== previous) {
      if (unit[0] === last) unit = unit.slice(1)
      // An incidental goes on the shaft one below the last end of the block before (its first shaft).
      else if (unit[0] % 2 === last % 2) out.push(CRACKLE_UNITS[previous - 1][0])
    }
    out.push(...unit)
    previous = b
  }
  return out.map((s) => s - 1)
}

/** Overshot threading: two ends per block pair per unit, always alternating odd and even shafts for tabby. */
function overshotThreading(blocks: number[]): number[] {
  const pairs = [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 1],
  ]
  const out: number[] = []
  for (const b of blocks)
    for (let i = 0; i < 4; i++) {
      const last = out[out.length - 1]
      const [p, q] = pairs[b - 1]
      // Pick whichever shaft of the pair keeps odd and even alternating.
      out.push(last === undefined ? p : p % 2 !== last % 2 ? p : q)
    }
  return out.map((s) => s - 1)
}

/** Expands a profile into a full draft in the chosen block structure. */
export function blockWeave(weave: BlockWeave, profile: Profile, colors: BlockColors): Draft {
  const spec = BLOCK_WEAVES[weave]
  const blocks = profile.tieup.length
  const blockTreadles = profile.tieup[0]?.length ?? 0
  if (blocks < 1 || blocks > spec.maxBlocks) throw new Error(`${spec.name} has 1 to ${spec.maxBlocks} blocks`)
  if (blockTreadles < 1 || blockTreadles > spec.maxBlocks)
    throw new Error(`${spec.name} has 1 to ${spec.maxBlocks} block treadles`)
  const bad =
    profile.threading.find((b) => b < 1 || b > blocks) ?? profile.treadling.find((t) => t < 1 || t > blockTreadles)
  if (bad !== undefined) throw new Error(`Block ${bad} isn't in the profile tie-up`)
  if (profile.threading.length === 0 || profile.treadling.length === 0) throw new Error('Add at least one profile unit')
  // In block weaves, block treadle k weaves block k as pattern, whatever the profile tie-up says.
  const pattern = (b: number, k: number) => (spec.freeTieup ? profile.tieup[b][k] : b === k)

  let shafts: number
  let threading: number[]
  const all = (n: number) => Array.from({ length: n }, (_, i) => i)
  const tabbyA: Pick = { lift: [], tabby: true }
  const tabbyB: Pick = { lift: [], tabby: true }
  let unitPicks: (k: number) => Pick[]

  switch (weave) {
    case 'overshot':
    case 'crackle': {
      shafts = 4
      threading = weave === 'overshot' ? overshotThreading(profile.threading) : crackleThreading(profile.threading)
      tabbyA.lift = [0, 2]
      tabbyB.lift = [1, 3]
      // Block k's pattern pick lifts the two shafts it doesn't use, so the pattern weft floats over it.
      const patternPick = (k: number): Pick => ({ lift: [(k + 2) % 4, (k + 3) % 4], tabby: false })
      unitPicks = (k) => [patternPick(k), tabbyA, patternPick(k), tabbyB]
      break
    }
    case 'summer-winter': {
      shafts = 2 + blocks
      threading = profile.threading.flatMap((b) => [0, b + 1, 1, b + 1])
      tabbyA.lift = [0, 1]
      tabbyB.lift = all(blocks).map((b) => b + 2)
      // A pattern pick lifts one tie-down shaft and the background blocks, so the weft floats over pattern blocks.
      const background = (k: number) =>
        all(blocks)
          .filter((b) => !pattern(b, k))
          .map((b) => b + 2)
      unitPicks = (k) => [
        { lift: [0, ...background(k)], tabby: false },
        tabbyA,
        { lift: [1, ...background(k)], tabby: false },
        tabbyB,
      ]
      break
    }
    case 'bronson': {
      shafts = 2 + blocks
      threading = profile.threading.flatMap((b) => [0, b + 1, 0, b + 1, 0, 1])
      tabbyA.lift = [0]
      tabbyB.lift = all(shafts).slice(1)
      // A lace pick lifts shaft 2 and the plain (background) blocks; lace blocks float.
      const lace = (k: number): Pick => ({
        lift: [
          1,
          ...all(blocks)
            .filter((b) => !pattern(b, k))
            .map((b) => b + 2),
        ],
        tabby: false,
      })
      unitPicks = (k) => [tabbyA, lace(k), tabbyA, lace(k), tabbyA, tabbyB]
      break
    }
    case 'ms-os': {
      shafts = 4
      const units = [
        [1, 2, 1, 2, 3, 4, 3, 4],
        [1, 3, 1, 3, 2, 4, 2, 4],
      ]
      threading = profile.threading.flatMap((b) => units[b - 1].map((s) => s - 1))
      // Weaving block A alternates lifting 1-2 and 3-4 (ribbed in A, plain in B); block B alternates 1-3 and 2-4.
      const lifts = [
        [
          [0, 1],
          [2, 3],
        ],
        [
          [0, 2],
          [1, 3],
        ],
      ]
      unitPicks = (k) => [0, 1, 0, 1].map((i) => ({ lift: lifts[k][i], tabby: false }))
      break
    }
    case 'damask': {
      const satin = 5
      shafts = satin * blocks
      threading = profile.threading.flatMap((b) => all(satin).map((i) => (b - 1) * satin + i))
      // 5-end satin, counter 2: on pick j one shaft in each block is the odd one out. Pattern blocks lift all but
      // that one (warp-faced); ground blocks lift only that one (weft-faced).
      unitPicks = (k) =>
        all(satin).map((j) => {
          const odd = (2 * j) % satin
          return {
            lift: all(blocks).flatMap((b) =>
              all(satin)
                .filter((i) => (i === odd) !== pattern(b, k))
                .map((i) => b * satin + i),
            ),
            tabby: false,
          }
        })
      break
    }
  }

  const picks = profile.treadling.flatMap((k) => unitPicks(k - 1))
  if (threading.length > MAX_THREADS || picks.length > MAX_THREADS)
    throw new Error(`That profile is too long: it would make more than ${MAX_THREADS} threads`)
  if (shafts > MAX_SHAFTS) throw new Error(`That needs ${shafts} shafts; the limit is ${MAX_SHAFTS}`)

  // One treadle per different shed, in order of first use, with tabby treadles last as is usual.
  const sheds: { key: string; pick: Pick }[] = []
  const order = [...picks.filter((p) => !p.tabby), ...picks.filter((p) => p.tabby)]
  for (const p of order) {
    const key = [...p.lift].sort((a, b) => a - b).join(',')
    if (!sheds.some((s) => s.key === key)) sheds.push({ key, pick: p })
  }
  const treadles = sheds.length
  if (treadles > MAX_TREADLES) throw new Error(`That needs ${treadles} treadles; the limit is ${MAX_TREADLES}`)
  const treadleOf = (p: Pick) => sheds.findIndex((s) => s.key === [...p.lift].sort((a, b) => a - b).join(','))

  return parseDraft({
    shafts,
    treadles,
    ends: threading.length,
    picks: picks.length,
    threading,
    tieup: all(shafts).map((s) => sheds.map((shed) => shed.pick.lift.includes(s))),
    treadling: picks.map((p) => all(treadles).map((t) => t === treadleOf(p))),
    warpColors: threading.map(() => colors.warp.toLowerCase()),
    weftColors: picks.map((p) => (p.tabby ? colors.tabby : colors.pattern).toLowerCase()),
  })
}
