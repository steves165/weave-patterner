import { describe, expect, it } from 'vitest'
import { longestFloats } from './floats'
import { broken, type TwillOptions, twillDraft, twillName, twillTieup } from './twill'
import { computeDrawdown, defaultDraft, emptyDraft } from './weave'

const column = (tieup: boolean[][], t: number) => tieup.map((row) => (row[t] ? '#' : '.')).join('')
const base: TwillOptions = { counts: [2, 2], step: 1, direction: 'Z', threading: 'straight', treadling: 'straight' }

describe('twill generator', () => {
  it('turns up/down counts into a tie-up that moves one shaft per treadle', () => {
    const t = twillTieup([2, 1, 1, 2], 1, 'Z')
    expect(t).toHaveLength(6)
    expect(column(t, 0)).toBe('##.#..')
    expect(column(t, 1)).toBe('.##.#.')
    expect(column(t, 5)).toBe('#.#..#')
  })

  it('runs an S twill the other way', () => {
    const t = twillTieup([2, 2], 1, 'S')
    expect(column(t, 0)).toBe('##..')
    expect(column(t, 1)).toBe('#..#')
  })

  it('makes an advanced twill with a larger step', () => {
    const t = twillTieup([3, 2, 1, 2], 3, 'Z')
    // ###..#.. turned three shafts along.
    expect(column(t, 1)).toBe('#..###..')
    // Every treadle a different shed.
    expect(new Set(t[0].map((_, i) => column(t, i))).size).toBe(8)
  })

  it('rejects a step that would repeat sheds, and impossible counts', () => {
    expect(() => twillTieup([2, 2], 2, 'Z')).toThrow(/shares a factor/)
    expect(() => twillTieup([2, 2], 4, 'Z')).toThrow(/from 1 to 3/)
    expect(() => twillTieup([1], 1, 'Z')).toThrow(/2 to 128/)
  })

  it('names twills as weavers write them', () => {
    expect(twillName({ counts: [2, 2], step: 1, direction: 'Z' })).toBe('2/2 Z twill')
    expect(twillName({ counts: [3, 1], step: 3, direction: 'S' })).toBe('3/1 S twill (advancing 3)')
  })

  it('draws a broken twill with every second pair swapped', () => {
    expect(broken(4)).toEqual([1, 2, 4, 3])
    expect(broken(8)).toEqual([1, 2, 4, 3, 5, 6, 8, 7])
    expect(broken(7)).toEqual([1, 2, 4, 3, 5, 6, 7])
  })

  it('builds a draft on the current size and colours, with diagonals rising to the right for Z', () => {
    const start = { ...defaultDraft(), warpColors: Array(32).fill('#123456') }
    const d = twillDraft(start, { ...base, counts: [3, 1, 1, 3] })
    expect([d.shafts, d.treadles, d.ends, d.picks]).toEqual([8, 8, 32, 32])
    expect(d.warpColors[0]).toBe('#123456')
    expect(d.threading.slice(0, 9)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 0])
    const dd = computeDrawdown(d)
    // Pick 2 has end 2 up where pick 1 had end 1: the diagonal climbs to the right.
    expect(dd[0][0]).toBe(true)
    expect(dd[1][1]).toBe(true)
    expect(dd[1][0]).toBe(false)
    expect(longestFloats(d).warp).toBe(3)
  })

  it('keeps the threading or treadling when asked, and treadles as drawn in', () => {
    const start = defaultDraft()
    const kept = twillDraft(start, { ...base, counts: [1, 3], threading: 'keep', treadling: 'keep' })
    expect(kept.threading).toEqual(start.threading)
    expect(kept.treadling).toEqual(start.treadling)
    const pointed = twillDraft(start, { ...base, threading: 'point', treadling: 'asDrawn' })
    expect(pointed.threading.slice(0, 7)).toEqual([0, 1, 2, 3, 2, 1, 0])
    expect(pointed.treadling.slice(0, 7).map((row) => row.indexOf(true))).toEqual([0, 1, 2, 3, 2, 1, 0])
  })

  it('fits kept treadles to the twill, and refuses kept threads past its shafts', () => {
    const eight = twillDraft(defaultDraft(), { ...base, counts: [4, 4] })
    expect(() => twillDraft(eight, { ...base, threading: 'keep' })).toThrow(/uses shaft 5/)
    expect(() => twillDraft(eight, { ...base, treadling: 'keep' })).toThrow(/Pick 5 uses a treadle past 4/)
    const wider = twillDraft(defaultDraft(), { ...base, counts: [3, 3], treadling: 'keep' })
    expect(wider.treadling[0]).toEqual([true, false, false, false, false, false])
    expect(() => twillDraft(emptyDraft(), { ...base, threading: 'keep', treadling: 'asDrawn' })).toThrow(
      /Nothing is threaded/,
    )
  })

  it('keeps the point draw straight on two shafts', () => {
    const d = twillDraft(defaultDraft(), { ...base, counts: [1, 1], threading: 'point', treadling: 'point' })
    expect(d.threading.slice(0, 4)).toEqual([0, 1, 0, 1])
  })
})
