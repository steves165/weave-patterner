/**
 * Warp and weft yarn requirements. Short lengths (width, finished length, allowances, waste) are in cm or inches;
 * yarn totals come out in metres or yards.
 */
export type Units = 'metric' | 'imperial'

export interface CalcInput {
  units: Units
  /** Warp ends on the loom. */
  ends: number
  /** Ends per cm or per inch. */
  sett: number
  /** Picks per cm or per inch. */
  ppi: number
  /** Finished length of one piece (cm or in). */
  finishedLength: number
  pieces: number
  /** Extra per piece for fringe or hems (cm or in). */
  allowance: number
  /** Loom waste for the whole warp (cm or in). */
  loomWaste: number
  /** Percentages, 0-99. */
  takeUp: number
  shrinkage: number
  /** Optional yarn grist (m per kg, or yd per lb) and price (per kg or lb) for weights and cost. */
  yarnPerWeight?: number
  pricePerWeight?: number
  /** Colour of each end / pick in one repeat of the draft; cycled across the warp and weft. */
  warpColors: string[]
  weftColors: string[]
}

export interface YarnAmount {
  color: string
  /** Metres or yards. */
  length: number
  /** kg or lb, when a grist is given. */
  weight?: number
  cost?: number
}

export interface CalcResult {
  /** Width in the reed (cm or in). */
  widthInReed: number
  /** Warp length to wind (m or yd). */
  warpLength: number
  /** Woven length on the loom before shrinkage (cm or in). */
  wovenLength: number
  totalPicks: number
  warp: YarnAmount[]
  weft: YarnAmount[]
  totalLength: number
  totalWeight?: number
  totalCost?: number
}

export function validate(input: CalcInput): string | null {
  const positive: [keyof CalcInput, string][] = [
    ['ends', 'Ends'],
    ['sett', 'Sett'],
    ['ppi', 'Picks per unit'],
    ['finishedLength', 'Finished length'],
    ['pieces', 'Pieces'],
  ]
  for (const [k, label] of positive) {
    const v = input[k] as number
    if (!Number.isFinite(v) || v <= 0) return `${label} must be more than 0`
  }
  for (const [k, label] of [
    ['allowance', 'Allowance'],
    ['loomWaste', 'Loom waste'],
  ] as const)
    if (!Number.isFinite(input[k]) || input[k] < 0) return `${label} can't be negative`
  for (const [k, label] of [
    ['takeUp', 'Take-up'],
    ['shrinkage', 'Shrinkage'],
  ] as const)
    if (!Number.isFinite(input[k]) || input[k] < 0 || input[k] >= 100) return `${label} must be between 0 and 99%`
  return null
}

/** Counts how many threads each colour gets when `colors` is cycled over `count` threads. */
function colorCounts(colors: string[], count: number) {
  const counts = new Map<string, number>()
  for (let i = 0; i < count; i++) {
    const c = colors[i % colors.length].toLowerCase()
    counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  return counts
}

export function calculate(input: CalcInput): CalcResult {
  const error = validate(input)
  if (error) throw new Error(error)
  const long = input.units === 'metric' ? 100 : 36 // cm per m, inches per yard
  const takeUp = input.takeUp / 100
  const shrink = input.shrinkage / 100

  const widthInReed = input.ends / input.sett
  // Cloth shrinks off the loom, and the warp is taken up by weaving: grow the length for both, then add waste.
  const wovenLength = ((input.finishedLength + input.allowance) * input.pieces) / (1 - shrink)
  const warpLength = (wovenLength / (1 - takeUp) + input.loomWaste) / long
  const totalPicks = Math.ceil(wovenLength * input.ppi)
  // Each pick crosses the width in the reed plus the same take-up.
  const pickLength = widthInReed / (1 - takeUp) / long

  const withWeight = (color: string, length: number): YarnAmount => {
    const amount: YarnAmount = { color, length }
    if (input.yarnPerWeight && input.yarnPerWeight > 0) {
      amount.weight = length / input.yarnPerWeight
      if (input.pricePerWeight && input.pricePerWeight > 0) amount.cost = amount.weight * input.pricePerWeight
    }
    return amount
  }
  const warp = [...colorCounts(input.warpColors, input.ends)].map(([c, n]) => withWeight(c, n * warpLength))
  const weft = [...colorCounts(input.weftColors, totalPicks)].map(([c, n]) => withWeight(c, n * pickLength))
  const all = [...warp, ...weft]
  const sum = (f: (a: YarnAmount) => number | undefined) =>
    all.every((a) => f(a) !== undefined) ? all.reduce((s, a) => s + (f(a) ?? 0), 0) : undefined
  return {
    widthInReed,
    warpLength,
    wovenLength,
    totalPicks,
    warp,
    weft,
    totalLength: sum((a) => a.length) ?? 0,
    totalWeight: sum((a) => a.weight),
    totalCost: sum((a) => a.cost),
  }
}

export const defaultCalcInput = (units: Units = 'metric'): Omit<CalcInput, 'ends' | 'warpColors' | 'weftColors'> =>
  units === 'metric'
    ? {
        units,
        sett: 8,
        ppi: 8,
        finishedLength: 180,
        pieces: 1,
        allowance: 20,
        loomWaste: 75,
        takeUp: 10,
        shrinkage: 10,
      }
    : {
        units,
        sett: 20,
        ppi: 20,
        finishedLength: 72,
        pieces: 1,
        allowance: 8,
        loomWaste: 30,
        takeUp: 10,
        shrinkage: 10,
      }
