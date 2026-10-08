import { describe, expect, it } from 'vitest'
import { findRepeat } from './repeat'
import { greenBlocks } from './testUtils'
import { defaultDraft, resizeDraft } from './weave'

describe('findRepeat', () => {
  it('finds the 4 × 4 repeat of the default twill', () => {
    expect(findRepeat(defaultDraft())).toEqual({ ends: 4, picks: 4 })
  })

  it('counts colours and allows a part repeat at the end', () => {
    const d = defaultDraft()
    d.warpColors = d.warpColors.map((_, e) => (e % 8 < 4 ? '#000000' : '#ffffff'))
    expect(findRepeat(d).ends).toBe(8)
    expect(findRepeat(resizeDraft(defaultDraft(), { ends: 30 })).ends).toBe(4)
  })

  it('gives the whole draft when nothing repeats', () => {
    const d = defaultDraft()
    d.threading[0] = -1 // end 1 is unlike any other, so nothing repeats
    expect(findRepeat(d).ends).toBe(32)
    expect(findRepeat(greenBlocks()).ends).toBeLessThanOrEqual(96)
  })
})
