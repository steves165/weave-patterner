import { parallel } from './network'
import { MAX_THREADS } from './tools'
import { type Draft, MAX_SHAFTS, parseDraft } from './weave'

export interface EchoOptions {
  /** The design line: 1-based shafts, e.g. a point or network draw. */
  base: number[]
  shafts: number
  /** How many shafts along the echo line runs (it shouldn't be within one of the first line). */
  shift: number
  /**
   * The twill the tie-up rotates, as alternate up/down counts that add up to the shafts, e.g. "3/1/1/3" on 8:
   * up 3, down 1, up 1, down 3.
   */
  tieup: number[]
  colorA: string
  colorB: string
  weft: string
}

/** Parses "3/1/1/3" into [3, 1, 1, 3]. */
export function parseTwill(text: string): number[] {
  const parts = text.split('/').map((p) => Number(p.trim()))
  if (parts.length < 2 || parts.some((n) => !Number.isInteger(n) || n < 1))
    throw new Error('Write the tie-up as up/down counts, like 2/2 or 3/1/1/3')
  if (parts.length % 2 === 1) throw new Error('A tie-up needs as many down counts as up counts, like 3/1 or 1/2/2/3')
  return parts
}

/** Treadle t lifts the shafts where the rotating up/down pattern is up. */
export function rotatingTieup(shafts: number, pattern: number[]): boolean[][] {
  const sum = pattern.reduce((a, b) => a + b, 0)
  if (sum !== shafts) throw new Error(`The tie-up counts add up to ${sum}; they need to add up to ${shafts} shafts`)
  const ups = pattern.flatMap((n, i) => Array<boolean>(n).fill(i % 2 === 0))
  return Array.from({ length: shafts }, (_, s) =>
    Array.from({ length: shafts }, (_, t) => ups[(s - t + shafts) % shafts]),
  )
}

/**
 * Echo weave: the design line threaded alongside a copy `shift` shafts along, end by end, in two alternating
 * colours, so the pattern seems to echo. Woven with a rotating twill tie-up, treadled as the design line is drawn
 * in (so the cloth comes out square), in one weft.
 */
export function echoDraft(o: EchoOptions): Draft {
  if (o.shafts < 4 || o.shafts > MAX_SHAFTS) throw new Error(`Use 4 to ${MAX_SHAFTS} shafts`)
  if (o.base.length === 0) throw new Error('Give a design line')
  const threading = parallel(o.base, o.shafts, o.shift).map((s) => s - 1)
  if (threading.length > MAX_THREADS)
    throw new Error(`That would make ${threading.length} ends; the limit is ${MAX_THREADS}`)
  const tieup = rotatingTieup(o.shafts, o.tieup)
  const treadles = Array.from({ length: threading.length }, (_, p) => o.base[p % o.base.length] - 1)
  return parseDraft({
    shafts: o.shafts,
    treadles: o.shafts,
    ends: threading.length,
    picks: treadles.length,
    threading,
    tieup,
    treadling: treadles.map((t) => Array.from({ length: o.shafts }, (_, i) => i === t)),
    warpColors: threading.map((_, e) => (e % 2 === 0 ? o.colorA : o.colorB).toLowerCase()),
    weftColors: treadles.map(() => o.weft.toLowerCase()),
  })
}
