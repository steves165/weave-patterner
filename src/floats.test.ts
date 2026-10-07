import { describe, expect, it } from 'vitest'
import { longestFloats, longFloatMask } from './floats'
import { greenBlocks } from './testUtils'
import { defaultDraft } from './weave'

/** A 6×4 plain draft where treadle 1 lifts nothing: picks on it are all weft (a 6-long weft float). */
function withWeftFloat() {
  const d = defaultDraft()
  d.ends = 6
  d.picks = 4
  d.threading = [0, 1, 2, 3, 0, 1]
  d.warpColors = d.warpColors.slice(0, 6)
  d.weftColors = d.weftColors.slice(0, 4)
  d.tieup = d.tieup.map((row) => row.map((v, t) => (t === 0 ? false : v)))
  d.treadling = d.treadling.slice(0, 4)
  return d
}

describe('longestFloats', () => {
  it('measures a 2/2 twill as 2 and 2', () => {
    expect(longestFloats(defaultDraft())).toEqual({ warp: 2, weft: 2 })
  })

  it('finds the 4-thread floats in Green blocks', () => {
    expect(longestFloats(greenBlocks())).toEqual({ warp: 4, weft: 4 })
  })

  it('finds a weft float across a pick with nothing lifted', () => {
    expect(longestFloats(withWeftFloat()).weft).toBe(6)
  })
})

describe('longFloatMask', () => {
  it('marks only threads in floats longer than the limit', () => {
    const mask = longFloatMask(withWeftFloat(), 5)
    expect(mask[0]).toEqual(Array(6).fill(true)) // pick 1 uses treadle 1: all weft
    expect(mask.slice(1).flat().some(Boolean)).toBe(false)
  })

  it('marks nothing when every float is within the limit', () => {
    expect(longFloatMask(greenBlocks(), 4).flat().some(Boolean)).toBe(false)
  })

  it('marks warp floats down a column', () => {
    const d = defaultDraft()
    d.treadling = d.treadling.map(() => [true, false, false, false]) // shafts 1 and 2 up on every pick
    const mask = longFloatMask(d, 5)
    expect(mask.every((row) => row[0] && row[1] && !row[2])).toBe(true)
  })
})
