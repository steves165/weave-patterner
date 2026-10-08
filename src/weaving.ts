import type { Draft } from './weave'

/** What to do for one pick (0-based), with 1-based treadle and shaft numbers for display. */
export function pickInfo(d: Draft, pick: number) {
  const row = d.treadling[pick]
  const treadles = row.flatMap((on, t) => (on ? [t + 1] : []))
  const shafts = Array.from({ length: d.shafts }, (_, s) => s).filter((s) => row.some((on, t) => on && d.tieup[s][t]))
  return { treadles, shafts: shafts.map((s) => s + 1), color: d.weftColors[pick] }
}

/** Where the weaver has got to: pick within the draft and how many full repeats are done. */
export interface Progress {
  pick: number
  repeat: number
}

export function step({ pick, repeat }: Progress, picks: number, delta: 1 | -1): Progress {
  const next = pick + delta
  if (next >= picks) return { pick: 0, repeat: repeat + 1 }
  if (next < 0) return repeat > 0 ? { pick: picks - 1, repeat: repeat - 1 } : { pick: 0, repeat: 0 }
  return { pick: next, repeat }
}

const key = (name: string) => `weave-progress:${name}`

/** Progress is remembered per pattern name in this browser. Storage can be unavailable, so failures are ignored. */
export function loadProgress(name: string, picks: number): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(key(name)) ?? 'null') as Progress | null
    if (p && Number.isInteger(p.pick) && Number.isInteger(p.repeat) && p.pick >= 0 && p.pick < picks && p.repeat >= 0)
      return p
  } catch {
    // fall through to the start
  }
  return { pick: 0, repeat: 0 }
}

export function saveProgress(name: string, progress: Progress) {
  try {
    localStorage.setItem(key(name), JSON.stringify(progress))
  } catch {
    // progress just won't be remembered
  }
}

/** True when this pick's weft differs from the one before (wrapping round to the last pick for pick 1). */
export const weftChanges = (d: Draft, pick: number) =>
  d.picks > 1 && d.weftColors[pick].toLowerCase() !== d.weftColors[(pick - 1 + d.picks) % d.picks].toLowerCase()

/**
 * What to do for one end (0-based) when threading: its shaft (1-based, or null if it's left empty), its colour, and
 * which heddle that is on its shaft counting from end 1, so a threader can check their place.
 */
export function endInfo(d: Draft, end: number) {
  const shaft = d.threading[end]
  const heddle = shaft < 0 ? null : d.threading.slice(0, end + 1).filter((s) => s === shaft).length
  return { shaft: shaft < 0 ? null : shaft + 1, heddle, color: d.warpColors[end] }
}

/** Heddles needed on each shaft (1-based shafts as indices 0..shafts-1). */
export const heddleCounts = (d: Draft) =>
  Array.from({ length: d.shafts }, (_, s) => d.threading.filter((t) => t === s).length)

const threadKey = (name: string) => `thread-progress:${name}`

/** Which end the threader has reached, remembered per pattern in this browser. */
export function loadThreadProgress(name: string, ends: number): number {
  try {
    const n = JSON.parse(localStorage.getItem(threadKey(name)) ?? 'null')
    if (Number.isInteger(n) && n >= 0 && n < ends) return n
  } catch {
    // fall through to the start
  }
  return 0
}

export function saveThreadProgress(name: string, end: number) {
  try {
    localStorage.setItem(threadKey(name), JSON.stringify(end))
  } catch {
    // progress just won't be remembered
  }
}
