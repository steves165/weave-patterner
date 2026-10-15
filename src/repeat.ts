import { computeDrawdown, type Draft } from './weave'

/** The smallest period of a sequence: the shortest n where every item equals the one n before it. */
function period<T>(items: T[], same: (a: T, b: T) => boolean): number {
  for (let n = 1; n < items.length; n++) if (items.every((x, i) => i < n || same(x, items[i - n]))) return n
  return items.length
}

/**
 * The smallest repeat of the cloth, colours included: how many ends and picks before it starts again. The draft can
 * stop part way through a repeat.
 */
export function findRepeat(d: Draft, dd = computeDrawdown(d)): { ends: number; picks: number } {
  const colour = (p: number, e: number) => (dd[p][e] ? `w${d.warpColors[e]}` : `f${d.weftColors[p]}`)
  const columns = Array.from({ length: d.ends }, (_, e) => dd.map((_, p) => colour(p, e)).join())
  const rows = dd.map((_, p) => Array.from({ length: d.ends }, (_, e) => colour(p, e)).join())
  // Threading and treadling must repeat too, so trimming keeps the same loom set-up.
  const ends = period(
    columns.map((c, e) => `${c}|${d.threading[e]}`),
    (a, b) => a === b,
  )
  const picks = period(
    rows.map((r, p) => `${r}|${d.treadling[p].join()}`),
    (a, b) => a === b,
  )
  return { ends, picks }
}

/**
 * Fills the empty ends and picks after the threading and treadling drawn so far with copies of it, as WeavePoint's
 * Repeat › Fill Pattern does: draw one repeat, then fill the draft with it. Only the empty ends (picks) after the last
 * threaded end (treadled pick) are filled; colours stay as they are. Null when there's nothing to fill.
 */
export function fillWithRepeat(d: Draft): { draft: Draft; ends: number; picks: number } | null {
  const filled = <T>(items: T[], used: (x: T) => boolean) => {
    let n = items.length
    while (n > 0 && !used(items[n - 1])) n--
    return n
  }
  const lastEnd = filled(d.threading, (s) => s >= 0)
  const lastPick = filled(d.treadling, (row) => row.some(Boolean))
  const ends = lastEnd > 0 && lastEnd < d.ends ? d.ends - lastEnd : 0
  const picks = lastPick > 0 && lastPick < d.picks ? d.picks - lastPick : 0
  if (!ends && !picks) return null
  return {
    draft: {
      ...d,
      threading: ends ? d.threading.map((s, e) => (e < lastEnd ? s : d.threading[e % lastEnd])) : d.threading,
      treadling: picks
        ? d.treadling.map((row, p) => (p < lastPick ? row : [...d.treadling[p % lastPick]]))
        : d.treadling,
    },
    ends,
    picks,
  }
}
