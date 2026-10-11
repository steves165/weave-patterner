/**
 * Drawing on the drawdown: setting one square to warp or weft with the smallest change to the draft that weaves it,
 * leaving every other square as it was. It uses the shafts and treadles the draft has first, adding one only when
 * changing those would change other squares too. In order:
 * 1. rethread the end onto a shaft that already rises on the right picks;
 * 2. move the pick onto a treadle that already lifts the right ends;
 * 3. change one box of the tie-up (the end's shaft on the pick's treadle), when nothing else depends on it;
 * 4. put the end on a shaft nothing else uses (a spare one, or its own) and tie that shaft up to rise on the right
 *    picks;
 * 5. put the pick on a treadle nothing else uses (a spare one, or its own) and tie it to lift the right ends;
 * 6. a shaft and a treadle of their own for the end and the pick: spare ones if there are, new ones if not.
 */
import { liftsPerPick } from './liftplan'
import { computeDrawdown, type Draft, MAX_SHAFTS, MAX_TREADLES } from './weave'

const same = (a: boolean[], b: boolean[]) => a.length === b.length && a.every((v, i) => v === b[i])
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/** Whether `next` differs from `dd` (the drawdown before) only at (pick, end), where it's `warp`. */
function onlyThat(next: Draft, dd: boolean[][], pick: number, end: number, warp: boolean): boolean {
  const nd = computeDrawdown(next)
  for (let p = 0; p < dd.length; p++)
    for (let e = 0; e < dd[p].length; e++) {
      const want = p === pick && e === end ? warp : dd[p][e]
      if (nd[p][e] !== want) return false
    }
  return true
}

/**
 * A tie-up row that makes a shaft rise on exactly the picks in `want` with the treadling as it is, or null when the
 * treadling can't (two picks on the same treadles wanting different things, or an empty pick wanting warp).
 */
function shaftRowFor(d: Draft, want: boolean[], pick?: number, treadles?: boolean[]): boolean[] | null {
  const pressed = (q: number) => (q === pick && treadles ? treadles : d.treadling[q])
  const row = range(d.treadles).map((t) => !range(d.picks).some((q) => pressed(q)[t] && !want[q]))
  for (let q = 0; q < d.picks; q++) if (want[q] !== pressed(q).some((on, t) => on && row[t])) return null
  return row
}

/**
 * A tie-up column that makes a treadle lift exactly the ends in `want` with the threading as it is, or null when it
 * can't (two ends on one shaft wanting different things, or an unthreaded end wanting warp).
 */
function treadleColumnFor(d: Draft, want: boolean[], threading = d.threading): boolean[] | null {
  const col: (boolean | null)[] = Array(d.shafts).fill(null)
  for (let e = 0; e < want.length; e++) {
    const s = threading[e]
    if (s < 0) {
      if (want[e]) return null
      continue
    }
    if (col[s] !== null && col[s] !== want[e]) return null
    col[s] = want[e]
  }
  return col.map((v) => v === true)
}

