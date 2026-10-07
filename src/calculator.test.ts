import { describe, expect, it } from 'vitest'
import { type CalcInput, calculate, defaultCalcInput, validate } from './calculator'

const base = (over: Partial<CalcInput> = {}): CalcInput => ({
  ...defaultCalcInput('metric'),
  ends: 200,
  sett: 10,
  ppi: 10,
  finishedLength: 160,
  pieces: 1,
  allowance: 20,
  loomWaste: 50,
  takeUp: 10,
  shrinkage: 10,
  warpColors: ['#ff0000', '#ff0000', '#0000ff', '#0000ff'],
  weftColors: ['#ffffff'],
  ...over,
})

describe('calculate', () => {
  it('works out width, warp length and picks', () => {
    const r = calculate(base())
    expect(r.widthInReed).toBe(20) // 200 ends at 10 per cm
    expect(r.wovenLength).toBeCloseTo(200) // (160 + 20) / 0.9
    expect(r.warpLength).toBeCloseTo((200 / 0.9 + 50) / 100) // metres
    expect(r.totalPicks).toBe(2000)
  })

  it('splits yarn by colour, cycling the draft colours across the warp and weft', () => {
    const r = calculate(base())
    expect(r.warp.map((w) => w.color)).toEqual(['#ff0000', '#0000ff'])
    expect(r.warp[0].length).toBeCloseTo(100 * r.warpLength)
    expect(r.weft).toHaveLength(1)
    expect(r.weft[0].length).toBeCloseTo((2000 * 20) / 0.9 / 100)
    expect(r.totalLength).toBeCloseTo(r.warp[0].length + r.warp[1].length + r.weft[0].length)
  })

  it('adds weight and cost when a grist and price are given', () => {
    const r = calculate(base({ yarnPerWeight: 1000, pricePerWeight: 50 }))
    expect(r.totalWeight).toBeCloseTo(r.totalLength / 1000)
    expect(r.totalCost).toBeCloseTo((r.totalLength / 1000) * 50)
    expect(calculate(base()).totalWeight).toBeUndefined()
  })

  it('uses inches and yards for imperial', () => {
    const r = calculate(
      base({
        units: 'imperial',
        ends: 200,
        sett: 20,
        finishedLength: 72,
        allowance: 0,
        loomWaste: 36,
        takeUp: 0,
        shrinkage: 0,
      }),
    )
    expect(r.widthInReed).toBe(10)
    expect(r.warpLength).toBeCloseTo(3) // (72 + 36) in = 3 yd
  })

  it.each([
    [{ ends: 0 }, 'Ends must be more than 0'],
    [{ sett: -1 }, 'Sett must be more than 0'],
    [{ loomWaste: -5 }, "Loom waste can't be negative"],
    [{ takeUp: 100 }, 'Take-up must be between 0 and 99%'],
    [{ finishedLength: Number.NaN }, 'Finished length must be more than 0'],
  ])('rejects %o', (over, message) => {
    expect(validate(base(over))).toBe(message)
    expect(() => calculate(base(over))).toThrow(message)
  })
})
