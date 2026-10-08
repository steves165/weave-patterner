import { describe, expect, it } from 'vitest'
import { clothStats } from './stats'
import { type Draft, defaultDraft } from './weave'

/** Plain weave on 2 shafts. */
const plain = (): Draft => {
  const d = defaultDraft()
  return { ...d, tieup: d.tieup.map((row, s) => row.map((_, t) => s % 2 === t % 2)) }
}

describe('cloth statistics', () => {
  it('reads plain weave as very firm and balanced', () => {
    const s = clothStats(plain())
    expect(s.interlacing).toBe(1)
    expect(s.warpFace).toBe(0.5)
    expect(s.averageFloat).toEqual({ warp: 1, weft: 1 })
    expect(s.firmness).toBe('very firm')
  })

  it('reads 2/2 twill as half as interlaced, with floats of 2', () => {
    const s = clothStats(defaultDraft())
    expect(s.interlacing).toBe(0.5)
    expect(s.averageFloat).toEqual({ warp: 2, weft: 2 })
    expect(s.firmness).toBe('balanced')
  })

  it('reads a 3/1 twill as warp-faced', () => {
    const d = defaultDraft()
    d.tieup = d.tieup.map((row, s) => row.map((_, t) => (s - t + 4) % 4 < 3))
    expect(clothStats(d).warpFace).toBe(0.75)
  })
})
