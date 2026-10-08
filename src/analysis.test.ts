import { describe, expect, it } from 'vitest'
import { draftFromCloth } from './analysis'
import { edgeCaseDraft, greenBlocks } from './testUtils'
import { computeDrawdown, defaultDraft } from './weave'

describe('draftFromCloth', () => {
  it.each([
    ['twill', defaultDraft()],
    ['green blocks', greenBlocks()],
    ['edge cases', edgeCaseDraft()],
  ])('rebuilds a draft that weaves exactly the same %s cloth', (_, d) => {
    const cloth = computeDrawdown(d)
    const rebuilt = draftFromCloth(cloth, d)
    expect(computeDrawdown(rebuilt)).toEqual(cloth)
    expect(rebuilt.shafts).toBeLessThanOrEqual(Math.max(2, d.shafts))
  })

  it('uses as few shafts and treadles as the cloth needs', () => {
    // Plain weave drawn by hand: 2 kinds of column, 2 kinds of row.
    const cloth = Array.from({ length: 6 }, (_, p) => Array.from({ length: 6 }, (_, e) => (p + e) % 2 === 0))
    const d = draftFromCloth(cloth, defaultDraft())
    expect([d.shafts, d.treadles]).toEqual([2, 2])
    expect(d.threading).toEqual([0, 1, 0, 1, 0, 1])
  })

  it('leaves ends that never rise unthreaded and picks with no shed empty', () => {
    const cloth = [
      [true, false],
      [false, false],
    ]
    const d = draftFromCloth(cloth, defaultDraft())
    expect(d.threading).toEqual([0, -1])
    expect(d.treadling[1]).toEqual([false, false])
  })

  it('finds drafts needing up to 24 shafts and treadles', () => {
    // 24 different columns and rows: a diagonal.
    const cloth = Array.from({ length: 24 }, (_, p) => Array.from({ length: 24 }, (_, e) => p === e))
    const d = draftFromCloth(cloth, defaultDraft())
    expect([d.shafts, d.treadles]).toEqual([24, 24])
    expect(computeDrawdown(d)).toEqual(cloth)
  })

  it('refuses cloth needing too many shafts', () => {
    // 129 different columns: a diagonal.
    const cloth = Array.from({ length: 129 }, (_, p) => Array.from({ length: 129 }, (_, e) => p === e))
    expect(() => draftFromCloth(cloth, defaultDraft())).toThrow(/needs 129 shafts/)
    expect(() => draftFromCloth([], defaultDraft())).toThrow(/Draw some cloth/)
  })
})
