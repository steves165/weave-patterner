import { describe, expect, it } from 'vitest'
import { skeletonTieup } from './skeleton'
import { greenBlocks } from './testUtils'
import { computeDrawdown, defaultDraft } from './weave'

describe('skeleton tie-up', () => {
  it('weaves the same cloth on fewer treadles, pressing two at once for some picks', () => {
    // Point twill treadled with all 4 shed pairs plus the 4 single-shaft sheds: 8 sheds.
    const d = defaultDraft()
    const t = 8
    d.treadles = t
    d.tieup = d.tieup.map((_, s) => Array.from({ length: t }, (_, k) => (k < 4 ? (s - k + 4) % 4 < 2 : s === k - 4)))
    d.treadling = d.treadling.map((_, p) => Array.from({ length: t }, (_, k) => k === p % t))
    const result = skeletonTieup(d)
    expect(result).not.toBeNull()
    if (!result) return
    expect(result.draft.treadles).toBeLessThan(8)
    expect(result.pressedTogether).toBeGreaterThan(0)
    expect(computeDrawdown(result.draft)).toEqual(computeDrawdown(d))
    expect(result.draft.treadling.every((row) => row.filter(Boolean).length <= 2)).toBe(true)
    // Already as few as it can be: no second saving.
    expect(skeletonTieup(result.draft)).toBeNull()
  })

  it('gives up when no treadle can be saved', () => {
    expect(skeletonTieup(defaultDraft())).toBeNull()
  })

  it('keeps the cloth for a bigger draft', () => {
    const d = greenBlocks()
    const result = skeletonTieup(d)
    if (result) expect(computeDrawdown(result.draft)).toEqual(computeDrawdown(d))
  })
})
