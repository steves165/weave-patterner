import { describe, expect, it } from 'vitest'
import { blankChart } from './chart'
import {
  applyMarks,
  colorSymbol,
  dragsShape,
  fillCells,
  lineCells,
  mirrored,
  mirrorLines,
  ovalCells,
  pickBrush,
  rectCells,
  toolCells,
} from './draw'
import { pictureRows, tidyColors } from './picture'
import { chartFrom } from './samples'

const key = (cells: { r: number; c: number }[]) =>
  cells
    .map(({ r, c }) => `${r},${c}`)
    .sort()
    .join(' ')

/** The colours as letters, rows listed from the top as in chartFrom. */
const picture = (k: ReturnType<typeof blankChart>) =>
  [...k.color].reverse().map((row) => row.map((v) => (v ? '#' : '.')).join(''))

describe('drawing shapes', () => {
  it('draws a line with no gaps, either way round', () => {
    expect(lineCells({ r: 0, c: 0 }, { r: 2, c: 4 })).toHaveLength(5)
    const back = lineCells({ r: 2, c: 4 }, { r: 0, c: 0 })
    expect(back).toHaveLength(5)
    // Each square touches the one before it.
    back.slice(1).forEach((s, i) => {
      expect(Math.max(Math.abs(s.r - back[i].r), Math.abs(s.c - back[i].c))).toBe(1)
    })
    expect(lineCells({ r: 1, c: 1 }, { r: 1, c: 1 })).toEqual([{ r: 1, c: 1 }])
  })

  it('draws a box, as an edge or filled', () => {
    expect(rectCells({ r: 0, c: 0 }, { r: 2, c: 2 }, false)).toHaveLength(8)
    expect(rectCells({ r: 2, c: 2 }, { r: 0, c: 0 }, true)).toHaveLength(9)
  })

  it('draws an oval, as an outline with no gaps or filled', () => {
    const k = blankChart(7, 5)
    const filled = applyMarks(
      k,
      ovalCells({ r: 0, c: 0 }, { r: 4, c: 6 }, true).map((c) => ({ ...c, flipped: false })),
      {
        kind: 'color',
        index: 1,
      },
    )
    expect(picture(filled)).toEqual(['.#####.', '#######', '#######', '#######', '.#####.'])
    const outline = ovalCells({ r: 0, c: 0 }, { r: 4, c: 6 }, false)
    expect(outline.length).toBeLessThan(ovalCells({ r: 0, c: 0 }, { r: 4, c: 6 }, true).length)
    expect(key(outline)).not.toContain('2,3')
    // A one-square oval is that square.
    expect(ovalCells({ r: 1, c: 1 }, { r: 1, c: 1 }, false)).toEqual([{ r: 1, c: 1 }])
  })

  it('fills the area of one colour joined to the square clicked', () => {
    const k = chartFrom(['...', '...', '...'], ['010', '111', '000'])
    expect(key(fillCells(k, { r: 0, c: 0 }, 'color'))).toBe(key([0, 1, 2].map((c) => ({ r: 0, c }))))
    // The top corners aren't joined to each other.
    expect(fillCells(k, { r: 2, c: 0 }, 'color')).toEqual([{ r: 2, c: 0 }])
    expect(fillCells(k, { r: 9, c: 0 }, 'color')).toEqual([])
    // A stitch brush fills by stitch.
    const s = chartFrom(['.-', '..'])
    expect(fillCells(s, { r: 0, c: 0 }, 'stitch')).toHaveLength(3)
  })

  it('works out the cells for each tool', () => {
    const k = blankChart(4, 4)
    const a = { r: 0, c: 0 }
    const b = { r: 3, c: 3 }
    expect(toolCells(k, 'draw', a, b, false, 'color')).toHaveLength(4)
    expect(toolCells(k, 'line', a, b, false, 'color')).toHaveLength(4)
    expect(toolCells(k, 'rect', a, b, false, 'color')).toHaveLength(12)
    expect(toolCells(k, 'oval', a, b, true, 'color').length).toBeGreaterThan(8)
    expect(toolCells(k, 'fill', a, b, false, 'color')).toHaveLength(16)
    expect(toolCells(k, 'pick', a, b, false, 'color')).toEqual([])
    expect(dragsShape('rect')).toBe(true)
    expect(dragsShape('fill')).toBe(false)
  })
})

