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
