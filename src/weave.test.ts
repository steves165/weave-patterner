import { describe, expect, it } from 'vitest'
import { ascii, edgeCaseDraft } from './testUtils'
import {
  computeDrawdown,
  defaultDraft,
  emptyDraft,
  exportFile,
  importFile,
  MAX_SHAFTS,
  MAX_TREADLES,
  parseDraft,
  resizeDraft,
} from './weave'

describe('computeDrawdown', () => {
  it('weaves the default 2/2 twill', () => {
    expect(
      ascii(defaultDraft())
        .slice(0, 4)
        .map((r) => r.slice(0, 8)),
    ).toEqual(['##..##..', '.##..##.', '..##..##', '#..##..#'])
  })

  it('shows weft for unthreaded ends and picks with no treadle', () => {
    const d = edgeCaseDraft()
    const dd = computeDrawdown(d)
    expect(dd.every((row) => row[3] === false)).toBe(true)
    expect(dd[2].every((up) => up === false)).toBe(true)
  })

  it('lifts the union of shafts when several treadles are pressed', () => {
    const d = defaultDraft()
    d.treadling[0] = [true, false, true, false] // treadles 1 and 3 lift every shaft in the twill tie-up
    expect(computeDrawdown(d)[0].every(Boolean)).toBe(true)
  })
})

describe('emptyDraft', () => {
  it('is the default size with nothing threaded, tied up or treadled', () => {
    const d = emptyDraft()
    expect([d.shafts, d.treadles, d.ends, d.picks]).toEqual([4, 4, 32, 32])
    expect(d.threading.every((s) => s === -1)).toBe(true)
    expect(d.tieup.flat().some(Boolean)).toBe(false)
    expect(d.treadling.flat().some(Boolean)).toBe(false)
    expect(computeDrawdown(d).flat().some(Boolean)).toBe(false)
    expect(parseDraft(d)).toEqual(d)
  })
})

describe('resizeDraft', () => {
  it('keeps existing edits when only ends or picks change', () => {
    const d = defaultDraft()
    d.threading[0] = 3
    d.warpColors[0] = '#000000'
    const r = resizeDraft(d, { ends: 40, picks: 8 })
    expect(r.threading[0]).toBe(3)
    expect(r.threading.slice(32)).toEqual(Array(8).fill(-1))
    expect(r.warpColors[0]).toBe('#000000')
    expect(r.warpColors).toHaveLength(40)
    expect(r.treadling).toHaveLength(8)
  })

  it('regenerates a twill that uses every shaft and treadle when those counts change', () => {
    const r = resizeDraft(defaultDraft(), { shafts: 8, treadles: 8 })
    expect(new Set(r.threading)).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]))
    expect(r.tieup.map((row) => row.filter(Boolean).length)).toEqual(Array(8).fill(4))
    expect(ascii(r)[0].slice(0, 8)).toBe('####....')
  })

  it('supports up to 128 shafts and treadles', () => {
    expect([MAX_SHAFTS, MAX_TREADLES]).toEqual([128, 128])
    const r = resizeDraft(defaultDraft(), { shafts: 128, treadles: 128, ends: 256 })
    expect(new Set(r.threading).size).toBe(128)
    expect(r.tieup).toHaveLength(128)
    expect(r.tieup.every((row) => row.length === 128 && row.filter(Boolean).length === 64)).toBe(true)
    expect(parseDraft(r)).toEqual(r)
    expect(() => parseDraft({ ...r, shafts: 129 })).toThrow(/dimensions/)
  })
})

describe('parseDraft', () => {
  const valid = () => JSON.parse(JSON.stringify(defaultDraft()))

  it('accepts a valid draft', () => {
    expect(parseDraft(valid())).toEqual(defaultDraft())
  })

  it.each([
    ['dimensions', (d: Record<string, unknown>) => (d.shafts = 0), /dimensions/],
    ['threading length', (d: Record<string, unknown>) => (d.threading = [0]), /threading/],
    ['shaft out of range', (d: Record<string, unknown>) => ((d.threading as number[])[0] = 9), /threading/],
    ['tie-up shape', (d: Record<string, unknown>) => (d.tieup = [[true]]), /tie-up/],
    ['treadling values', (d: Record<string, unknown>) => ((d.treadling as unknown[][])[0][0] = 1), /treadling/],
    ['colour format', (d: Record<string, unknown>) => ((d.warpColors as string[])[0] = 'red'), /warp colours/],
  ])('rejects a bad %s', (_, mutate, message) => {
    const d = valid()
    mutate(d)
    expect(() => parseDraft(d)).toThrow(message)
  })

  it('rejects non-objects', () => {
    expect(() => parseDraft(null)).toThrow(/Not a weave pattern/)
  })
})

describe('pattern files', () => {
  it('round-trips through export and import', () => {
    const d = edgeCaseDraft()
    expect(importFile(exportFile('Edge', d))).toEqual({ name: 'Edge', draft: d })
  })

  it('also accepts a bare draft object', () => {
    expect(importFile(JSON.stringify(defaultDraft()))).toEqual({ draft: defaultDraft() })
  })

  it('reports invalid JSON', () => {
    expect(() => importFile('{nope')).toThrow(/not valid JSON/)
  })
})
