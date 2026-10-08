import { describe, expect, it } from 'vitest'
import { blankChart, paint } from './chart'
import { chartFrom } from './samples'
import { yarnNeeded } from './yarn'

describe('yarn needed', () => {
  it('estimates plain knitting from the gauge: about 12–13 m for a 10 cm square of DK, with 10% extra', () => {
    const [plain] = yarnNeeded(blankChart(22, 30), 10, 10)
    expect(plain.color).toBe(0)
    expect(plain.metres).toBeGreaterThan(12)
    expect(plain.metres).toBeLessThan(13)
    // Twice the area, twice the yarn, however many times the chart repeats.
    expect(yarnNeeded(blankChart(11, 15), 20, 10)[0].metres).toBeCloseTo(plain.metres * 2, 5)
  })

  it('adds the floats carried behind in stranded colourwork, and more for bobbles', () => {
    const solid = yarnNeeded(blankChart(8, 1), 10, 10)[0].metres
    // One row: B, then 6 A, then B: B floats behind the 6 stitches of A.
    let k = paint(paint(blankChart(8, 1), 0, 0, { color: 1 }), 0, 7, { color: 1 })
    const [a, b] = yarnNeeded(k, 10, 10)
    expect(a.metres).toBeCloseTo((solid * 6) / 8, 5)
    expect(b.metres).toBeGreaterThan((solid * 2) / 8)
    k = paint(blankChart(8, 1), 0, 3, { stitch: 'mb' })
    expect(yarnNeeded(k, 10, 10)[0].metres).toBeGreaterThan(solid * 1.5)
    expect(yarnNeeded(chartFrom(['--..']), 10, 10)).toHaveLength(1)
  })
})
