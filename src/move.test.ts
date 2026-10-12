import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyMove, asMoveData, describeMove, freeName, type MoveData } from './move'
import { MAX_PATTERNS, patternStore } from './storage'
import { defaultDraft, resizeDraft } from './weave'

const weave = patternStore<{ shafts: number }>('weave-patterner')
const knit = patternStore('knit-patterner')
const items = new Map<string, string>()

beforeEach(async () => {
  for (const s of [weave, knit]) for (const p of await s.listPatterns()) await s.deletePattern(p.name)
  items.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => items.set(k, String(v)),
    removeItem: (k: string) => items.delete(k),
  })
})

const move = (patterns: MoveData['patterns'], local: Record<string, string> = {}): MoveData => ({
  type: 'patterner-move',
  version: 1,
  local,
  patterns,
})

describe('moving from the old address', () => {
  it('only takes the mover’s message', () => {
    expect(asMoveData(move({}))).not.toBeNull()
    expect(asMoveData({ type: 'something-else' })).toBeNull()
    expect(asMoveData(null)).toBeNull()
    expect(asMoveData({ type: 'patterner-move', version: 2, local: {}, patterns: {} })).toBeNull()
  })

  it('adds patterns, keeping both when a name is used here for something different', async () => {
    const small = defaultDraft()
    const big = resizeDraft(defaultDraft(), { shafts: 8 })
    await weave.savePattern('Towel', small)
    await weave.savePattern('Same', small)
    const r = await applyMove(
      move(
        {
          'weave-patterner': [
            { name: 'Towel', draft: big, updatedAt: 1, preset: true },
            { name: 'Same', draft: small, updatedAt: 2 },
            { name: 'Scarf', draft: small, updatedAt: 3 },
          ],
          'knit-patterner': [{ name: 'Hat', draft: { rows: 1 }, updatedAt: 4 }],
        },
        { 'wp-colours': '{"favourites":["#123456"]}', 'mui-mode': 'dark' },
      ),
    )
    expect(r).toEqual({ kind: 'move', patterns: 3, renamed: 1, skipped: 0, settings: 2 })
    const names = (await weave.listPatterns()).map((p) => p.name).sort()
    expect(names).toEqual(['Same', 'Scarf', 'Towel', 'Towel (old address)'])
    const moved = (await weave.listPatterns()).find((p) => p.name === 'Towel (old address)')
    expect(moved?.draft.shafts).toBe(8)
    expect(moved?.preset).toBe(true)
    expect((await knit.listPatterns()).map((p) => p.name)).toEqual(['Hat'])
    expect(items.get('wp-colours')).toBe('{"favourites":["#123456"]}')
    expect(items.get('wp-moved')).toBe('done')
  })

  it('stops at the most patterns that can be kept', async () => {
    const many = Array.from({ length: MAX_PATTERNS + 3 }, (_, i) => ({
      name: `P${i}`,
      draft: defaultDraft(),
      updatedAt: i,
    }))
    const r = await applyMove(move({ 'weave-patterner': many }))
    expect(r.patterns).toBe(MAX_PATTERNS)
    expect(r.skipped).toBe(3)
  })

  it('names clashes and says what came over', () => {
    expect(freeName('A', new Set())).toBe('A (old address)')
    expect(freeName('A', new Set(['A (old address)']))).toBe('A (old address 2)')
    expect(describeMove({ kind: 'move', patterns: 1, renamed: 0, skipped: 0, settings: 3 })).toBe(
      'Brought over 1 pattern and your settings.',
    )
    expect(describeMove({ kind: 'move', patterns: 0, renamed: 0, skipped: 0, settings: 0 })).toBe(
      'No new patterns to bring over.',
    )
  })
})
