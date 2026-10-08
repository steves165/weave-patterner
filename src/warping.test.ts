import { describe, expect, it } from 'vitest'
import { colorTotals, windingPlan, windingRuns } from './warping'
import { defaultDraft } from './weave'

describe('warp winding plan', () => {
  it('groups consecutive ends of one colour', () => {
    expect(windingRuns(['#AA0000', '#aa0000', '#ffffff', '#aa0000'])).toEqual([
      { color: '#aa0000', count: 2, from: 1, to: 2 },
      { color: '#ffffff', count: 1, from: 3, to: 3 },
      { color: '#aa0000', count: 1, from: 4, to: 4 },
    ])
  })

  it('splits the warp into bouts, carrying end numbers through', () => {
    const d = defaultDraft()
    d.warpColors = d.warpColors.map((_, e) => (e % 8 < 4 ? '#000000' : '#ffffff'))
    const plan = windingPlan(d, 12)
    expect(plan.map((b) => [b.from, b.to])).toEqual([
      [1, 12],
      [13, 24],
      [25, 32],
    ])
    expect(plan[1].runs[0]).toEqual({ color: '#ffffff', count: 4, from: 13, to: 16 })
    expect(windingPlan(d)).toHaveLength(1)
    expect(colorTotals(d.warpColors)).toEqual([
      { color: '#000000', count: 16 },
      { color: '#ffffff', count: 16 },
    ])
  })
})
