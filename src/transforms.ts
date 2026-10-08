import { isDirectTieup, liftsPerPick } from './liftplan'
import { type Draft, MAX_SHAFTS, parseDraft } from './weave'

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
