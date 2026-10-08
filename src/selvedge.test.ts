import { describe, expect, it } from 'vitest'
import { selvedgeMisses } from './selvedge'
import { computeDrawdown, defaultDraft } from './weave'

describe('selvedge check', () => {
  it('finds no misses in plain weave', () => {
    const d = defaultDraft()
    d.tieup = d.tieup.map((row, s) => row.map((_, t) => s % 2 === t % 2))
    expect(selvedgeMisses(d)).toEqual([])
  })

  it('finds the turns where a 2/2 twill misses the edge end', () => {
    // End 1 (shaft 1) is up on picks 1 and 4, down on 2 and 3; end 32 (shaft 4) up on picks 3 and 4.
    const misses = selvedgeMisses(defaultDraft())
    expect(misses.length).toBeGreaterThan(0)
    const dd = computeDrawdown(defaultDraft())
    for (const m of misses) {
      const e = m.side === 'left' ? 0 : 31
      expect(dd[m.pick - 1][e]).toBe(dd[m.pick][e])
    }
    // Starting from the other side swaps which edge each turn is at.
    expect(selvedgeMisses(defaultDraft(), 'right')).not.toEqual(misses)
  })
})
