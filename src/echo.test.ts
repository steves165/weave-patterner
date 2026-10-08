import { describe, expect, it } from 'vitest'
import { echoDraft, parseTwill, rotatingTieup } from './echo'
import { longestFloats } from './floats'
import { point } from './tools'

const opts = { shafts: 8, shift: 4, tieup: [3, 1, 1, 3], colorA: '#aa0000', colorB: '#0000aa', weft: '#000000' }

describe('echo weave', () => {
  it('threads the design line and its echo end by end, in alternating colours', () => {
    const d = echoDraft({ ...opts, base: point(8) })
    expect(d.ends).toBe(28) // 14-end point, doubled
    expect(d.threading.slice(0, 6).map((s) => s + 1)).toEqual([1, 5, 2, 6, 3, 7])
    expect(d.warpColors.slice(0, 3)).toEqual(['#aa0000', '#0000aa', '#aa0000'])
    expect(d.picks).toBe(28)
    // 3/1/1/3 floats over 3 at most, plus one where the point turns.
    expect(longestFloats(d).warp).toBeLessThanOrEqual(5)
  })

  it('builds a rotating tie-up from up/down counts', () => {
    expect(parseTwill('3/1/1/3')).toEqual([3, 1, 1, 3])
    const t = rotatingTieup(8, [3, 1, 1, 3])
    expect(t.map((row) => (row[0] ? '#' : '.')).join('')).toBe('###.#...')
    expect(t.map((row) => (row[1] ? '#' : '.')).join('')).toBe('.###.#..')
    expect(() => rotatingTieup(8, [2, 2])).toThrow(/add up to 4/)
    expect(() => parseTwill('3/1/1')).toThrow(/as many down counts/)
    expect(() => parseTwill('a/b')).toThrow(/up\/down counts/)
  })

  it('rejects impossible settings', () => {
    expect(() => echoDraft({ ...opts, base: [] })).toThrow(/design line/)
    expect(() => echoDraft({ ...opts, base: [9] })).toThrow(/Shaft 9/)
    expect(() => echoDraft({ ...opts, base: [1], shift: 8 })).toThrow(/Shift must be/)
  })
})
