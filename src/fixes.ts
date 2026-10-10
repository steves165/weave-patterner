/**
 * Suggested fixes for the problems the status bar flags: threads that never weave in, edges the weft doesn't catch,
 * and floats longer than the limit. Each fix says what it changes, and gives the draft (or view setting) after it, to
 * apply in one undoable step.
 */
import { longestFloats, unwovenThreads } from './floats'
import { selvedgeMisses } from './selvedge'
import type { ViewOptions } from './viewOptions'
import { computeDrawdown, type Draft } from './weave'

export interface Fix {
  id: string
  /** What to do, as a button's words: "Rethread end 5". */
  title: string
  /** What it changes, in a sentence. */
  detail: string
  /** The draft after the fix, for fixes that change the pattern. */
  draft?: Draft
  /** View settings to change, for fixes that are about how it's woven or shown. */
  view?: Partial<ViewOptions>
  /** Whether it clears the problem completely. */
  resolves: boolean
}

/** Shafts raised on each pick, for the draft's tie-up and treadling. */
function raisedShafts(d: Draft): Set<number>[] {
  return d.treadling.map((row) => {
    const up = new Set<number>()
    row.forEach((on, t) => {
      if (on) for (let s = 0; s < d.shafts; s++) if (d.tieup[s][t]) up.add(s)
    })
    return up
  })
}

const treadled = (d: Draft) => d.treadling.flatMap((row, p) => (row.some(Boolean) ? [p] : []))
const threadedEnds = (d: Draft) => d.threading.flatMap((s, e) => (s >= 0 ? [e] : []))

/** Shafts to try for an end, best first: carrying on the draw from the end before, then back from the one after. */
function shaftOrder(d: Draft, e: number): number[] {
  const before = d.threading
    .slice(0, e)
    .filter((s) => s >= 0)
    .at(-1)
  const after = d.threading.slice(e + 1).find((s) => s >= 0)
  const order: number[] = []
  const add = (s: number | undefined) => {
    if (s === undefined) return
    const n = ((s % d.shafts) + d.shafts) % d.shafts
    if (!order.includes(n)) order.push(n)
  }
  if (before !== undefined) add(before + 1)
  if (after !== undefined) add(after - 1)
  if (before !== undefined) add(before - 1)
  for (let s = 0; s < d.shafts; s++) add(s)
  return order
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const listOf = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0])

/** Fixes for ends and picks that never interlace. */
export function unwovenFixes(d: Draft): Fix[] {
  const { ends, picks } = unwovenThreads(d)
  const fixes: Fix[] = []
  const up = raisedShafts(d)
  const used = treadled(d)
  if (ends.length) {
    // A shaft weaves in when it's up on some picks and down on others.
    const weaves = (s: number) => {
      const states = used.map((p) => up[p].has(s))
      return states.some(Boolean) && !states.every(Boolean)
    }
    const threading = d.threading.slice()
    const moves: string[] = []
    for (const e of ends) {
      const s = shaftOrder(d, e).find(weaves)
      if (s === undefined) continue
      threading[e] = s
      moves.push(`end ${e + 1} to shaft ${s + 1}`)
    }
    if (moves.length)
      fixes.push({
        id: 'rethread-ends',
        title: ends.length === 1 ? `Rethread end ${ends[0] + 1}` : `Rethread ${plural(ends.length, 'end')}`,
        detail: `Moves ${listOf(moves)}: a shaft that goes up on some picks and down on others, carrying on the threading where it can.`,
        draft: { ...d, threading },
        resolves: moves.length === ends.length,
      })
    fixes.push({
      id: 'unthread-ends',
      title:
        ends.length === 1 ? `Leave end ${ends[0] + 1} unthreaded` : `Leave ${plural(ends.length, 'end')} unthreaded`,
      detail: 'Takes them out of the threading, for a gap in the warp or ends you will leave out.',
      draft: { ...d, threading: d.threading.map((s, e) => (ends.includes(e) ? -1 : s)) },
      resolves: true,
    })
  }
  if (picks.length) {
    const live = threadedEnds(d)
    // A treadle weaves in when it lifts some threaded ends and not others.
    const weaves = (t: number) => {
      const lifted = new Set<number>()
      for (let s = 0; s < d.shafts; s++) if (d.tieup[s][t]) lifted.add(s)
      const states = live.map((e) => lifted.has(d.threading[e]))
      return states.some(Boolean) && !states.every(Boolean)
    }
    const treadling = d.treadling.map((row) => row.slice())
    const moves: string[] = []
    for (const p of picks) {
      // Carry on from the pick before: its treadle and the next one along.
      const prev = used.filter((q) => q < p).at(-1)
      const prevTreadle = prev === undefined ? -1 : d.treadling[prev].indexOf(true)
      const order = Array.from({ length: d.treadles }, (_, i) => (prevTreadle + 1 + i) % d.treadles)
      const t = order.find(weaves)
      if (t === undefined) continue
      treadling[p] = treadling[p].map((_, i) => i === t)
      moves.push(`pick ${p + 1} to treadle ${t + 1}`)
    }
    if (moves.length)
      fixes.push({
        id: 'retreadle-picks',
        title:
          picks.length === 1
            ? `Change the treadle for pick ${picks[0] + 1}`
            : `Change the treadles for ${plural(picks.length, 'pick')}`,
        detail: `Treadles ${listOf(moves)}: one that lifts some ends and not others, following on from the pick before.`,
        draft: { ...d, treadling },
        resolves: moves.length === picks.length,
      })
  }
  return fixes
}

