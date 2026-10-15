import { isDirectTieup } from './liftplan'
import { advancing, point, straight, trompAsWrit } from './tools'
import { computeDrawdown, type Draft } from './weave'

export interface Variation {
  name: string
  draft: Draft
}

const sameCloth = (a: Draft, b: Draft) => JSON.stringify(computeDrawdown(a)) === JSON.stringify(computeDrawdown(b))

/** Keeps the first of any variations that weave the same cloth as each other or as the original. */
function distinct(original: Draft, variations: Variation[]): Variation[] {
  const kept: Variation[] = []
  for (const v of variations)
    if (!sameCloth(v.draft, original) && !kept.some((k) => sameCloth(k.draft, v.draft))) kept.push(v)
  return kept
}

/** A tie-up where treadle t lifts the `lift` shafts starting at shaft t (wrapping): a k/(n−k) twill. */
const twill = (shafts: number, treadles: number, lift: number) =>
  Array.from({ length: shafts }, (_, s) =>
    Array.from({ length: treadles }, (_, t) => (s - (t % shafts) + shafts) % shafts < lift),
  )

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/**
 * The move numbers that make an even satin on n shafts: each treadle lifts one shaft, `move` along from the last,
 * where move and n share no factor and move isn't 1 or n−1 (those make a twill). Mirror-image pairs give one each.
 */
export function satinMoves(n: number): number[] {
  const moves: number[] = []
  for (let m = 2; m < n - 1; m++) if (gcd(m, n) === 1 && !moves.includes(n - m)) moves.push(m)
  return moves
}

/** A satin tie-up: treadle t lifts the one shaft t × move along (wrapping), so the stitches are spread out. */
const satin = (shafts: number, treadles: number, move: number) =>
  Array.from({ length: shafts }, (_, s) => Array.from({ length: treadles }, (_, t) => (t * move) % shafts === s))

/**
 * The same threading and treadling with other tie-ups: plain weave, satins, the standard twills, broken twill, and the current tie-up
 * inverted, mirrored and turned one treadle along. Not offered for a lift plan, which has no tie-up to change.
 */
export function tieupVariations(d: Draft): Variation[] {
  if (isDirectTieup(d)) return []
  const { shafts, treadles, tieup } = d
  const columns = (order: number[]) => tieup.map((row) => order.map((t) => row[t]))
  const all = Array.from({ length: treadles }, (_, t) => t)
  const v: Variation[] = [
    { name: 'Tie-up inverted', draft: { ...d, tieup: tieup.map((row) => row.map((x) => !x)) } },
    { name: 'Tie-up mirrored', draft: { ...d, tieup: columns([...all].reverse()) } },
    { name: 'Tie-up turned along one', draft: { ...d, tieup: columns(all.map((t) => (t + 1) % treadles)) } },
  ]
  v.push({
    name: 'Plain weave tie-up',
    draft: { ...d, tieup: Array.from({ length: shafts }, (_, s) => all.map((t) => s % 2 === t % 2)) },
  })
  for (const move of satinMoves(shafts))
    v.push({ name: `${shafts}-end satin tie-up (move ${move})`, draft: { ...d, tieup: satin(shafts, treadles, move) } })
  for (let lift = 1; lift < shafts; lift++)
    v.push({ name: `${lift}/${shafts - lift} twill tie-up`, draft: { ...d, tieup: twill(shafts, treadles, lift) } })
  if (shafts >= 4) {
    // Broken twill: a 2/2-style twill with every second pair of treadles swapped.
    const t = twill(shafts, treadles, Math.floor(shafts / 2))
    const order = all.map((i) => (i % 4 === 2 ? i + 1 : i % 4 === 3 ? i - 1 : i)).map((i) => Math.min(i, treadles - 1))
    v.push({ name: 'Broken twill tie-up', draft: { ...d, tieup: t.map((row) => order.map((i) => row[i])) } })
  }
  return distinct(d, v)
}

/** Fills every pick from a repeating sequence of 1-based treadles. */
const fillTreadling = (d: Draft, sequence: number[]): Draft => ({
  ...d,
  treadling: d.treadling.map((_, p) => {
    const n = sequence[p % sequence.length]
    return Array.from({ length: d.treadles }, (_, t) => t === n - 1)
  }),
})

/** The same threading and tie-up with other treadlings: as drawn in, straight, point, advancing and reversed. */
export function treadlingVariations(d: Draft): Variation[] {
  const n = d.treadles
  const v: Variation[] = [
    { name: 'Treadled as drawn in', draft: trompAsWrit(d).draft },
    { name: 'Straight treadling', draft: fillTreadling(d, straight(n)) },
    { name: 'Point treadling', draft: fillTreadling(d, point(n)) },
    {
      name: 'Reversed treadling',
      draft: { ...d, treadling: [...d.treadling].reverse(), weftColors: [...d.weftColors].reverse() },
    },
  ]
  if (n >= 4) v.push({ name: 'Advancing treadling', draft: fillTreadling(d, advancing(n, 4, 1)) })
  return distinct(d, v)
}
