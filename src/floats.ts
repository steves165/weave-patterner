import { computeDrawdown, type Draft } from './weave'

/** Longest run of one thread on top: warp floats run down a column, weft floats along a row. */
export function longestFloats(d: Draft, dd = computeDrawdown(d)) {
  let warp = 0
  let weft = 0
  for (let p = 0; p < d.picks; p++) {
    let run = 0
    for (let e = 0; e < d.ends; e++) {
      run = dd[p][e] ? 0 : run + 1
      weft = Math.max(weft, run)
    }
  }
  for (let e = 0; e < d.ends; e++) {
    let run = 0
    for (let p = 0; p < d.picks; p++) {
      run = dd[p][e] ? run + 1 : 0
      warp = Math.max(warp, run)
    }
  }
  return { warp, weft }
}

/** Marks every drawdown cell that is part of a warp or weft float longer than `maxLength` threads. */
export function longFloatMask(d: Draft, maxLength: number, dd = computeDrawdown(d)): boolean[][] {
  const mask = dd.map((row) => row.map(() => false))
  // Weft floats: runs of weft-up cells along each pick.
  for (let p = 0; p < d.picks; p++) {
    let start = 0
    for (let e = 0; e <= d.ends; e++) {
      if (e < d.ends && !dd[p][e]) continue
      if (e - start > maxLength) for (let i = start; i < e; i++) mask[p][i] = true
      start = e + 1
    }
  }
  // Warp floats: runs of warp-up cells down each end.
  for (let e = 0; e < d.ends; e++) {
    let start = 0
    for (let p = 0; p <= d.picks; p++) {
      if (p < d.picks && dd[p][e]) continue
      if (p - start > maxLength) for (let i = start; i < p; i++) mask[i][e] = true
      start = p + 1
    }
  }
  return mask
}
