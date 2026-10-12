import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backupFileName, countsOf, describeCounts, makeBackup, parseBackup, restoreBackup } from './backup'
import { describeMove } from './move'
import { patternStore } from './storage'
import { defaultDraft, resizeDraft } from './weave'

const weave = patternStore<{ shafts: number }>('weave-patterner')
const sew = patternStore('sew-patterner')
const items = new Map<string, string>()

beforeEach(async () => {
  for (const s of [weave, sew]) for (const p of await s.listPatterns()) await s.deletePattern(p.name)
  items.clear()
  vi.stubGlobal('localStorage', {
    get length() {
      return items.size
    },
    key: (i: number) => [...items.keys()][i] ?? null,
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => items.set(k, String(v)),
    removeItem: (k: string) => items.delete(k),
  })
})

describe('backups', () => {
  it('hold every app’s patterns and their settings, but not the analytics choice or the pattern on screen', async () => {
    await weave.savePattern('Towel', defaultDraft())
    await sew.savePattern('Apron', { kind: 'apron' } as never)
    items.set('wp-colours', '{"favourites":["#123456"]}')
    items.set('weave-analytics-consent', 'granted')
    items.set('weave-current', '{"draft":{}}')
    items.set('someone-else', 'x')
    const b = await makeBackup(new Date('2026-10-12T10:00:00Z'))
    expect(backupFileName(b)).toBe('patterner-backup-2026-10-12.json')
    expect(countsOf(b.patterns)).toEqual({ weave: 1, knit: 0, sew: 1 })
    expect(describeCounts(countsOf(b.patterns))).toBe('1 weaving draft, no knitting charts and 1 sewing project')
    expect(Object.keys(b.local)).toEqual(['wp-colours'])
    // And back, through the file.
    expect(parseBackup(JSON.stringify(b))).toEqual(b)
  })

  it('restore beside what’s there, renaming clashes, with or without the settings', async () => {
    await weave.savePattern('Towel', defaultDraft())
    const b = await makeBackup()
    b.patterns['weave-patterner'] = [
      { name: 'Towel', draft: resizeDraft(defaultDraft(), { shafts: 8 }), updatedAt: 1 },
      { name: 'Scarf', draft: defaultDraft(), updatedAt: 2 },
    ]
    b.local = { 'wp-colours': '{"favourites":["#abcdef"]}', 'weave-current': 'not restored' }
    items.set('wp-colours', 'mine')

    const r = await restoreBackup(b, { settings: false })
    expect(r).toEqual({ kind: 'backup', patterns: 2, renamed: 1, skipped: 0, settings: 0 })
    expect(describeMove(r)).toBe('Restored 2 patterns. 1 with names already used here end in “(from backup)”.')
    expect((await weave.listPatterns()).map((p) => p.name).sort()).toEqual(['Scarf', 'Towel', 'Towel (from backup)'])
    expect(items.get('wp-colours')).toBe('mine')

    // Restoring again adds nothing new, and with settings replaces the colours (never the pattern on screen).
    const again = await restoreBackup(b)
    expect(again.patterns).toBe(0)
    expect(items.get('wp-colours')).toBe('{"favourites":["#abcdef"]}')
    expect(items.has('weave-current')).toBe(false)
    expect(items.has('wp-moved')).toBe(false)
  })

  it('refuse files that aren’t backups', () => {
    expect(() => parseBackup('not json')).toThrow(/isn’t a Patterner backup/)
    expect(() => parseBackup('{"type":"something"}')).toThrow(/isn’t a Patterner backup/)
    expect(() => parseBackup('{"type":"patterner-backup","version":2}')).toThrow(/newer version/)
    expect(() => parseBackup('{"type":"patterner-backup","version":1,"local":{}}')).toThrow(/damaged/)
    expect(() =>
      parseBackup('{"type":"patterner-backup","version":1,"local":{},"patterns":{"weave-patterner":3}}'),
    ).toThrow(/damaged/)
  })
})
