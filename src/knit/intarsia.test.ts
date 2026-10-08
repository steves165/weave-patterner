import { describe, expect, it } from 'vitest'
import { longFloats } from './chart'
import { intarsia } from './intarsia'
import { writtenPattern } from './instructions'
import { chartFrom } from './samples'
import { yarnNeeded } from './yarn'

// Two blocks of B on an A ground: B on the left in rows 1–2, and a separate B block on the right in row 4.
// Rows listed from the top; 0 is A, 1 is B.
const blocks = () =>
  chartFrom(
    Array(4).fill('.........'),
    ['000000011', '000000000', '110000000', '110000000'],
    ['#ffffff', '#c62828'],
  )

describe('intarsia', () => {
  it('counts a bobbin for each area of colour, and the twists in each row, in working order', () => {
    const k = { ...blocks(), colorwork: 'intarsia' as const }
    const plan = intarsia(k)
    expect(plan.bobbins).toEqual([
      { color: 0, count: 1 },
      { color: 1, count: 2 },
    ])
    expect(plan.total).toBe(3)
    // Row 1, read from the right: 7 A then 2 B.
    expect(plan.rows[0].areas).toEqual([
      { color: 0, stitches: 7 },
      { color: 1, stitches: 2 },
    ])
    expect(plan.rows[0].twists).toBe(1)
    // Row 2 is read from the left.
    expect(plan.rows[1].areas[0]).toEqual({ color: 1, stitches: 2 })
  })

  it('has no floats, carries no yarn behind, and says to wind bobbins', () => {
    // B at both ends of the row: stranded, B floats behind the 7 A stitches between.
    const stranded = chartFrom(['.........'], ['100000001'], ['#ffffff', '#c62828'])
    const k = { ...stranded, colorwork: 'intarsia' as const, floatLimit: 1 }
    expect(longFloats({ ...stranded, floatLimit: 1 }).length).toBeGreaterThan(0)
    expect(longFloats(k)).toEqual([])
    const b = (c: typeof k) => yarnNeeded(c, 10, 10)[1].metres
    expect(b(k)).toBeLessThan(b(stranded))
    expect(writtenPattern(k)).toContain('Intarsia: wind a separate bobbin for each area of colour, 3 in all (A ×1, B ×2)')
  })
})