/** The draft with the square at (pick, end) showing warp (`warp` true) or weft, and nothing else changed. */
export function drawSquare(d: Draft, pick: number, end: number, warp: boolean): Draft {
  const dd = computeDrawdown(d)
  if (dd[pick]?.[end] === undefined || dd[pick][end] === warp) return d
  const lifts = liftsPerPick(d).map((ss) => new Set(ss))
  const shaftColumn = (s: number) => lifts.map((up) => up.has(s))
  const wantColumn = dd.map((row, p) => (p === pick ? warp : row[end]))
  const wantRow = dd[pick].map((v, e) => (e === end ? warp : v))
  const now = d.threading[end]
  const ok = (next: Draft) => onlyThat(next, dd, pick, end, warp)
  const rethread = (x: Draft, s: number) => ({ ...x, threading: x.threading.map((v, e) => (e === end ? s : v)) })
  const retreadle = (x: Draft, t: number) => ({
    ...x,
    treadling: x.treadling.map((r, p) => (p === pick ? r.map((_, i) => i === t) : r)),
  })
  const setRow = (x: Draft, s: number, row: boolean[]) => ({
    ...x,
    tieup: x.tieup.map((r, i) => (i === s ? row : r)),
  })
  const setColumn = (x: Draft, t: number, col: boolean[]) => ({
    ...x,
    tieup: x.tieup.map((r, s) => r.map((v, i) => (i === t ? col[s] : v))),
  })
  // Shafts no other end is on, and treadles no other pick presses: free to tie up afresh.
  const freeShafts = range(d.shafts).filter((s) => d.threading.every((x, e) => e === end || x !== s))
  const freeTreadles = range(d.treadles).filter((t) => d.treadling.every((r, p) => p === pick || !r[t]))
  // Prefer the end's own shaft and the pick's own treadle, then the nearest.
  const byNear = (xs: number[], to: number) => xs.slice().sort((a, b) => Math.abs(a - to) - Math.abs(b - to))

  // 1. An existing shaft that rises on just the right picks.
  for (const s of byNear(range(d.shafts), now)) if (same(shaftColumn(s), wantColumn)) return rethread(d, s)
  // 2. An existing treadle that lifts just the right ends.
  const treadleRow = (t: number) => d.threading.map((s) => s >= 0 && d.tieup[s][t])
  for (let t = 0; t < d.treadles; t++) if (same(treadleRow(t), wantRow)) return retreadle(d, t)
  // 3. One box of the tie-up.
  if (now >= 0)
    for (let t = 0; t < d.treadles; t++)
      if (d.treadling[pick][t]) {
        const next = setRow(
          d,
          now,
          d.tieup[now].map((v, i) => (i === t ? !v : v)),
        )
        if (ok(next)) return next
      }
  // 4. A shaft nothing else uses, tied up to rise on the right picks.
  // (Any free shaft would do the same, so the nearest is the one to try.)
  const freeShaft = byNear(freeShafts, now)[0]
  const row = freeShaft === undefined ? null : shaftRowFor(d, wantColumn)
  if (row) {
    const next = setRow(rethread(d, freeShaft), freeShaft, row)
    if (ok(next)) return next
  }
  // 5. A treadle nothing else uses, tied to lift the right ends.
  const firstPressed = d.treadling[pick].indexOf(true)
  const col = treadleColumnFor(d, wantRow)
  const freeTreadle = byNear(freeTreadles, firstPressed)[0]
  if (col && freeTreadle !== undefined) {
    const next = setColumn(retreadle(d, freeTreadle), freeTreadle, col)
    if (ok(next)) return next
  }

  // 6. A shaft and a treadle of their own: spare ones where there are, new ones where not.
  let next: Draft = d
  let shaft = byNear(freeShafts, now)[0]
  if (shaft === undefined) {
    if (d.shafts >= MAX_SHAFTS) throw new Error(`That needs more than ${MAX_SHAFTS} shafts`)
    shaft = d.shafts
    next = { ...next, shafts: d.shafts + 1, tieup: [...next.tieup, Array(next.treadles).fill(false)] }
  }
  // The shaft rises where the end's old one did on every other pick.
  next = setRow(next, shaft, now >= 0 && now !== shaft ? d.tieup[now].slice() : next.tieup[shaft].map(() => false))
  next = rethread(next, shaft)
  // What the pick lifts now, with the end's shaft up or down as drawn.
  const column = range(next.shafts).map((s) => (s === shaft ? warp : lifts[pick].has(s) && s < d.shafts))
  let treadle =
    range(next.treadles).find((t) => next.tieup.every((r, s) => r[t] === column[s])) ??
    byNear(freeTreadles, firstPressed)[0]
  if (treadle === undefined) {
    if (next.treadles >= MAX_TREADLES) throw new Error(`That needs more than ${MAX_TREADLES} treadles`)
    treadle = next.treadles
    next = {
      ...next,
      treadles: next.treadles + 1,
      tieup: next.tieup.map((r) => [...r, false]),
      treadling: next.treadling.map((r) => [...r, false]),
    }
  }
  next = retreadle(setColumn(next, treadle, column), treadle)
  if (ok(next)) return next
  // The spare shaft's row may not suit every pick: fall back to its own new shaft and treadle.
  return withNew(d, pick, end, warp, lifts)
}

/** A new shaft for the end (rising where its old one did) and a new treadle for the pick. */
function withNew(d: Draft, pick: number, end: number, warp: boolean, lifts: Set<number>[]): Draft {
  if (d.shafts >= MAX_SHAFTS) throw new Error(`That needs more than ${MAX_SHAFTS} shafts`)
  if (d.treadles >= MAX_TREADLES) throw new Error(`That needs more than ${MAX_TREADLES} treadles`)
  const old = d.threading[end]
  const shaft = d.shafts
  const column = [...range(d.shafts).map((s) => lifts[pick].has(s)), warp]
  const tieup = [...d.tieup, old >= 0 ? d.tieup[old].slice() : Array(d.treadles).fill(false)].map((r, s) => [
    ...r,
    column[s],
  ])
  return {
    ...d,
    shafts: d.shafts + 1,
    treadles: d.treadles + 1,
    tieup,
    threading: d.threading.map((x, e) => (e === end ? shaft : x)),
    treadling: d.treadling.map((r, p) => (p === pick ? [...r.map(() => false), true] : [...r, false])),
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
