import { describe, expect, it } from 'vitest'
import { isDirectTieup, liftsPerPick, toLiftplan, toTreadling } from './liftplan'
import { edgeCaseDraft, greenBlocks } from './testUtils'
import { computeDrawdown, type Draft, defaultDraft, MAX_TREADLES, resizeDraft } from './weave'

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

  describe('back to treadles after a lift plan', () => {
    const shed = (d: Draft, pick: number) => liftsPerPick(d)[pick].join(',')
    // Six treadles, and pick 1 pressing two at once.
    const onTreadles = () => {
      const d = resizeDraft(defaultDraft(), { treadles: 6 })
      // Treadle 5 lifts shaft 1 alone, and treadle 6 shaft 4 alone.
      d.tieup.forEach((row, s) => {
        row[4] = s === 0
        row[5] = s === 3
      })
      d.treadling[0] = d.treadling[0].map((_, t) => t === 0 || t === 2)
      return d
    }

    it('gives back the tie-up and treadling as they were', () => {
      const before = onTreadles()
      const back = toTreadling(toLiftplan(before), MAX_TREADLES, before)
      expect(back.tieup).toEqual(before.tieup)
      expect(back.treadling).toEqual(before.treadling)
    })

    it('keeps the tie-up when picks change, using its treadles where they fit and adding one for a new shed', () => {
      const before = onTreadles()
      const lift = toLiftplan(before)
      lift.treadling[1] = lift.treadling[0].map((_, s) => s === 0) // shaft 1 alone: what treadle 5 lifts
      lift.treadling[2] = lift.treadling[0].map((_, s) => s === 1 || s === 3) // shafts 2 and 4: no treadle does
      lift.treadling[3] = lift.treadling[0].map(() => false)
      const back = toTreadling(lift, MAX_TREADLES, before)
      expect(back.treadles).toBe(7)
      expect(back.tieup.map((row) => row.slice(0, 6))).toEqual(before.tieup)
      expect(back.treadling[0]).toEqual([...before.treadling[0], false])
      expect(back.treadling[1].indexOf(true)).toBe(4)
      expect(back.treadling[2].indexOf(true)).toBe(6)
      expect(back.treadling[3].some(Boolean)).toBe(false)
      expect(back.treadling.slice(4)).toEqual(before.treadling.slice(4).map((r) => [...r, false]))
      expect(computeDrawdown(back)).toEqual(computeDrawdown(lift))
      expect(shed(back, 2)).toBe('1,3')
    })

    it('copes with shafts added or taken away in the lift plan', () => {
      const before = onTreadles()
      for (const shafts of [6, 3]) {
        const lift = toLiftplan(resizeDraft(toLiftplan(before), { shafts, treadles: shafts }))
        const back = toTreadling(lift, MAX_TREADLES, before)
        expect(computeDrawdown(back)).toEqual(computeDrawdown(lift))
      }
    })
  })

  it('recognises a direct tie-up', () => {
    expect(isDirectTieup(defaultDraft())).toBe(false)
  })
})