describe('symmetry', () => {
  it('mirrors about the middle of the chart, or of the repeat box', () => {
    const k = blankChart(6, 4)
    expect(mirrorLines(k)).toEqual({ across: 5, up: 3 })
    expect(mirrorLines({ ...k, repeat: { from: 1, to: 3 } }).across).toBe(4)
  })

  it('adds mirror images left to right, up and down, or four ways', () => {
    const k = blankChart(5, 4)
    const cell = [{ r: 0, c: 0 }]
    expect(mirrored(k, cell, 'none')).toEqual([{ r: 0, c: 0, flipped: false }])
    expect(mirrored(k, cell, 'across')).toEqual([
      { r: 0, c: 0, flipped: false },
      { r: 0, c: 4, flipped: true },
    ])
    expect(key(mirrored(k, cell, 'up'))).toBe('0,0 3,0')
    expect(key(mirrored(k, cell, 'both'))).toBe('0,0 0,4 3,0 3,4')
    // A repeat box near the edge mirrors some squares off the chart: they're left out.
    expect(mirrored({ ...k, repeat: { from: 0, to: 1 } }, [{ r: 0, c: 4 }], 'across')).toHaveLength(1)
  })

  it('paints mirrored stitches leaning the other way, and cables crossing the other way', () => {
    const k = blankChart(6, 1)
    const marks = mirrored(k, [{ r: 0, c: 0 }], 'across')
    expect(applyMarks(k, marks, { kind: 'stitch', id: 'k2tog' }).stitch[0]).toEqual([
      'k2tog',
      'k',
      'k',
      'k',
      'k',
      'ssk',
    ])
    expect(applyMarks(k, marks, { kind: 'stitch', id: 'rc1' }).stitch[0]).toEqual([
      'rc1',
      'rc1',
      'k',
      'k',
      'lc1',
      'lc1',
    ])
  })

  it('returns the same chart when nothing changes', () => {
    const k = blankChart(3, 3)
    expect(applyMarks(k, [{ r: 0, c: 0, flipped: false }], { kind: 'color', index: 0 })).toBe(k)
    expect(applyMarks(k, [{ r: 0, c: 0, flipped: false }], { kind: 'stitch', id: 'k' })).toBe(k)
  })
})

describe('picking and colour symbols', () => {
  it('picks up a colour or a stitch', () => {
    const k = chartFrom(['-.'], ['10'])
    expect(pickBrush(k, { r: 0, c: 0 }, 'color')).toEqual({ kind: 'color', index: 1 })
    expect(pickBrush(k, { r: 0, c: 0 }, 'stitch')).toEqual({ kind: 'stitch', id: 'p' })
    expect(pickBrush({ ...k, stitch: [['none', 'k']] }, { r: 0, c: 0 }, 'stitch')).toEqual({ kind: 'stitch', id: 'k' })
  })

  it('gives each colour a symbol, A left plain', () => {
    expect(colorSymbol(0)).toBe('')
    expect(new Set([0, 1, 2, 3, 4, 5, 6, 7].map(colorSymbol)).size).toBe(8)
    expect(colorSymbol(9)).toBe('J')
  })
})

describe('pictures as colourwork', () => {
  it('keeps the picture its shape at the gauge', () => {
    // A square picture at 20 stitches and 30 rows to 10 cm: 30 rows for 20 stitches.
    expect(pictureRows({ width: 100, height: 100 }, 20, { stitches: 20, rows: 30 }, 160)).toBe(30)
    expect(pictureRows({ width: 10, height: 1000 }, 100, { stitches: 20, rows: 30 }, 160)).toBe(160)
    expect(pictureRows({ width: 1000, height: 1 }, 10, { stitches: 20, rows: 30 }, 160)).toBe(1)
  })

  it('tidies lone stitches of colour', () => {
    expect(
      tidyColors([
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ]),
    ).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ])
    // A line of colour stays.
    const line = [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ]
    expect(tidyColors(line)).toEqual(line)
  })
})
