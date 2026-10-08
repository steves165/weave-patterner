import type { Profile } from './blocks'
import { MAX_THREADS } from './tools'
import { type Draft, MAX_SHAFTS, MAX_TREADLES, parseDraft } from './weave'

/** The weave each layer uses: plain weave (2 shafts per layer) or 2/2 twill (4 shafts per layer). */
export type LayerWeave = 'plain' | 'twill'

/**
 * - separate: two unconnected layers, A on top.
 * - tubular: one shuttle goes round both layers, joining them at both edges into a tube.
 * - double-width: one shuttle weaves top, bottom, bottom, top, joining the layers at one edge only, so the cloth
 *   opens out to twice the width.
 * - blocks: the layers swap places by block (pick-up style double weave), following a block profile.
 */
export type Structure = 'separate' | 'tubular' | 'double-width' | 'blocks'

export interface DoubleClothOptions {
  structure: Structure
  weave: LayerWeave
  /** Layer A's yarns (on top unless a block profile says otherwise) and layer B's. */
  warpA: string
  warpB: string
  weftA: string
  weftB: string
  /** Number of weave repeats across and along, for every structure except blocks. */
  repeats: number
  /** Blocks only. tieup[block][blockTreadle] is true where layer A is on top. */
  profile?: Profile
}

/** Which layer each end or pick belongs to (0 = A, 1 = B), plus its place in that layer's weave. */
interface Thread {
  layer: 0 | 1
  index: number
}

export const shaftsPerLayer = (weave: LayerWeave) => (weave === 'plain' ? 2 : 4)

/** One repeat of ends: A and B alternating, each straight-drawn on its layer's shafts. */
const endUnit = (n: number): Thread[] =>
  Array.from({ length: 2 * n }, (_, i) => ({ layer: (i % 2) as 0 | 1, index: i >> 1 }))

/** One repeat of picks. Double width weaves top, bottom, bottom, top so the shuttle only turns at one edge. */
function pickUnit(n: number, structure: Structure): Thread[] {
  return Array.from({ length: n }, (_, j) => {
    const order: (0 | 1)[] = structure === 'double-width' && j % 2 === 1 ? [1, 0] : [0, 1]
    return order.map((layer) => ({ layer, index: j }))
  }).flat()
}

/** Within one layer's weave, does that layer's shaft k lift on that layer's pick j? */
const weaveLifts = (n: number, k: number, j: number) => (k - j + n) % n < n / 2

/**
 * Generates a double-cloth draft. Each block uses 2n shafts: n for layer A then n for layer B. Each pick of the
 * layer on top lifts that layer's weave; each pick of the layer underneath lifts every top-layer shaft out of the
 * way plus the lower layer's weave.
 */
export function doubleCloth(o: DoubleClothOptions): Draft {
  const n = shaftsPerLayer(o.weave)
  const blocks = o.structure === 'blocks'
  const profile: Profile = blocks
    ? (o.profile ?? { threading: [1], treadling: [1], tieup: [[true]] })
    : {
        threading: Array(o.repeats).fill(1),
        treadling: Array(o.repeats).fill(1),
        tieup: [[true]],
      }
  const blockCount = profile.tieup.length
  const blockTreadles = profile.tieup[0]?.length ?? 0
  if (!blocks && (!Number.isInteger(o.repeats) || o.repeats < 1)) throw new Error('Use at least one repeat')
  if (blockCount < 1 || blockTreadles < 1) throw new Error('The profile needs at least one block and block treadle')
  const bad =
    profile.threading.find((b) => b < 1 || b > blockCount) ?? profile.treadling.find((t) => t < 1 || t > blockTreadles)
  if (bad !== undefined) throw new Error(`Block ${bad} isn't in the profile tie-up`)
  if (profile.threading.length === 0 || profile.treadling.length === 0) throw new Error('Add at least one profile unit')

  const shafts = blockCount * 2 * n
  const treadles = blockTreadles * 2 * n
  if (shafts > MAX_SHAFTS)
    throw new Error(`That needs ${shafts} shafts (${2 * n} per block); the limit is ${MAX_SHAFTS}`)
  if (treadles > MAX_TREADLES)
    throw new Error(`That needs ${treadles} treadles (${2 * n} per block treadle); the limit is ${MAX_TREADLES}`)

  const ends = profile.threading.flatMap((b) => endUnit(n).map((t) => ({ ...t, block: b - 1 })))
  const picks = profile.treadling.flatMap((k) => pickUnit(n, o.structure).map((t) => ({ ...t, block: k - 1 })))
  if (ends.length > MAX_THREADS || picks.length > MAX_THREADS)
    throw new Error(`That would make ${Math.max(ends.length, picks.length)} threads; the limit is ${MAX_THREADS}`)

  // Shaft for (block, layer, index in layer) and treadle for (block treadle, layer, pick index in layer).
  const shaftOf = (b: number, layer: number, i: number) => b * 2 * n + layer * n + i
  const treadleOf = (k: number, layer: number, j: number) => k * 2 * n + 2 * j + layer

  const tieup = Array.from({ length: shafts }, () => Array<boolean>(treadles).fill(false))
  for (let b = 0; b < blockCount; b++)
    for (let k = 0; k < blockTreadles; k++) {
      const top = profile.tieup[b][k] ? 0 : 1
      for (let j = 0; j < n; j++)
        for (const layer of [0, 1]) {
          const t = treadleOf(k, layer, j)
          for (let i = 0; i < n; i++) {
            // Picks of the lower layer lift the whole upper layer out of the way.
            if (layer !== top) tieup[shaftOf(b, top, i)][t] = true
            if (weaveLifts(n, i, j)) tieup[shaftOf(b, layer, i)][t] = true
          }
        }
    }

  // One shuttle for a tube or double width, so one weft colour.
  const oneShuttle = o.structure === 'tubular' || o.structure === 'double-width'
  return parseDraft({
    shafts,
    treadles,
    ends: ends.length,
    picks: picks.length,
    threading: ends.map((e) => shaftOf(e.block, e.layer, e.index)),
    tieup,
    treadling: picks.map((p) => {
      const row = Array<boolean>(treadles).fill(false)
      row[treadleOf(p.block, p.layer, p.index)] = true
      return row
    }),
    warpColors: ends.map((e) => (e.layer === 0 ? o.warpA : o.warpB).toLowerCase()),
    weftColors: picks.map((p) => (p.layer === 0 || oneShuttle ? o.weftA : o.weftB).toLowerCase()),
  })
}
