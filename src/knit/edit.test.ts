import { describe, expect, it } from 'vitest'
import { blankChart, mirror, parseChart, repeatStitches, resize } from './chart'
import {
  clear,
  copy,
  deleteColumns,
  deleteRows,
  flipAcross,
  flipUp,
  insertColumns,
  insertRows,
  paste,
  repeatAcross,
  repeatUp,
  setRepeat,
} from './edit'
import { castOnText, writeRow, writtenPattern } from './instructions'
import { chartFrom } from './samples'

// chartFrom: rows listed from the top, squares left to right; '.' knit, '-' purl, '/' k2tog, '\' ssk, 'o' yo.
const text = (k: ReturnType<typeof chartFrom>) => k.stitch.map((row) => row.join(' '))

describe('editing a selection', () => {
  it('copies and pastes squares, leaving out what falls off the chart', () => {
    // Row 1 (bottom) is k p; row 2 is p k.
    const k = chartFrom(['-.', '.-'])
    const clip = copy(k, { r0: 0, r1: 1, c0: 0, c1: 1 })
    // Pasted with its bottom-left at row 2, stitch column 3: only its left column fits.
    const big = paste(blankChart(3, 3), clip, 1, 2)
    expect(text(big)).toEqual(['k k k', 'k k k', 'k k p'])
  })

  it('flips across (decreases lean the other way) and upside down', () => {
    // Row 1 is k p k; row 2 is k2tog k k.
    const k = chartFrom(['/..', '.-.'])
    const s = { r0: 0, r1: 1, c0: 0, c1: 2 }
    expect(text(flipAcross(k, s))).toEqual(['k p k', 'k k ssk'])
    expect(text(flipUp(k, s))).toEqual(['k2tog k k', 'k p k'])
    expect(text(clear(k, { r0: 0, r1: 0, c0: 1, c1: 1 }))).toEqual(['k k k', 'k2tog k k'])
  })

  it('repeats squares across their rows and up the chart, lined up with where they are', () => {
    const k = blankChart(6, 4)
    const seeded = paste(k, { stitch: [['p', 'yo']], color: [[0, 0]] }, 1, 2)
    expect(text(repeatAcross(seeded, { r0: 1, r1: 1, c0: 2, c1: 3 }))[1]).toBe('p yo p yo p yo')
    const up = repeatUp(seeded, { r0: 1, r1: 2, c0: 2, c1: 3 })
    expect(up.stitch.map((row) => row[2])).toEqual(['k', 'p', 'k', 'p'])
  })

  it('adds and takes out rows and stitches, moving the repeat box with them', () => {
    const k = setRepeat(blankChart(6, 4), 2, 3)
    expect(insertRows(k, 4).stitch).toHaveLength(5)
    expect(deleteRows(k, 0, 1).stitch).toHaveLength(2)
    expect(deleteRows(k, 0, 3)).toBe(k) // at least one row stays
    expect(insertColumns(k, 0, 2).repeat).toEqual({ from: 4, to: 5 })
    expect(insertColumns(k, 3, 1).repeat).toEqual({ from: 2, to: 4 })
    expect(deleteColumns(k, 0, 0).repeat).toEqual({ from: 1, to: 2 })
    expect(deleteColumns(k, 2, 3).repeat).toBeUndefined()
  })
})

describe('the repeat box', () => {
  it('writes its stitches as the repeat, with those either side worked once', () => {
    // 6 stitches: from the right, k1 (edge), then p2 k2 as the repeat (squares 1–4), then k1.
    const k = setRepeat(chartFrom(['.--...']), 1, 4)
    expect(writeRow(k, 0)).toBe('k1, *k2, p2; rep from * to last st, k1')
    expect(repeatStitches(k)).toEqual({ repeat: 4, edges: 2 })
    expect(castOnText(k)).toBe('Cast on a multiple of 4 stitches plus 2 (6 for one repeat).')
    expect(writtenPattern(k)).toContain('Cast on a multiple of 4 stitches plus 2')
  })

  it('outlining the whole width, or nothing, is no box; it survives saving, resizing and mirroring', () => {
    const k = blankChart(6, 2)
    expect(setRepeat(k, 0, 5).repeat).toBeUndefined()
    const boxed = setRepeat(k, 1, 2)
    expect(parseChart(JSON.parse(JSON.stringify(boxed)))?.repeat).toEqual({ from: 1, to: 2 })
    expect(parseChart({ ...boxed, repeat: { from: 4, to: 9 } })?.repeat).toBeUndefined()
    expect(resize(boxed, 2, 2).repeat).toEqual({ from: 1, to: 1 })
    expect(mirror(boxed).repeat).toEqual({ from: 3, to: 4 })
  })
})
