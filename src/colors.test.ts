import { describe, expect, it } from 'vitest'
import { applyStripes, expandRuns, PRESETS, toRuns } from './colors'
import { ascii } from './testUtils'

describe('stripes', () => {
  const runs = [
    { color: '#AA0000', count: 2 },
    { color: '#ffffff', count: 1 },
  ]

  it('expands and repeats a sequence over a range', () => {
    expect(expandRuns(runs)).toEqual(['#aa0000', '#aa0000', '#ffffff'])
    expect(applyStripes(Array(7).fill('#000000'), runs, 2, 6)).toEqual([
      '#000000',
      '#aa0000',
      '#aa0000',
      '#ffffff',
      '#aa0000',
      '#aa0000',
      '#000000',
    ])
  })

  it('reads runs back out', () => {
    expect(toRuns(['#a', '#a', '#b', '#a'])).toEqual([
      { color: '#a', count: 2 },
      { color: '#b', count: 1 },
      { color: '#a', count: 1 },
    ])
  })

  it.each([
    [[{ color: '#000000', count: 0 }], 1, 4, /whole number/],
    [[], 1, 4, /whole number/],
    [runs, 0, 4, /between 1 and 4/],
    [runs, 3, 2, /between 1 and 4/],
  ])('rejects bad input %#', (r, from, to, message) => {
    expect(() => applyStripes(Array(4).fill('#000000'), r, from, to)).toThrow(message)
  })
})

describe('colour-and-weave presets', () => {
  const build = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) throw new Error(id)
    return preset.build('#000000', '#ffffff')
  }

  it('houndstooth: 2/2 twill with 4/4 colour order', () => {
    const d = build('houndstooth')
    expect([d.shafts, d.treadles, d.ends, d.picks]).toEqual([4, 4, 32, 32])
    expect(d.warpColors.slice(0, 9)).toEqual([...Array(4).fill('#000000'), ...Array(4).fill('#ffffff'), '#000000'])
    expect(ascii(d)[0].slice(0, 8)).toBe('##..##..')
  })

  it('gingham and log cabin are plain weave', () => {
    for (const id of ['gingham', 'log-cabin']) {
      const rows = ascii(build(id))
      expect(rows[0].slice(0, 4)).toBe('#.#.')
      expect(rows[1].slice(0, 4)).toBe('.#.#')
    }
    expect(build('log-cabin').warpColors.slice(0, 10)).toEqual([
      ...Array(4).fill(['#000000', '#ffffff']).flat(),
      '#ffffff',
      '#000000',
    ])
  })

  it('every preset builds a valid draft', () => {
    for (const p of PRESETS) expect(() => p.build('#123456', '#abcdef')).not.toThrow()
  })
})
