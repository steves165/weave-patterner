import { describe, expect, it } from 'vitest'
import { toLiftplan } from './liftplan'
import { greenBlocks } from './testUtils'
import { satinMoves, tieupVariations, treadlingVariations } from './variations'
import { computeDrawdown, defaultDraft, resizeDraft } from './weave'

describe('variations', () => {
  it('offers tie-ups that change the cloth, without duplicates', () => {
    const v = tieupVariations(defaultDraft())
    const names = v.map((x) => x.name)
    expect(names).toContain('1/3 twill tie-up')
    expect(names).toContain('Broken twill tie-up')
    expect(names).not.toContain('2/2 twill tie-up') // that's the current one
    const cloths = v.map((x) => JSON.stringify(computeDrawdown(x.draft)))
    expect(new Set(cloths).size).toBe(cloths.length)
    expect(tieupVariations(toLiftplan(defaultDraft()))).toEqual([])
  })

  it('offers plain weave, and satins from five shafts', () => {
    expect(tieupVariations(defaultDraft()).map((x) => x.name)).toContain('Plain weave tie-up')
    expect(satinMoves(4)).toEqual([])
    expect(satinMoves(5)).toEqual([2])
    expect(satinMoves(8)).toEqual([3])
    const eight = resizeDraft(defaultDraft(), { shafts: 8, treadles: 8 })
    const satin = tieupVariations(eight).find((x) => x.name === '8-end satin tie-up (move 3)')
    // One shaft lifted per treadle, each three along from the last.
    expect(satin?.draft.tieup.map((row) => row.findIndex(Boolean))).toEqual([0, 3, 6, 1, 4, 7, 2, 5])
  })

  it('offers treadlings, keeping the threading and tie-up', () => {
    const d = greenBlocks()
    const v = treadlingVariations(d)
    expect(v.length).toBeGreaterThan(1)
    for (const x of v) {
      expect(x.draft.threading).toEqual(d.threading)
      expect(x.draft.tieup).toEqual(d.tieup)
    }
  })
})
