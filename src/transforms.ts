import { isDirectTieup, liftsPerPick } from './liftplan'
import { MAX_THREADS } from './tools'
import { type Draft, MAX_SHAFTS, MAX_TREADLES, parseDraft } from './weave'

/**
 * Turns the draft 90°: the ends become picks and the picks become ends, so warp and weft swap. Each different shed
 * becomes a shaft of the turned draft and each old shaft a treadle; the tie-up is turned and inverted, because what
 * showed as warp now shows as weft. Colours move with their threads. Picks with no shed and unthreaded ends survive
 * as unthreaded ends and empty picks.
 */
export function turnDraft(d: Draft): Draft {
  const lifts = liftsPerPick(d)
  // A pick with nothing pressed isn't really a pick; it becomes an unthreaded end.
  const pressed = d.treadling.map((row) => row.some(Boolean))
  const sheds: string[] = []
  const shedOf = lifts.map((l, p) => {
    if (!pressed[p]) return -1
    const k = l.join(',')
    if (!sheds.includes(k)) sheds.push(k)
    return sheds.indexOf(k)
  })
  const shafts = Math.max(1, sheds.length)
  if (shafts > MAX_SHAFTS)
    throw new Error(`Turned, this needs ${shafts} shafts (one per different shed); the limit is ${MAX_SHAFTS}`)
  const treadles = d.shafts
  const shedSets = sheds.map((k) => new Set(k === '' ? [] : k.split(',').map(Number)))
  return parseDraft({
    shafts,
    treadles,
    ends: d.picks,
    picks: d.ends,
    threading: shedOf,
    // Shed c lifted shaft s (warp over weft); turned, that crossing shows the other thread, so the tie-up inverts.
    tieup: Array.from({ length: shafts }, (_, c) => Array.from({ length: treadles }, (_, s) => !shedSets[c]?.has(s))),
    treadling: d.threading.map((s) => Array.from({ length: treadles }, (_, t) => t === s)),
    warpColors: [...d.weftColors],
    weftColors: [...d.warpColors],
  })
}

/**
 * Swaps the face and back weaves: everything that was warp on top becomes weft on top. For a lift plan the lifts
 * invert (so it stays a lift plan); otherwise the tie-up inverts.
 */
export function invertDraft(d: Draft): Draft {
  if (isDirectTieup(d))
    return { ...d, treadling: d.treadling.map((row) => (row.some(Boolean) ? row.map((v) => !v) : row)) }
  return { ...d, tieup: d.tieup.map((row) => row.map((v) => !v)) }
}

/** Mirrors the draft left to right (reversing the threading) or top to bottom (reversing the treadling). */
export function flipDraft(d: Draft, axis: 'horizontal' | 'vertical'): Draft {
  return axis === 'horizontal'
    ? { ...d, threading: [...d.threading].reverse(), warpColors: [...d.warpColors].reverse() }
    : { ...d, treadling: [...d.treadling].reverse(), weftColors: [...d.weftColors].reverse() }
}

const rotate = <T>(items: T[], by: number) => {
  const n = items.length
  const k = ((by % n) + n) % n
  return [...items.slice(n - k), ...items.slice(0, n - k)]
}

/**
 * Moves the pattern right by `ends` and down by `picks`, wrapping round, so the repeat starts somewhere else.
 * Negative numbers move it left or up.
 */
export function shiftDraft(d: Draft, ends: number, picks: number): Draft {
  return {
    ...d,
    threading: rotate(d.threading, ends),
    warpColors: rotate(d.warpColors, ends),
    treadling: rotate(d.treadling, picks),
    weftColors: rotate(d.weftColors, picks),
  }
}

/** The two tabby (plain weave) sheds: odd-numbered shafts, and even-numbered shafts (0-based indices). */
export const tabbySheds = (shafts: number) => {
  const all = Array.from({ length: shafts }, (_, s) => s)
  return { a: all.filter((s) => s % 2 === 0), b: all.filter((s) => s % 2 === 1) }
}

/**
 * Ends where tabby won't give plain weave: neighbouring threaded ends on shafts that are both odd or both even.
 * Returns the 1-based end numbers of the second end of each such pair.
 */
export function tabbyBreaks(d: Draft): number[] {
  const threaded = d.threading.flatMap((s, e) => (s >= 0 ? [e] : []))
  return threaded.slice(1).flatMap((e, i) => (d.threading[e] % 2 === d.threading[threaded[i]] % 2 ? [e + 1] : []))
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i])

/**
 * Puts a tabby pick (alternately odd and even shafts) after every pattern pick, in `color`, as overshot and summer
 * and winter are woven. Adds two tabby treadles unless treadles already lift exactly those shafts; for a lift plan
 * the tabby lifts go straight into the plan.
 */
export function insertTabby(d: Draft, color: string): Draft {
  const { a, b } = tabbySheds(d.shafts)
  const pattern = d.treadling.map((row, p) => ({ row, color: d.weftColors[p] })).filter((x) => x.row.some(Boolean))
  if (pattern.length === 0) throw new Error('There are no pattern picks to put tabby between')
  if (pattern.length * 2 > MAX_THREADS)
    throw new Error(`With tabby that would be ${pattern.length * 2} picks; the limit is ${MAX_THREADS}`)

  let { tieup, treadles } = d
  let rowFor: (shed: number[]) => boolean[]
  if (isDirectTieup(d)) rowFor = (shed) => Array.from({ length: d.treadles }, (_, t) => shed.includes(t))
  else {
    const lifts = (t: number) => tieup.flatMap((row, s) => (row[t] ? [s] : []))
    const existing = (shed: number[]) =>
      Array.from({ length: treadles }, (_, t) => t).find((t) => sameSet(lifts(t), shed))
    const found = [existing(a), existing(b)]
    const needed = found.filter((t) => t === undefined).length
    if (treadles + needed > MAX_TREADLES)
      throw new Error(`Tabby needs ${needed} more treadle${needed > 1 ? 's' : ''}; the limit is ${MAX_TREADLES}`)
    const treadleOf = [a, b].map((shed, i) => {
      if (found[i] !== undefined) return found[i] as number
      tieup = tieup.map((row, s) => [...row, shed.includes(s)])
      return treadles++
    })
    rowFor = (shed) => Array.from({ length: treadles }, (_, t) => t === treadleOf[shed === a ? 0 : 1])
  }
  const widen = (row: boolean[]) => [...row, ...Array(treadles - row.length).fill(false)]
  const treadling = pattern.flatMap((x, i) => [widen(x.row), rowFor(i % 2 === 0 ? a : b)])
  const weftColors = pattern.flatMap((x) => [x.color, color.toLowerCase()])
  return parseDraft({ ...d, treadles, tieup, picks: treadling.length, treadling, weftColors })
}

/** Takes out every tabby pick (one lifting exactly the odd or exactly the even shafts). */
export function removeTabby(d: Draft): { draft: Draft; removed: number } {
  const { a, b } = tabbySheds(d.shafts)
  const lifts = liftsPerPick(d)
  const keep = lifts.map((l) => !(sameSet(l, a) || sameSet(l, b)))
  const removed = keep.filter((k) => !k).length
  if (removed === 0) return { draft: d, removed }
  if (removed === d.picks) throw new Error('Every pick is tabby; there would be nothing left')
  return {
    draft: {
      ...d,
      picks: d.picks - removed,
      treadling: d.treadling.filter((_, p) => keep[p]),
      weftColors: d.weftColors.filter((_, p) => keep[p]),
    },
    removed,
  }
}
