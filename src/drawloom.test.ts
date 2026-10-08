import { describe, expect, it } from 'vitest'
import {
  type DrawloomDesign,
  drawloomCloth,
  drawloomDraft,
  drawSequence,
  groundTreadling,
  ranges,
  sampleDrawloom,
} from './drawloom'
import { longestFloats } from './floats'
import { computeDrawdown } from './weave'

const design = (pattern: boolean[][], ground: DrawloomDesign['ground'] = 'satin5', unit = 5): DrawloomDesign => ({
  pattern,
  unit,
  ground,
  warp: '#ffffff',
  weft: '#000000',
})

describe('drawloom', () => {
  it('weaves warp-faced satin in pattern units and weft-faced satin in the ground', () => {
    const cloth = drawloomCloth(design([[true, false]]))
    expect(cloth).toHaveLength(5)
    expect(cloth[0]).toHaveLength(10)
    const share = (cols: number[]) => cloth.flatMap((row) => cols.map((c) => row[c])).filter(Boolean).length / 25
    expect(share([0, 1, 2, 3, 4])).toBe(0.8) // pattern: warp shows 4 in 5
    expect(share([5, 6, 7, 8, 9])).toBe(0.2) // ground: weft shows 4 in 5
  })

  it('keeps satin floats short: binding points never touch', () => {
    for (const ground of ['satin5', 'satin8'] as const) {
      const d = design([[true]], ground, ground === 'satin5' ? 10 : 16)
      const cloth = drawloomCloth(d)
      // Each binding point (weft up) has no other binding point beside it, so floats stay at most shafts − 1.
      const n = ground === 'satin5' ? 5 : 8
      for (const row of cloth) {
        let run = 0
        let longest = 0
        for (const up of row) {
          run = up ? run + 1 : 0
          longest = Math.max(longest, run)
        }
        expect(longest).toBeLessThanOrEqual(n - 1)
      }
    }
  })

  it('lists the draw cords to pull for each row, and the ground treadling', () => {
    const seq = drawSequence(
      design([
        [true, true, true, false, true],
        [true, true, true, false, true],
        [false, false, false, false, false],
      ]),
    )
    expect(seq.map((s) => ranges(s.cords))).toEqual(['1–3, 5', '1–3, 5', ''])
    expect(seq.map((s) => s.same)).toEqual([false, true, false])
    expect(groundTreadling(design([[true]]))).toEqual([1, 3, 5, 2, 4])
    expect(ranges([1, 2, 3, 7, 9, 10])).toBe('1–3, 7, 9–10')
  })

  it('turns into a shaft draft that weaves the same cloth', () => {
    const d = design([
      [true, false, true],
      [false, true, false],
    ])
    const draft = drawloomDraft(d)
    expect(computeDrawdown(draft)).toEqual(drawloomCloth(d))
    expect(draft.shafts).toBe(10) // two kinds of unit column, five ground shafts each
    expect(longestFloats(draft).warp).toBeLessThanOrEqual(8)
  })

  it('refuses a shaft draft when the pattern needs more than 128 shafts', () => {
    const pattern = [
      Array.from({ length: 30 }, (_, c) => c % 2 === 0),
      Array.from({ length: 30 }, (_, c) => c % 3 === 0),
    ]
    // Two rows give at most four kinds of unit column (pattern or ground in each row): 20 shafts, which fits.
    expect(() => drawloomDraft(design(pattern))).not.toThrow()
    const diagonal = Array.from({ length: 30 }, (_, r) => Array.from({ length: 30 }, (_, c) => r === c))
    expect(() => drawloomDraft(design(diagonal))).toThrow(/needs \d+ shafts/)
  })

  it('has a sample design', () => {
    const d = sampleDrawloom()
    expect(drawloomCloth(d)).toHaveLength(24 * 5)
  })
})
