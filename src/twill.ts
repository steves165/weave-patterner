import { point, straight } from './tools'
import { type Draft, MAX_SHAFTS, parseDraft } from './weave'

/** How the threading or treadling is drawn: kept as it is, or redrawn over the twill's shafts. */
export type TwillDraw = 'keep' | 'straight' | 'point' | 'broken' | 'asDrawn'

export interface TwillOptions {
  /** Alternate up/down counts, e.g. [2, 1, 1, 2] for a 2/1/1/2 twill on 6 shafts. */
  counts: number[]
  /** How many shafts the twill moves along from one treadle to the next: 1 for a twill, more for an advanced twill. */
  step: number
  /** Z: the diagonal rises to the right (end 1 on the left, pick 1 at the bottom); S: it rises to the left. */
  direction: 'Z' | 'S'
  threading: Exclude<TwillDraw, 'asDrawn'>
  /** 'asDrawn' treadles as the threading is drawn in (tromp as writ). */
  treadling: TwillDraw
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/** A twill's name, as weavers write it: "2/1/1/2 twill", with the step when it is advanced. */
export const twillName = (o: Pick<TwillOptions, 'counts' | 'step' | 'direction'>) =>
  `${o.counts.join('/')} ${o.direction} twill${o.step > 1 ? ` (advancing ${o.step})` : ''}`

/**
 * The tie-up: treadle t lifts the up/down pattern turned `step` shafts along per treadle, up the shafts for a Z twill
 * and down them for an S twill. The step has to share no factor with the shafts, or some sheds would repeat and some
 * shafts never move together.
 */
export function twillTieup(counts: number[], step: number, direction: 'Z' | 'S'): boolean[][] {
  const shafts = counts.reduce((a, b) => a + b, 0)
  if (shafts < 2 || shafts > MAX_SHAFTS)
    throw new Error(`The counts add up to ${shafts}; use 2 to ${MAX_SHAFTS} shafts`)
  if (!Number.isInteger(step) || step < 1 || step >= shafts)
    throw new Error(`The step must be a whole number from 1 to ${shafts - 1}`)
  if (gcd(step, shafts) !== 1)
    throw new Error(`A step of ${step} shares a factor with ${shafts} shafts, so the twill wouldn't use every shed`)
  const ups = counts.flatMap((n, i) => Array<boolean>(n).fill(i % 2 === 0))
  const sign = direction === 'Z' ? 1 : -1
  return Array.from({ length: shafts }, (_, s) =>
    Array.from({ length: shafts }, (_, t) => ups[(((s - sign * t * step) % shafts) + shafts) % shafts]),
  )
}

/**
 * Broken twill: a straight draw with every second pair swapped (1 2 4 3, 5 6 8 7…), so the diagonal breaks and the
 * cloth shows no line, while no thread floats further than in the twill itself.
 */
export const broken = (n: number) =>
  straight(n).map((s, i) => (i % 4 === 2 && i + 1 < n ? s + 1 : i % 4 === 3 ? s - 1 : s))

const draws = { straight, point, broken } as const

/** One repeat of a draw over n shafts or treadles, 1-based. */
const drawn = (kind: 'straight' | 'point' | 'broken', n: number) =>
  n < 3 && kind === 'point' ? straight(n) : draws[kind](n)

/**
 * The twill on the current draft: its tie-up from the counts, and the threading and treadling kept or redrawn over the
 * twill's shafts. The draft keeps its ends, picks, colours and blocks; the shafts and treadles become the twill's.
 */
export function twillDraft(d: Draft, o: TwillOptions): Draft {
  const tieup = twillTieup(o.counts, o.step, o.direction)
  const n = tieup.length
  let threading: number[]
  if (o.threading === 'keep') {
    const over = d.threading.find((s) => s >= n)
    if (over !== undefined)
      throw new Error(`The threading uses shaft ${over + 1}; this twill has ${n}. Redraw the threading too`)
    threading = d.threading
  } else {
    const seq = drawn(o.threading, n)
    threading = d.threading.map((_, e) => seq[e % seq.length] - 1)
  }
  let treadling: boolean[][]
  if (o.treadling === 'keep') {
    const over = d.treadling.findIndex((row) => row.some((on, t) => on && t >= n))
    if (over >= 0)
      throw new Error(`Pick ${over + 1} uses a treadle past ${n}, the twill's treadles. Redraw the treadling too`)
    treadling = d.treadling.map((row) => Array.from({ length: n }, (_, t) => row[t] ?? false))
  } else {
    const seq = o.treadling === 'asDrawn' ? threading.filter((s) => s >= 0).map((s) => s + 1) : drawn(o.treadling, n)
    if (!seq.length) throw new Error('Nothing is threaded to treadle as drawn in')
    treadling = d.treadling.map((_, p) => Array.from({ length: n }, (_, t) => t === seq[p % seq.length] - 1))
  }
  return parseDraft({ ...d, shafts: n, treadles: n, threading, tieup, treadling })
}
