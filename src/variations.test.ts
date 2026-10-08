import { describe, expect, it } from 'vitest'
import { toLiftplan } from './liftplan'
import { greenBlocks } from './testUtils'
import { tieupVariations, treadlingVariations } from './variations'
import { computeDrawdown, defaultDraft } from './weave'

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
