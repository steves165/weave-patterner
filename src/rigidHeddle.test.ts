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

describe('rigid heddle with a heddle rod', () => {
  /**
   * Holes on shaft 1 (ends 1, 3, 5 …) and slot ends on shafts 2–4 in turn, so picks can lift any mix of slot sets.
   * `picks` lists, for each pick, the shafts it lifts (1-based).
   */
  const draft = (picks: number[][]): Draft => {
    const d = defaultDraft()
    d.threading = d.threading.map((_, e) => (e % 2 === 0 ? 0 : 1 + (Math.floor(e / 2) % 3)))
    d.treadles = 4
    d.tieup = [0, 1, 2, 3].map((s) => [0, 1, 2, 3].map((t) => s === t)) // a lift plan
    d.treadling = d.treadling.map((_, p) => [0, 1, 2, 3].map((t) => picks[p % picks.length].includes(t + 1)))
    return d
  }

  it('uses the stick for one set of slot ends and the rod for another, and both together', () => {
    const r = rigidHeddlePlan(draft([[1], [2, 3, 4], [2], [3], [2, 3], [1, 2]]))
    expect('plan' in r).toBe(true)
    if (!('plan' in r)) return
    expect(r.plan.sheds.slice(0, 6)).toEqual(['up', 'down', 'stick', 'rod', 'stick-rod', 'up-stick'])
    expect(r.plan.pickUp.slice(0, 2)).toEqual([2, 8]) // slot ends on shaft 2
    expect(r.plan.rod.slice(0, 2)).toEqual([4, 10]) // slot ends on shaft 3
  })

  it('needs no rod when one set of slot ends is enough', () => {
    const r = rigidHeddlePlan(draft([[1], [2, 3, 4], [2]]))
    expect('plan' in r && r.plan.rod).toEqual([])
  })

  it('explains when a third set would be needed', () => {
    const r = rigidHeddlePlan(draft([[1], [2, 3, 4], [2], [3], [4]]))
    expect('reason' in r && r.reason).toMatch(/third set of picked-up ends/)
  })
})
