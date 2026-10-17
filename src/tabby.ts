import { isDirectTieup } from './liftplan'
import { MAX_THREADS } from './tools'
import { type Draft, MAX_TREADLES, parseDraft } from './weave'

/** The shafts a tabby pick lifts: shafts 1, 3, 5… (`odd`) or 2, 4, 6…, 0-based. */
const tabbyShafts = (shafts: number, odd: boolean) =>
  Array.from({ length: shafts }, (_, s) => s).filter((s) => s % 2 === (odd ? 0 : 1))

/** The warp colour used most, for the tabby weft (often the same yarn as the warp). */
export function tabbyColour(d: Draft): string {
  const counts = new Map<string, number>()
  for (const c of d.warpColors) counts.set(c, (counts.get(c) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? d.weftColors[0]
}

export interface Tabbied {
  draft: Draft
  /** The tabby treadles (1-based), or null on a lift plan, which lifts the shafts directly. */
  treadles: [number, number] | null
}

/**
 * Adds a tabby (plain weave) pick after every pick, alternately lifting shafts 1, 3, 5… and 2, 4, 6…, so each tabby
 * pick is the opposite shed to the one before it. On treadles it uses treadles that already tie up those sheds, or
 * adds two tabby treadles; on a lift plan the tabby picks lift the shafts directly.
 */
export function addTabby(d: Draft, colour = tabbyColour(d)): Tabbied {
  if (d.shafts < 2) throw new Error('Tabby needs at least 2 shafts')
  const picks = d.picks * 2
  if (picks > MAX_THREADS) throw new Error(`That would make ${picks} picks; the limit is ${MAX_THREADS}`)
  const sheds = [tabbyShafts(d.shafts, true), tabbyShafts(d.shafts, false)]
  const liftplan = isDirectTieup(d)

  let { tieup, treadles } = d
  let rowFor: (shed: number[]) => boolean[]
  let tabbyTreadles: [number, number] | null = null
  if (liftplan) rowFor = (shed) => Array.from({ length: d.shafts }, (_, s) => shed.includes(s))
  else {
    // A treadle tied to exactly this shed already, or a new one at the right.
    const columnFor = (shed: number[]) => {
      const t = tieup[0].findIndex((_, t) => tieup.every((row, s) => row[t] === shed.includes(s)))
      if (t >= 0) return t
      tieup = tieup.map((row, s) => [...row, shed.includes(s)])
      return treadles++
    }
    const columns = sheds.map(columnFor)
    if (treadles > MAX_TREADLES) throw new Error(`Tabby needs 2 more treadles; the limit is ${MAX_TREADLES}`)
    tabbyTreadles = [columns[0] + 1, columns[1] + 1]
    rowFor = (shed) => Array.from({ length: treadles }, (_, t) => t === columns[sheds.indexOf(shed)])
  }
  const widen = (row: boolean[]) => [...row, ...Array<boolean>(treadles - row.length).fill(false)]
  const treadling = d.treadling.flatMap((row, p) => [widen(row), rowFor(sheds[p % 2])])
  const weftColors = d.weftColors.flatMap((c) => [c, colour])
  // Weft stripes no longer line up with the picks.
  const stripes = d.stripes?.warp ? { warp: d.stripes.warp } : undefined
  return {
    draft: parseDraft({ ...d, treadles, tieup, picks, treadling, weftColors, stripes }),
    treadles: tabbyTreadles,
  }
}
