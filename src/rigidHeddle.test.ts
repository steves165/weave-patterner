import { describe, expect, it } from 'vitest'
import { rigidHeddlePlan } from './rigidHeddle'
import { type Draft, defaultDraft } from './weave'

/** Plain weave on 2 shafts. */
const plain = (): Draft => {
  const d = defaultDraft()
  return { ...d, tieup: d.tieup.map((row, s) => row.map((_, t) => s % 2 === t % 2)) }
}

describe('rigid heddle', () => {
  it('weaves plain weave with heddle up and down', () => {
    const r = rigidHeddlePlan(plain())
    expect('plan' in r && r.plan.sheds.slice(0, 4)).toEqual(['up', 'down', 'up', 'down'])
    expect('plan' in r && r.plan.firstEnd).toBe('hole')
  })

  it('uses the pick-up stick for a pick-up pattern', () => {
    // Plain weave, plus picks that lift only slot ends 2, 6, 10 … (on shaft 3) and picks lifting holes plus those.
    const d = plain()
    d.threading = d.threading.map((_, e) => (e % 2 === 0 ? 0 : e % 4 === 1 ? 2 : 1))
    d.tieup = [
      [true, false, false, true],
      [false, true, false, false],
      [false, true, true, true],
      [false, false, false, false],
    ]
    d.treadling = d.treadling.map((_, p) => [0, 1, 2, 3].map((t) => t === [0, 1, 2, 1][p % 4]))
    const r = rigidHeddlePlan(d)
    expect('plan' in r).toBe(true)
    if (!('plan' in r)) return
    expect(r.plan.sheds.slice(0, 4)).toEqual(['up', 'down', 'stick', 'down'])
    expect(r.plan.pickUp.slice(0, 3)).toEqual([2, 6, 10])
  })

  it("explains drafts a rigid heddle can't weave", () => {
    const r = rigidHeddlePlan(defaultDraft())
    expect('reason' in r && r.reason).toMatch(/only some of the hole ends|second pick-up stick/)
    const d = plain()
    d.threading[4] = -1
    expect('reason' in rigidHeddlePlan(d) && (rigidHeddlePlan(d) as { reason: string }).reason).toMatch(
      /End 5 is unthreaded/,
    )
  })
})
