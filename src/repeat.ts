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
