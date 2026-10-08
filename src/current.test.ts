import { describe, expect, it } from 'vitest'
import { parseCurrent } from './current'
import { greenBlocks } from './testUtils'
import { defaultDraft } from './weave'

describe('parseCurrent', () => {
  it('restores the name, draft and baseline', () => {
    const draft = greenBlocks()
    const baseline = defaultDraft()
    expect(parseCurrent(JSON.stringify({ name: 'Blocks', draft, baseline }))).toEqual({
      name: 'Blocks',
      draft,
      baseline,
    })
  })

  it('restores an unsaved pattern with no name, using the draft as the baseline when none was stored', () => {
    const draft = defaultDraft()
    expect(parseCurrent(JSON.stringify({ name: null, draft }))).toEqual({ name: null, draft, baseline: draft })
  })

  it('keeps the draft when only the baseline is unreadable', () => {
    const draft = defaultDraft()
    expect(parseCurrent(JSON.stringify({ name: 'x', draft, baseline: { shafts: 'no' } }))?.baseline).toEqual(draft)
  })

  it.each([
    ['nothing stored', null],
    ['invalid JSON', '{'],
    ['no draft', '{"name":"x"}'],
    ['an invalid draft', JSON.stringify({ draft: { ...defaultDraft(), threading: [] } })],
  ])('returns null for %s', (_, json) => {
    expect(parseCurrent(json)).toBeNull()
  })
})
