import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { deletePattern, listPatterns, MAX_PATTERNS, nextPatternName, renamePattern, savePattern } from './storage'
import { defaultDraft, resizeDraft } from './weave'

beforeEach(async () => {
  for (const p of await listPatterns()) await deletePattern(p.name)
})

describe('saved patterns', () => {
  it('saves and lists patterns, newest first', async () => {
    await savePattern('A', defaultDraft())
    await new Promise((r) => setTimeout(r, 5))
    await savePattern('B', defaultDraft())
    expect((await listPatterns()).map((p) => p.name)).toEqual(['B', 'A'])
  })

  it('replaces a pattern saved under the same name', async () => {
    await savePattern('A', defaultDraft())
    await savePattern('A', resizeDraft(defaultDraft(), { ends: 8 }))
    const all = await listPatterns()
    expect(all).toHaveLength(1)
    expect(all[0].draft.ends).toBe(8)
  })

  it(`allows at most ${MAX_PATTERNS} patterns, but still lets existing ones be replaced`, async () => {
    for (let i = 0; i < MAX_PATTERNS; i++) await savePattern(`P${i}`, defaultDraft())
    await expect(savePattern('one too many', defaultDraft())).rejects.toThrow(/up to 200/)
    await expect(savePattern('P0', defaultDraft())).resolves.toBeUndefined()
  })

  it('renames, refusing names already in use', async () => {
    await savePattern('A', defaultDraft())
    await savePattern('B', defaultDraft())
    await renamePattern('A', 'C')
    expect((await listPatterns()).map((p) => p.name).sort()).toEqual(['B', 'C'])
    await expect(renamePattern('B', 'C')).rejects.toThrow(/already exists/)
    await expect(renamePattern('missing', 'D')).rejects.toThrow(/no longer exists/)
  })

  it('deletes', async () => {
    await savePattern('A', defaultDraft())
    await deletePattern('A')
    expect(await listPatterns()).toEqual([])
  })
})

describe('nextPatternName', () => {
  it('continues after the highest "Pattern N", ignoring other names', () => {
    expect(nextPatternName([])).toBe('Pattern 1')
    expect(nextPatternName(['Pattern 2', 'Pattern 10', 'My twill', 'Pattern x'])).toBe('Pattern 11')
  })
})
