import { describe, expect, it } from 'vitest'
import { applyStripes, darkAndLight, expandRuns, PRESETS, sett, textOn, toRuns } from './colors'
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

  it('plain weave: tabby on 2 shafts, dark warp and light weft', () => {
    const d = build('plain-weave')
    expect([d.shafts, d.treadles]).toEqual([2, 2])
    expect(
      ascii(d)
        .slice(0, 2)
        .map((r) => r.slice(0, 4)),
    ).toEqual(['#.#.', '.#.#'])
    expect(new Set(d.warpColors)).toEqual(new Set(['#000000']))
    expect(new Set(d.weftColors)).toEqual(new Set(['#ffffff']))
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

describe('textOn', () => {
  it.each([
    ['#ffffff', '#000000'],
    ['#ffeb3b', '#000000'],
    ['#8b0a0a', '#ffffff'],
    ['#000000', '#ffffff'],
    ['#1a237e', '#ffffff'],
    ['#808080', '#000000'],
  ])('puts readable text on %s', (bg, text) => {
    expect(textOn(bg)).toBe(text)
  })
})

describe('more presets', () => {
  it('include the standard checks and stripes, with unique ids', () => {
    const ids = PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ['puppytooth', 'glen-check', 'gun-club', 'windowpane', 'tattersall', 'herringbone', 'birds-eye'])
      expect(ids).toContain(id)
  })

  it('fill the whole draft with whole repeats, using the accent only where they say so', () => {
    for (const p of PRESETS) {
      const d = p.build('#000000', '#ffffff', '#ff0000')
      expect(d.warpColors).toHaveLength(d.ends)
      expect(d.threading.every((s) => s >= 0 && s < d.shafts)).toBe(true)
      const usesAccent = [...d.warpColors, ...d.weftColors].includes('#ff0000')
      expect(usesAccent, p.name).toBe(Boolean(p.accent))
    }
  })

  it('puts the darker colour first', () => {
    expect(darkAndLight('#ffd3e4', '#d6246e')).toEqual(['#d6246e', '#ffd3e4'])
    expect(darkAndLight('#000000', '#ffffff')).toEqual(['#000000', '#ffffff'])
  })
})

describe('tartans', () => {
  it('weave a threadcount out to the far pivot and back, each pivot once', () => {
    expect(
      sett([
        ['r', 2],
        ['g', 1],
        ['y', 1],
      ]),
    ).toEqual(['r', 'r', 'g', 'y', 'g'])
  })

  it('Clan Cameron: the registered sett R/8 G24 R8 G24 R64 Y/4 in 2/2 twill, the same in warp and weft', () => {
    const preset = PRESETS.find((p) => p.id === 'clan-cameron')
    if (!preset) throw new Error('missing')
    // Its own colours, whatever is chosen.
    const d = preset.build('#000000', '#ffffff', '#ff0000')
    expect(d).toEqual(preset.build('#123456', '#abcdef'))
    expect([d.shafts, d.treadles, d.ends, d.picks]).toEqual([4, 4, 252, 252])
    expect(d.weftColors).toEqual(d.warpColors)
    const names = preset.colours ?? {}
    expect(toRuns(d.warpColors).map((r) => `${names[r.color][0].toUpperCase()}${r.count}`)).toEqual([
      'R8',
      'G24',
      'R8',
      'G24',
      'R64',
      'Y4',
      'R64',
      'G24',
      'R8',
      'G24',
    ])
    expect(ascii(d)[0].slice(0, 8)).toBe('##..##..')
  })
})
