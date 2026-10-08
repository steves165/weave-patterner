import { describe, expect, it } from 'vitest'
import { toLiftplan } from './liftplan'
import { insertTabby, removeTabby, tabbyBreaks } from './transforms'
import { computeDrawdown, defaultDraft } from './weave'

describe('tabby', () => {
  it('puts a tabby pick after every pattern pick, adding two tabby treadles', () => {
    const d = defaultDraft()
    const t = insertTabby(d, '#cccccc')
    expect([t.picks, t.treadles]).toEqual([64, 6])
    expect(t.weftColors.slice(0, 4)).toEqual(['#ffd3e4', '#cccccc', '#ffd3e4', '#cccccc'])
    const dd = computeDrawdown(t)
    // Tabby picks alternate across the cloth (straight draw on 4 shafts).
    for (const p of [1, 3]) expect(dd[p].every((v, e) => e === 0 || v !== dd[p][e - 1])).toBe(true)
    expect(tabbyBreaks(d)).toEqual([])
    // Taking it out again gives back the original.
    const back = removeTabby(t)
    expect(back.removed).toBe(32)
    expect(computeDrawdown(back.draft)).toEqual(computeDrawdown(d))
  })

  it('reuses treadles that already lift a tabby shed, and works on a lift plan', () => {
    const d = insertTabby(defaultDraft(), '#cccccc')
    expect(insertTabby(d, '#cccccc').treadles).toBe(6)
    const lift = insertTabby(toLiftplan(defaultDraft()), '#cccccc')
    expect(lift.treadles).toBe(4)
    expect(lift.picks).toBe(64)
  })

  it('reports where the threading breaks tabby', () => {
    const d = defaultDraft()
    d.threading[1] = 2 // ends 1 and 2 both on odd shafts
    expect(tabbyBreaks(d)).toEqual([2, 3])
  })
})
