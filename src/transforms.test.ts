import { describe, expect, it } from 'vitest'
import { toLiftplan } from './liftplan'
import { edgeCaseDraft, greenBlocks } from './testUtils'
import { flipDraft, invertDraft, shiftDraft, turnDraft } from './transforms'
import { computeDrawdown, type Draft, defaultDraft } from './weave'

const transpose = <T>(g: T[][]) => (g[0] ?? []).map((_, c) => g.map((row) => row[c]))
const not = (g: boolean[][]) => g.map((row) => row.map((v) => !v))

/** The cloth as colours, so threads moving with their colours can be checked. */
const colours = (d: Draft) => {
  const dd = computeDrawdown(d)
  return dd.map((row, p) => row.map((up, e) => (up ? d.warpColors[e] : d.weftColors[p])))
}

describe('turnDraft', () => {
  it.each([
    ['twill', defaultDraft()],
    ['green blocks', greenBlocks()],
    ['a lift plan', toLiftplan(greenBlocks())],
  ])('turns %s through 90°: same cloth, warp and weft swapped', (_, d) => {
    const t = turnDraft(d)
    expect([t.ends, t.picks]).toEqual([d.picks, d.ends])
    expect(computeDrawdown(t)).toEqual(not(transpose(computeDrawdown(d))))
    expect(colours(t)).toEqual(transpose(colours(d)))
  })

  it('makes one shaft per different shed', () => {
    const t = turnDraft(defaultDraft())
    expect([t.shafts, t.treadles]).toEqual([4, 4])
  })

  it('turns unthreaded ends and empty picks into each other', () => {
    const d = edgeCaseDraft()
    const t = turnDraft(d)
    d.threading.forEach((s, e) => {
      expect(t.treadling[e].some(Boolean)).toBe(s >= 0)
    })
    d.treadling.forEach((row, p) => {
      expect(t.threading[p] >= 0).toBe(row.some(Boolean))
    })
  })

  it('turns back to the same cloth', () => {
    const d = greenBlocks()
    expect(colours(turnDraft(turnDraft(d)))).toEqual(colours(d))
  })
})

describe('invertDraft', () => {
  it('swaps warp and weft faces, for a tie-up or a lift plan', () => {
    for (const d of [defaultDraft(), greenBlocks(), toLiftplan(greenBlocks())]) {
      const inv = invertDraft(d)
      expect(computeDrawdown(inv)).toEqual(not(computeDrawdown(d)))
    }
    const lift = invertDraft(toLiftplan(greenBlocks()))
    expect(lift.tieup).toEqual(toLiftplan(greenBlocks()).tieup) // still a lift plan
  })
})

describe('flipDraft and shiftDraft', () => {
  it('mirrors the cloth left to right and top to bottom', () => {
    const d = greenBlocks()
    expect(colours(flipDraft(d, 'horizontal'))).toEqual(colours(d).map((row) => [...row].reverse()))
    expect(colours(flipDraft(d, 'vertical'))).toEqual([...colours(d)].reverse())
  })

  it('moves the pattern round, wrapping at the edges', () => {
    const d = greenBlocks()
    const s = shiftDraft(d, 3, -2)
    const c = colours(d)
    const shifted = colours(s)
    expect(shifted[0][3]).toBe(c[2][0])
    expect(shifted[d.picks - 2][0]).toBe(c[0][d.ends - 3])
    expect(shiftDraft(d, d.ends, d.picks)).toEqual(d)
  })
})
