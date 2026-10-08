import { describe, expect, it } from 'vitest'
import { isDirectTieup, liftsPerPick, toLiftplan, toTreadling } from './liftplan'
import { edgeCaseDraft, greenBlocks } from './testUtils'
import { computeDrawdown, defaultDraft, resizeDraft } from './weave'

describe('lift plans', () => {
  it('lists the shafts lifted on each pick', () => {
    expect(liftsPerPick(defaultDraft()).slice(0, 2)).toEqual([
      [0, 1],
      [1, 2],
    ])
  })

  it.each([
    ['twill', defaultDraft()],
    ['green blocks', greenBlocks()],
    ['edge cases', edgeCaseDraft()],
  ])('converting %s to a lift plan and back keeps the cloth', (_, d) => {
    const lift = toLiftplan(d)
    expect(isDirectTieup(lift)).toBe(true)
    expect(lift.treadles).toBe(d.shafts)
    expect(computeDrawdown(lift)).toEqual(computeDrawdown(d))
    const back = toTreadling(lift)
    expect(computeDrawdown(back)).toEqual(computeDrawdown(d))
    expect(back.treadling.every((row) => row.filter(Boolean).length <= 1)).toBe(true)
  })

  it('makes one treadle per distinct shed, in order of first use', () => {
    const back = toTreadling(toLiftplan(defaultDraft()))
    expect(back.treadles).toBe(4)
    expect(back.tieup.map((r) => r.map(Number).join(''))).toEqual(['1001', '1100', '0110', '0011'])
  })

  it('converts lift plans with up to 24 different sheds', () => {
    const lift = resizeDraft(defaultDraft(), { shafts: 24, treadles: 24, picks: 24 })
    const asLift = toLiftplan(lift)
    expect(asLift.shafts).toBe(24)
    const back = toTreadling(asLift)
    expect(back.treadles).toBe(24)
    expect(computeDrawdown(back)).toEqual(computeDrawdown(lift))
  })

  it('refuses when there are more sheds than treadles allow', () => {
    expect(() => toTreadling(toLiftplan(defaultDraft()), 3)).toThrow(/4 different sheds; a tie-up can only have 3/)
  })

  it('recognises a direct tie-up', () => {
    expect(isDirectTieup(defaultDraft())).toBe(false)
  })
})
