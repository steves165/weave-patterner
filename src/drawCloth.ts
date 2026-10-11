/**
 * Drawing on the drawdown: setting one square to warp or weft with the smallest change to the draft that weaves it,
 * leaving every other square as it was. In order of preference:
 * 1. rethread that end to a shaft that already rises on exactly the right picks;
 * 2. move that pick to a treadle that already lifts exactly the right ends;
 * 3. give the end a new shaft (rising where its old one did) and the pick a new treadle (lifting what it did, and the
 *    new shaft or not), so only that square changes.
 */
import { liftsPerPick } from './liftplan'
import { computeDrawdown, type Draft, MAX_SHAFTS, MAX_TREADLES } from './weave'

const same = (a: boolean[], b: boolean[]) => a.length === b.length && a.every((v, i) => v === b[i])

/** The draft with the square at (pick, end) showing warp (`warp` true) or weft, and nothing else changed. */
export function drawSquare(d: Draft, pick: number, end: number, warp: boolean): Draft {
  const dd = computeDrawdown(d)
  if (dd[pick]?.[end] === undefined || dd[pick][end] === warp) return d
  const lifts = liftsPerPick(d).map((ss) => new Set(ss))
  const shaftColumn = (s: number) => lifts.map((up) => s >= 0 && up.has(s))

  // 1. An existing shaft that rises on just the right picks for this end.
  const want = dd.map((row, p) => (p === pick ? warp : row[end]))
  const fits = Array.from({ length: d.shafts }, (_, s) => s).filter((s) => same(shaftColumn(s), want))
  if (fits.length) {
    // Nearest to its shaft now, so the threading stays tidy.
    const now = d.threading[end]
    const s = fits.sort((a, b) => Math.abs(a - now) - Math.abs(b - now))[0]
    return { ...d, threading: d.threading.map((x, e) => (e === end ? s : x)) }
  }
  // 2. An existing treadle that lifts just the right ends for this pick.
  const row = dd[pick].map((v, e) => (e === end ? warp : v))
  const treadleRow = (t: number) => d.threading.map((s) => s >= 0 && d.tieup[s][t])
  for (let t = 0; t < d.treadles; t++)
    if (same(treadleRow(t), row))
      return { ...d, treadling: d.treadling.map((r, p) => (p === pick ? r.map((_, i) => i === t) : r)) }

  // 3. A shaft of its own for the end, and a treadle of its own for the pick.
  if (d.shafts >= MAX_SHAFTS) throw new Error(`That needs more than ${MAX_SHAFTS} shafts`)
  const old = d.threading[end]
  const shaft = d.shafts
  const tieup = [...d.tieup.map((r) => [...r]), d.tieup[old]?.slice() ?? Array(d.treadles).fill(false)]
  // What the pick lifts now, plus (or minus) the new shaft.
  const column = [...Array.from({ length: d.shafts }, (_, s) => lifts[pick].has(s)), warp]
  let treadle = Array.from({ length: d.treadles }, (_, t) => t).find((t) => tieup.every((r, s) => r[t] === column[s]))
  let treadles = d.treadles
  let treadling = d.treadling
  if (treadle === undefined) {
    if (d.treadles >= MAX_TREADLES) throw new Error(`That needs more than ${MAX_TREADLES} treadles`)
    treadle = d.treadles
    treadles++
    tieup.forEach((r, s) => r.push(column[s]))
    treadling = d.treadling.map((r) => [...r, false])
  }
  const t = treadle
  return {
    ...d,
    shafts: d.shafts + 1,
    treadles,
    tieup,
    threading: d.threading.map((x, e) => (e === end ? shaft : x)),
    treadling: treadling.map((r, p) => (p === pick ? r.map((_, i) => i === t) : r)),
  }
}

/**
 * Tidies up after a drawing stroke: ends and picks moved onto shafts and treadles added since `base` go back onto the
 * draft's own ones where those weave exactly the same, and added ones nothing uses any more are taken away, so a
 * stroke that tries a shaft and moves on doesn't leave it behind. The draft's own shafts and treadles always stay.
 */
export function pruneAdded(d: Draft, base: Draft): Draft {
  if (d.shafts <= base.shafts && d.treadles <= base.treadles) return d
  const lifts = liftsPerPick(d).map((ss) => new Set(ss))
  const column = (s: number) => lifts.map((up) => up.has(s))
  // Ends on added shafts: back onto an own shaft that rises on the same picks.
  const threading = d.threading.map((s) => {
    if (s < base.shafts) return s
    const own = Array.from({ length: base.shafts }, (_, x) => x).find((x) => same(column(x), column(s)))
    return own ?? s
  })
  // Picks on added treadles: back onto an own treadle that lifts the same ends.
  const used = new Set(threading.filter((s) => s >= 0))
  const liftsOf = (t: number) =>
    [...used]
      .filter((s) => d.tieup[s][t])
      .sort((a, b) => a - b)
      .join()
  const treadling = d.treadling.map((row, p) => {
    if (!row.some((on, t) => on && t >= base.treadles)) return row
    const wanted = [...lifts[p]]
      .filter((s) => used.has(s))
      .sort((a, b) => a - b)
      .join()
    const own = Array.from({ length: base.treadles }, (_, t) => t).find((t) => liftsOf(t) === wanted)
    return own === undefined ? row : row.map((_, t) => t === own)
  })
  const next = { ...d, threading, treadling }
  const dropShafts = new Set(
    Array.from({ length: d.shafts }, (_, s) => s).filter((s) => s >= base.shafts && !threading.includes(s)),
  )
  const dropTreadles = new Set(
    Array.from({ length: d.treadles }, (_, t) => t).filter((t) => t >= base.treadles && !treadling.some((r) => r[t])),
  )
  if (!dropShafts.size && !dropTreadles.size) return next
  const keepS = Array.from({ length: d.shafts }, (_, s) => s).filter((s) => !dropShafts.has(s))
  const keepT = Array.from({ length: d.treadles }, (_, t) => t).filter((t) => !dropTreadles.has(t))
  return {
    ...next,
    shafts: keepS.length,
    treadles: keepT.length,
    threading: threading.map((s) => (s < 0 ? -1 : keepS.indexOf(s))),
    tieup: keepS.map((s) => keepT.map((t) => d.tieup[s][t])),
    treadling: treadling.map((r) => keepT.map((t) => r[t])),
  }
}
