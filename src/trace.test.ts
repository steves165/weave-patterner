import { describe, expect, it } from 'vitest'
import { toLiftplan } from './liftplan'
import { edgeCaseDraft, greenBlocks } from './testUtils'
import { traceCell } from './trace'
import { computeDrawdown, defaultDraft } from './weave'

describe('traceCell', () => {
  it('agrees with the drawdown everywhere', () => {
    for (const d of [defaultDraft(), greenBlocks(), edgeCaseDraft(), toLiftplan(greenBlocks())]) {
      const dd = computeDrawdown(d)
      for (let p = 0; p < d.picks; p++)
        for (let e = 0; e < d.ends; e++) expect(traceCell(d, e, p).warpUp).toBe(dd[p][e])
    }
  })

  it('names the shaft and the treadles that lift it', () => {
    // Default 2/2 twill: end 1 on shaft 1; pick 1 presses treadle 1, which lifts shafts 1 and 2.
    const t = traceCell(defaultDraft(), 0, 0)
    expect(t).toMatchObject({ shaft: 0, treadles: [0], lifting: [0], warpUp: true })
    expect(t.explanation).toBe('End 1, pick 1: warp shows because end 1 is on shaft 1, and treadle 1 lifts it.')
  })

  it('explains weft showing', () => {
    const t = traceCell(defaultDraft(), 2, 0)
    expect(t).toMatchObject({ shaft: 2, treadles: [0], lifting: [], warpUp: false })
    expect(t.explanation).toBe("End 3, pick 1: weft shows because end 3 is on shaft 3, and treadle 1 doesn't lift it.")
  })

  it('lists several treadles', () => {
    const d = defaultDraft()
    d.treadling[0] = [true, false, false, true]
    expect(traceCell(d, 0, 0).explanation).toMatch(/treadles 1 and 4 lift it/)
    expect(traceCell(d, 1, 0).lifting).toEqual([0])
  })

  it('explains unthreaded ends and empty picks', () => {
    const d = defaultDraft()
    d.threading[4] = -1
    d.treadling[1] = [false, false, false, false]
    expect(traceCell(d, 4, 0).explanation).toMatch(/end 5 isn't threaded/)
    expect(traceCell(d, 0, 1).explanation).toMatch(/pick 2 has no treadle pressed/)
    expect(traceCell(d, 4, 0).shaft).toBe(-1)
  })

  it('talks about lifted shafts for a lift plan', () => {
    const d = toLiftplan(defaultDraft())
    expect(traceCell(d, 0, 0).explanation).toMatch(/shaft 1, which is lifted on this pick/)
    expect(traceCell(d, 2, 0).explanation).toMatch(/shaft 3, which isn't lifted on this pick \(shafts 1 and 2 are\)/)
  })
})
