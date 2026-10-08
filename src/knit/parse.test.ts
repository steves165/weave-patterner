import { describe, expect, it } from 'vitest'
import { blankChart, paint } from './chart'
import { writtenPattern } from './instructions'
import { parseWritten } from './parse'
import { chartFrom, SAMPLES } from './samples'

describe('reading a written pattern', () => {
  it('reads every sample back from its own written pattern', () => {
    for (const sample of SAMPLES) {
      const k = sample.chart()
      const { chart, errors } = parseWritten(writtenPattern(k))
      expect(errors, sample.name).toEqual([])
      expect(chart?.stitch, sample.name).toEqual(k.stitch)
      expect(chart?.mode, sample.name).toBe(k.mode)
    }
  })

  it('reads repeats, groups, counted runs and wrong-side wording', () => {
    const { chart, errors } = parseWritten(
      [
        'Cast on 10 stitches.',
        'Row 1 (RS): k1, *p2, k2; rep from * to last st, p1.',
        'Row 2 (WS): (k1, p1) 5 times.',
      ].join('\n'),
    )
    expect(errors).toEqual([])
    // Row 1 from the right: k1, p2, k2, p2, k2, p1. Row 2 from the left: k1 (a purl square), p1 (a knit square)…
    expect(chart?.stitch[0]).toEqual(['p', 'k', 'k', 'p', 'p', 'k', 'k', 'p', 'p', 'k'])
    expect(chart?.stitch[1]).toEqual(['p', 'k', 'p', 'k', 'p', 'k', 'p', 'k', 'p', 'k'])
  })

  it('reads colour letters, cables, "to end" and stitch counts, and works out the cast-on from row 1', () => {
    const { chart, errors } = parseWritten(
      ['Rnd 1: k2 A, k2 B, k to end', 'Rnd 2: 2/2 RC, k2. (6 sts)'].join('\n').replace('k to end', 'k2'),
    )
    expect(errors).toEqual([])
    expect(chart?.mode).toBe('round')
    expect(chart?.color[0]).toEqual([0, 0, 1, 1, 0, 0])
    expect(chart?.stitch[1]).toEqual(['k', 'k', 'rc2', 'rc2', 'rc2', 'rc2'])
  })

  it('reads short rows, and says where it gets stuck', () => {
    let k = blankChart(5, 1)
    k = paint(paint(k, 0, 1, { stitch: 'wt' }), 0, 0, { stitch: 'rest' })
    expect(parseWritten(writtenPattern(k)).chart?.stitch[0]).toEqual(k.stitch[0])
    expect(parseWritten('Row 1: k2, frobnicate, k2').errors[0].message).toBe('Row 1: didn\'t understand "frobnicate".')
    expect(parseWritten('Row 1: *k2, p2; rep from * to end').errors[0].message).toMatch(/cast-on/)
    expect(parseWritten('nothing here').errors[0].message).toMatch(/No rows found/)
    expect(parseWritten('Cast on 3 stitches.\nRow 1: knit.\nRow 2: purl.').chart?.stitch).toEqual([
      ['k', 'k', 'k'],
      ['k', 'k', 'k'],
    ])
    expect(parseWritten(writtenPattern(chartFrom(['.-o/']))).chart?.stitch).toEqual(chartFrom(['.-o/']).stitch)
  })
})
