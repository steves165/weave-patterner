import { describe, expect, it } from 'vitest'
import { bookletText } from './booklet'
import { setRepeat } from './edit'
import { SAMPLES } from './samples'

describe('the pattern booklet', () => {
  it('has the size, gauge, yarn per colour, notes, abbreviations and every row', () => {
    const fair = SAMPLES.find((s) => s.name === 'Fair Isle peerie')?.chart()
    if (!fair) throw new Error('no sample')
    const k = { ...setRepeat(fair, 8, 15), sizes: [{ name: 'M', width: 50, length: 60 }] }
    const t = bookletText(k, 'Peerie hat', { width: 50, length: 60, metresPerBall: 200 })
    expect(t.title).toBe('Peerie hat')
    expect(t.gauge).toMatch(/^22 stitches and 30 rows to 10 cm/)
    expect(t.materials.map((m) => m.text)).toEqual([
      expect.stringMatching(/^Colour A: about \d+ m \(\d+ balls? of 200 m\)$/),
      expect.stringMatching(/^Colour B: about \d+ m/),
    ])
    expect(t.sizes[0]).toMatch(/^M: [\d.]+ × 60 cm\. Cast on \d+, work 180 rounds/)
    expect(t.notes).toContain('Worked in the round. Every round is read from right to left on the chart.')
    expect(t.notes.some((n) => n.startsWith('Cast on a multiple of 8 stitches'))).toBe(true)
    expect(t.abbreviations[0]).toMatch(/^k: knit/)
    expect(t.rows).toHaveLength(k.stitch.length)
    expect(t.rows[0]).toMatch(/^Round 1: \*/)
  })
})
