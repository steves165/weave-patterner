import { describe, expect, it } from 'vitest'
import { CELL_DEFAULT, DEFAULT_VIEW, parseViewOptions } from './viewOptions'

describe('parseViewOptions', () => {
  it('uses the defaults when nothing is saved', () => {
    expect(parseViewOptions(null)).toEqual(DEFAULT_VIEW)
    expect(parseViewOptions('junk')).toEqual(DEFAULT_VIEW)
    expect(DEFAULT_VIEW.cellSize).toBe(CELL_DEFAULT)
    expect(DEFAULT_VIEW.settingsOpen).toBeNull()
  })

  it('restores every saved setting', () => {
    const saved = {
      drawTool: 'point',
      endOneRight: true,
      colorBoxes: false,
      numbers: true,
      ruler: 8,
      clothSide: 'back',
      fabric: true,
      noTieup: true,
      sinkingShed: true,
      threadingBelow: true,
      cellSize: 10,
      highlightFloats: true,
      floatLimit: 5,
      settingsOpen: false,
    }
    expect(parseViewOptions(saved)).toEqual(saved)
  })

  it('keeps settings saved before newer ones were added', () => {
    expect(parseViewOptions({ fabric: true })).toEqual({ ...DEFAULT_VIEW, fabric: true })
  })

  it.each([
    ['cellSize', 100],
    ['cellSize', 2],
    ['cellSize', 'big'],
    ['floatLimit', 0],
    ['floatLimit', 7.5],
    ['ruler', -1],
    ['fabric', 'yes'],
    ['settingsOpen', 'open'],
    ['clothSide', 'inside'],
    ['drawTool', 'spray'],
  ])('ignores an invalid %s of %j', (key, value) => {
    expect(parseViewOptions({ [key]: value, numbers: true })).toEqual({ ...DEFAULT_VIEW, numbers: true })
  })

  it('ignores unknown keys', () => {
    expect(parseViewOptions({ other: 1 })).toEqual(DEFAULT_VIEW)
  })
})
