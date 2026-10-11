import { describe, expect, it } from 'vitest'
import { forgetStripe, moveRun, withStripe } from './colors'
import { parseColourStore } from './colourStore'
import { defaultDraft, exportFile, importFile, resizeDraft } from './weave'

const runs = [
  { color: '#AA0000', count: 2 },
  { color: '#00aa00', count: 1 },
]

describe('remembered stripes', () => {
  it('applies a stripe and remembers it to edit again, and forgets it on request', () => {
    const d = withStripe(defaultDraft(), 'warp', { runs, from: 3, to: 8 })
    expect(d.warpColors.slice(2, 8)).toEqual(['#aa0000', '#aa0000', '#00aa00', '#aa0000', '#aa0000', '#00aa00'])
    expect(d.warpColors[0]).toBe(defaultDraft().warpColors[0])
    expect(d.stripes?.warp).toEqual({ runs: [{ color: '#aa0000', count: 2 }, runs[1]], from: 3, to: 8 })
    // Editing it re-applies it over the same range.
    const edited = withStripe(d, 'warp', { ...d.stripes!.warp!, runs: moveRun(d.stripes!.warp!.runs, 0, 1) })
    expect(edited.warpColors.slice(2, 5)).toEqual(['#00aa00', '#aa0000', '#aa0000'])
    const both = withStripe(edited, 'weft', { runs, from: 1, to: 32 })
    expect(Object.keys(both.stripes ?? {})).toEqual(['warp', 'weft'])
    const forgot = forgetStripe(both, 'warp')
    expect(forgot.stripes).toEqual({ weft: both.stripes?.weft })
    expect(forgot.warpColors).toEqual(both.warpColors)
    expect(forgetStripe(forgot, 'weft').stripes).toBeUndefined()
  })

  it('keeps stripes in the file, and inside the pattern when it shrinks', () => {
    const d = withStripe(defaultDraft(), 'weft', { runs, from: 5, to: 30 })
    expect(importFile(exportFile('x', d)).draft.stripes).toEqual(d.stripes)
    expect(resizeDraft(d, { picks: 20 }).stripes?.weft).toMatchObject({ from: 5, to: 20 })
    expect(resizeDraft(d, { picks: 4 }).stripes).toBeUndefined()
    const bad = JSON.parse(exportFile('x', d))
    bad.draft.stripes = { warp: { runs: [{ color: 'red', count: 2 }], from: 1, to: 4 } }
    expect(importFile(JSON.stringify(bad)).draft.stripes).toBeUndefined()
  })

  it('moves a stripe within the sequence', () => {
    const three = [...runs, { color: '#0000aa', count: 3 }]
    expect(moveRun(three, 0, 2).map((r) => r.count)).toEqual([1, 3, 2])
    expect(moveRun(three, 2, 0).map((r) => r.count)).toEqual([3, 2, 1])
    expect(moveRun(three, 1, 5)).toBe(three)
  })
})

describe('favourite colours', () => {
  it('reads saved favourites and palettes, keeping only valid ones', () => {
    expect(
      parseColourStore({
        favourites: ['#FF0000', 'red', '#ff0000', '#00ff00'],
        palettes: [{ name: 'Sea', colours: ['#0000ff', 7], hidden: true }, { name: '', colours: [] }, 'x'],
      }),
    ).toEqual({ favourites: ['#ff0000', '#00ff00'], palettes: [{ name: 'Sea', colours: ['#0000ff'], hidden: true }] })
    expect(parseColourStore('nonsense')).toEqual({ favourites: [], palettes: [] })
  })
})