/** How many times the weft misses the edge end on one side. */
const missesOn = (d: Draft, side: 'left' | 'right', start: 'left' | 'right') =>
  selvedgeMisses(d, start).filter((m) => m.side === side).length

/** The draft with an end added at each edge that misses, threaded on the shaft that catches the weft best. */
function withSelvedgeEnds(d: Draft, start: 'left' | 'right'): { draft: Draft; added: string[] } | null {
  let draft = d
  const added: string[] = []
  for (const side of ['left', 'right'] as const) {
    if (!missesOn(draft, side, start)) continue
    let best: { draft: Draft; misses: number; shaft: number } | null = null
    for (let s = 0; s < d.shafts; s++) {
      const at = side === 'left' ? 0 : draft.ends
      const insert = <T>(xs: T[], x: T) => [...xs.slice(0, at), x, ...xs.slice(at)]
      const edgeColour = side === 'left' ? draft.warpColors[0] : draft.warpColors[draft.ends - 1]
      const next: Draft = {
        ...draft,
        ends: draft.ends + 1,
        threading: insert(draft.threading, s),
        warpColors: insert(draft.warpColors, edgeColour),
        // Named blocks keep their ends.
        blocks: side === 'left' ? draft.blocks?.map((b) => ({ ...b, from: b.from + 1, to: b.to + 1 })) : draft.blocks,
      }
      const misses = missesOn(next, side, start)
      const woven = !unwovenThreads(next).ends.includes(at)
      if (woven && (!best || misses < best.misses)) best = { draft: next, misses, shaft: s }
    }
    if (best && best.misses < missesOn(draft, side, start)) {
      draft = best.draft
      added.push(`one on shaft ${best.shaft + 1} at the ${side}`)
    }
  }
  return added.length ? { draft, added } : null
}

/** Fixes for an edge the weft doesn't catch at every turn. */
export function selvedgeFixes(d: Draft, start: 'left' | 'right'): Fix[] {
  const misses = selvedgeMisses(d, start)
  if (!misses.length) return []
  const fixes: Fix[] = [
    {
      id: 'floating-selvedge',
      title: 'Weave with floating selvedges',
      detail:
        'An extra end at each edge, through the reed but not a heddle: take the shuttle over it as it goes in and under it as it comes out, so the weft always catches it. Nothing in the draft changes.',
      view: { floatingSelvedge: true },
      resolves: true,
    },
  ]
  const added = withSelvedgeEnds(d, start)
  if (added) {
    const left = selvedgeMisses(added.draft, start).length
    fixes.push({
      id: 'selvedge-ends',
      title: 'Add a selvedge end',
      detail: `Adds ${added.added.length === 1 ? 'an end' : 'an end at each edge'}: ${listOf(added.added)}, threaded so it catches the weft${left ? ` at all but ${plural(left, 'turn')}` : ' at every turn'}. The pattern itself doesn't change.`,
      draft: added.draft,
      resolves: left === 0,
    })
  }
  const other = start === 'left' ? 'right' : 'left'
  const otherMisses = selvedgeMisses(d, other).length
  if (otherMisses < misses.length)
    fixes.push({
      id: 'shuttle-start',
      title: `Start the shuttle from the ${other}`,
      detail: otherMisses
        ? `Throwing the first pick from the ${other} edge, the weft misses the edge ${plural(otherMisses, 'time')} instead of ${misses.length}.`
        : `Throwing the first pick from the ${other} edge, the weft catches the edge end at every turn.`,
      view: { shuttleStart: other },
      resolves: otherMisses === 0,
    })
  // Simplest first: starting from the other side when that's all it takes, then floating selvedges, then changes to
  // the draft.
  const rank = (f: Fix) => (f.id === 'shuttle-start' && f.resolves ? 0 : f.id === 'floating-selvedge' ? 1 : 2)
  return fixes.sort((a, b) => rank(a) - rank(b))
}

/** Fixes for floats longer than the limit: show them, or allow them. */
export function floatFixes(d: Draft, limit: number, highlighting: boolean): Fix[] {
  const { warp, weft } = longestFloats(d, computeDrawdown(d))
  const longest = Math.max(warp, weft)
  if (longest <= limit) return []
  const fixes: Fix[] = []
  if (!highlighting)
    fixes.push({
      id: 'highlight-floats',
      title: 'Show them in the drawdown',
      detail: `Stripes every float longer than ${plural(limit, 'thread')}, so you can see where to change the tie-up or treadling.`,
      view: { highlightFloats: true },
      resolves: false,
    })
  fixes.push({
    id: 'allow-floats',
    title: `Allow floats up to ${longest}`,
    detail: `Raises the limit to ${plural(longest, 'thread')}: fine for a loose or decorative weave, or one that will be fulled.`,
    view: { floatLimit: longest },
    resolves: true,
  })
  return fixes
}
