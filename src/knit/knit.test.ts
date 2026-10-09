import { describe, expect, it } from 'vitest'
import { chartBitmap } from './bitmap'
import { blankChart, castOn, castOnFor, longFloats, mirror, paint, parseChart, problems, resize, size } from './chart'
import { writeRow, writtenPattern, writtenRows } from './instructions'
import { pictureColors } from './picture'
import { chartFrom, SAMPLES } from './samples'

describe('reading a chart as written instructions', () => {
  it('reads right-side rows right to left and wrong-side rows left to right, as their opposites', () => {
    // Row 1 (bottom): from the right, k1 then p3. Row 2 (WS) is read from the left, purl squares knitted.
    const k = chartFrom(['--..', '...-'])
    expect(writeRow(k, 0)).toBe('p1, k3')
    expect(writeRow(k, 1)).toBe('k2, p2')
  })

  it('reads every round right to left as charted, in the round', () => {
    const k = { ...chartFrom(['--..', '...-']), mode: 'round' as const }
    expect(writeRow(k, 1)).toBe('k2, p2')
    expect(writtenRows(k).map((w) => w.label)).toEqual(['Round 1', 'Round 2'])
    expect(writtenRows(k)[0].side).toBeNull()
  })

  it('writes repeats knitters recognise', () => {
    const rib = SAMPLES[0].chart()
    expect(writeRow(rib, 0)).toBe('*k2, p2; rep from * to end')
    expect(writeRow(rib, 1)).toBe('*k2, p2; rep from * to end')
    const seed = SAMPLES[1].chart()
    expect(writeRow(seed, 0)).toBe('*k1, p1; rep from * to last st, k1')
    expect(writeRow(chartFrom(['........']), 0), 'a plain row is a run').toBe('k8')
  })

  it('groups repeats within a repeat, and counts decreases, increases and twisted stitches', () => {
    const fan = SAMPLES[3].chart()
    expect(writeRow(fan, 2)).toBe('*k2tog 3 times, (yo, k1) 6 times, k2tog 3 times; rep from * to end')
    expect(writeRow(fan, 3)).toBe('k36')
    expect(writeRow(chartFrom(['ttoo']), 0), 'yarn overs twice, twisted stitches bracketed').toBe(
      'yo twice, (k1 tbl) twice',
    )
    expect(writeRow(chartFrom(['vv..']), 0), 'slipped stitches are counted').toBe('k2, sl2 wyib')
  })

  it('works a cable as one step, and skips no-stitch squares', () => {
    const cable = SAMPLES[2].chart()
    expect(writeRow(cable, 0)).toBe('*p2, 2/2 RC; rep from * to last 2 sts, p2')
    expect(writeRow(cable, 1)).toBe('*k2, p4; rep from * to last 2 sts, k2')
    expect(writeRow(chartFrom(['x..x']), 0)).toBe('k2')
  })

  it('names the colours in colourwork', () => {
    const k = chartFrom(['....'], ['0011'])
    expect(writeRow(k, 0)).toBe('k2 B, k2 A')
    const pattern = writtenPattern(k)
    expect(pattern).toContain('A: #f2ead8')
    expect(pattern).toContain('B: #2e5e8c')
  })

  it('writes the whole pattern: cast on, the key, every row and the stitch counts', () => {
    const k = chartFrom(['x/..\\x', '.o..o.'])
    expect(castOn(k)).toBe(4)
    const text = writtenPattern(k, 'Test')
    expect(text).toMatch(/^Test\n\nCast on 4 stitches\. Row 1 is a right-side \(RS\) row\./)
    expect(text).toContain('Row 1 (RS): *k1, yo, k1; rep from * to end. (6 sts)')
    expect(text).toContain('Row 2 (WS): p2tog, p2, ssp. (4 sts)')
    expect(text).toContain('k2tog: knit 2 together')
    expect(text).toContain('yo: yarn over')
    expect(text).not.toContain('cdd:')
    expect(text).toContain('Repeat rows 1–2 for the pattern.')
  })
})

