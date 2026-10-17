import { describe, expect, it } from 'vitest'
import { liftsPerPick, toLiftplan } from './liftplan'
import { addTabby, tabbyColour } from './tabby'
import { MAX_THREADS } from './tools'
import { computeDrawdown, defaultDraft, resizeDraft } from './weave'

describe('tabby', () => {
  it('adds a plain weave pick after every pick, alternating sheds', () => {
    const d = defaultDraft()
    const { draft, treadles } = addTabby(d)
    expect(draft.picks).toBe(d.picks * 2)
    const lifts = liftsPerPick(draft)
    // Pattern picks are kept as they were, in order.
    lifts.forEach((shafts, p) => {
      if (p % 2 === 0) expect(shafts).toEqual(liftsPerPick(d)[p / 2])
    })
    // Tabby picks: 1 3, then 2 4, then 1 3 again.
    expect(lifts[1]).toEqual([0, 2])
    expect(lifts[3]).toEqual([1, 3])
    expect(lifts[5]).toEqual([0, 2])
    // Two new treadles at the right, tied to the tabby sheds.
    expect(treadles).toEqual([5, 6])
    expect(draft.tieup.map((row) => row.slice(4).map(Number).join(''))).toEqual(['10', '01', '10', '01'])
    // A tabby pick is plain weave: every other end up, the opposite on the next tabby pick.
    const dd = computeDrawdown(draft)
    expect(dd[1].map((up, e) => up !== dd[3][e]).every(Boolean)).toBe(true)
  })

  it('uses treadles already tied to the tabby sheds', () => {
    const d = resizeDraft(defaultDraft(), { treadles: 6 })
    d.tieup.forEach((row, s) => {
      row[4] = s % 2 === 1
      row[5] = s % 2 === 0
    })
    const { draft, treadles } = addTabby(d)
    expect(draft.treadles).toBe(6)
    expect(treadles).toEqual([6, 5])
  })

  it('lifts the shafts directly on a lift plan', () => {
    const { draft, treadles } = addTabby(toLiftplan(defaultDraft()))
    expect(treadles).toBeNull()
    expect(draft.treadles).toBe(4)
    expect(draft.treadling[1].map(Number).join('')).toBe('1010')
    expect(draft.treadling[3].map(Number).join('')).toBe('0101')
  })

  it('weaves the tabby in the main warp colour, keeping the pattern picks colours', () => {
    const d = defaultDraft()
    d.warpColors = d.warpColors.map((_, e) => (e < 4 ? '#aa0000' : '#00aa00'))
    d.weftColors = d.weftColors.map(() => '#0000aa')
    expect(tabbyColour(d)).toBe('#00aa00')
    const { draft } = addTabby(d)
    expect(draft.weftColors.slice(0, 4)).toEqual(['#0000aa', '#00aa00', '#0000aa', '#00aa00'])
  })

  it('refuses when the draft would be too long', () => {
    const d = resizeDraft(defaultDraft(), { picks: MAX_THREADS / 2 + 1 })
    expect(() => addTabby(d)).toThrow(/the limit is/)
  })
})
