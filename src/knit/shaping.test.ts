import { describe, expect, it } from 'vitest'
import { blankChart, parseChart } from './chart'
import { setRepeat } from './edit'
import { writtenPattern } from './instructions'
import { sizePlans, spreadEvenly } from './shaping'

describe('sizes and shaping', () => {
  it('spreads decreases and increases evenly, the larger groups first', () => {
    expect(spreadEvenly(50, -5)).toEqual({ text: '(k8, k2tog) 5 times', after: 45 })
    expect(spreadEvenly(52, -5)).toEqual({ text: '(k9, k2tog) twice, (k8, k2tog) 3 times', after: 47 })
    expect(spreadEvenly(30, 4)).toEqual({ text: '(k8, m1) twice, (k7, m1) twice', after: 34 })
    expect(spreadEvenly(4, -2)).toEqual({ text: 'k2tog twice', after: 2 })
    expect(spreadEvenly(10, -6)).toEqual({ error: 'You can decrease at most 5 stitches in one row of 10.' })
    expect(spreadEvenly(10, 0)).toHaveProperty('error')
  })

  it('works out each size in whole repeats of the pattern, with its rows and yarn', () => {
    // A 4-stitch repeat plus 2 edge stitches, at 20 sts and 30 rows to 10 cm.
    const k = { ...setRepeat(blankChart(6, 4), 1, 4), gauge: { stitches: 20, rows: 30 } }
    const [s, m] = sizePlans(k, [
      { name: 'S', width: 40, length: 50 },
      { name: 'M', width: 45, length: 52 },
    ])
    // 40 cm is 80 sts: 78 for the pattern is 19.5 repeats, so 20 repeats + 2 = 82.
    expect(s.castOn).toBe(82)
    expect(s.repeats).toBe(20)
    expect(s.actualWidth).toBeCloseTo(41)
    expect(s.rows).toBe(150)
    expect(m.castOn).toBeGreaterThan(s.castOn)
    expect(m.metres).toBeGreaterThan(s.metres)
    const sized = { ...k, sizes: [{ name: 'S', width: 40, length: 50 }] }
    expect(writtenPattern(sized)).toContain('S: cast on 82 stitches (41.0 cm wide); work 150 rows (50 cm)')
    expect(parseChart(JSON.parse(JSON.stringify(sized)))?.sizes).toEqual(sized.sizes)
  })
})
