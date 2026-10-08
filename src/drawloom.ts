import { draftFromCloth } from './analysis'
import { type Draft, defaultDraft, MAX_SHAFTS, MAX_TREADLES } from './weave'

/**
 * A drawloom design: a pattern drawn in units, where each unit is `unit` ends wide (one draw cord, or lash, lifts
 * them together) and `unit` picks tall, woven over a ground weave on a few shafts. Filled units are pattern; on
 * damask the pattern shows warp-faced satin against weft-faced satin, and the other way round on the back.
 */
export interface DrawloomDesign {
  /** pattern[row][col]: true where the unit is pattern. */
  pattern: boolean[][]
  /** Ends (and picks) per unit: the découpure. */
  unit: number
  ground: Ground
  warp: string
  weft: string
}

export type Ground = 'satin5' | 'satin8' | 'twill4'

export const GROUNDS: Record<Ground, { name: string; shafts: number; counter: number }> = {
  satin5: { name: '5-end satin damask', shafts: 5, counter: 2 },
  satin8: { name: '8-end satin damask', shafts: 8, counter: 3 },
  twill4: { name: 'Turned 3/1 twill', shafts: 4, counter: 1 },
}

/**
 * Whether the ground weave binds end e on pick p: the one crossing in each `shafts` that goes against the face.
 * Satins step the binding point on by the counter each pick, so bindings never touch; twill steps by one.
 */
const binding = (g: Ground, e: number, p: number) => {
  const { shafts, counter } = GROUNDS[g]
  return (((e - counter * p) % shafts) + shafts) % shafts === 0
}

/**
 * The cloth, thread by thread: true where warp shows. In pattern units the warp floats over the weft except at the
 * binding points; in ground units the weft floats except at the binding points.
 */
export function drawloomCloth(d: DrawloomDesign): boolean[][] {
  const rows = d.pattern.length
  const cols = d.pattern[0]?.length ?? 0
  return Array.from({ length: rows * d.unit }, (_, p) =>
    Array.from({ length: cols * d.unit }, (_, e) => {
      const pattern = d.pattern[Math.floor(p / d.unit)][Math.floor(e / d.unit)]
      return binding(d.ground, e, p) ? !pattern : pattern
    }),
  )
}

/** Runs of consecutive numbers, written compactly: [1, 2, 3, 7, 9, 10] → "1–3, 7, 9–10". */
export function ranges(ns: number[]): string {
  const out: string[] = []
  for (let i = 0; i < ns.length; ) {
    let j = i
    while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++
    out.push(i === j ? `${ns[i]}` : `${ns[i]}–${ns[j]}`)
    i = j + 1
  }
  return out.join(', ')
}

/**
 * The drawing sequence: for each row of the pattern, which draw cords (1-based units) to pull before weaving its
 * picks. Repeated rows say so, as the drawer only changes the cords when the row changes.
 */
export function drawSequence(d: DrawloomDesign): { row: number; cords: number[]; same: boolean }[] {
  return d.pattern.map((row, r) => ({
    row: r + 1,
    cords: row.flatMap((on, c) => (on ? [c + 1] : [])),
    same: r > 0 && row.every((v, c) => v === d.pattern[r - 1][c]),
  }))
}

/** How the ground shafts are treadled within each row: pick i lifts (or sinks) ground shaft k, 1-based. */
export function groundTreadling(d: DrawloomDesign): number[] {
  const { shafts, counter } = GROUNDS[d.ground]
  return Array.from({ length: d.unit }, (_, p) => ((counter * p) % shafts) + 1)
}

/**
 * The same cloth as a shaft-loom draft, when it fits: each different column of the cloth needs its own shaft and
 * each different row its own treadle, so a pattern with few different unit columns fits on a dobby.
 */
export function drawloomDraft(d: DrawloomDesign): Draft {
  const cloth = drawloomCloth(d)
  const base = defaultDraft()
  const ends = cloth[0]?.length ?? 0
  const picks = cloth.length
  const draft = draftFromCloth(
    cloth,
    { ...base, ends, picks, warpColors: Array(ends).fill(d.warp), weftColors: Array(picks).fill(d.weft) },
    MAX_SHAFTS,
    MAX_TREADLES,
  )
  return draft
}

/** A starting design: a diamond on a 24 × 24 unit grid. */
export function sampleDrawloom(): DrawloomDesign {
  const n = 24
  const pattern = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => Math.abs(r - (n - 1) / 2) + Math.abs(c - (n - 1) / 2) < n / 3),
  )
  return { pattern, unit: 5, ground: 'satin5', warp: '#f2ead8', weft: '#7b1f1f' }
}
