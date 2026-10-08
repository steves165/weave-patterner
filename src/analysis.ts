import { type Draft, parseDraft } from './weave'

/**
 * Fabric analysis: the smallest draft that weaves a given cloth. Ends with identical columns share a shaft and
 * picks with identical rows share a treadle; the tie-up then says which shaft rises on which treadle.
 * `cloth[pick][end]` is true where warp shows. Colours are kept from `base`.
 */
export function draftFromCloth(cloth: boolean[][], base: Draft, maxShafts = 16, maxTreadles = 16): Draft {
  const picks = cloth.length
  const ends = cloth[0]?.length ?? 0
  if (picks === 0 || ends === 0) throw new Error('Draw some cloth first')

  const columns: string[] = []
  const threading = Array.from({ length: ends }, (_, e) => {
    const key = cloth.map((row) => (row[e] ? '1' : '0')).join('')
    // An end that never rises needs no shaft at all.
    if (!key.includes('1')) return -1
    let s = columns.indexOf(key)
    if (s < 0) s = columns.push(key) - 1
    return s
  })
  const rows: string[] = []
  const treadleOf = cloth.map((row) => {
    const key = row.map((v) => (v ? '1' : '0')).join('')
    if (!key.includes('1')) return -1
    let t = rows.indexOf(key)
    if (t < 0) t = rows.push(key) - 1
    return t
  })
  if (columns.length > maxShafts)
    throw new Error(`This cloth needs ${columns.length} shafts (different warp movements); the limit is ${maxShafts}`)
  if (rows.length > maxTreadles)
    throw new Error(`This cloth needs ${rows.length} treadles (different sheds); the limit is ${maxTreadles}`)

  const shafts = Math.max(2, columns.length)
  const treadles = Math.max(2, rows.length)
  // Shaft s rises on treadle t if a representative end on s shows warp on a representative pick of t.
  const tieup = Array.from({ length: shafts }, (_, s) =>
    Array.from({ length: treadles }, (_, t) => {
      const e = threading.indexOf(s)
      const p = treadleOf.indexOf(t)
      return e >= 0 && p >= 0 && cloth[p][e]
    }),
  )
  const cycle = (colors: string[], n: number) => Array.from({ length: n }, (_, i) => colors[i % colors.length])
  return parseDraft({
    shafts,
    treadles,
    ends,
    picks,
    threading,
    tieup,
    treadling: treadleOf.map((t) => Array.from({ length: treadles }, (_, i) => i === t)),
    warpColors: cycle(base.warpColors, ends),
    weftColors: cycle(base.weftColors, picks),
  })
}
