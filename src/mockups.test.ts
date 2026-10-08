import { describe, expect, it } from 'vitest'
import { isMockup, MOCKUP_SIZES, repeatsOn, tileSize, VIEWS_3D } from './mockups'
import { defaultDraft } from './weave'

describe('mockups', () => {
  it('sizes one repeat of the draft from the sett', () => {
    // 32 ends at 8 per cm is 4 cm wide; 32 picks at 8 per cm is 4 cm long.
    expect(tileSize(defaultDraft(), { units: 'metric', sett: 8, ppi: 8 })).toEqual({ width: 4, height: 4 })
    const imperial = tileSize(defaultDraft(), { units: 'imperial', sett: 16, ppi: 32 })
    expect(imperial.width).toBeCloseTo(5.08)
    expect(imperial.height).toBeCloseTo(2.54)
  })

  it('works out how often the pattern repeats across a rug', () => {
    const r = repeatsOn({ width: 4, height: 5 }, MOCKUP_SIZES.rug.width, MOCKUP_SIZES.rug.length)
    expect(r).toEqual({ x: 40, y: 46 })
  })

  it('tells thread views from made-up things', () => {
    expect(VIEWS_3D.filter((v) => isMockup(v.value)).map((v) => v.value)).toEqual([
      'sofa',
      'rug',
      'tapestry',
      'coat',
      'skirt',
    ])
    expect(isMockup('draped')).toBe(false)
  })
})
