import { computeDrawdown, type Draft } from './weave'

/** Where the weft fails to catch an edge end: the pick before it turns, and which edge. */
export interface Miss {
  /** 1-based pick after which the shuttle turns without catching the edge end. */
  pick: number
  side: 'left' | 'right'
}

/**
 * Checks whether the weft catches the outermost threaded end each time the shuttle turns. The shuttle starts at
 * `start` and goes back and forth, turning at alternate edges. At a turn the weft wraps round the edge end only if
 * that end swaps between up and down from one pick to the next; if it stays up (or down) for both, the weft slides
 * past it and the edge end isn't woven in there. Empty picks are skipped, as no weft is thrown.
 */
export function selvedgeMisses(d: Draft, start: 'left' | 'right' = 'left', dd = computeDrawdown(d)): Miss[] {
  const threaded = d.threading.flatMap((s, e) => (s >= 0 ? [e] : []))
  if (threaded.length < 2) return []
  const edge = { left: threaded[0], right: threaded[threaded.length - 1] }
  const picks = d.treadling.flatMap((row, p) => (row.some(Boolean) ? [p] : []))
  const misses: Miss[] = []
  for (let i = 0; i + 1 < picks.length; i++) {
    // Pick i travels away from its starting side, so it turns at the far edge.
    const fromLeft = (i % 2 === 0) === (start === 'left')
    const side = fromLeft ? 'right' : 'left'
    const e = edge[side]
    const [p, q] = [picks[i], picks[i + 1]]
    if (dd[p][e] === dd[q][e]) misses.push({ pick: p + 1, side })
  }
  return misses
}
