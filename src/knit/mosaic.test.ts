import { describe, expect, it } from 'vitest'
import { blankChart, longFloats, paint } from './chart'
import { writeRow } from './instructions'
import { mosaic } from './mosaic'

describe('mosaic', () => {
  it('makes each design row a pair of rows in one colour, slipping the other', () => {
    // Row 1 all A; row 2: B at the two middle squares.
    let design = blankChart(4, 2)
    design = paint(paint(design, 1, 1, { color: 1 }), 1, 2, { color: 1 })
    const { chart, missed } = mosaic(design)
    expect(chart.stitch).toHaveLength(4)
    // Pair 2 (rows 3–4) is worked in B: the middle squares knitted, the edges slipped.
    expect(chart.stitch[2]).toEqual(['sl', 'k', 'k', 'sl'])
    expect(chart.stitch[3]).toEqual(['sl', 'p', 'p', 'sl']) // garter: knitted back on the wrong side
    expect(chart.color[2]).toEqual([0, 1, 1, 0])
    expect(missed).toBe(0)
    expect(writeRow(chart, 2)).toBe('sl1 wyib, k2 B, sl1 wyib')
    // Slipped stitches aren't floats of the other colour.
    expect(longFloats({ ...chart, floatLimit: 1 })).toEqual([])
  })

  it("counts squares it can't follow, and stockinette purls back", () => {
    // B wanted in row 1, but row 1's pair is worked in A and the stitch below is A.
    const design = paint(blankChart(3, 1), 0, 1, { color: 1 })
    const { chart, missed } = mosaic(design, false)
    expect(missed).toBe(1)
    expect(chart.stitch[1]).toEqual(['k', 'sl', 'k'])
  })
})