describe('checking a chart', () => {
  it('finds rows that work more or fewer stitches than the row below left', () => {
    expect(problems(SAMPLES[3].chart())).toEqual([])
    expect(problems(chartFrom(['.....x', '......']))).toEqual([
      { row: 2, message: 'Row 2 works 5 stitches, but row 1 left 6.' },
    ])
  })

  it('flags broken cables and cables on wrong-side rows', () => {
    const broken = chartFrom(['......', '.RRR..'])
    expect(problems(broken).map((p) => p.message)).toEqual(['Row 1: a 2/2 RC cable needs 4 squares.'])
    const ws = chartFrom(['.RRRR.', '......'])
    expect(problems(ws).map((p) => p.message)).toEqual([
      'Row 2 crosses a cable on a wrong-side row; cables are usually crossed from the right side.',
    ])
  })

  it('finds long stranded floats', () => {
    const k = { ...chartFrom(['.........'], ['100000001']), floatLimit: 5 }
    expect(longFloats(k)).toEqual([{ row: 1, color: 1, length: 7, from: 2 }])
    expect(longFloats({ ...k, floatLimit: 7 })).toEqual([])
    expect(longFloats(SAMPLES[5].chart()), 'the sample stays within the limit').toEqual([])
  })
})

describe('editing a chart', () => {
  it('paints stitches and colours, filling a cable across its squares', () => {
    let k = blankChart(6, 2)
    k = paint(k, 0, 1, { stitch: 'rc2' })
    expect(k.stitch[0]).toEqual(['k', 'rc2', 'rc2', 'rc2', 'rc2', 'k'])
    k = paint(k, 1, 5, { stitch: 'lc1' })
    expect(k.stitch[1]).toEqual(['k', 'k', 'k', 'k', 'lc1', 'lc1'])
    k = paint(k, 1, 0, { color: 1 })
    expect(k.color[1][0]).toBe(1)
    expect(paint(k, 1, 0, { color: 1 }), 'no change keeps the same chart').toBe(k)
  })

  it('mirrors left to right, swapping how stitches lean', () => {
    const k = mirror(chartFrom(['/.\\RRRR']))
    expect(k.stitch[0]).toEqual(['lc2', 'lc2', 'lc2', 'lc2', 'k2tog', 'k', 'ssk'])
  })

  it('resizes, keeping what fits', () => {
    const k = resize(chartFrom(['--', '..']), 3, 3)
    expect(k.stitch).toEqual([
      ['k', 'k', 'k'],
      ['p', 'p', 'k'],
      ['k', 'k', 'k'],
    ])
  })

  it('works out the size and the stitches to cast on for a width', () => {
    const k = { ...blankChart(22, 30), gauge: { stitches: 22, rows: 30 } }
    expect(size(k)).toEqual({ width: 10, height: 10 })
    // 50 cm at 22 sts per 10 cm is 110 sts; in repeats of 4 plus 2 edge stitches: 27 repeats + 2.
    expect(castOnFor(50, 22, 4, 2)).toBe(110)
    expect(castOnFor(50, 22, 12, 0)).toBe(108)
    expect(castOnFor(1, 22, 12)).toBe(12)
  })

  it('reads back saved charts and rejects anything else', () => {
    for (const s of SAMPLES) expect(parseChart(JSON.parse(JSON.stringify(s.chart())))).toEqual(s.chart())
    expect(parseChart(null)).toBeNull()
    expect(parseChart({ ...blankChart(), stitch: [['k', 'bogus']] })).toBeNull()
    expect(parseChart({ ...blankChart(2, 1), color: [[0, 9]] })).toBeNull()
  })
})

describe('a picture as colourwork', () => {
  it('finds its main colours and puts the nearest in each square, bottom row first', () => {
    // 4 × 4 pixels: the top half red, the bottom half white.
    const data = new Uint8ClampedArray(4 * 4 * 4)
    for (let i = 0; i < 16; i++) data.set(i < 8 ? [200, 0, 0, 255] : [255, 255, 255, 255], i * 4)
    const { colors, grid } = pictureColors({ data, width: 4, height: 4 }, 2, 2, 2)
    expect(colors).toEqual(['#c80000', '#ffffff'])
    expect(grid).toEqual([
      [1, 1],
      [0, 0],
    ])
  })
})

describe('bitmap export', () => {
  it('is one pixel per stitch, row 1 at the bottom, indexed in the chart colours', () => {
    // Row 1, the rightmost stitch shown (stitch 1) in colour B.
    const chart = paint(blankChart(3, 2), 0, 2, { color: 1 })
    const b = chartBitmap(chart)
    const v = new DataView(b.buffer)
    expect([v.getInt32(18, true), v.getInt32(22, true), v.getUint16(28, true)]).toEqual([3, 2, 1])
    // Palette: colour A then B.
    expect([...b.slice(54, 57)]).toEqual([0xd8, 0xea, 0xf2])
    // Bitmaps store the bottom row first: row 1, with only the last pixel set.
    expect(b[62]).toBe(0b0010_0000)
    expect(b[66]).toBe(0)
  })
})
